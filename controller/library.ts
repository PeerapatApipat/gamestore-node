// controller/library.ts
import express, { Request, Response } from "express";
import { conn } from "../dbconnect";
import { jwtAuthen } from "../jwtauth";

export const router = express.Router();

/**
 * GET /library
 * ดึงรายชื่อเกมทั้งหมดที่ผู้ใช้เป็นเจ้าของ (status = 'paid')
 */
router.get("/", jwtAuthen, (req: any, res: Response) => {
  const userId = req.auth.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const sql = `
    SELECT 
      g.id,
      g.title,
      g.image_url,
      g.description, -- ผมจะใช้ 'description' แทน 'publisher' ที่หายไป
      g.category
      -- g.publisher,  -- คุณไม่มีคอลัมน์นี้
      -- g.size_gb     -- คุณไม่มีคอลัมน์นี้
    FROM games g
    JOIN order_items oi ON g.id = oi.game_id
    JOIN orders o ON oi.order_id = o.id
    WHERE 
      o.user_id = ? 
      AND o.status = 'paid'
      AND o.discount_code != 'TOPUP' -- กันรายการเติมเงิน
    GROUP BY g.id -- ใช้ Group By เพื่อกันการแสดงผลซ้ำ
    ORDER BY g.title ASC
  `;

  conn.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("[GetLibrary] SQL error:", err.message);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
    }
    
    // ส่งข้อมูลเกมทั้งหมดที่ผู้ใช้เป็นเจ้าของ
    res.status(200).json(results);
  });
});