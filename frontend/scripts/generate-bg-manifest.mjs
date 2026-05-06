import { promises as fs } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, "public");
const outputFile = path.join(publicDir, "bj-manifest.json");
const imageExts = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

async function walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walkFiles(fullPath);
      }
      return [fullPath];
    }),
  );
  return files.flat();
}

async function main() {
  await fs.mkdir(publicDir, { recursive: true });

  const allFiles = await walkFiles(publicDir);
  const imageRecords = await Promise.all(
    allFiles
      .map((fullPath) => path.relative(publicDir, fullPath))
      .filter((relativePath) => relativePath.toLowerCase() !== "bj-manifest.json")
      .filter((relativePath) => /^bj/i.test(path.basename(relativePath)))
      .filter((relativePath) =>
        imageExts.has(path.extname(relativePath).toLowerCase()),
      )
      .map(async (relativePath) => {
        const fullPath = path.join(publicDir, relativePath);
        const stats = await fs.stat(fullPath);
        return {
          src: `/${relativePath.replace(/\\/g, "/")}`,
          bytes: stats.size,
        };
      }),
  );

  imageRecords.sort((a, b) => a.bytes - b.bytes || a.src.localeCompare(b.src));
  const images = imageRecords.map((item) => item.src);

  const manifest = {
    images,
    initialImage: images[0] ?? null,
    entries: imageRecords,
    generatedAt: new Date().toISOString(),
  };

  await fs.writeFile(
    outputFile,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[bg-manifest] generated ${images.length} image(s): ${path.relative(projectRoot, outputFile)}`,
  );
}

main().catch((error) => {
  console.error("[bg-manifest] failed:", error);
  process.exitCode = 1;
});
