import jwt from "jsonwebtoken";
import { getAccountById } from "./data.js";

const SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";

export function signToken(account) {
  return jwt.sign({ id: account.id, role: account.role, email: account.email }, SECRET, { expiresIn: "2d" });
}

export function authRequired(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "Missing auth token" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    const account = getAccountById(decoded.role, decoded.id);
    if (!account) {
      return res.status(401).json({ message: "Invalid token account" });
    }
    req.user = account;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
