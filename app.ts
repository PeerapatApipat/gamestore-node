import express from "express";
import { router as index } from "./controller/index";
import bodyParser from "body-parser";
import { router as upload } from "./controller/upload";
import { router as login } from "./controller/login";
import { router as register } from "./controller/register";
import { router as newgame } from "./controller/adminnewgame";
import { router as admin } from "./controller/admin";
import { router as editprofile } from "./controller/editprofile";
import { router as updateProfile } from "./controller/updateProfile";
import { router as cloudinary } from "./controller/cloudinaryUpload";
import { router as getgame } from "./controller/getgame";
import { router as deletegame } from "./controller/deletegame";
import { router as getgamebyid } from "./controller/getgamebyid";
import { router as updategame } from "./controller/updategame";
import { router as admintransaction } from "./controller/adminTransaction";
import { router as wallet } from "./controller/wallet";
import { router as topup } from "./controller/topUp";
import { router as transaction } from "./controller/transaction";   
import { router as purchase } from "./controller/purchase";
import { router as adminDiscounts } from "./controller/adminDiscounts";
import { router as cart } from "./controller/cart";
import { router as ranking } from "./controller/ranking";
import { router as addgametocart } from "./controller/addgametocart";
import { router as library } from "./controller/library"; 

import cors from "cors";
import { generateToken, jwtAuthen, secret } from "./jwtauth";
import path from "path/posix";
import { conn } from "./dbconnect";

export const app = express();
app.use(bodyParser.text());
app.use(bodyParser.json());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(jwtAuthen, (err: any, req: any, res: any, next: any) => {
  if (err.name === "UnauthorizedError") {
    res.status(err.status).send({ message: "Token ไม่ถูกต้องหรือหมดอายุ" });
    return;
  }
  next();
});

// Test Token
app.use("/testtoken", (req, res) => {
  const payload: any = { username: "Aj.M" };
  const jwttoken = generateToken(payload, secret);
  res.status(200).json({
    token: jwttoken,
  });
});

app.use("/", index);

// app.use("/upload", upload);
// app.use("/uploads", express.static("uploads"));
// app.use("/upload", express.static(path.join(process.cwd(), "uploads")));


//user
app.use("/customers/login", login);
app.use("/customers/register", register);

app.use("/customers/update-profile", updateProfile);
app.use("/customers/editprofile", editprofile);
app.use("/upload", cloudinary);
app.use("/wallet", wallet);
app.use("/topup", topup);
app.use("/history", transaction);
app.use("/purchase", purchase);

//admin
app.use("/admin", admin);
app.use("/admin/getgame",getgame );
app.use("/admin/newgame", newgame);
app.use("/admin/deletegame", deletegame);
app.use("/admin/getGameById", getgamebyid);
app.use("/admin/updategame", updategame);
app.use("/admin/history", admintransaction);


//ล่าสุด
app.use("/admin/discounts", adminDiscounts);
app.use("/cart", cart);
app.use("/ranking", ranking);
app.use("/addgametocart",addgametocart );
app.use("/library", library);

app.use("/getprofiledata",jwtAuthen, (req, res) => {
  const user_id = req.query.user_id as string;

  //console.log("user_id:", user_id);

  if (!user_id) {
    return res.status(400).json({ error: "กรุณาลองใหม่!!!" });
  }

  const sql = "SELECT * FROM users WHERE user_id = ?";
  conn.query(sql, [user_id], (err, results) => {
    if (err) {
      console.error("SQL error:", err);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "ไม่พบข้อมูลผู้ใช้" });
    }

    res.json(results[0]); // ส่ง user กลับไป 1 คน
  });
});



