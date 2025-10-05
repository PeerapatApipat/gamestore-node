import express, { Request, Response } from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import bcrypt from "bcrypt";
import { FileMiddleware } from "../FileMiddleware";
import { jwtAuthen } from "../jwtauth";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
export const router = express.Router();
const fileUpload = new FileMiddleware();


// router.put("/:id",jwtAuthen,fileUpload.diskLoader.single("profile_image"),
//   async (req, res) => {
//     try {
//       const id = +req.params.id;
//       const user = req.body;

//       let profileImageURL: string | undefined = undefined;
//       if (req.file) {
//         const form = new FormData();
//         form.append("file", fs.createReadStream(req.file.path));

//         const response = await axios.post(
//           "https://api-upload-image.onrender.com/upload",
//           form,
//           { headers: form.getHeaders() }
//         );

//         profileImageURL = `https://api-upload-image.onrender.com/upload/${response.data.filename}`;
//       }
//       const updates: any = {
//         username: user.username,
//         profile_image: profileImageURL,
//       };

//       if (user.password) {
//         updates.password = await bcrypt.hash(user.password, 10);
//       }
//       Object.keys(updates).forEach(
//         (key) => updates[key] === undefined && delete updates[key]
//       );

//       const setSql = Object.keys(updates)
//         .map((key) => `\`${key}\` = ?`)
//         .join(", ");
//       const values = [...Object.values(updates), id];
//       const sql = mysql.format(
//         `UPDATE users SET ${setSql} WHERE user_id = ?`,
//         values
//       );
//       conn.query(sql, (err, result) => {
//         if (err) return res.status(500).json({ message: "อัปเดตไม่สำเร็จ" });

//         res.status(200).json({
//           message: "อัปเดตสำเร็จ",
//           affectedRows: result.affectedRows,
//         });
//       });
//     } catch (error) {}
//   }
// );



// ✅ อัปเดตรูปภาพเท่านั้น
// router.put("/", jwtAuthen, fileUpload.diskLoader.single("profile_image"), async (req, res) => {
//   try {
//     const userId = req.body.userId;

//     if (!userId) {
//       return res.status(400).json({ message: "กรุณาส่ง userId มาด้วย" });
//     }

//     if (!req.file) {
//       return res.status(400).json({ message: "กรุณาอัปโหลดรูปภาพ" });
//     }

//     // ส่งไฟล์ไป API Upload
//     const form = new FormData();
//     form.append("file", fs.createReadStream(req.file.path));

//     const uploadResponse = await axios.post(
//       "https://api-upload-image.onrender.com/upload",
//       form,
//       { headers: form.getHeaders() }
//     );

//     const imageUrl = `https://api-upload-image.onrender.com/upload/${uploadResponse.data.filename}`;

//     // อัปเดตเฉพาะ profile_image ในฐานข้อมูล
//     const sql = mysql.format(`UPDATE users SET profile_image = ? WHERE user_id = ?`, [
//       imageUrl,
//       userId,
//     ]);

//     conn.query(sql, (err, result) => {
//       if (err) {
//         console.error(err);
//         return res.status(500).json({ message: "อัปเดตรูปไม่สำเร็จ" });
//       }

//       res.status(200).json({
//         message: "อัปเดตรูปเรียบร้อย",
//         profile_image: imageUrl,
//       });
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "เกิดข้อผิดพลาด" });
//   }
// });

router.put(
  "/",
  jwtAuthen,
  fileUpload.diskLoader.single("profile_image"),
  async (req: Request, res: Response) => {
    try {
     const userId = req.body.userId;

      if (!req.file) {
        return res.status(400).json({ message: "กรุณาอัปโหลดรูปภาพ" });
      }

      // อัปโหลดไป Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "profile_images",
        use_filename: true,
        unique_filename: false,
      });

      const profileImageURL = result.secure_url;

      // ลบไฟล์ temp หลังอัปโหลด
      fs.unlinkSync(req.file.path);

      // อัปเดตเฉพาะ profile_image
      const sql = mysql.format( "UPDATE users SET profile_image = ? WHERE user_id = ?", 
        [profileImageURL, userId]
      );

      conn.query(sql, (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "อัปเดตรูปไม่สำเร็จ" });
        }

        res.status(200).json({
          message: "อัปเดตรูปสำเร็จ",
          profile_image: profileImageURL,
        });
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัปเดตรูป" });
    }
  }
);