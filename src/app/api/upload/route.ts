import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getAllowedCorsOrigins } from "@/lib/env";

const publicUploadDir = path.join(process.cwd(), "public", "uploads");

function withCors(request: Request, response: NextResponse) {
  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedCorsOrigins();

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }

  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export function OPTIONS(request: Request) {
  return withCors(request, new NextResponse(null, { status: 204 }));
}

function getUploadDirs() {
  const configuredUploadDir = process.env.UPLOAD_DIR?.trim();
  if (!configuredUploadDir) {
    return [publicUploadDir];
  }

  return configuredUploadDir === publicUploadDir
    ? [publicUploadDir]
    : [configuredUploadDir, publicUploadDir];
}

async function writeFileToUploadDirs(fileName: string, bytes: Buffer) {
  for (const uploadDir of getUploadDirs()) {
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), bytes);
  }
}

function getPublicPath(fileName: string) {
  return `/uploads/${fileName}`;
}

function getFileUrl(request: Request, fileName: string) {
  const publicPath = getPublicPath(fileName);
  const publicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (publicApiBaseUrl) {
    return new URL(publicPath, publicApiBaseUrl.endsWith("/") ? publicApiBaseUrl : `${publicApiBaseUrl}/`).toString();
  }

  return new URL(publicPath, request.url).toString();
}

function fileExistsInPublicDir(fileName: string) {
  return path.join(publicUploadDir, fileName);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file")?.trim();

  if (!file) {
    return withCors(request, NextResponse.json({ error: "Missing file" }, { status: 400 }));
  }

  return withCors(
    request,
    NextResponse.json({
      path: getPublicPath(file),
      url: getFileUrl(request, file),
      localPath: fileExistsInPublicDir(file),
    }),
  );
}

function safeFileName(name: string) {
  const ext = path.extname(name).toLowerCase();
  const base = path.basename(name, ext).replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/(^-|-$)/g, "") || "upload";
  return `${base}-${Date.now()}${ext}`;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return withCors(request, NextResponse.json({ error: "Missing file" }, { status: 400 }));
  }

  const fileName = safeFileName(file.name);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFileToUploadDirs(fileName, bytes);

  return withCors(
    request,
    NextResponse.json({
      path: getPublicPath(fileName),
      url: getFileUrl(request, fileName),
      name: file.name,
      size: file.size,
    }),
  );
}
