import mysql from "mysql";

export const conn = mysql.createPool({
  connectionLimit: 10,
  host: "gonggang.net",
  user: "u910454988_actnpt44",
  password: "1u[M]7oG",
  database: "u910454988_actnpt44",
});
