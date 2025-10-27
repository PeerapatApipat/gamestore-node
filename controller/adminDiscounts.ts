import express, { Request, Response } from "express";
import { conn } from "../dbconnect"; // Import ฐานข้อมูล
import { DiscountCode } from "../model/discountCode"; // Import model ที่คุณมีอยู่แล้ว

export const router = express.Router();

// ดูโค้ดส่วนลดทั้งหมด
// GET /admin/discounts
router.get("/", (req: Request, res: Response) => {
  const sql = "SELECT * FROM discount_codes ORDER BY id DESC";
  conn.query(sql, (err, results) => {
    if (err) {
      console.error("[AdminDiscounts GET] SQL error:", err.message);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
    }
    res.json(results);
  });
});

// เพิ่มโค้ดส่วนลดใหม่
// POST /admin/discounts
router.post("/", (req: Request, res: Response) => {
  const newCode: DiscountCode = req.body;

  // ตรวจสอบข้อมูล
  if (
    !newCode.code ||
    !newCode.discount_percent ||
    !newCode.max_uses ||
    !newCode.expire_date
  ) {
    return res.status(400).json({
      message:
        "กรุณากรอกข้อมูลให้ครบ: code, discount_percent, max_uses, expire_date",
    });
  }

  const sql =
    "INSERT INTO discount_codes (code, discount_percent, max_uses, expire_date, used_count) VALUES (?, ?, ?, ?, 0)";

  conn.query(
    sql,
    [
      newCode.code,
      newCode.discount_percent,
      newCode.max_uses,
      newCode.expire_date,
    ],
    (err, result) => {
      if (err) {
        console.error("[AdminDiscounts POST] SQL error:", err.message);
        // ตรวจสอบว่าโค้ดซ้ำหรือไม่
        if ((err as any).code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ message: "โค้ดส่วนลดนี้มีอยู่ในระบบแล้ว" });
        }
        return res.status(500).json({ error: "เกิดข้อผิดพลาดในการสร้างโค้ด" });
      }
      res
        .status(201)
        .json({ message: "สร้างโค้ดส่วนลดสำเร็จ", id: result.insertId });
    }
  );
});

// แก้ไขโค้ดส่วนลด
// PUT /admin/discounts/:id
router.put("/:id", (req: Request, res: Response) => {
  // TODO: ควรมีการตรวจสอบสิทธิ์ Admin ที่นี่ก่อน

  const codeId = req.params.id;
  const updatedCode: DiscountCode = req.body;

  if (
    !updatedCode.code ||
    !updatedCode.discount_percent ||
    !updatedCode.max_uses ||
    !updatedCode.expire_date
  ) {
    return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }

  const sql =
    "UPDATE discount_codes SET code = ?, discount_percent = ?, max_uses = ?, expire_date = ? WHERE id = ?";

  conn.query(
    sql,
    [
      updatedCode.code,
      updatedCode.discount_percent,
      updatedCode.max_uses,
      updatedCode.expire_date,
      codeId,
    ],
    (err, result) => {
      if (err) {
        console.error("[AdminDiscounts PUT] SQL error:", err.message);
        return res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตโค้ด" });
      }
      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "ไม่พบโค้ดส่วนลดที่ต้องการแก้ไข" });
      }
      res.json({ message: "อัปเดตโค้ดส่วนลดสำเร็จ" });
    }
  );
});

// ลบโค้ดส่วนลด
// DELETE /admin/discounts/:id
router.delete("/:id", (req: Request, res: Response) => {
  // TODO: ควรมีการตรวจสอบสิทธิ์ Admin ที่นี่ก่อน

  const codeId = req.params.id;
  const sql = "DELETE FROM discount_codes WHERE id = ?";

  conn.query(sql, [codeId], (err, result) => {
    if (err) {
      console.error("[AdminDiscounts DELETE] SQL error:", err.message);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบโค้ด" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบโค้ดส่วนลดที่ต้องการลบ" });
    }
    res.json({ message: "ลบโค้ดส่วนลดสำเร็จ" });
  });
});
