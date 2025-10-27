// routes/purchase.ts (แก้ไขเป็น "Add to Cart")
import express from "express";
import { conn } from "../dbconnect";
import { jwtAuthen } from "../jwtauth";

export const router = express.Router();

// แก้ไข: เปลี่ยนจาก "ซื้อ" เป็น "เพิ่มเกมลงในตะกร้า"
router.post("/", jwtAuthen, (req: any, res) => {
  const authData = req.auth;
  const userId = authData?.userId;
  // ลบ discount_code ออกจาก req.body เพราะเราจะใช้ตอน checkout
  const { games } = req.body;

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

        // [คงเดิม] ตรวจสอบเกมซ้ำในคลัง (ที่เคยซื้อแล้ว)
        const ownedGamesQuery = `
          SELECT oi.game_id 
          FROM order_items oi 
          JOIN orders o ON oi.order_id = o.id 
          WHERE o.user_id = ? 
          AND o.status = 'paid' 
          AND oi.game_id IN (?)
        `;

        // [คงเดิม] ตรวจสอบเกมซ้ำในตะกร้า (pending)
        // โลจิกนี้หมายความว่า ถ้าเกมอยู่ในตะกร้าอื่น (pending) แล้ว จะเพิ่มไม่ได้
        const chechGamesQuery = `
          SELECT oi.game_id 
          FROM order_items oi 
          JOIN orders o ON oi.order_id = o.id 
          WHERE o.user_id = ? 
          AND o.status = 'pending' 
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

        const chechGames: any = await new Promise((resolve, reject) => {
          connection.query(
            chechGamesQuery,
            [userId, gameIds],
            (err, results) => {
              if (err) reject(err);
              else resolve(results);
            }
          );
        });

        if (ownedGames.length > 0) {
          const ownedGameId = ownedGames[0].game_id;
          throw new Error(
            `คุณมีเกม ID: ${ownedGameId} อยู่ในคลังแล้ว ไม่สามารถเพิ่มลงตะกร้าได้`
          );
        }
        if (chechGames.length > 0) {
          const ownedcartGameId = chechGames[0].game_id;
          throw new Error(
            `คุณเพิ่มเกม ID: ${ownedcartGameId} ลงในตะกร้าเเล้ว`
          );
        }

        // [ลบออก] ไม่จำเป็นต้องดึง wallet_balance มาตรวจสอบ
        // const userRow: any = ...

        // [คงเดิม] ดึงข้อมูลเกมและราคา
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

        // [ลบออก] ลบตรรกะการตรวจสอบและใช้ discount_code ทั้งหมด
        // if (discount_code) { ... }
        // ...
        // const updateCodeResult: any = ...

        // [แก้ไข] สร้าง Order ใหม่โดยกำหนด status = 'pending'
        // และให้ final_price เท่ากับ total_price ไปก่อน
        const orderResult: any = await new Promise((resolve, reject) => {
          connection.query(
            "INSERT INTO orders (user_id, total_price, discount_code, final_price, status) VALUES (?, ?, ?, ?, 'pending')",
            [userId, totalPrice, null, totalPrice], // discount_code เป็น null, status เป็น 'pending'
            (err, result) => (err ? reject(err) : resolve(result))
          );
        });

        const orderId = orderResult.insertId;

        // [คงเดิม] เพิ่มรายการเกมลงใน order_items
        for (const g of games) {
          await new Promise((resolve, reject) => {
            connection.query(
              "INSERT INTO order_items (order_id, game_id, quantity, price) VALUES (?, ?, ?, ?)",
              [orderId, g.game_id, g.quantity, gameMap[g.game_id]],
              (err) => (err ? reject(err) : resolve(true))
            );
          });
        }

        // [ลบออก] ลบตรรกะการอัปเดต wallet_balance
        // await new Promise(...)

        // [คงเดิม] Commit transaction
        connection.commit((err) => {
          if (err) {
            connection.rollback(() => connection.release());
            return res.status(500).json({ message: "Commit error" });
          }
          console.log("🛒 Transaction Commit สำเร็จ! เพิ่มลงตะกร้าเรียบร้อย");
          connection.release();
          res.json({
            message: "เพิ่มเกมลงในตะกร้าสำเร็จ", // แก้ไขข้อความตอบกลับ
            userId: userId,
            order_id: orderId, // นี่คือ ID ของตะกร้า (pending order)
            total_price: totalPrice,
          });
        });
      } catch (error: any) {
        connection.rollback(() => connection.release());
        console.error("เกิดข้อผิดพลาดใน try-catch block:", error.message);
        res.status(400).json({ message: error.message });
      }
    });
  });
});