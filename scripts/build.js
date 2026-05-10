const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIST_DIR = path.join(ROOT, "dist");

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
const exists = (p) => {
  try {
    return fs.existsSync(p);
  } catch (_) {
    return false;
  }
};

const toBuffer = (value) => {
  if (!value) return Buffer.alloc(0);
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  return Buffer.from(String(value));
};

const sha256 = (buffer) => crypto.createHash("sha256").update(toBuffer(buffer)).digest("hex");
const shortHash = (buffer) => sha256(buffer).slice(0, 10);

const readUtf8 = (p) => fs.readFileSync(p, "utf8");
const writeUtf8 = (p, content) => fs.writeFileSync(p, content, "utf8");

const copyFile = (from, to) => {
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
};

const replaceAssetRefs = (html, { cssFileName, appFileName, reactFileName }) => {
  let out = html;

  out = out.replace(/href="styles\.css"/g, `href="${cssFileName}"`);
  out = out.replace(/src="app\.js"/g, `src="${appFileName}"`);
  if (reactFileName) {
    out = out.replace(/src="react-app\.js"/g, `src="${reactFileName}"`);
  }

  return out;
};

const build = async () => {
  let esbuild;
  try {
    esbuild = require("esbuild");
  } catch (error) {
    console.error("Missing dev dependency: esbuild. Run: npm install");
    process.exit(1);
  }

  ensureDir(DIST_DIR);

  const appEntry = path.join(ROOT, "app.js");
  const cssEntry = path.join(ROOT, "scripts", "styles.entry.css");
  const reactEntry = path.join(ROOT, "src", "react", "main.jsx");

  const appBuild = await esbuild.build({
    entryPoints: [appEntry],
    bundle: true,
    minify: true,
    sourcemap: false,
    platform: "browser",
    target: ["es2019"],
    format: "iife",
    outfile: "app.js",
    write: false,
  });

  const appOutFile =
    appBuild.outputFiles.find((f) => String(f.path || "").toLowerCase().endsWith(".js")) ||
    appBuild.outputFiles[0];
  const appOut = toBuffer(appOutFile?.contents);
  if (appOut.length === 0) {
    throw new Error("Failed to build app bundle");
  }

  const appFileName = `app.${shortHash(appOut)}.js`;
  fs.writeFileSync(path.join(DIST_DIR, appFileName), appOut);

  let reactFileName = null;
  if (exists(reactEntry)) {
    const reactBuild = await esbuild.build({
      entryPoints: [reactEntry],
      bundle: true,
      minify: true,
      sourcemap: false,
      platform: "browser",
      target: ["es2019"],
      format: "iife",
      outfile: "react-app.js",
      write: false,
      jsx: "automatic",
      define: { "process.env.NODE_ENV": JSON.stringify("production") },
    });

    const reactOutFile =
      reactBuild.outputFiles.find((f) => String(f.path || "").toLowerCase().endsWith(".js")) ||
      reactBuild.outputFiles[0];
    const reactOut = toBuffer(reactOutFile?.contents);
    if (reactOut.length === 0) {
      throw new Error("Failed to build react bundle");
    }

    reactFileName = `react-app.${shortHash(reactOut)}.js`;
    fs.writeFileSync(path.join(DIST_DIR, reactFileName), reactOut);
  }

  const notyfCssPath = path.join(ROOT, "assets", "vendor", "notyf.min.css");
  const cssBuild = await esbuild.build(
    exists(notyfCssPath)
      ? {
          entryPoints: [cssEntry],
          bundle: true,
          minify: true,
          sourcemap: false,
          loader: { ".png": "file", ".jpg": "file", ".jpeg": "file", ".webp": "file", ".svg": "file" },
          assetNames: "assets/[name]-[hash]",
          outfile: "styles.css",
          write: false,
        }
      : {
          stdin: {
            contents: `@import "../styles.css";\n`,
            resolveDir: path.join(ROOT, "scripts"),
            loader: "css",
          },
          bundle: true,
          minify: true,
          sourcemap: false,
          loader: { ".png": "file", ".jpg": "file", ".jpeg": "file", ".webp": "file", ".svg": "file" },
          assetNames: "assets/[name]-[hash]",
          outfile: "styles.css",
          write: false,
        }
  );

  const cssOutFile =
    cssBuild.outputFiles.find((f) => String(f.path || "").toLowerCase().endsWith(".css")) ||
    cssBuild.outputFiles.find((f) => toBuffer(f.contents).length > 0);
  if (!cssOutFile) {
    throw new Error("Failed to build CSS bundle");
  }

  const cssOut = toBuffer(cssOutFile.contents);
  const cssFileName = `styles.${shortHash(cssOut)}.css`;
  fs.writeFileSync(path.join(DIST_DIR, cssFileName), cssOut);

  // Write any emitted assets (from CSS file loader)
  cssBuild.outputFiles.forEach((f) => {
    if (f === cssOutFile) return;
    const rel = path.relative(path.dirname(cssEntry), f.path);
    const outPath = path.join(DIST_DIR, rel);
    ensureDir(path.dirname(outPath));
    fs.writeFileSync(outPath, toBuffer(f.contents));
  });

  // Vendor JS -> dist with hashes (still needed at runtime: Notyf + Lucide)
  const vendorDir = path.join(ROOT, "assets", "vendor");
  const vendorOutDir = path.join(DIST_DIR, "vendor");
  ensureDir(vendorOutDir);

  const vendorMap = {};
  const vendorFiles = [
    { key: "notyf", in: path.join(vendorDir, "notyf.min.js"), outBase: "notyf" },
    { key: "lucide", in: path.join(vendorDir, "lucide.js"), outBase: "lucide" },
  ];

  vendorFiles.forEach((item) => {
    if (!exists(item.in)) return;
    const buf = toBuffer(fs.readFileSync(item.in));
    const outName = `${item.outBase}.${shortHash(buf)}.js`;
    const outPath = path.join(vendorOutDir, outName);
    fs.writeFileSync(outPath, buf);
    vendorMap[item.key] = `vendor/${outName}`;
  });

  if (!vendorMap.notyf || !vendorMap.lucide) {
    console.warn("Warning: vendor JS missing. Run: npm run vendor:fetch");
  }

  // HTML pages -> dist with hashed refs
  const pages = [
    "index.html",
    "landing.html",
    "dashboard.html",
    "admin.html",
    "about.html",
    "help.html",
    "payment-instapay.html",
    "payment-vodafone.html",
    "payment-orange.html",
    "payment-etisalat.html",
    "payment-fawry.html",
    "payment-meeza.html",
    "react.html",
  ];
  for (const page of pages) {
    const srcPath = path.join(ROOT, page);
    if (!exists(srcPath)) continue;
    const distPath = path.join(DIST_DIR, page);
    const html = readUtf8(srcPath);

    // Remove local vendor CSS include (bundled into dist CSS)
    let stripped = html.replace(
      /\s*<link[^>]+href="assets\/vendor\/notyf\.min\.css"[^>]*>\s*/g,
      "\n"
    );

    // Rewrite vendor JS includes to hashed dist vendor paths (if available)
    if (vendorMap.notyf) {
      stripped = stripped.replace(/src="assets\/vendor\/notyf\.min\.js"/g, `src="${vendorMap.notyf}"`);
    }
    if (vendorMap.lucide) {
      stripped = stripped.replace(/src="assets\/vendor\/lucide\.js"/g, `src="${vendorMap.lucide}"`);
    }

    const updated = replaceAssetRefs(stripped, { cssFileName, appFileName, reactFileName });
    writeUtf8(distPath, updated);
  }

  // Manifest for server/runtime (optional)
  const manifest = {
    generatedAt: new Date().toISOString(),
    app: appFileName,
    css: cssFileName,
    react: reactFileName,
  };
  writeUtf8(path.join(DIST_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`Built dist/${appFileName} and dist/${cssFileName}`);
};

build().catch((err) => {
  console.error(err.stack || err.message || String(err));
  process.exit(1);
});
