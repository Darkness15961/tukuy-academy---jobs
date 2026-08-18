#!/usr/bin/env bun
/**
 * Sube el pack de imágenes demo a S3: anuncios-portal/{instalacionId}/catalogo/
 *
 * Opción A — AWS directo (si tienes claves en el entorno):
 *   AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_S3_BUCKET=tukuy-academy-media \
 *   bun scripts/subir-anuncios-portal-s3.mjs --instalacion=<UUID>
 *
 * Opción B — vía Edge media-presign (usa secretos AWS del proyecto Principal):
 *   VITE_SUPABASE_PRIMARY_URL=... ACCESS_TOKEN=<jwt> \
 *   bun scripts/subir-anuncios-portal-s3.mjs --instalacion=<UUID> --via=edge
 *
 * El JWT lo sacas de DevTools → Application → localStorage (sb-*-auth-token)
 * o iniciando sesión y copiando session.access_token.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, "assets", "anuncios-portal");

function arg(nombre, defecto = "") {
  const prefijo = `--${nombre}=`;
  const hit = process.argv.find((a) => a.startsWith(prefijo));
  if (hit) return hit.slice(prefijo.length);
  const idx = process.argv.indexOf(`--${nombre}`);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return defecto;
}

const instalacionId = (arg("instalacion") || process.env.INSTALACION_ID || "").trim();
const via = (arg("via") || process.env.VIA || "auto").trim().toLowerCase();
const bucket =
  process.env.AWS_S3_BUCKET?.trim() || "tukuy-academy-media";
const region = process.env.AWS_REGION?.trim() || "us-east-2";
const accessKey = process.env.AWS_ACCESS_KEY_ID?.trim() || "";
const secretKey = process.env.AWS_SECRET_ACCESS_KEY?.trim() || "";
const supabaseUrl =
  process.env.VITE_SUPABASE_PRIMARY_URL?.trim() ||
  process.env.SUPABASE_URL?.trim() ||
  "";
const accessToken =
  process.env.ACCESS_TOKEN?.trim() || process.env.SUPABASE_ACCESS_TOKEN?.trim() || "";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!UUID_RE.test(instalacionId)) {
  console.error(
    "Falta --instalacion=<UUID de la organización>.\nEjemplo:\n  bun scripts/subir-anuncios-portal-s3.mjs --instalacion=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  );
  process.exit(1);
}

async function subirViaAws() {
  const { S3Client, PutObjectCommand, HeadObjectCommand } = await import(
    "@aws-sdk/client-s3"
  );
  const client = new S3Client({
    region,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });
  const archivos = (await readdir(assetsDir)).filter((f) =>
    /\.(jpe?g|png|webp)$/i.test(f),
  );
  if (!archivos.length) {
    throw new Error(`No hay imágenes en ${assetsDir}`);
  }
  const resultados = [];
  for (const archivo of archivos) {
    const slug = archivo.replace(/\.[^.]+$/, "");
    const objectKey = `anuncios-portal/${instalacionId}/catalogo/${slug}.jpg`;
    let existe = false;
    try {
      await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: objectKey }),
      );
      existe = true;
    } catch {
      existe = false;
    }
    if (existe) {
      console.log(`= existente  ${objectKey}`);
      resultados.push({ objectKey, estado: "existente" });
      continue;
    }
    const body = await readFile(join(assetsDir, archivo));
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: body,
        ContentType: "image/jpeg",
      }),
    );
    console.log(`+ subido     ${objectKey}`);
    resultados.push({ objectKey, estado: "creado" });
  }
  return resultados;
}

async function subirViaEdge() {
  if (!supabaseUrl || !accessToken) {
    throw new Error(
      "Para --via=edge necesitas VITE_SUPABASE_PRIMARY_URL y ACCESS_TOKEN (JWT).",
    );
  }
  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/media-presign`;
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      apikey: accessToken,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      action: "seed-anuncios-portal-demo",
      instalacionId,
    }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.ok) {
    throw new Error(
      data?.error || `Edge falló (${resp.status})`,
    );
  }
  for (const img of data.imagenes ?? []) {
    const marca = img.estado === "creado" ? "+" : "=";
    console.log(`${marca} ${img.estado.padEnd(10)} ${img.objectKey}`);
  }
  return data.imagenes ?? [];
}

const modo =
  via === "edge"
    ? "edge"
    : via === "aws"
      ? "aws"
      : accessKey && secretKey
        ? "aws"
        : "edge";

console.log(`Modo: ${modo}`);
console.log(`Instalación: ${instalacionId}`);
console.log(`Prefijo: anuncios-portal/${instalacionId}/catalogo/`);

try {
  const resultados =
    modo === "aws" ? await subirViaAws() : await subirViaEdge();
  console.log(`\nListo: ${resultados.length} imágenes en anuncios-portal/`);
} catch (err) {
  console.error("\nError:", err instanceof Error ? err.message : err);
  if (modo === "aws") {
    console.error(
      "Tip: instala el SDK con `bun add -d @aws-sdk/client-s3` o usa --via=edge con ACCESS_TOKEN.",
    );
  } else {
    console.error(
      "Tip: redeploy media-presign y pasa ACCESS_TOKEN=<jwt de sesión>.",
    );
  }
  process.exit(1);
}
