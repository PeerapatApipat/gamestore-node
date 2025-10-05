import express from "express";
import bcrypt from "bcrypt";
import { User } from "../model/user";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { FileMiddleware } from "./upload";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import { generateToken, secret } from "../jwtauth";
export const router = express.Router();
import { jwtAuthen } from "../jwtauth";


// router.get("/getprofiledata",jwtAuthen, (req, res) => {
//   const user_id = req.query.user_id as string;

//   console.log("user_id:", user_id);

//   if (!user_id) {
//     return res.status(400).json({ error: "กรุณาลองใหม่!!!" });
//   }

//   const sql = "SELECT * FROM users WHERE user_id = ?";
//   conn.query(sql, [user_id], (err, results) => {
//     if (err) {
//       console.error("SQL error:", err);
//       return res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
//     }

//     if (results.length === 0) {
//       return res.status(404).json({ error: "ไม่พบข้อมูลผู้ใช้" });
//     }

//     res.json(results[0]); // ส่ง user กลับไป 1 คน
//   });
// });
