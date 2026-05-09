import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BlobServiceClient } from "@azure/storage-blob";
import sql from "mssql";
import { runAzurePipeline } from "./azurePipeline.mjs";

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = fs.existsSync(path.join(thisDir, "app", "public"))
  ? thisDir
  : path.resolve(thisDir, "..", "..");
const publicDir = path.join(projectRoot, "app", "public");
const port = Number(process.env.PORT || 8080);
const containerName = process.env.DATA_LAKE_CONTAINER || "smartretail";

let operation = { running: false, lines: [], exitCode: null, startedAt: null, finishedAt: null };

const server = http.createServer(async (request, response) => {
  try {
    await route(request, response);
  } catch (error) {
    json(response, 500, { error: error.message });
  }
});

server.listen(port, () => {
  console.log(`Smart Retail Pro Azure web app is running on port ${port}`);
});

async function route(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === "/" || pathname === "/index.html") return staticFile(response, path.join(publicDir, "index.html"));
  if (pathname.startsWith("/assets/")) return staticFile(response, path.join(publicDir, pathname.slice("/assets/".length)));
  if (pathname.startsWith("/project/")) return projectFile(response, pathname.slice("/project/".length));
  if (pathname === "/api/overview") return json(response, 200, await overview());
  if (pathname === "/api/tree") return json(response, 200, await tree(url.searchParams.get("root") || "app"));
  if (pathname === "/api/file") return json(response, 200, await fileInfo(url.searchParams.get("path") || ""));
  if (pathname === "/api/db/meta") return json(response, 200, await dbMeta());
  if (pathname === "/api/db/query" && request.method === "POST") return json(response, 200, await dbQuery(await body(request)));
  if (pathname === "/api/assistant/sql" && request.method === "POST") return json(response, 200, assistantSql(await body(request)));
  if (pathname === "/api/operation/run" && request.method === "POST") return json(response, 202, startPipeline(await body(request)));
  if (pathname === "/api/operation/status") return json(response, 200, operation);
  return text(response, 404, "Not found");
}

async function overview() {
  const executive = await readBlobJson("reports/executive_summary.json");
  const quality = await readBlobJson("reports/data_quality_report.json");
  return {
    rootDir: "Azure App Service",
    mode: "azure",
    executive,
    quality,
    counts: await databaseCounts(),
    importantFiles: [
      "reports/dashboard.html",
      "reports/executive_summary.md",
      "reports/data_quality_report.md",
      "reports/sql_assistant_examples.sql",
      "metadata/catalog.json",
      "app/public/index.html",
      "azure/web/server.mjs",
      "azure/web/azurePipeline.mjs",
      "azure/infra/main.bicep"
    ].map((item) => ({ name: path.basename(item), path: item, size: null })),
    roots: [
      { key: "app", label: "الكود والواجهة" },
      { key: "azure", label: "Azure" },
      { key: "reports", label: "التقارير السحابية" },
      { key: "metadata", label: "Metadata" }
    ]
  };
}

async function tree(root) {
  if (root === "reports" || root === "metadata") return { root, items: await blobTree(root) };
  if (!["app", "azure"].includes(root)) throw new Error("Path is not exposed.");
  const absolute = path.join(projectRoot, root);
  return { root, items: walk(absolute, root, 4) };
}

function walk(dir, relative, depth) {
  if (!fs.existsSync(dir) || depth < 0) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith("."))
    .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
    .slice(0, 120)
    .map((entry) => {
      const abs = path.join(dir, entry.name);
      const rel = path.join(relative, entry.name).replaceAll(path.sep, "/");
      const stat = fs.statSync(abs);
      const node = { name: entry.name, path: rel, type: entry.isDirectory() ? "directory" : "file", size: entry.isFile() ? stat.size : null };
      if (entry.isDirectory()) node.children = walk(abs, rel, depth - 1);
      return node;
    });
}

async function blobTree(prefix) {
  const container = containerClient();
  const items = [];
  for await (const blob of container.listBlobsFlat({ prefix: `${prefix}/` })) {
    items.push({ name: path.posix.basename(blob.name), path: blob.name, type: "file", size: blob.properties.contentLength ?? null });
  }
  return items.slice(0, 250);
}

async function fileInfo(relative) {
  const clean = normalizeRelative(relative);
  if (clean.startsWith("reports/") || clean.startsWith("metadata/") || clean.startsWith("data/")) {
    const content = await readBlobText(clean);
    return { path: clean, name: path.posix.basename(clean), size: Buffer.byteLength(content), type: "text", content: content.slice(0, 400000) };
  }
  const abs = safeLocalPath(clean);
  const stat = fs.statSync(abs);
  if (stat.isDirectory()) return { path: clean, type: "directory" };
  const content = fs.readFileSync(abs, "utf8");
  return { path: clean, name: path.basename(abs), size: stat.size, type: "text", content: content.slice(0, 400000) };
}

async function projectFile(response, relative) {
  const clean = normalizeRelative(relative);
  if (clean.startsWith("reports/") || clean.startsWith("metadata/") || clean.startsWith("data/")) {
    const blob = containerClient().getBlockBlobClient(clean);
    if (!(await blob.exists())) return text(response, 404, "Not found");
    const download = await blob.download();
    response.writeHead(200, { "Content-Type": mime(clean), "Cache-Control": "no-store" });
    return download.readableStreamBody.pipe(response);
  }
  return staticFile(response, safeLocalPath(clean));
}

