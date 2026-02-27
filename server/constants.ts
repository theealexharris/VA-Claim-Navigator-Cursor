import path from "path";
import fs from "fs";

// Temp directory for server-side file storage and analysis
// On Vercel, only /tmp is writable; locally use project root
const isVercel = !!process.env.VERCEL;
export const TEMP_UPLOAD_DIR = isVercel
  ? path.join("/tmp", "temp-uploads")
  : path.join(process.cwd(), "temp-uploads");

// Ensure the directory exists at startup
try {
  if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
    fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
  }
} catch (err: any) {
  console.warn(`[CONSTANTS] Could not create temp dir: ${err.message}`);
}
