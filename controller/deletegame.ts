import express, { Request, Response } from "express";
import { conn } from "../dbconnect";

import { FileMiddleware } from "./upload";
import { jwtAuthen } from "../jwtauth";


export const router = express.Router();
const fileUpload = new FileMiddleware();

router.put("/", jwtAuthen, async (req, res) => {
 const { id } = req.body;
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid game ID' });

  try {
    const result = await conn.query('DELETE FROM games WHERE id = ?', [id]);
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json({ message: 'Game deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
  console.log("gameId /deletegame:", id);
});
