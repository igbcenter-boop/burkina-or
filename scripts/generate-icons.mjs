// Génère toutes les icônes de l'application à partir de public/logo.svg.
// Usage : npm run icons
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logo = readFileSync(join(root, "public/logo.svg"));
mkdirSync(join(root, "public/icons"), { recursive: true });

const png = (size, svg = logo) => sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

// Version « maskable » : fond plein, logo réduit dans la zone de sécurité (80 %).
const inner = readFileSync(join(root, "public/logo.svg"), "utf8")
  .replace(/<rect width="512" height="512" rx="112" fill="#0E0E10"\/>/, "")
  .replace(/<rect x="14"[^>]*\/>/, "");
const maskable = Buffer.from(
  inner.replace(/<svg([^>]*)>/, '<svg$1><rect width="512" height="512" fill="#0E0E10"/><g transform="translate(51.2 51.2) scale(.8)">').replace("</svg>", "</g></svg>"),
);

const out = {
  "public/icons/icon-192.png": await png(192),
  "public/icons/icon-512.png": await png(512),
  "public/icons/maskable-512.png": await png(512, maskable),
  "public/icons/maskable-192.png": await png(192, maskable),
  "src/app/apple-icon.png": await png(180, maskable),
};
for (const [f, buf] of Object.entries(out)) writeFileSync(join(root, f), buf);

// favicon.ico multi-tailles (entrées PNG, format ICO standard)
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((s) => png(s)));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(s, e);
  header.writeUInt8(s, e + 1);
  header.writeUInt8(0, e + 2);
  header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(images[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += images[i].length;
});
writeFileSync(join(root, "src/app/favicon.ico"), Buffer.concat([header, ...images]));
writeFileSync(join(root, "src/app/icon.svg"), logo);
console.log("Icônes générées :", [...Object.keys(out), "src/app/favicon.ico", "src/app/icon.svg"].join(", "));
