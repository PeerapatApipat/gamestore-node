// controller/cart.ts
import express, { Request, Response } from "express";
import { conn } from "../dbconnect";
import { jwtAuthen } from "../jwtauth"; // Import jwtAuthen

export const router = express.Router();

/**
 * ✅ [คงเดิม] POST /cart/validate-code
 * ตรวจสอบโค้ดส่วนลดว่าใช้งานได้หรือไม่ (สำหรับแสดงผลฝั่ง Front-end)
 */
router.post("/validate-code", jwtAuthen, (req: any, res: Response) => {
  const { code } = req.body;
  const user_id = req.auth.userId; // ดึง user_id จาก token

  if (!code || !user_id) {
    return res.status(400).json({ message: "กรุณาส่ง code" });
  }

  const findCodeSql = "SELECT * FROM discount_codes WHERE code = ?";
  conn.query(findCodeSql, [code], (err, results) => {
    if (err) {
      console.error("[ValidateCode] SQL error 1:", err.message);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "ไม่พบโค้ดส่วนลดนี้" });
    }

    const discountCode = results[0];

    // ตรวจสอบวันหมดอายุ
    if (
      discountCode.expire_date &&
      new Date(discountCode.expire_date) < new Date()
    ) {
      return res.status(400).json({ message: "โค้ดนี้หมดอายุการใช้งานแล้ว" });
    }

    // ตรวจสอบจำนวนการใช้
    if (discountCode.max_uses > 0 && discountCode.used_count >= discountCode.max_uses) {
      return res
        .status(400)
        .json({ message: "โค้ดนี้ถูกใช้ครบตามจำนวนที่กำหนดแล้ว" });
    }

    // ตรวจสอบว่าผู้ใช้คนนี้เคยใช้โค้ดนี้หรือยัง
    const checkUserUsageSql =
      "SELECT COUNT(*) AS usage_count FROM orders WHERE user_id = ? AND discount_code = ? AND status = 'paid'";

    conn.query(checkUserUsageSql, [user_id, code], (err, usageResult) => {
      if (err) {
        console.error("[ValidateCode] SQL error 2:", err.message);
        return res
          .status(500)
          .json({ error: "เกิดข้อผิดพลาดในการตรวจสอบประวัติการใช้" });
      }

      // หมายเหตุ: โลจิกนี้อาจต้องปรับถ้าโค้ด "ใช้ได้หลายครั้ง"
      if (usageResult[0].usage_count > 0 && discountCode.max_uses === 1) {
        return res
          .status(400)
          .json({ message: "คุณได้ใช้โค้ดส่วนลดนี้ไปแล้ว" });
      }

      // ถ้าทุกอย่างผ่าน
      res.status(200).json({
        message: "โค้ดส่วนลดใช้งานได้",
        code: discountCode.code,
        discount_percent: discountCode.discount_percent,
      });
    });
  });
});

/**
 * 🛒 [ใหม่] GET /cart
 * ดึงข้อมูลเกมทั้งหมดในตะกร้าของผู้ใช้ (orders.status = 'pending')
 */
router.get("/", jwtAuthen, (req: any, res: Response) => {
  const userId = req.auth.userId;

  const sql = `
    SELECT 
      o.id AS order_id,
      oi.id AS item_id,
      oi.game_id,
      oi.quantity,
      g.title,
      g.price,
      g.image_url,
      g.description
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN games g ON oi.game_id = g.id
    WHERE o.user_id = ? AND o.status = 'pending'
    ORDER BY o.order_date DESC
  `;

  conn.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("[GetCart] SQL error:", err.message);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
    }
    // ส่งข้อมูลรายการในตะกร้ากลับไป
    res.status(200).json(results);
  });
});

/**
 * 🗑️ [ใหม่] DELETE /cart/item/:itemId
 * ลบ item ออกจากตะกร้า (ลบจาก order_items)
 */
