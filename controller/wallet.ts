import express from "express";
import { conn } from "../dbconnect";
import { User } from "../model/user";

export const router = express.Router();

router.get("/:user_id", (req, res) => {
  const user_id = parseInt(req.params.user_id);

  const sql = "SELECT * FROM users WHERE user_id = ?";
  conn.query(sql, [user_id], (err, result) => {
    if (err)
      return res.status(500).json({ message: "Database error", error: err });
    if (result.length === 0)
      return res.status(404).json({ message: "User not found" });

    const user: User = result[0]; // map SQL row -> User interface

    res.json({
      user_id: user.user_id,
      wallet_balance: user.wallet_balance,
    });
  });
});
