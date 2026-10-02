import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { config } from "./config.js";
import { getUserByEmail } from "./db.js";

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, role: user.role },
    config.jwtSecret,
    { expiresIn: "8h", issuer: "cloud-emergency-system" }
  );
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    req.user = jwt.verify(token, config.jwtSecret, { issuer: "cloud-emergency-system" });
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function roles(...allowed) {
  return (req, res, next) => {
    if (!allowed.includes(req.user.role)) return res.status(403).json({ error: "Insufficient permissions" });
    next();
  };
}

export function newId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone || "" };
}

export async function login(email, password) {
  const user = await getUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) return null;
  return { user: publicUser(user), token: signToken(user) };
}
