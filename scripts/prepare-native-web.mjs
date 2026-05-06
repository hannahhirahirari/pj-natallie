#!/usr/bin/env node
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(root, "native", "www");
const appSrc = path.join(root, "app");
const appDest = path.join(webDir, "app");
const vendorDest = path.join(webDir, "vendor");
const reactSrc = path.join(root, "node_modules", "react", "umd", "react.production.min.js");
const reactDomSrc = path.join(root, "node_modules", "react-dom", "umd", "react-dom.production.min.js");

for (const file of [reactSrc, reactDomSrc]) {
  if (!existsSync(file)) {
    throw new Error(`Missing ${path.relative(root, file)}. Run npm install before preparing native assets.`);
  }
}

await rm(webDir, { recursive: true, force: true });
await mkdir(appDest, { recursive: true });
await mkdir(vendorDest, { recursive: true });
await cp(appSrc, appDest, { recursive: true });
await cp(reactSrc, path.join(vendorDest, "react.production.min.js"));
await cp(reactDomSrc, path.join(vendorDest, "react-dom.production.min.js"));

const appHtmlPath = path.join(appDest, "index.html");
let appHtml = await readFile(appHtmlPath, "utf8");
appHtml = appHtml
  .replace("https://unpkg.com/react@18/umd/react.production.min.js", "/vendor/react.production.min.js")
  .replace("https://unpkg.com/react-dom@18/umd/react-dom.production.min.js", "/vendor/react-dom.production.min.js")
  .replace(
    'if("serviceWorker" in navigator){navigator.serviceWorker.register("/app/sw.js")}',
    '/* Service workers are for the PWA shell and can be noisy under native WKWebView. */'
  );
await writeFile(appHtmlPath, appHtml);

await writeFile(path.join(webDir, "index.html"), appHtml);

console.log(`Prepared native web assets in ${path.relative(root, webDir)}`);
