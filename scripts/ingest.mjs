#!/usr/bin/env node
/**
 * INGESTA DE OBRAS  ·  npm run ingest
 *
 * Entrada: `contenido/` = la carpeta de Drive descargada TAL CUAL:
 *
 *   contenido/
 *     Ilustración/  CECAELIA.jpg, 143 sin título.png ...      ← cada archivo suelto = 1 proyecto
 *     Bocetos/      IMG_20190419_161854354.jpg ...
 *     Animación/    Resultado.mp4 ...
 *     <Categoría>/<Proyecto>/  01.jpg, 02.jpg, proceso/*.mp4  ← subcarpeta = proyecto con varias fotos + timelapses
 *
 * Salida:
 *   public/obras/<slug>/…        imágenes AVIF/WebP en 3 tamaños + textura WebGL + vídeos H.264 + pósters
 *   src/content/catalog.json     manifiesto que lee la web
 *
 * Incremental: solo procesa archivos nuevos o modificados (ideal mientras se sigue subiendo material).
 * Flags: --force (reprocesa todo) · --dry (solo lista lo que haría)
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "contenido");
const OUT = path.join(ROOT, "public", "obras");
const MANIFEST = path.join(ROOT, "src", "content", "catalog.json");
const FORCE = process.argv.includes("--force");
const DRY = process.argv.includes("--dry");

const IMG = /\.(jpe?g|png|webp|avif|tiff?|heic)$/i;
const VID = /\.(mp4|mov|webm|m4v|mkv)$/i;
const SIZES = { sm: 480, ms: 800, md: 1280, lg: 2560 };
/** Textura WebGL de la portada del proyecto. 1600 basta para ~85 % de la pantalla y pesa la mitad que 2048. */
const TEX = 1600;

const CATEGORY = /^(animaci[oó]n(es)?|bocetos?|ilustraci[oó]n(es)?|p[oó]sters?|afiches?)$/i;

const KIND_BY_FOLDER = [
  [/anima/i, "animacion"],
  [/boceto|sketch/i, "boceto"],
  [/poster|afiche/i, "poster"],
  [/ilustra/i, "ilustracion"],
];

/* ---------- utilidades ---------- */

const slugify = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "obra";

const shortHash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 6);

/** Nombres de cámara/Procreate/pruebas → sin título. */
const GENERIC = /^(img|vid|dsc|pxl|screenshot|captura|whatsapp|muestra|prueba|resultado|untitled|sin t[ií]tulo|nuevo plano)(?![a-z])|sin t[ií]tulo|^[\d\s_-]+$|^[0-9a-f]{8}[\s_-]?[0-9a-f]{4}/i;

function parseName(file) {
  let stem = path.basename(file).replace(/\.[^.]+$/, "");
  try {
    stem = decodeURIComponent(stem.replace(/\+/g, " ")); // nombres que llegan URL-encoded desde Drive
  } catch {}
  stem = stem.replace(/[⁠​]/g, "").normalize("NFC");
  const date = stem.match(/(20\d{2}|19\d{2})(\d{2})(\d{2})/);
  const clean = stem
    .replace(/[_\s-]*\d{8,}[\d_~]*/g, "") // fechas/timestamps
    .replace(/~\d+$/, "")
    .replace(/\(\d+\)/g, "")
    .replace(/\+/g, " ")
    .replace(/%2C/gi, ",")
    .replace(/^\d+\s+/, "") // "143 sin título" → "sin título"
    .trim();
  const generic = !clean || GENERIC.test(clean) || GENERIC.test(stem);
  const title = generic ? undefined : titleCase(clean.replace(/[_-]+/g, " "));
  return { stem, title, year: date ? Number(date[1]) : undefined, dateKey: date ? `${date[1]}${date[2]}${date[3]}` : undefined };
}

