// 📁 routes/purchase.ts
import express from "express";
import { conn } from "../dbconnect";
import { jwtAuthen } from "../jwtauth";

export const router = express.Router();

// 💳 ซื้อเกม (ตัดเงินจาก Wallet)
router.post("/", jwtAuthen, (req: any, res) => {
  const authData = req.auth;
  const userId = authData?.userId;
  const { games, discount_code } = req.body;

  if (!userId || !games || !Array.isArray(games) || games.length === 0) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง" });
  }

  conn.getConnection((err, connection) => {
    if (err)
      return res.status(500).json({ message: "Database connection error" });

    connection.beginTransaction(async (err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ message: "Transaction error" });
      }

      try {
        const gameIds = games.map((g: any) => g.game_id);

        //เกมซ้ำ
        const ownedGamesQuery = `
          SELECT oi.game_id 
          FROM order_items oi 
          JOIN orders o ON oi.order_id = o.id 
          WHERE o.user_id = ? 
          AND o.status = 'paid' 
          AND oi.game_id IN (?)
        `;

        const ownedGames: any = await new Promise((resolve, reject) => {
          connection.query(
            ownedGamesQuery,
            [userId, gameIds],
            (err, results) => {
              if (err) reject(err);
              else resolve(results);
            }
          );
        });

        if (ownedGames.length > 0) {
          const ownedGameId = ownedGames[0].game_id;
          // หยุดการทำงานทันทีถ้าเจอเกมที่เคยซื้อแล้ว
          throw new Error(
            `คุณมีเกม ID: ${ownedGameId} อยู่ในคลังแล้ว ไม่สามารถซื้อซ้ำได้`
          );
        }

        const userRow: any = await new Promise((resolve, reject) => {
          connection.query(
            "SELECT username, wallet_balance FROM users WHERE user_id = ? FOR UPDATE",
            [userId],
            (err, results) => {
              if (err) reject(err);
              else resolve(results[0]);
            }
          );
        });

        if (!userRow) throw new Error("ไม่พบผู้ใช้");

        const username = userRow.username;
        let walletBalance = parseFloat(userRow.wallet_balance);

        const gameRows: any = await new Promise((resolve, reject) => {
          connection.query(
            `SELECT id, price FROM games WHERE id IN (?)`,
            [gameIds],
            (err, results) => {
              if (err) reject(err);
              else resolve(results);
            }
          );
        });

        let totalPrice = 0;
        const gameMap: any = {};
        gameRows.forEach((g: any) => (gameMap[g.id] = g.price));

        games.forEach((g: any) => {
          const price = gameMap[g.game_id];
          if (!price) throw new Error(`ไม่พบเกม id ${g.game_id}`);
          totalPrice += price * g.quantity;
        });

        let finalPrice = totalPrice;
        if (discount_code) {
          const discountRow: any = await new Promise((resolve, reject) => {
            connection.query(
              "SELECT discount_percent, max_uses, used_count, expire_date FROM discount_codes WHERE code = ?",
              [discount_code],
              (err, results) => {
                if (err) reject(err);
                else resolve(results[0] || null);
              }
            );
          });

          if (discountRow) {
            const today = new Date();
            const expireDate = new Date(discountRow.expire_date);
            if (discountRow.expire_date && today > expireDate) {
              throw new Error("โค้ดส่วนลดหมดอายุ");
            }
            if (
              discountRow.max_uses &&
              discountRow.used_count >= discountRow.max_uses
            ) {
              throw new Error("โค้ดส่วนลดถูกใช้ครบแล้ว");
            }

            finalPrice = finalPrice * (1 - discountRow.discount_percent / 100);

            await new Promise((resolve, reject) => {
              connection.query(
                "UPDATE discount_codes SET used_count = used_count + 1 WHERE code = ?",
                [discount_code],
                (err) => (err ? reject(err) : resolve(true))
              );
            });
          }
        }

        if (walletBalance < finalPrice) {
          throw new Error("ยอดเงินใน Wallet ไม่เพียงพอ");
        }

        const remainingBalance = walletBalance - finalPrice;
        console.log(`
          --- 📝 สรุปรายการซื้อ ---
          👤 ชื่อผู้ซื้อ: ${username} (ID: ${userId})
          💰 ยอดเงินเริ่มต้น: ${walletBalance.toFixed(2)} บาท
          💸 ยอดที่ต้องชำระ: ${finalPrice.toFixed(2)} บาท
          💵 ยอดเงินคงเหลือ: ${remainingBalance.toFixed(2)} บาท
          --------------------------
        `);

        const orderResult: any = await new Promise((resolve, reject) => {
          connection.query(
            "INSERT INTO orders (user_id, total_price, discount_code, final_price, status) VALUES (?, ?, ?, ?, 'paid')",
            [userId, totalPrice, discount_code || null, finalPrice],
            (err, result) => (err ? reject(err) : resolve(result))
          );
        });

        const orderId = orderResult.insertId;

        for (const g of games) {
          await new Promise((resolve, reject) => {
            connection.query(
              "INSERT INTO order_items (order_id, game_id, quantity, price) VALUES (?, ?, ?, ?)",
              [orderId, g.game_id, g.quantity, gameMap[g.game_id]],
              (err) => (err ? reject(err) : resolve(true))
            );
          });
        }

        await new Promise((resolve, reject) => {
          connection.query(
            "UPDATE users SET wallet_balance = wallet_balance - ? WHERE user_id = ?",
            [finalPrice, userId],
            (err) => (err ? reject(err) : resolve(true))
          );
        });

        connection.commit((err) => {
          if (err) {
            connection.rollback(() => connection.release());
            return res.status(500).json({ message: "Commit error" });
          }
          console.log("🎉 Transaction Commit สำเร็จ! การซื้อเสร็จสมบูรณ์");
          connection.release();
          res.json({
            message: "ซื้อเกมสำเร็จ",
            userId: userId,
            order_id: orderId,
            total_price: totalPrice,
            final_price: finalPrice,
            remaining_balance: remainingBalance,
          });
        });
      } catch (error: any) {
        connection.rollback(() => connection.release());
        console.error("❌ เกิดข้อผิดพลาดใน try-catch block:", error.message);
        res.status(400).json({ message: error.message });
      }
    });
  });
});
