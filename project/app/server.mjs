import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execFile, spawn, spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { paths, rootDir } from "./config.mjs";
import { readJsonIfExists, safeRelative } from "./lib/fsx.mjs";

const port = Number(readArg("--port") || 4173);
const shouldOpen = process.argv.includes("--open");
const textExtensions = new Set([".mjs", ".js", ".py", ".json", ".md", ".sql", ".csv", ".jsonl", ".txt", ".html", ".css", ".cmd", ".ps1", ".bicep"]);
const exposedRoots = ["app", "azure", "data", "warehouse", "reports", "docs", "metadata", "runtime", "launcher"];
const rootFiles = ["README_AR.md", "README_PYTHON_AR.md", "README_AZURE_AR.md", "START_PROJECT.cmd", "RUN_PIPELINE.cmd", "RUN_TESTS.cmd", "RUN_PYTHON_PIPELINE.cmd", "RUN_PYTHON_TESTS.cmd", "RUN_AZURE_DEPLOY.cmd", "SmartRetailProject.exe", "package.json"];

let operation = { running: false, lines: [], exitCode: null, startedAt: null, finishedAt: null };

const server = http.createServer(async (request, response) => {
  try {
    await route(request, response);
  } catch (error) {
    json(response, 500, { error: error.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${port}`;
  console.log(`Smart Retail Pro is running at ${url}`);
  if (shouldOpen) openBrowser(url);
});

async function route(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  if (pathname === "/" || pathname === "/index.html") return staticFile(response, path.join(paths.public, "index.html"));
  if (pathname.startsWith("/assets/")) return staticFile(response, path.join(paths.public, pathname.slice("/assets/".length)));
  if (pathname.startsWith("/project/")) return projectFile(response, pathname.slice("/project/".length));
  if (pathname === "/api/overview") return json(response, 200, overview());
  if (pathname === "/api/tree") return json(response, 200, tree(url.searchParams.get("root") || "app"));
  if (pathname === "/api/file") return json(response, 200, fileInfo(url.searchParams.get("path") || ""));
  if (pathname === "/api/db/meta") return json(response, 200, dbMeta());
  if (pathname === "/api/db/query" && request.method === "POST") return json(response, 200, dbQuery(await body(request)));
  if (pathname === "/api/assistant/sql" && request.method === "POST") return json(response, 200, assistantSql(await body(request)));
  if (pathname === "/api/operation/run" && request.method === "POST") return json(response, 202, startPipeline(await body(request)));
  if (pathname === "/api/operation/status") return json(response, 200, operation);
  return text(response, 404, "Not found");
}

function overview() {
  const executive = readJsonIfExists(path.join(paths.reports, "executive_summary.json"));
  const quality = readJsonIfExists(path.join(paths.reports, "data_quality_report.json"));
  return {
    rootDir,
    executive,
    quality,
    counts: databaseCounts(),
    importantFiles: [
      "README_AR.md",
      "README_PYTHON_AR.md",
      "README_AZURE_AR.md",
      "START_PROJECT.cmd",
      "RUN_PYTHON_PIPELINE.cmd",
      "RUN_AZURE_DEPLOY.cmd",
      "SmartRetailProject.exe",
      "reports/dashboard.html",
      "reports/executive_summary.md",
      "reports/data_quality_report.md",
      "docs/SmartRetailPro_Project_Report.docx",
      "docs/SmartRetailPro_Presentation.pptx",
      "docs/SmartRetailPro_Code_Walkthrough.pptx",
      "docs/SmartRetailPro_Database_SQL.pptx",
      "docs/SmartRetailPro_Data_Pipeline_Deep_Dive.pptx",
      "docs/SmartRetailPro_UX_UI_Walkthrough.pptx",
      "docs/SmartRetailPro_Deployment_Run_Guide.pptx",
      "docs/SmartRetailPro_Python_Implementation.pptx",
      "docs/SmartRetailPro_Testing_QA.pptx",
      "docs/SmartRetailPro_Business_Value.pptx",
      "docs/SmartRetailPro_Project_Defense_QA.pptx",
      "warehouse/smart_retail.sqlite",
      "app/pipeline.mjs",
      "app/python/smart_retail_pipeline.py",
      "azure/infra/main.bicep",
      "azure/web/server.mjs",
      "azure/web/azurePipeline.mjs",
      "app/sql/schema.sql"
    ].map(summaryFile).filter(Boolean),
    roots: exposedRoots.filter((root) => fs.existsSync(path.join(rootDir, root))).map((root) => ({ key: root, label: labelForRoot(root) }))
  };
}

function tree(root) {
  if (!exposedRoots.includes(root)) throw new Error("Path is not exposed.");
  const absolute = path.join(rootDir, root);
  return { root, items: walk(absolute, root, 5) };
}

function walk(dir, relative, depth) {
  if (!fs.existsSync(dir) || depth < 0) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith("."))
    .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
    .map((entry) => {
      const abs = path.join(dir, entry.name);
      const rel = path.join(relative, entry.name);
      const stat = fs.statSync(abs);
      const node = { name: entry.name, path: rel.split(path.sep).join("/"), type: entry.isDirectory() ? "directory" : "file", size: entry.isFile() ? stat.size : null };
      if (entry.isDirectory()) node.children = walk(abs, rel, depth - 1);
      return node;
    });
}

function fileInfo(relative) {
  const abs = safePath(relative);
  const stat = fs.statSync(abs);
  if (stat.isDirectory()) return { path: relative, type: "directory" };
  const ext = path.extname(abs).toLowerCase();
  const result = { path: safeRelative(rootDir, abs), name: path.basename(abs), size: stat.size, type: textExtensions.has(ext) ? "text" : "binary" };
  if (result.type === "text") result.content = fs.readFileSync(abs, "utf8").slice(0, 400000);
  return result;
}

function projectFile(response, relative) {
  return staticFile(response, safePath(relative));
}

function dbMeta() {
  if (!fs.existsSync(paths.warehouseFile)) return { exists: false, objects: [] };
  const db = new DatabaseSync(paths.warehouseFile, { readOnly: true });
  try {
    const objects = db.prepare("SELECT name,type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY type,name").all()
      .map((object) => ({ ...object, count: object.type === "table" ? countRows(db, object.name) : null }));
    return { exists: true, file: paths.warehouseFile, objects };
  } finally {
    db.close();
  }
}

function dbQuery(input) {
  const sql = String(input.sql || "").trim().replace(/;+\s*$/, "");
  if (!/^(select|with|pragma)\s/i.test(sql) || sql.includes(";")) throw new Error("Read-only SELECT/WITH/PRAGMA queries only.");
  const db = new DatabaseSync(paths.warehouseFile, { readOnly: true });
  try {
    const started = Date.now();
    const rows = db.prepare(sql).all();
    return { rows: rows.slice(0, 500), rowCount: rows.length, shownRows: Math.min(rows.length, 500), durationMs: Date.now() - started };
  } finally {
    db.close();
  }
}

function assistantSql(input) {
  const q = String(input.question || "").toLowerCase();
  if (q.includes("quality") || q.includes("جودة")) return { sql: "SELECT * FROM vw_data_quality_health;" };
  if (q.includes("city") || q.includes("segment") || q.includes("مدينة")) return { sql: "SELECT * FROM vw_city_segment_sales LIMIT 20;" };
  if (q.includes("product") || q.includes("منتج")) return { sql: "SELECT * FROM vw_top_products LIMIT 10;" };
  if (q.includes("funnel") || q.includes("cart")) return { sql: "SELECT * FROM vw_behavior_funnel LIMIT 20;" };
  return { sql: "SELECT * FROM vw_retail_kpi_scorecard;" };
}

function startPipeline(input) {
  if (operation.running) return operation;
  operation = { running: true, lines: [], exitCode: null, startedAt: new Date().toISOString(), finishedAt: null };
  
  const py = getPythonCmd();
  const args = [...py.args, path.join(rootDir, "app", "python", "smart_retail_pipeline.py"), "run"];
  
  if (input.days) args.push("--days", String(input.days));
  if (input.customers) args.push("--customers", String(input.customers));
  if (input.products) args.push("--products", String(input.products));
  if (input.seed) args.push("--seed", String(input.seed));

  const child = spawn(py.cmd, args, { cwd: rootDir, env: process.env });
  
  child.stdout.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/).filter(Boolean);
    for (const line of lines) operation.lines.push(line);
    operation.lines = operation.lines.slice(-800);
  });

  child.stderr.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/).filter(Boolean);
    for (const line of lines) operation.lines.push(`ERROR: ${line}`);
    operation.lines = operation.lines.slice(-800);
  });

  child.on("close", (code) => {
    operation.running = false;
    operation.exitCode = code;
    operation.finishedAt = new Date().toISOString();
    if (code === 0) {
      operation.lines.push("Pipeline finished successfully.");
    } else {
      operation.lines.push(`Pipeline failed with exit code ${code}.`);
    }
  });

  child.on("error", (error) => {
    operation.running = false;
    operation.exitCode = 1;
    operation.finishedAt = new Date().toISOString();
    operation.lines.push(`ERROR: ${error.message}`);
  });

  return operation;
}

function getPythonCmd() {
  const isWin = process.platform === "win32";
  if (isWin) {
    if (spawnSync("py", ["-3", "--version"]).status === 0) return { cmd: "py", args: ["-3"] };
  }
  if (spawnSync("python3", ["--version"]).status === 0) return { cmd: "python3", args: [] };
  if (spawnSync("python", ["--version"]).status === 0) return { cmd: "python", args: [] };
  return { cmd: "python", args: [] };
}

function databaseCounts() {
  if (!fs.existsSync(paths.warehouseFile)) return null;
  const db = new DatabaseSync(paths.warehouseFile, { readOnly: true });
  try {
    return db.prepare("SELECT (SELECT COUNT(*) FROM fact_sales) salesRows, (SELECT COUNT(*) FROM fact_web_event) eventRows, (SELECT COUNT(*) FROM dim_customer) customers, (SELECT COUNT(*) FROM dim_product) products").get();
  } catch {
    return null;
  } finally {
    db.close();
  }
}

function countRows(db, name) {
  try {
    return db.prepare(`SELECT COUNT(*) count FROM "${name.replaceAll('"', '""')}"`).get().count;
  } catch {
    return null;
  }
}

function summaryFile(relative) {
  const abs = path.join(rootDir, relative);
  if (!fs.existsSync(abs)) return null;
  const stat = fs.statSync(abs);
  return { name: path.basename(relative), path: relative, size: stat.size };
}

function safePath(relative) {
  const clean = String(relative).replaceAll("\\", "/").replace(/^\/+/, "");
  const top = clean.split("/")[0];
  if (!exposedRoots.includes(top) && !rootFiles.includes(clean)) throw new Error("Path is not exposed.");
  const abs = path.resolve(rootDir, clean);
  if (!(abs === rootDir || abs.startsWith(`${rootDir}${path.sep}`))) throw new Error("Path is outside project.");
  return abs;
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
    ".sqlite": "application/vnd.sqlite3"
  }[ext] || "application/octet-stream";
}

function labelForRoot(root) {
  return {
    app: "الكود والواجهة",
    azure: "Azure Cloud",
    data: "طبقات البيانات",
    warehouse: "قاعدة البيانات",
    reports: "التقارير",
    docs: "ملفات Word وPowerPoint",
    metadata: "Metadata",
    runtime: "Runtime",
    launcher: "Launcher"
  }[root] ?? root;
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function openBrowser(url) {
  const command = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  execFile(command, args, { windowsHide: true }, () => {});
}
