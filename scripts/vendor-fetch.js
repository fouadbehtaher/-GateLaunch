const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "assets", "vendor");
const OUT_DIR_LEGACY = path.join(ROOT, "GateLaunch", "assets", "vendor");

const download = (url, outPath) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`GET ${url} -> HTTP ${res.statusCode}`));
          res.resume();
          return;
        }

        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        const file = fs.createWriteStream(outPath);
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
        file.on("error", reject);
      })
      .on("error", reject);
  });

const main = async () => {
  const files = [
    {
      url: "https://cdn.jsdelivr.net/npm/notyf@3/notyf.min.js",
      out: path.join(OUT_DIR, "notyf.min.js"),
    },
    {
      url: "https://cdn.jsdelivr.net/npm/notyf@3/notyf.min.css",
      out: path.join(OUT_DIR, "notyf.min.css"),
    },
    {
      url: "https://unpkg.com/lucide@0.563.0/dist/umd/lucide.js",
      out: path.join(OUT_DIR, "lucide.js"),
    },
  ];

  console.log(`Downloading vendor files to ${OUT_DIR} ...`);
  for (const item of files) {
    console.log(`- ${item.url}`);
    await download(item.url, item.out);
  }

  if (fs.existsSync(path.join(ROOT, "GateLaunch"))) {
    console.log(`Mirroring vendor files to ${OUT_DIR_LEGACY} ...`);
    files.forEach((item) => {
      const target = path.join(OUT_DIR_LEGACY, path.basename(item.out));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(item.out, target);
    });
  }

  const written = fs
    .readdirSync(OUT_DIR)
    .filter((name) => /\.(css|js)$/i.test(name))
    .sort();
  console.log(`Done. Files: ${written.join(", ")}`);
};

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
