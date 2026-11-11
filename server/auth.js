import jwt from "jsonwebtoken";
import { User } from "./models.js";

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) throw new Error("JWT_SECRET is required in production.");
  return secret || "freshfarm-development-only-secret";
}

export function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username || "",
    phone: user.phone || "",
    role: user.role,
    status: user.status,
    village: user.village || "",
    fpoName: user.fpoName || ""
  };
}

export function createToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, jwtSecret(), { expiresIn: "7d" });
}

export async function optionalAuth(req, _res, next) {
  try {
    const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (token) {
      const payload = jwt.verify(token, jwtSecret());
      req.user = await User.findById(payload.sub);
    }
  } catch {
    req.user = null;
  }
  next();
}

export async function requireAuth(req, res, next) {
  await optionalAuth(req, res, () => {});
  if (!req.user) return res.status(401).json({ message: "Please sign in to continue." });
  next();
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: "You do not have permission for this action." });
    next();
  };
}