async function dbMeta() {
  const pool = await sqlPool();
  const objects = await pool.request().query(`
    SELECT TABLE_NAME AS name, 'table' AS type
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
    UNION ALL
    SELECT TABLE_NAME AS name, 'view' AS type
    FROM INFORMATION_SCHEMA.VIEWS
    ORDER BY type, name;
  `);
  return { exists: true, objects: objects.recordset.map((item) => ({ ...item, count: null })) };
}

async function dbQuery(input) {
  const query = String(input.sql || "").trim().replace(/;+\s*$/, "");
  if (!/^(select|with)\s/i.test(query) || query.includes(";")) throw new Error("Read-only SELECT/WITH queries only.");
  const pool = await sqlPool();
  const started = Date.now();
  const result = await pool.request().query(query);
  const rows = result.recordset || [];
  return { rows: rows.slice(0, 500), rowCount: rows.length, shownRows: Math.min(rows.length, 500), durationMs: Date.now() - started };
}

function assistantSql(input) {
  const q = String(input.question || "").toLowerCase();
  if (q.includes("quality") || q.includes("جودة")) return { sql: "SELECT * FROM vw_data_quality_health;" };
  if (q.includes("city") || q.includes("segment") || q.includes("مدينة")) return { sql: "SELECT TOP 20 * FROM vw_city_segment_sales;" };
  if (q.includes("product") || q.includes("منتج")) return { sql: "SELECT TOP 10 * FROM vw_top_products;" };
  if (q.includes("funnel") || q.includes("cart")) return { sql: "SELECT TOP 20 * FROM vw_behavior_funnel;" };
  return { sql: "SELECT * FROM vw_retail_kpi_scorecard;" };
}

function startPipeline(input) {
  if (operation.running) return operation;
  operation = { running: true, lines: [], exitCode: null, startedAt: new Date().toISOString(), finishedAt: null };
  runAzurePipeline(input, {
    containerName,
    logger: (line) => {
      operation.lines.push(line);
      operation.lines = operation.lines.slice(-800);
    }
  }).then(() => {
    operation.running = false;
    operation.exitCode = 0;
    operation.finishedAt = new Date().toISOString();
    operation.lines.push("Azure pipeline finished successfully.");
  }).catch((error) => {
    operation.running = false;
    operation.exitCode = 1;
    operation.finishedAt = new Date().toISOString();
    operation.lines.push(`ERROR: ${error.message}`);
  });
  return operation;
}

async function databaseCounts() {
  try {
    const pool = await sqlPool();
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT_BIG(*) FROM fact_sales) AS salesRows,
        (SELECT COUNT_BIG(*) FROM fact_web_event) AS eventRows,
        (SELECT COUNT_BIG(*) FROM dim_customer) AS customers,
        (SELECT COUNT_BIG(*) FROM dim_product) AS products;
    `);
    return result.recordset[0] ?? null;
  } catch {
    return null;
  }
}

async function sqlPool() {
  if (!process.env.SQL_CONNECTION_STRING) throw new Error("SQL_CONNECTION_STRING app setting is missing.");
  if (!globalThis.smartRetailSqlPool) {
    globalThis.smartRetailSqlPool = await sql.connect(process.env.SQL_CONNECTION_STRING);
  }
  return globalThis.smartRetailSqlPool;
}

function containerClient() {
  if (!process.env.AZURE_STORAGE_CONNECTION_STRING) throw new Error("AZURE_STORAGE_CONNECTION_STRING app setting is missing.");
  if (!globalThis.smartRetailContainer) {
    const service = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
    globalThis.smartRetailContainer = service.getContainerClient(containerName);
  }
  return globalThis.smartRetailContainer;
}

async function readBlobJson(name) {
  try {
    return JSON.parse(await readBlobText(name));
  } catch {
    return null;
  }
}

async function readBlobText(name) {
  const blob = containerClient().getBlockBlobClient(name);
  if (!(await blob.exists())) throw new Error(`Blob not found: ${name}`);
  return await blob.downloadToBuffer().then((buffer) => buffer.toString("utf8"));
}

function safeLocalPath(relative) {
  const clean = normalizeRelative(relative);
  const top = clean.split("/")[0];
  if (!["app", "azure", "docs"].includes(top)) throw new Error("Path is not exposed.");
  const abs = path.resolve(projectRoot, clean);
  if (!(abs === projectRoot || abs.startsWith(`${projectRoot}${path.sep}`))) throw new Error("Path is outside project.");
  return abs;
}

function normalizeRelative(relative) {
  return String(relative || "").replaceAll("\\", "/").replace(/^\/+/, "");
}

function staticFile(response, file) {
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return text(response, 404, "Not found");
  response.writeHead(200, { "Content-Type": mime(file), "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(response);
}

async function body(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

function json(response, status, value) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(value));
}

function text(response, status, value) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(value);
}

function mime(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".csv": "text/csv; charset=utf-8",
    ".sql": "application/sql; charset=utf-8",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  }[ext] || "application/octet-stream";
}
