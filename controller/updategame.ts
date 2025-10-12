import express from "express";
import { conn } from "../dbconnect";
import { FileMiddleware } from "../FileMiddleware";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";
import { jwtAuthen } from "../jwtauth";

export const router = express.Router();
const fileUpload = new FileMiddleware();
dotenv.config();

router.put("/", jwtAuthen, 
    fileUpload.diskLoader.single("game_images")
    , async (req, res) => {
  try {
    const {
      id,
      title,
      price,
      description,
      category,
      release_date,
      bestseller_rank
    } = req.body;

    console.log("Received data:", req.body);
    if (!id || !title || !price || !release_date) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบ" });
    }

    let image_url: string | null = null;

    // ถ้ามีไฟล์รูปภาพใหม่ ให้ upload ขึ้น Cloudinary
    if (req.file) {
      try {

        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "game_images",
          use_filename: true,
          unique_filename: false,
        });
        image_url = result.secure_url;
        fs.unlinkSync(req.file.path); // ลบไฟล์ temp หลัง upload
        
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ" });
      }
    }

    // SQL สำหรับ UPDATE
    let sql = "UPDATE games SET title = ?, price = ?, description = ?, category = ?, release_date = ?, bestseller_rank = ?";
    const params: any[] = [title, price, description || "", category || "", release_date, bestseller_rank || null];

    if (image_url) {
      sql += ", image_url = ?";
      params.push(image_url);
    }

    sql += " WHERE id = ?";
    params.push(id);

    conn.query(sql, params, (err, result) => {
      if (err) {
        console.error("SQL error:", err);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
      }

      res.json({ message: "อัปเดตเกมเรียบร้อย", result });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});
