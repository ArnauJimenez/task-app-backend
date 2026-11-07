import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access token missing or malformed" });
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET || "secreto_super_seguro";

  try {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === "string") {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    const userId = typeof decoded.userId === "string" ? decoded.userId : decoded.id;
    if (typeof userId !== "string") {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    req.user = {
      id: userId,
      email: typeof decoded.email === "string" ? decoded.email : undefined,
      role: typeof decoded.role === "string" ? decoded.role : undefined,
    };
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};