import fs from "fs";
import path from "path";
import { run } from "./db.js";

const root = path.join(process.cwd(), "server", "storage", "users");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export function userFolder(user) {
  const type = user.user_type || (["student","teacher"].includes(user.role) ? user.role : "misc");
  return path.join(root, type, user.username);
}

export function writeProfile(user) {
  const dir = userFolder(user);
  ensureDir(dir);
  const profilePath = path.join(dir, "profile.json");
  const payload = {
    username: user.username,
    role: user.role,
    user_type: user.user_type || null,
    created_at: user.created_at
  };
  fs.writeFileSync(profilePath, JSON.stringify(payload, null, 2));
  run("INSERT INTO user_files (user_id, rel_path) VALUES (?, ?)", [user.id, path.relative(path.join(process.cwd(), "server"), profilePath)]);
  return profilePath;
}

export function moveIfNeeded(prevUser, nextUser) {
  const prevDir = userFolder(prevUser);
  const nextDir = userFolder(nextUser);
  if (prevDir !== nextDir) {
    ensureDir(path.dirname(nextDir));
    if (fs.existsSync(prevDir)) fs.renameSync(prevDir, nextDir);
  }
  writeProfile(nextUser);
}

export function markFilesDeleted(userId) {
  run("UPDATE user_files SET deleted_at=CURRENT_TIMESTAMP WHERE user_id=?", [userId]);
}
