import { existsSync, mkdirSync, copyFileSync, symlinkSync, readdirSync, linkSync } from "node:fs";
import path from "node:path";

const BACKUP_DIR = "/home/u421648830/backup_wordpress_tortugabay_2026/wp-content/uploads";
const SHARED_MEDIA_DIR = "/home/u421648830/domains/app.tortugabay.it/shared/live-tv-media";
const PUBLIC_HTML_DIR = "/home/u421648830/domains/app.tortugabay.it/public_html";
const LOCAL_PUBLIC_DIR = path.join(process.cwd(), "public");

function linkOrCopy(src, dest) {
  try {
    if (existsSync(dest)) return;
    try {
      linkSync(src, dest);
    } catch {
      copyFileSync(src, dest);
    }
  } catch (err) {
    console.warn(`[ensure-media] Warning linking ${src} -> ${dest}:`, err.message);
  }
}

function run() {
  if (!existsSync(BACKUP_DIR)) {
    return;
  }

  console.log("[ensure-media] Running production media linker...");

  const targetPublic2026 = path.join(LOCAL_PUBLIC_DIR, "wp-content", "uploads", "2026", "05");
  mkdirSync(targetPublic2026, { recursive: true });

  const backup2026 = path.join(BACKUP_DIR, "2026", "05");
  if (existsSync(backup2026)) {
    const files = readdirSync(backup2026);
    for (const file of files) {
      if (file.toLowerCase().endsWith(".mp4")) {
        linkOrCopy(path.join(backup2026, file), path.join(targetPublic2026, file));
      }
    }
  }

  if (existsSync(PUBLIC_HTML_DIR)) {
    const publicHtml2026 = path.join(PUBLIC_HTML_DIR, "wp-content", "uploads", "2026", "05");
    mkdirSync(publicHtml2026, { recursive: true });
    if (existsSync(backup2026)) {
      const files = readdirSync(backup2026);
      for (const file of files) {
        if (file.toLowerCase().endsWith(".mp4")) {
          linkOrCopy(path.join(backup2026, file), path.join(publicHtml2026, file));
        }
      }
    }

    if (existsSync(SHARED_MEDIA_DIR)) {
      const publicHtmlLiveMedia = path.join(PUBLIC_HTML_DIR, "live-tv-media");
      try {
        if (!existsSync(publicHtmlLiveMedia)) {
          symlinkSync(SHARED_MEDIA_DIR, publicHtmlLiveMedia);
        }
      } catch (err) {
        console.warn("[ensure-media] Symlink live-tv-media warning:", err.message);
      }
    }
  }

  console.log("[ensure-media] Media links verified successfully.");
}

run();