router.delete("/item/:itemId", jwtAuthen, (req: any, res: Response) => {
  const userId = req.auth.userId;
  const itemId = req.params.itemId;

  if (!itemId) {
    return res.status(400).json({ message: "ไม่พบ ID ของรายการ" });
  }

  conn.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ message: "Database connection error" });
    }

    connection.beginTransaction(async (err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ message: "Transaction error" });
      }

      try {
        // 1. ค้นหา order_id และ price ของ item ที่จะลบ
        const itemQuery = `
          SELECT oi.order_id, oi.price, oi.quantity
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          WHERE oi.id = ? AND o.user_id = ? AND o.status = 'pending'
        `;
        const itemResult: any = await new Promise((resolve, reject) => {
          connection.query(itemQuery, [itemId, userId], (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });

        if (itemResult.length === 0) {
          throw new Error("ไม่พบรายการนี้ในตะกร้าของคุณ หรือรายการถูกซื้อไปแล้ว");
        }

        const { order_id, price, quantity } = itemResult[0];
        const itemTotalPrice = price * quantity;

        // 2. ลบ item ออกจาก order_items
        await new Promise((resolve, reject) => {
          connection.query(
            "DELETE FROM order_items WHERE id = ?",
            [itemId],
            (err) => (err ? reject(err) : resolve(true))
          );
        });

        // 3. ตรวจสอบว่ามี item เหลือใน order นี้หรือไม่
        const countQuery = "SELECT COUNT(*) AS itemCount FROM order_items WHERE order_id = ?";
        const countResult: any = await new Promise((resolve, reject) => {
          connection.query(countQuery, [order_id], (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });

        if (countResult[0].itemCount === 0) {
          // 4a. ถ้าไม่มี item เหลือ ให้ลบ order นั้นทิ้ง
          await new Promise((resolve, reject) => {
            connection.query(
              "DELETE FROM orders WHERE id = ?",
              [order_id],
              (err) => (err ? reject(err) : resolve(true))
            );
          });
        } else {
          // 4b. ถ้ามี item เหลือ ให้อัปเดตราคารวมของ order
          const updateOrderSql = `
            UPDATE orders 
            SET total_price = total_price - ?, final_price = total_price - ?
            WHERE id = ?
          `;
          await new Promise((resolve, reject) => {
            connection.query(
              updateOrderSql,
              [itemTotalPrice, itemTotalPrice, order_id],
              (err) => (err ? reject(err) : resolve(true))
            );
          });
        }

        // 5. Commit
        connection.commit((err) => {
          if (err) throw err;
          connection.release();
          res.status(200).json({ message: "ลบรายการออกจากตะกร้าสำเร็จ" });
        });
      } catch (error: any) {
        connection.rollback(() => {
          connection.release();
          res.status(400).json({ message: error.message });
        });
      }
    });
  });
});

/**
 * 💳 [ใหม่] POST /cart/checkout
 * รวมทุก 'pending' order, ใช้ส่วนลด, หัก wallet, และเปลี่ยนสถานะเป็น 'paid'
 */
