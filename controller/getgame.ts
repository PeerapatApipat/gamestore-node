import express, { Request, Response } from "express";
import { conn } from "../dbconnect";

import { FileMiddleware } from "./upload";
import { jwtAuthen } from "../jwtauth";


export const router = express.Router();
const fileUpload = new FileMiddleware();

router.get("/", jwtAuthen, async (req, res) => {


 

  const sql = "SELECT * FROM games ";
  conn.query(sql, (err, results) => {
    if (err) {
      console.error("SQL error:", err);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "ไม่พบเกม" });
    }

    res.json(results); 
  });    
});
