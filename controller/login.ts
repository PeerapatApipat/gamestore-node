import express from "express";
import bcrypt from "bcrypt";

import { conn } from "../dbconnect";
import { generateToken, secret } from "../jwtauth";
import { User } from "../model/user";

export const router = express.Router();

//customers/login
router.post("/", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "กรุณากรอกอีเมลและรหัสผ่าน" });
  }

  const sql = "SELECT * FROM users WHERE email = ?";
  conn.query(sql, [email], async (err, rows) => {
    if (err) return res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });

    if (rows.length === 0) {
      return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    const user = rows[0] as User;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    const token = generateToken(
      { userId: user.user_id, email: user.email, role: user.role },
      secret
    );

    res.status(200).json({
      message: "เข้าสู่ระบบสำเร็จ",
      user: user,
      token: token,
    });
  });
});
