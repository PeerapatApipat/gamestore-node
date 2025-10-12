// router/adminTransaction.ts
import express from "express";
import { conn } from "../dbconnect";
import { jwtAuthen } from "../jwtauth";

export const router = express.Router();

// ✅ ดูประวัติธุรกรรมของผู้ใช้ทุกคน (เฉพาะ role = 'user')
router.get("/", jwtAuthen, (req: any, res) => {
  const adminUser = req.auth;

  if (!adminUser || adminUser.role !== "admin") {
    return res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้" });
  }

  const user_id = req.query.user_id;

  // ถ้ามี user_id -> ดึงเฉพาะคนนั้น
  if (user_id) return getSingleUserTransactions(user_id, res);

  // ถ้าไม่มี -> ดึงทุกคน (เฉพาะ role user)
  return getAllUsersWithTransactions(res);
});

// ✅ ฟังก์ชัน: ดึงประวัติของผู้ใช้คนเดียว (เฉพาะ role user)
function getSingleUserTransactions(user_id: string, res: any) {
  const sql = `
    SELECT 
      u.username,
      o.id AS order_id,
      CASE 
        WHEN o.discount_code = 'TOPUP' THEN 'เติมเงิน'
        ELSE 'ซื้อเกม'
      END AS type,
      o.final_price AS amount,
      o.order_date AS date,
      o.status,
      COALESCE(GROUP_CONCAT(g.title SEPARATOR ', '), 'Top-up') AS games
    FROM users u
    LEFT JOIN orders o ON u.user_id = o.user_id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN games g ON oi.game_id = g.id
    WHERE u.user_id = ? AND u.role = 'user'
    GROUP BY o.id
    ORDER BY o.order_date DESC
  `;

  conn.query(sql, [user_id], (err, results) => {
    if (err) {
      console.error("[AdminTransaction] SQL error:", err.message);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
    }

    if (!results || results.length === 0) {
      return res.json({
        username: null,
        transactions: [],
        message: "ไม่พบประวัติธุรกรรมของผู้ใช้นี้",
      });
    }

    res.json({
      username: results[0].username,
      transactions: results.map((r: any) => ({
        order_id: r.order_id,
        type: r.type,
        amount: r.amount,
        date: r.date,
        status: r.status,
        games: r.games,
      })),
    });
  });
}

// ✅ ฟังก์ชัน: ดึงประวัติของผู้ใช้ทุกคน (role = 'user')
function getAllUsersWithTransactions(res: any) {
  const sql = `
    SELECT 
      u.user_id,
      u.username,
      o.id AS order_id,
      CASE 
        WHEN o.discount_code = 'TOPUP' THEN 'เติมเงิน'
        ELSE 'ซื้อเกม'
      END AS type,
      o.final_price AS amount,
      o.order_date AS date,
      o.status,
      COALESCE(GROUP_CONCAT(g.title SEPARATOR ', '), 'Top-up') AS games
    FROM users u
    LEFT JOIN orders o ON u.user_id = o.user_id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN games g ON oi.game_id = g.id
    WHERE u.role = 'user'
    GROUP BY o.id, u.user_id
    ORDER BY u.username ASC, o.order_date DESC
  `;

  conn.query(sql, (err, results) => {
    if (err) {
      console.error("[AdminTransaction] SQL error:", err.message);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
    }

    if (!results || results.length === 0) {
      return res.json({ message: "ไม่พบข้อมูลธุรกรรมของผู้ใช้ทั่วไป" });
    }

    // ✅ รวมธุรกรรมตามชื่อผู้ใช้
    const userMap: any = {};
    results.forEach((row: any) => {
      if (!userMap[row.username]) {
        userMap[row.username] = [];
      }
      userMap[row.username].push({
        order_id: row.order_id,
        type: row.type,
        amount: row.amount,
        date: row.date,
        status: row.status,
        games: row.games,
      });
    });

    // แปลงเป็น array
    const usersWithTransactions = Object.keys(userMap).map((username) => ({
      username,
      transactions: userMap[username],
    }));

    res.json({
      total_users: usersWithTransactions.length,
      users: usersWithTransactions,
    });
  });
}