function titleCase(s) {
  // Respeta mayúsculas intencionales ("ProFondos"); solo normaliza TODO MAYÚSCULAS o todo minúsculas.
  if (s !== s.toUpperCase() && s !== s.toLowerCase()) return s.trim();
  const lower = new Set(["de", "del", "la", "el", "y", "en", "a", "of", "and"]);
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && lower.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

function hasFfmpeg() {
  return spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
}

function ffprobeSize(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", file], { encoding: "utf8" });
  try {
    const j = JSON.parse(r.stdout);
    return { width: j.streams[0].width, height: j.streams[0].height, duration: Number(j.format.duration) };
  } catch {
    return { width: 1280, height: 720, duration: 0 };
  }
}

const isFresh = (src, out) => !FORCE && existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs;

/* ---------- procesado ---------- */

/** Fecha de captura desde EXIF (DateTimeOriginal) sin dependencias: busca el patrón ASCII. */
function exifDate(exif) {
  if (!exif) return undefined;
  const m = exif.toString("latin1").match(/(19|20)(\d{2}):(\d{2}):(\d{2}) \d{2}:\d{2}:\d{2}/);
  return m ? { year: Number(m[1] + m[2]), dateKey: `${m[1]}${m[2]}${m[3]}${m[4]}` } : undefined;
}

/** HEIC (iPhone): sharp no trae decodificador HEVC → se convierte con ffmpeg a PNG temporal. */
function heicToPng(src) {
  const tmp = path.join(OUT, `.tmp-${shortHash(src)}.png`);
  if (!existsSync(tmp)) spawnSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-frames:v", "1", tmp], { stdio: "inherit" });
  return existsSync(tmp) ? tmp : null;
}

async function processImage(srcIn, dir, name, { levels }) {
  const src = /\.heic$/i.test(srcIn) ? heicToPng(srcIn) : srcIn;
  if (!src) throw new Error(`no se pudo decodificar ${srcIn}`);
  const outMd = path.join(dir, `${name}-md.webp`);
  const info = await sharp(src, { limitInputPixels: false }).metadata();
  const date = exifDate(info.exif);
  // Fotos de cámara (EXIF con fabricante) o bocetos: nivelar papel gris → blanco.
  const isPhoto = !!info.exif && /Apple|samsung|Xiaomi|HUAWEI|motorola|Google|OPPO|Canon|NIKON|SONY/i.test(info.exif.toString("latin1"));
  const doLevels = levels || isPhoto;

  if (!isFresh(srcIn, outMd)) {
    if (DRY) return { dry: true };
    // Un solo decode del original gigante → master 2560 en memoria → derivados.
    let p = sharp(src, { limitInputPixels: false }).rotate().flatten({ background: "#ffffff" });
    if (doLevels) p = p.normalise({ lower: 1, upper: 97 });
    const master = await p.resize(SIZES.lg, SIZES.lg, { fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 1 }).toBuffer();
    const from = () => sharp(master);
    await from().avif({ quality: 55, effort: 4 }).toFile(path.join(dir, `${name}-lg.avif`));
    await from().resize(TEX, TEX, { fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(dir, `${name}-tex.webp`));
    await from().resize(SIZES.md, SIZES.md, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toFile(outMd);
    await from().resize(SIZES.ms, SIZES.ms, { fit: "inside", withoutEnlargement: true }).webp({ quality: 74 }).toFile(path.join(dir, `${name}-ms.webp`));
    await from().resize(SIZES.sm, SIZES.sm, { fit: "inside" }).webp({ quality: 72 }).toFile(path.join(dir, `${name}-sm.webp`));
  }
  const meta = await sharp(outMd).metadata();
  const blur = await sharp(outMd).resize(16).webp({ quality: 40 }).toBuffer();
  const url = (s) => `/obras/${path.basename(dir)}/${name}-${s}`;
  return {
    type: "image",
    src: url("md.webp"),
    srcSet: { sm: url("sm.webp"), ms: url("ms.webp"), md: url("md.webp"), lg: url("lg.avif") },
    tex: url("tex.webp"),
    width: meta.width,
    height: meta.height,
    blur: `data:image/webp;base64,${blur.toString("base64")}`,
    date,
  };
}

function processVideo(src, dir, name, label, role = "process") {
  const out = path.join(dir, `${name}.mp4`);
  const poster = path.join(dir, `${name}-poster.webp`);
  if (!isFresh(src, out)) {
    if (DRY) return { dry: true };
    // Monocromo, 720p, faststart: los timelapses pesan muy poco en escala de grises.
    spawnSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-vf", "scale='min(1280,iw)':-2,format=yuv420p", "-c:v", "libx264", "-crf", "26", "-preset", "slow", "-movflags", "+faststart", "-an", out], { stdio: "inherit" });
    spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", "0.3", "-i", out, "-frames:v", "1", "-vf", "scale='min(1280,iw)':-2", poster], { stdio: "inherit" });
  }
  const { width, height, duration } = ffprobeSize(out);
  const base = `/obras/${path.basename(dir)}`;
  return { type: "video", src: `${base}/${name}.mp4`, poster: `${base}/${name}-poster.webp`, width, height, duration, label, role };
}


/** Logo del artista → recursos de marca: versión clara y oscura (sin fondo) + favicon/ícono. */
async function processBrand(src) {
  const BRAND = path.join(ROOT, "public", "brand");
  mkdirSync(BRAND, { recursive: true });
  const trimmed = await sharp(src).trim().toBuffer();
  await sharp(trimmed).resize(512, 512, { fit: "inside" }).webp({ quality: 90 }).toFile(path.join(BRAND, "logo-paper.webp"));
  // versión tinta: invierte el color, conserva la transparencia
  await sharp(trimmed).resize(512, 512, { fit: "inside" }).negate({ alpha: false }).webp({ quality: 90 }).toFile(path.join(BRAND, "logo-ink.webp"));
  // íconos cuadrados sobre tinta (favicon + iOS); Next los toma de src/app automáticamente
  const icon = async (size, file) =>
    sharp({ create: { width: size, height: size, channels: 4, background: "#0a0a0a" } })
      .composite([{ input: await sharp(trimmed).resize(Math.round(size * 0.78), Math.round(size * 0.78), { fit: "inside" }).toBuffer(), gravity: "center" }])
      .png()
      .toFile(file);
  await icon(256, path.join(ROOT, "src", "app", "icon.png"));
  await icon(180, path.join(ROOT, "src", "app", "apple-icon.png"));
  console.log("✓ marca → public/brand/, src/app/icon.png");
}

/* ---------- recorrido ---------- */

async function main() {
  if (!existsSync(SRC)) {
    console.error("✗ No existe contenido/. Descarga la carpeta de Drive y colócala ahí.");
    process.exit(1);
  }
  const ffmpeg = hasFfmpeg();
  if (!ffmpeg) console.warn("⚠ ffmpeg no encontrado: se omitirán los vídeos.");
  mkdirSync(OUT, { recursive: true });

  const projects = [];
  const usedSlugs = new Set();
  const uniqueSlug = (s, seed) => {
    let slug = s;
    if (usedSlugs.has(slug)) slug = `${s}-${shortHash(seed)}`;
    usedSlugs.add(slug);
    return slug;
  };

  /** Carpeta = un proyecto (varias fotos, vídeos sueltos = animación, proceso/ = timelapses). */
  async function addProjectFolder(abs, rel, entry, kind, levels, titleOverride) {
        const info = parseName(entry);
        const metaPath = path.join(abs, "meta.json");
        const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, "utf8")) : {};
        const slug = uniqueSlug(slugify(meta.title ?? titleOverride ?? entry), rel);
        const dir = path.join(OUT, slug);
        mkdirSync(dir, { recursive: true });
        const files = readdirSync(abs).filter((x) => !x.endsWith(".part")).sort();

        const results = [];
        for (const f of files.filter((x) => IMG.test(x))) {
          try {
            results.push(await processImage(path.join(abs, f), dir, slugify(f.replace(/\.[^.]+$/, "")), { levels }));
          } catch (err) {
            console.warn(`✗ ${rel}/${f}: ${err.message}`);
          }
        }
        const process_ = [];
        const procDir = path.join(abs, "proceso");
        if (ffmpeg && existsSync(procDir)) {
          for (const f of readdirSync(procDir).filter((x) => VID.test(x)).sort()) {
            process_.push(processVideo(path.join(procDir, f), dir, `proceso-${slugify(f.replace(VID, ""))}`, f.replace(VID, "").replace(/[-_+]/g, " ")));
          }
        }
        // vídeos sueltos dentro del proyecto = resultado animado
        if (ffmpeg) {
          for (const f of files.filter((x) => VID.test(x))) {
            process_.push(processVideo(path.join(abs, f), dir, slugify(f.replace(VID, "")), parseName(f).title ?? "animación", "result"));
          }
        }
        if (!results.length && !process_.length) return;
        projects.push({
          slug,
          source: rel,
          title: meta.title ?? titleOverride ?? info.title,
          year: meta.year ?? info.year ?? results[0]?.date?.year ?? 0,
          dateKey: info.dateKey ?? results[0]?.date?.dateKey ?? "0",
          kind: meta.kind ?? kind,
          medium: meta.medium,
          description: meta.description,
          tags: meta.tags ?? [],
          featured: meta.featured,
          cover: results[0] ?? null,
          results,
          process: process_,
        });
        console.log(`✓ ${rel}  (${results.length} fotos, ${process_.length} vídeos)`);
  }

  /** Archivo suelto = proyecto de una pieza. El slug NO depende de la carpeta (sobrevive a mover archivos). */
  async function addLooseFile(abs, rel, entry, { kind, levels, medium, tags = [], pasillo = false }) {
    const isImg = IMG.test(entry);
    const isVid = VID.test(entry);
    if (!isImg && !(isVid && ffmpeg)) return;

    const info = parseName(entry);
    const slug = uniqueSlug(info.title ? slugify(info.title) : `${kind}-${info.dateKey ?? shortHash(path.basename(entry))}`, rel);
    const dir = path.join(OUT, slug);
    mkdirSync(dir, { recursive: true });

    let media;
    try {
      media = isImg ? await processImage(abs, dir, "obra", { levels }) : processVideo(abs, dir, "obra", "animación", "result");
    } catch (err) {
      console.warn(`✗ ${rel}: ${err.message}`);
      return;
    }
    if (media.dry) return console.log(`· (dry) ${rel}`);
    projects.push({
      slug,
      source: rel,
      title: info.title,
      year: info.year ?? media.date?.year ?? 0,
      dateKey: info.dateKey ?? media.date?.dateKey ?? "0",
      kind,
      medium,
      tags,
      pasillo: pasillo || undefined,
      featured: pasillo || undefined,
      cover: isImg ? media : null,
      results: isImg ? [media] : [],
      process: isVid ? [media] : [],
    });
    console.log(`✓ ${rel}`);
  }

  const entries = (dir) => readdirSync(dir).filter((e) => !e.endsWith(".part") && !e.startsWith(".")).sort();
  const isProjectDir = (dir, name) => /^proyecto\b/i.test(name) || existsSync(path.join(dir, "meta.json")) || existsSync(path.join(dir, "proceso"));
  /** Tipo de un proyecto por su contenido: mayoría de vídeos → animación. */
  const kindByContent = (dir, fallback) => {
    const files = entries(dir);
    const v = files.filter((f) => VID.test(f)).length;
    const i = files.filter((f) => IMG.test(f)).length;
    return v > i ? "animacion" : fallback;
  };

  for (const cat of entries(SRC).filter((d) => statSync(path.join(SRC, d)).isDirectory())) {
    const catDir = path.join(SRC, cat);
    const name = cat.trim();

    // ---- Logo / marca: no es obra, genera recursos de identidad ----
    if (/^logo|^firma|^marca/i.test(name)) {
      const f = entries(catDir).find((x) => IMG.test(x));
      if (f && !DRY) await processBrand(path.join(catDir, f));
      continue;
    }

    // ---- Pasillo: selección curada para el recorrido 3D (también aparecen en el archivo) ----
    if (/^pasillo$/i.test(name)) {
      for (const entry of entries(catDir)) {
        const abs = path.join(catDir, entry);
        if (statSync(abs).isDirectory()) continue;
        await addLooseFile(abs, `${cat}/${entry}`, entry, { kind: "ilustracion", levels: false, pasillo: true });
      }
      continue;
    }

    const kind = KIND_BY_FOLDER.find(([re]) => re.test(cat))?.[1] ?? "ilustracion";
    const levels = kind === "boceto"; // las fotos de celular necesitan nivelado

    // ---- Carpeta raíz que no es categoría → UN proyecto ("Proyecto Nidra", "Animación Aniversario Tunhouse") ----
    if (!CATEGORY.test(name)) {
      const rest = cat.replace(/^proyecto\s+/i, "").replace(/animaci[oó]n|bocetos?|ilustraci[oó]n(es)?|p[oó]sters?|afiches?/gi, "").trim();
      await addProjectFolder(catDir, cat, cat, kindByContent(catDir, kind), levels, rest ? titleCase(rest) : undefined);
      continue;
    }

    for (const entry of entries(catDir)) {
      const abs = path.join(catDir, entry);
      const rel = `${cat}/${entry}`;
      if (!statSync(abs).isDirectory()) {
        await addLooseFile(abs, rel, entry, { kind, levels });
        continue;
      }
      // Subcarpeta: proyecto (Proyecto…/meta.json/proceso) o SUBCATEGORÍA por técnica ("Grafito", "Tinta", "Blanco y negro")
      if (isProjectDir(abs, entry)) {
        const title = entry.replace(/^proyecto\s+/i, "").trim();
        await addProjectFolder(abs, rel, entry, kindByContent(abs, kind), levels, title ? titleCase(title) : undefined);
        continue;
      }
      const medium = titleCase(entry);
      for (const f of entries(abs)) {
        const fa = path.join(abs, f);
        if (statSync(fa).isDirectory()) {
          if (isProjectDir(fa, f)) await addProjectFolder(fa, `${rel}/${f}`, f, kindByContent(fa, kind), levels, titleCase(f.replace(/^proyecto\s+/i, "")));
          continue;
        }
        await addLooseFile(fa, `${rel}/${f}`, f, { kind, levels, medium, tags: [medium.toLowerCase()] });
      }
    }
  }

  if (DRY) return;
  // Limpia salidas de proyectos que ya no existen / cambiaron de slug
  const alive = new Set(projects.map((p) => p.slug));
  for (const d of readdirSync(OUT)) {
    if (!d.startsWith(".") && !alive.has(d)) rmSync(path.join(OUT, d), { recursive: true, force: true });
  }
  for (const d of readdirSync(OUT).filter((f) => f.startsWith(".tmp-"))) rmSync(path.join(OUT, d), { force: true });

  writeFileSync(MANIFEST, JSON.stringify({ generatedAt: new Date().toISOString(), projects }, null, 1));
  console.log(`\n${projects.length} proyectos → src/content/catalog.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
