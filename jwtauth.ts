import { expressjwt, Request as JWTRequest } from "express-jwt";
import jwt from "jsonwebtoken";

export const secret = "this-is-top-secret";
export const jwtAuthen = expressjwt({
  secret: secret,
  algorithms: ["HS256"],
}).unless({
  path: ["/", "/customers/login", "/customers/register", "/testtoken"],
});

export function generateToken(payload: any, secretKey: string): string {
  const token: string = jwt.sign(payload, secretKey, {
    expiresIn: "30d", // expires in 30 days
    issuer: "CS-MSU",
  });
  return token;
}

export function verifyToken(
  token: string,
  secretKey: string
): { valid: boolean; decoded?: any; error?: string } {
  try {
    const decodedPayload: any = jwt.verify(token, secretKey);
    return { valid: true, decoded: decodedPayload };
  } catch (error) {
    return { valid: false, error: JSON.stringify(error) };
  }
}
