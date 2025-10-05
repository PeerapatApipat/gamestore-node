import express, { Request, Response } from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import bcrypt from "bcrypt";
import { FileMiddleware } from "./upload";
import { jwtAuthen } from "../jwtauth";

import axios from "axios";
import FormData from "form-data";
import fs from "fs";
export const router = express.Router();
const fileUpload = new FileMiddleware();

router.put("/", jwtAuthen, async (req, res) => {
  const { userId } = req.body;
  const { username } = req.body;
  console.log("user_id /editprofile:", userId);
  console.log("username:", username);
  if (!username) return res.status(400).json({ success: false, message: "ไม่มีชื่อใหม่" });

  const sql = `UPDATE users SET username = ? WHERE user_id = ?`;
  await conn.query(sql, [username, userId]);

  conn.query("SELECT * FROM users WHERE user_id = ?", [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในระบบ" });
    }
    res.json(results[0]);
  });           
});
