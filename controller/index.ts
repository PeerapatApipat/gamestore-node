import express from "express";

export const router = express.Router();

router.get("/", (req, res) => {
  res.send(`
    <div style="
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      flex-direction: column;
      background: linear-gradient(135deg, #1e3c72, #2a5298);
      color: white;
      font-family: 'Segoe UI', sans-serif;
      text-align: center;
    ">
      <h1 style="font-size: 3rem; margin: 0;">🎮 Hello, <span style="color:#ffd700;">GameShop</span>!</h1>
      <p style="font-size: 1.2rem; opacity: 0.9;">🚀 Your backend server is running perfectly!</p>
    </div>
  `);
});
