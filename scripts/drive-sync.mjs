#!/usr/bin/env node
/**
 * SINCRONIZAR DESDE GOOGLE DRIVE  ·  npm run sync
 *
 * Descarga la carpeta pública de Drive a `contenido/` respetando su estructura
 * (Categoría/archivo o Categoría/Proyecto/…). Incremental: solo baja lo que falta,
 * así que se puede correr cada vez que suban material nuevo. Luego: npm run ingest.
 *
 * Requisito: la carpeta debe estar compartida como "cualquiera con el enlace".
 * Flags: --dry (solo lista) · --only=Ilustración (una categoría) · --max-mb=80 (omite archivos más grandes)
 */
import { createWriteStream, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";

const ROOT_ID = process.env.DRIVE_FOLDER_ID ?? "1YOGgcZp2LFt0UeSe7q6tDG_W1BmurEd9";
const OUT = path.join(process.cwd(), "contenido");
const DRY = process.argv.includes("--dry");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const MAX_MB = Number(process.argv.find((a) => a.startsWith("--max-mb="))?.split("=")[1] ?? Infinity);

const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").normalize("NFC").trim();

async function list(folderId, attempt = 1) {
  let res;
  try {
    res = await fetch(`https://drive.google.com/embeddedfolderview?id=${folderId}`);
  } catch (err) {
    if (attempt >= 4) throw err;
    await new Promise((r) => setTimeout(r, 2000 * attempt));
    return list(folderId, attempt + 1);
  }
  if (!res.ok) throw new Error(`No se pudo listar ${folderId}: HTTP ${res.status}`);
  const html = await res.text();
  const entries = [];
  const re = /<div class="flip-entry" id="entry-([\w-]+)"[\s\S]*?<a href="([^"]+)"[\s\S]*?<div class="flip-entry-title">([\s\S]*?)<\/div>/g;
  for (const m of html.matchAll(re)) {
    entries.push({ id: m[1], folder: m[2].includes("/folders/"), name: decode(m[3]) });
  }
  return entries;
}

// Quita saltos de línea/control (hay nombres de Drive con "\n") y caracteres inválidos en Windows.
const safe = (name) => name.replace(/[\u0000-\u001f]+/g, " ").replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, " ").trim();

async function download(id, dest) {
  const url = `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;
  const res = await fetch(url);
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || type.startsWith("text/html")) throw new Error(`descarga rechazada (${res.status} ${type})`);
  const size = Number(res.headers.get("content-length") ?? 0);
  if (size / 1e6 > MAX_MB) {
    await res.body?.cancel();
    return { skipped: true, size };
  }
  const tmp = `${dest}.part`;
  await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
  renameSync(tmp, dest);
  return { size: statSync(dest).size };
}

async function walk(folderId, rel, depth, stats) {
  for (const e of await list(folderId)) {
    const target = path.join(OUT, rel, safe(e.name));
    if (e.folder) {
      if (depth === 0 && ONLY && e.name.normalize("NFC").trim() !== ONLY.normalize("NFC")) continue;
      if (!DRY) mkdirSync(target, { recursive: true });
      await walk(e.id, path.join(rel, safe(e.name)), depth + 1, stats);
      continue;
    }
    if (depth === 0) continue; // archivos sueltos en la raíz: sin categoría
    if (existsSync(target)) {
      stats.kept++;
      continue;
    }
    if (DRY) {
      console.log(`· faltaría  ${path.join(rel, e.name)}`);
      stats.new++;
      continue;
    }
    stats.queue.push(() => fetchOne(e, rel, target, stats));
  }
}

const CONCURRENCY = 4;

async function fetchOne(e, rel, target, stats) {
    try {
      let r;
      for (let attempt = 1; ; attempt++) {
        try {
          r = await download(e.id, target);
          break;
        } catch (err) {
          if (attempt >= 3) throw err;
          await new Promise((res) => setTimeout(res, 1500 * attempt)); // reintento
        }
      }
      if (r.skipped) {
        console.log(`↷ omitido (${(r.size / 1e6).toFixed(1)} MB > ${MAX_MB})  ${path.join(rel, e.name)}`);
        stats.skipped++;
      } else {
        console.log(`↓ ${(r.size / 1e6).toFixed(1).padStart(6)} MB  ${path.join(rel, e.name)}`);
        stats.new++;
        stats.bytes += r.size;
      }
    } catch (err) {
      if (existsSync(`${target}.part`)) unlinkSync(`${target}.part`);
      console.warn(`✗ ${path.join(rel, e.name)}: ${err.message}`);
      stats.failed++;
    }
}

const stats = { new: 0, kept: 0, skipped: 0, failed: 0, bytes: 0, queue: [] };
mkdirSync(OUT, { recursive: true });
await walk(ROOT_ID, "", 0, stats);
// Descargas en paralelo (los archivos pequeños no esperan a los vídeos grandes)
const queue = stats.queue;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) await queue.shift()();
}));
console.log(
  `\n${DRY ? "Faltan" : "Nuevos"}: ${stats.new} (${(stats.bytes / 1e6).toFixed(0)} MB) · ya estaban: ${stats.kept} · omitidos: ${stats.skipped} · fallidos: ${stats.failed}`,
);
if (!DRY && stats.new) console.log("Siguiente paso: npm run ingest");
