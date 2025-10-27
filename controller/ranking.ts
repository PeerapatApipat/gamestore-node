import express, { Request, Response } from "express";
import { conn } from "../dbconnect";

export const router = express.Router();

router.get("/", (req: Request, res: Response) => {
  const rankingLimit = 10;

  const sql = `
    SELECT
      g.id AS game_id,
      g.title,
      g.image_url,
      g.price,
      SUM(oi.quantity) AS total_sold
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN games g ON oi.game_id = g.id
    WHERE o.status = 'paid'
    GROUP BY g.id, g.title, g.image_url, g.price
    ORDER BY total_sold DESC
    LIMIT ?;
  `;

  conn.query(sql, [rankingLimit], (err, results) => {
    if (err) {
      console.error("[Bestsellers] SQL error:", err.message);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
    }

    // ส่งข้อมูลเกมที่ขายดีที่สุด 10 อันดับกลับไป
    res.json(results);
  });
});
