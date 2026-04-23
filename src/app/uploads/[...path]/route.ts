import { readFile } from "node:fs/promises";
import path from "node:path";

const publicUploadDir = path.join(process.cwd(), "public", "uploads");
const configuredUploadDir = process.env.UPLOAD_DIR?.trim();

function resolveUploadPath(parts: string[]) {
  const safeParts = parts.filter((part) => part && part !== "." && part !== ".." && !part.includes("/") && !part.includes("\\"));
  if (safeParts.length !== parts.length) {
    return null;
  }

  const relativePath = path.join(...safeParts);
  const candidates = [
    path.join(publicUploadDir, relativePath),
    configuredUploadDir ? path.join(configuredUploadDir, relativePath) : null,
  ].filter(Boolean) as string[];

  return { relativePath, candidates };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  const resolved = resolveUploadPath(parts);
  if (!resolved) {
    return new Response("Invalid upload path", { status: 400 });
  }

  for (const candidate of resolved.candidates) {
    try {
      const file = await readFile(candidate);
      const extension = path.extname(candidate).toLowerCase();
      const contentType =
        extension === ".png"
          ? "image/png"
          : extension === ".jpg" || extension === ".jpeg"
            ? "image/jpeg"
            : extension === ".webp"
              ? "image/webp"
              : extension === ".gif"
                ? "image/gif"
                : extension === ".svg"
                  ? "image/svg+xml"
                  : extension === ".avif"
                    ? "image/avif"
                    : "application/octet-stream";
      return new Response(file, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      continue;
    }
  }

  return new Response("Not Found", { status: 404 });
}
