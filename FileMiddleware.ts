import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

export class FileMiddleware {
  filename = "";

  constructor() {
    const uploadsDir = path.join(__dirname, "/uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  }

  public readonly diskLoader = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, path.join(__dirname, "/uploads"));
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4();
        this.filename = `${uniqueSuffix}.${file.originalname.split(".").pop()}`;
        cb(null, this.filename);
      },
    }),
    limits: {
      fileSize: 64 * 1024 * 1024,
    },
  });
}
