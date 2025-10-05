import express from "express";
import bcrypt from "bcrypt";
import { User } from "../model/user";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { FileMiddleware } from "../FileMiddleware";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

import FormData from "form-data"; 
import fs from "fs";
export const router = express.Router();
const fileUpload = new FileMiddleware();
dotenv.config();



//customers/register
router.post(
  "/",
  fileUpload.diskLoader.single("profile_image"),
  async (req, res) => {
    try {
      const user: User = req.body;

      if (!user.username || !user.email || !user.password) {
        return res.status(400).json({
          error: "กรุณากรอก Username, Email และ Password ให้ครบถ้วน",
        });
      }

      const checkSql = "SELECT * FROM users WHERE email = ? OR username = ?";
      conn.query(checkSql, [user.email, user.username], async (err, rows) => {
        if (err) return res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });

        if (rows.length > 0) {
          const existingUser = rows[0];
          if (existingUser.email === user.email) {
            return res.status(400).json({ error: "อีเมลนี้ถูกใช้งานแล้ว" });
          }
          if (existingUser.username === user.username) {
            return res.status(400).json({ error: "Username นี้ถูกใช้งานแล้ว" });
          }
        }

        const hashedPassword = await bcrypt.hash(user.password, 10);

        let profileImageURL: string | null = null;

        if (req.file) {
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "profile_images",
            use_filename: true,
            unique_filename: false,
          });
          profileImageURL = result.secure_url;
          fs.unlinkSync(req.file.path);
        }
        const sql = `
  INSERT INTO users
  (username, email, password, profile_image, role, wallet_balance, created_at)
  VALUES (?, ?, ?, ?, ?, ?, NOW())
`;
        const formattedSql = mysql.format(sql, [
          user.username,
          user.email,
          hashedPassword,
          profileImageURL,
          user.role || "user",
          user.wallet_balance || 0.0,
        ]);

          console.log("formattedSql:", formattedSql);
          console.log("sql:", sql);
          console.log("user:",           user.username
);
          console.log("profile url:", profileImageURL);


          conn.query(formattedSql, (err, result) => {
          if (err)
            return res
              .status(500)
              .json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });

          res.status(201).json({
            message: "ลงทะเบียนสำเร็จ",
            userId: result.insertId,
            profile_image: profileImageURL,
          });
        });
      });
    } catch (error) {
      res
        .status(500)
        .json({ error: `เกิดข้อผิดพลาด: ${(error as Error).message}` });
    }
  }
);