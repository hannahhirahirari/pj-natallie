#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const textFiles = ["index.html", "manual.html", "format.html", "privacy.html", "app/index.html"];
const mustServe = [
  "/",
  "/app/",
  "/manual.html",
  "/format.html",
  "/privacy.html",
  "/app/manifest.json",
  "/app/sw.js",
  "/app/icon-32.png",
  "/app/icon-192.png",
  "/app/icon-512.png",
  "/app/icon-maskable-192.png",
  "/app/icon-maskable-512.png",
  "/app/apple-touch-icon.png",
  "/app/favicon.ico"
];
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon"
};
const results = [];

function ok(name, detail = "") {
  results.push({ pass: true, name, detail });
}

function fail(name, detail = "") {
  results.push({ pass: false, name, detail });
}

function assert(name, condition, detail = "") {
  condition ? ok(name) : fail(name, detail);
}

async function read(rel) {
  return readFile(path.join(root, rel), "utf8");
}

function localPathFromUrl(url) {
  const clean = decodeURIComponent(url.split("#")[0].split("?")[0]);
  if (clean === "/") return "index.html";
  if (clean.endsWith("/")) return clean.slice(1) + "index.html";
  return clean.replace(/^\//, "");
}

function urlFromFileReference(ref, htmlFile) {
  if (/^(https?:|data:|mailto:|tel:|#)/i.test(ref)) return null;
  if (ref.startsWith("/")) return ref;
  const base = "/" + path.dirname(htmlFile).replace(/^\.$/, "");
  return path.posix.normalize(path.posix.join(base, ref));
}

function extractLocalReferences(html, htmlFile) {
  const refs = new Set();
  const attrRe = /\b(?:href|src)=["']([^"']+)["']/g;
  let match;
  while ((match = attrRe.exec(html))) {
    const url = urlFromFileReference(match[1], htmlFile);
    if (url) refs.add(url);
  }
  return [...refs];
}

function findNatKeys(source) {
  return [...new Set([...source.matchAll(/["'`](nat-[a-z0-9-]+)["'`]/g)].map((m) => m[1]))].sort();
}

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      let rel = localPathFromUrl(url.pathname);
      if (existsSync(path.resolve(root, rel)) && !path.extname(rel)) rel = path.join(rel, "index.html");
      const full = path.resolve(root, rel);
      if (!full.startsWith(root + path.sep) || !existsSync(full)) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("not found");
        return;
      }
      const body = await readFile(full);
      res.writeHead(200, { "content-type": mime[path.extname(full)] || "application/octet-stream" });
      res.end(body);
    } catch (error) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end(String(error && error.stack || error));
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function checkUrl(base, url) {
  const response = await fetch(base + url);
  assert(`serves ${url}`, response.status === 200, `HTTP ${response.status}`);
  return response;
}

async function run() {
  const appHtml = await read("app/index.html");
  const sw = await read("app/sw.js");
  const manifest = JSON.parse(await read("app/manifest.json"));
  const readme = await read("README.md");

  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const url of mustServe) await checkUrl(base, url);

    for (const file of textFiles) {
      const html = await read(file);
      for (const ref of extractLocalReferences(html, file)) {
        const response = await fetch(base + ref);
        assert(`${file} local asset exists: ${ref}`, response.status === 200, `HTTP ${response.status}`);
      }
    }

    const manifestHref = appHtml.match(/<link[^>]+rel=["']manifest["'][^>]+href=["']([^"']+)["']/i)?.[1];
    assert("app manifest link uses /app/manifest.json", manifestHref === "/app/manifest.json", manifestHref || "missing");
    assert("app registers /app/sw.js", /serviceWorker\.register\(["']\/app\/sw\.js["']\)/.test(appHtml), "service worker registration did not match");
    assert("manifest start_url is /app/", manifest.start_url === "/app/", manifest.start_url);
    assert("manifest scope is /app/", manifest.scope === "/app/", manifest.scope);

    for (const icon of manifest.icons || []) {
      assert(`manifest icon is scoped to /app/: ${icon.src}`, icon.src.startsWith("/app/"), icon.src);
      assert(`manifest icon file exists: ${icon.src}`, existsSync(path.join(root, localPathFromUrl(icon.src))), icon.src);
    }

    const cacheMatch = sw.match(/const FILES = \[([\s\S]*?)\];/);
    assert("service worker has a FILES precache list", !!cacheMatch);
    const cachedUrls = cacheMatch ? [...cacheMatch[1].matchAll(/["']([^"']+)["']/g)].map((m) => m[1]) : [];
    for (const url of ["/app/", "/app/index.html", "/app/manifest.json", "/app/icon-192.png", "/app/icon-512.png"]) {
      assert(`service worker precaches ${url}`, cachedUrls.includes(url));
    }
    for (const url of cachedUrls) {
      assert(`service worker cached file exists: ${url}`, existsSync(path.join(root, localPathFromUrl(url))), url);
    }
    assert("service worker offline fallback is /app/index.html", /caches\.match\(["']\/app\/index\.html["']\)/.test(sw));

    const externalScripts = [...appHtml.matchAll(/<script[^>]+src=["'](https?:\/\/[^"']+)["']/gi)].map((m) => m[1]);
    const allowedExternalScripts = externalScripts.filter((src) => /^https:\/\/unpkg\.com\/react(?:-dom)?@18\/umd\/react(?:-dom)?\.production\.min\.js$/.test(src));
    assert("only React CDN scripts are loaded externally", externalScripts.length === allowedExternalScripts.length, externalScripts.join(", ") || "none");
    assert("no common analytics SDK strings in app", !/(google-analytics|googletagmanager|gtag\(|mixpanel|segment\.com|plausible|posthog|amplitude)/i.test(appHtml));

    const natKeys = findNatKeys(appHtml);
    const readmeKeys = findNatKeys(readme);
    for (const key of natKeys) {
      assert(`README documents ${key}`, readmeKeys.includes(key));
      assert(`reset-everything removes ${key}`, new RegExp(`rms\\(["']${key}["']\\)`).test(appHtml));
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  const failed = results.filter((r) => !r.pass);
  for (const result of results) {
    const mark = result.pass ? "PASS" : "FAIL";
    console.log(`${mark} ${result.name}${result.detail ? ` (${result.detail})` : ""}`);
  }
  if (failed.length) {
    console.error(`\n${failed.length} pre-deploy check${failed.length === 1 ? "" : "s"} failed.`);
    console.error("If this failed after an intentional refactor, update scripts/predeploy-check.mjs, TEST_PLAN.md, and README.md in the same PR.");
    process.exit(1);
  }
  console.log(`\n${results.length} pre-deploy checks passed.`);
}

run().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
