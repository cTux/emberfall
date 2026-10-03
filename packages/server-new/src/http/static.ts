import type { RequestListener } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
export function staticHandler(staticRoot?: string): RequestListener {
  const handler: RequestListener = async (req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"ok":true}');
      return;
    }
    if (!staticRoot || !["GET", "HEAD"].includes(req.method ?? "")) {
      res.writeHead(404);
      res.end();
      return;
    }
    try {
      const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
      const root = resolve(staticRoot);
      const file = resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
      if (!file.startsWith(root + sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const content = await readFile(file);
      const mime: Record<string, string> = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ttf": "font/ttf",
        ".txt": "text/plain",
      };
      res.writeHead(200, {
        "Content-Type": mime[extname(file)] ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control":
          pathname === "/version.json"
            ? "no-store"
            : /\/[\w-]+-[\w-]{8,}\.(js|css)$/.test(pathname)
              ? "public, max-age=31536000, immutable"
              : "no-cache",
      });
      res.end(req.method === "HEAD" ? undefined : content);
    } catch {
      res.writeHead(404);
      res.end();
    }
  };

  return handler;
}
