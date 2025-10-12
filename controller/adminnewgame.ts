import express from "express";
import { games } from "../model/game";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { FileMiddleware } from "../FileMiddleware";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";
import { jwtAuthen } from "../jwtauth";

export const router = express.Router();
const fileUpload = new FileMiddleware();
dotenv.config();

router.post(
  "/",
  jwtAuthen,
  fileUpload.diskLoader.single("profile_image"),
  async (req, res) => {
    try {
      const game: games = req.body;

      // 1. ตรวจสอบข้อมูลเบื้องต้น
      if (!game.title || !game.price) {
        return res.status(400).json({
          error: "กรุณากรอก Title และ Price ให้ครบถ้วน",
        });
      }

      // 2. ตรวจสอบว่ามีชื่อเกมซ้ำหรือไม่
      const checkSql = "SELECT * FROM games WHERE title = ?";
      conn.query(checkSql, [game.title], async (err, rows) => {
        if (err) {
          console.error("Check duplicate error:", err);
          return res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
        }

        if (rows.length > 0) {
          return res.status(400).json({ error: "ชื่อเกมนี้มีอยู่แล้ว" });
        }

        // 3. อัปโหลดรูปภาพ (ถ้ามี)
        let profileImageURL: string | null = null;
        if (req.file) {
          try {
            const result = await cloudinary.uploader.upload(req.file.path, {
              folder: "game_images", // เปลี่ยน folder เพื่อความชัดเจน
              use_filename: true,
              unique_filename: false,
            });
            profileImageURL = result.secure_url;
            fs.unlinkSync(req.file.path);
          } catch (uploadError) {
            console.error("Cloudinary upload error:", uploadError);
            return res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ" });
          }
        }

      if (game.release_date === undefined || game.release_date === null) {
         const sql = `
          INSERT INTO games
            (title, price, image_url, category,description, bestseller_rank)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        const values = [
          game.title,
          parseFloat(game.price.toString()),
          profileImageURL, // จะเป็น URL หรือ null ก็ได้
          game.category ?? null,
          game.description ?? null,
          (game.bestseller_rank !== undefined && game.bestseller_rank !== null)
            ? parseInt(game.bestseller_rank.toString())
            : null,
        ];

        const formattedSql = mysql.format(sql, values);
        console.log("Executing SQL:", formattedSql);

        // 5. บันทึกข้อมูลลงฐานข้อมูล
        conn.query(formattedSql, (err, result) => {
          if (err) {
            console.error("Database INSERT Error:", err);
            return res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
          }

          res.status(201).json({
            message: "เพิ่มเกมสำเร็จ",
            gameId: result.insertId,
            profile_image: profileImageURL,
          });
        });
      }
      else{
         const sql = `
          INSERT INTO games
            (title, price, image_url, category, release_date, description, bestseller_rank)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
          game.title,
          parseFloat(game.price.toString()),
          profileImageURL, // จะเป็น URL หรือ null ก็ได้
          game.category ?? null,
          game.release_date ?? null,
          game.description ?? null,
          (game.bestseller_rank !== undefined && game.bestseller_rank !== null)
            ? parseInt(game.bestseller_rank.toString())
            : null,
        ];

        const formattedSql = mysql.format(sql, values);
        console.log("Executing SQL:", formattedSql);

        // 5. บันทึกข้อมูลลงฐานข้อมูล
        conn.query(formattedSql, (err, result) => {
          if (err) {
            console.error("Database INSERT Error:", err);
            return res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
          }

          res.status(201).json({
            message: "เพิ่มเกมสำเร็จ",
            gameId: result.insertId,
            profile_image: profileImageURL,
          });
        });
      }
       




      });
    } 
    
    catch (error) {
      console.error("Overall catch error:", error);
      res.status(500).json({ error: `เกิดข้อผิดพลาด: ${(error as Error).message}` });
    }
  }
);