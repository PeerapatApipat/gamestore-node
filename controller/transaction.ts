// router/transaction.ts
import express from "express";
import { conn } from "../dbconnect";

export const router = express.Router();

// ดูประวัติ transaction ของ user
router.get("/", (req: any, res) => {
  const user_id = req.query.user_id;
  console.log("[Transaction] Request received for user_id:", user_id);

  if (!user_id) {
    console.warn("[Transaction] Missing user_id in query");
    return res.status(400).json({ error: "User ID ไม่ถูกต้อง" });
  }

  const sql = `
  SELECT 
    o.id AS order_id,
    CASE 
      WHEN o.discount_code = 'TOPUP' THEN 'topup'
      ELSE 'purchase'
    END AS type,
    o.final_price AS amount,
    o.order_date AS date,
    o.status,
    COALESCE(
      GROUP_CONCAT(g.title SEPARATOR ', '),
      CASE WHEN o.discount_code = 'TOPUP' THEN 'Top-up' ELSE '' END
    ) AS games
  FROM orders o
  LEFT JOIN order_items oi ON o.id = oi.order_id
  LEFT JOIN games g ON oi.game_id = g.id
  WHERE o.user_id = ?
  GROUP BY o.id
  ORDER BY o.order_date DESC
`;

  conn.query(sql, [user_id], (err, results) => {
    if (err) {
      console.error("[Transaction] SQL error:", err.message);
      return res
        .status(500)
        .json({ error: "เกิดข้อผิดพลาดในระบบ", detail: err.message });
    }

    if (!results || results.length === 0) {
      console.info(
        `[Transaction] No transaction found for user_id: ${user_id}`
      );
      return res.json({ message: "ไม่พบประวัติการทำรายการ", transactions: [] });
    }

    console.log(
      `[Transaction] Found ${results.length} transaction(s) for user_id: ${user_id}`
    );
    res.json({ transactions: results });
  });
});