router.post("/checkout", jwtAuthen, (req: any, res: Response) => {
  const userId = req.auth.userId;
  const { discount_code } = req.body; // รับโค้ดส่วนลด (อาจเป็น null)

  conn.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ message: "Database connection error" });
    }

    connection.beginTransaction(async (err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ message: "Transaction error" });
      }

      try {
        // 1. ดึงข้อมูลผู้ใช้ (Wallet) และ Lock row
        const userResult: any = await new Promise((resolve, reject) => {
          connection.query(
            "SELECT wallet_balance FROM users WHERE user_id = ? FOR UPDATE",
            [userId],
            (err, results) => (err ? reject(err) : resolve(results))
          );
        });
        if (userResult.length === 0) throw new Error("ไม่พบผู้ใช้");
        let walletBalance = parseFloat(userResult[0].wallet_balance);

        // 2. ดึงรายการทั้งหมดในตะกร้า (pending) และ Lock rows
        const cartItemsSql = `
          SELECT o.id AS order_id, oi.price, oi.quantity, oi.game_id
          FROM orders o
          JOIN order_items oi ON o.id = oi.order_id
          WHERE o.user_id = ? AND o.status = 'pending'
          FOR UPDATE
        `;
        const cartItems: any = await new Promise((resolve, reject) => {
          connection.query(cartItemsSql, [userId], (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });

        if (cartItems.length === 0) {
          throw new Error("ไม่มีสินค้าในตะกร้า");
        }

        // 3. คำนวณราคารวม
        let totalPrice = cartItems.reduce(
          (sum: number, item: any) => sum + item.price * item.quantity,
          0
        );
        let finalPrice = totalPrice;
        let discountPercent = 0;

        // 4. [ถ้ามีโค้ดส่วนลด] ตรวจสอบและคำนวณส่วนลด
        if (discount_code) {
          const codeResult: any = await new Promise((resolve, reject) => {
            connection.query(
              "SELECT * FROM discount_codes WHERE code = ? FOR UPDATE",
              [discount_code],
              (err, results) => (err ? reject(err) : resolve(results))
            );
          });
          if (codeResult.length === 0)
            throw new Error("ไม่พบโค้ดส่วนลดนี้");

          const codeData = codeResult[0];
          // ตรวจสอบวันหมดอายุ
          if (
            codeData.expire_date &&
            new Date(codeData.expire_date) < new Date()
          )
            throw new Error("โค้ดนี้หมดอายุการใช้งานแล้ว");
          // ตรวจสอบจำนวนการใช้
          if (codeData.max_uses > 0 && codeData.used_count >= codeData.max_uses)
            throw new Error("โค้ดนี้ถูกใช้ครบตามจำนวนที่กำหนดแล้ว");
          
          // ตรวจสอบการใช้ซ้ำ (จากโลจิกเดิมของคุณ)
           const usageResult: any = await new Promise((resolve, reject) => {
             connection.query(
               "SELECT COUNT(*) AS usage_count FROM orders WHERE user_id = ? AND discount_code = ? AND status = 'paid'",
               [userId, discount_code],
               (err, results) => (err ? reject(err) : resolve(results))
             );
           });
          
           if (usageResult[0].usage_count > 0 && codeData.max_uses === 1) // สมมติว่า max_uses=1 คือใช้ได้ครั้งเดียว
             throw new Error("คุณได้ใช้โค้ดส่วนลดนี้ไปแล้ว");

          // คำนวณราคาใหม่
          discountPercent = codeData.discount_percent;
          finalPrice = totalPrice * (1 - discountPercent / 100);

          // อัปเดตการใช้โค้ด
          await new Promise((resolve, reject) => {
            connection.query(
              "UPDATE discount_codes SET used_count = used_count + 1 WHERE code = ?",
              [discount_code],
              (err) => (err ? reject(err) : resolve(true))
            );
          });
        }

        // 5. ตรวจสอบ Wallet
        if (walletBalance < finalPrice) {
          throw new Error("ยอดเงินใน Wallet ไม่เพียงพอ");
        }

        // 6. [สำคัญ] แก้ไขสถาปัตยกรรม:
        //    สร้าง Order 'paid' ใหม่ 1 อัน
        //    ย้าย 'order_items' ทั้งหมดไปที่ Order ใหม่
        //    ลบ Order 'pending' เก่าๆ ทิ้ง

        // 6a. สร้าง Order 'paid' ใหม่
        const newOrderSql = `
          INSERT INTO orders (user_id, total_price, discount_code, final_price, status, order_date)
          VALUES (?, ?, ?, ?, 'paid', CURRENT_TIMESTAMP)
        `;
        const newOrderResult: any = await new Promise((resolve, reject) => {
          connection.query(
            newOrderSql,
            [userId, totalPrice, discount_code || null, finalPrice],
            (err, result) => (err ? reject(err) : resolve(result))
          );
        });
        const newOrderId = newOrderResult.insertId;

        // 6b. ย้าย items
        const pendingOrderIds = [
          ...new Set(cartItems.map((item: any) => item.order_id)),
        ];
        await new Promise((resolve, reject) => {
          connection.query(
            "UPDATE order_items SET order_id = ? WHERE order_id IN (?)",
            [newOrderId, pendingOrderIds],
            (err) => (err ? reject(err) : resolve(true))
          );
        });
        
        // 6c. ลบ 'pending' orders เก่า
        await new Promise((resolve, reject) => {
          connection.query(
            "DELETE FROM orders WHERE id IN (?) AND user_id = ?",
            [pendingOrderIds, userId],
            (err) => (err ? reject(err) : resolve(true))
          );
        });

        // 7. อัปเดต Wallet ผู้ใช้
        const newWalletBalance = walletBalance - finalPrice;
        await new Promise((resolve, reject) => {
          connection.query(
            "UPDATE users SET wallet_balance = ? WHERE user_id = ?",
            [newWalletBalance, userId],
            (err) => (err ? reject(err) : resolve(true))
          );
        });

        // 8. Commit
        connection.commit((err) => {
          if (err) throw err;
          connection.release();
          res.status(200).json({
            message: "ชำระเงินสำเร็จ!",
            order_id: newOrderId,
            final_price: finalPrice,
            remaining_balance: newWalletBalance,
          });
        });
      } catch (error: any) {
        connection.rollback(() => {
          connection.release();
          console.error("[Checkout] Error:", error.message);
          res.status(400).json({ message: error.message });
        });
      }
    });
  });
});