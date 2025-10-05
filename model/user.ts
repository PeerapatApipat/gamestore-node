export interface User {
  user_id: number; // Primary Key
  username: string; // NOT NULL
  email: string; // NOT NULL, UNIQUE
  password: string; // NOT NULL
  profile_image?: string; // รูปโปรไฟล์, อาจว่างได้
  role: "user" | "admin"; // ENUM('user','admin')
  wallet_balance: number; // DECIMAL(10,2)
  created_at: Date; // Timestamp, default CURRENT_TIMESTAMP
}
