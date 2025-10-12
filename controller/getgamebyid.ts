import express, { Request, Response } from "express";
import { conn } from "../dbconnect";

import { FileMiddleware } from "./upload";
import { jwtAuthen } from "../jwtauth";


export const router = express.Router();
const fileUpload = new FileMiddleware();

router.post("/", jwtAuthen, async (req, res) => {
 const { id } = req.body; 
  if (!id) return res.status(400).json({ error: "กรุณาส่ง id" });

  const sql = "SELECT * FROM games WHERE id = ?";
  conn.query(sql, [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "ไม่พบเกม" });
    }

    res.json(results[0]); 
  });
  
});
