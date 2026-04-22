import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

function safeFileName(name: string) {
  const ext = path.extname(name).toLowerCase();
  const base = path.basename(name, ext).replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/(^-|-$)/g, "") || "upload";
  return `${base}-${Date.now()}${ext}`;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const fileName = safeFileName(file.name);
  const targetPath = path.join(uploadDir, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(targetPath, bytes);

  const publicPath = `/uploads/${fileName}`;
  return NextResponse.json({ path: publicPath, name: file.name, size: file.size });
}
