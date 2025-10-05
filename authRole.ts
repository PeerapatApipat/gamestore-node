import { Request, Response, NextFunction } from "express";

export function authRole(roles: string[]) {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ message: "Unauthorized" });

    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ message: "คุณไม่มีสิทธิ์เข้าถึง" });
    }

    next();
  };
}
