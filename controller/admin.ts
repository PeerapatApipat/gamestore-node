import express from "express";
import { authRole } from "../authRole";

export const router = express.Router();

router.get("/", authRole(["admin"]), (req: any, res) => {
  res.json({ message: `Welcome Admin ${req.auth.email}!` });
});
