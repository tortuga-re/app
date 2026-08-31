import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const publicRoot = path.resolve("public");
const groups = [
  { directory: "badges", maxWidth: 384, quality: 82 },
  { directory: "gift-cards", maxWidth: 1200, quality: 80 },
  { directory: "images", maxWidth: 1200, quality: 80 },
  { directory: "maps", maxWidth: 1400, quality: 82 },
];

const results = [];
for (const group of groups) {
  const directory = path.join(publicRoot, group.directory);
  const names = await readdir(directory);
  for (const name of names.filter((entry) => /\.png$/i.test(entry))) {
    const source = path.join(directory, name);
    const target = source.replace(/\.png$/i, ".webp");
    const metadata = await sharp(source).metadata();
    const width = metadata.width && metadata.width > group.maxWidth
      ? group.maxWidth
      : undefined;
    await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: group.quality, alphaQuality: 90, effort: 5 })
      .toFile(target);
    const [before, after] = await Promise.all([stat(source), stat(target)]);
    results.push({
      file: path.relative(publicRoot, source),
      dimensions: `${metadata.width ?? "?"}x${metadata.height ?? "?"}`,
      before: before.size,
      after: after.size,
    });
  }
}

const totalBefore = results.reduce((sum, item) => sum + item.before, 0);
const totalAfter = results.reduce((sum, item) => sum + item.after, 0);
console.table(results);
console.log(JSON.stringify({ files: results.length, totalBefore, totalAfter, saved: totalBefore - totalAfter }));
