import express from "express";
import { conn } from "../dbconnect";

export const router = express.Router();

router.post("/", (req, res) => {
  const { user_id, wallet } = req.body;

  if (!user_id || !wallet || wallet <= 0) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง" });
  }

  conn.getConnection((err, connection) => {
    if (err)
      return res.status(500).json({ message: "Database connection error" });

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ message: "Transaction error" });
      }

      // 1️⃣ อัปเดต wallet_balance
      const updateWallet =
        "UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?";
      connection.query(updateWallet, [wallet, user_id], (err) => {
        if (err) {
          return connection.rollback(() => {
            connection.release();
            res.status(500).json({ message: "Update wallet error" });
          });
        }

        // 2️⃣ สร้าง order สำหรับ top-up
        const insertOrder =
          "INSERT INTO orders (user_id, total_price, discount_code, final_price, status) VALUES (?, ?, 'TOPUP', ?, 'paid')";
        connection.query(insertOrder, [user_id, wallet, wallet], (err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ message: "Insert top-up order error" });
            });
          }

          // 3️ commit transaction
          connection.commit((err) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({ message: "Commit error" });
              });
            }

            connection.release();
            console.log(`[TopUp] User ${user_id} topped up ${wallet} THB`);
            res.json({
              message: "เติมเงินสำเร็จ",
              user_id,
              added_amount: wallet,
            });
          });
        });
      });
    });
  });
});
