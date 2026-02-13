import path from "path";
import fs from "fs";

// Temp directory for server-side file storage and analysis
export const TEMP_UPLOAD_DIR = path.join(process.cwd(), "temp-uploads");

// Ensure the directory exists at startup
if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
  fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
}
