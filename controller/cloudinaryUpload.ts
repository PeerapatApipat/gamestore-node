import express from "express";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { FileMiddleware } from "../FileMiddleware";

dotenv.config();

export const router = express.Router();
const fileUpload = new FileMiddleware();


cloudinary.config({
  cloud_name: "dv9qa6uvq",
  api_key: "329658412267187",
  api_secret: "wnbdyC0msc_5t5i-DeIg0HDFYDU",
});

router.post("/", fileUpload.diskLoader.single("file"), async (req, res) => {
  // console.log("📂 Received file:", api_key.file);
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    console.log("📂 Uploading to Cloudinary:", req.file.path);

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "uploads",
      use_filename: true,
      unique_filename: false,
    });

    fs.unlinkSync(req.file.path);

    res.json({
      message: "Uploaded successfully",
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (err) {
    console.error("Upload failed:", err);
    res.status(500).json({ error: "Cloudinary upload failed" });
  }
});
