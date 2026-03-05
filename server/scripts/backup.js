import fs from "fs";
import path from "path";
import { dbFilePath } from "../src/db.js";

const backupsDir = path.join(process.cwd(), "server", "data", "backups");
if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const dest = path.join(backupsDir, `app-${ts}.db`);
fs.copyFileSync(dbFilePath, dest);
process.stdout.write(dest + "\n");
