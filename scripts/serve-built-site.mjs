#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const host = process.env.HOST || "127.0.0.1";
const port = Number.parseInt(process.env.PORT || "0", 10);
const siteRoot = path.resolve(process.env.SITE_DIR || "site");

if (!fs.existsSync(siteRoot) || !fs.statSync(siteRoot).isDirectory()) {
  console.error(`Built site directory is missing: ${siteRoot}`);
  process.exit(1);
}

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

const server = http.createServer((request, response) => {
  if (!request.url || !["GET", "HEAD"].includes(request.method || "")) {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${host}`).pathname);
  } catch {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }

  const relativePath = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  let filePath = path.resolve(siteRoot, `.${relativePath}`);
  if (filePath !== siteRoot && !filePath.startsWith(`${siteRoot}${path.sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const stat = fs.statSync(filePath);
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Length": stat.size,
    "Content-Type": contentTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream",
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  const address = server.address();
  const activePort = typeof address === "object" && address ? address.port : port;
  console.log(JSON.stringify({ ready: true, url: `http://${host}:${activePort}/` }));
});

const stop = () => server.close(() => process.exit(0));
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
