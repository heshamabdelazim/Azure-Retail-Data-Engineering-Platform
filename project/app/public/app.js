const $ = (selector) => document.querySelector(selector);
let overview = null;
let activeRoot = "app";

document.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll("aside button").forEach((button) => button.onclick = () => show(button.dataset.view, button.textContent));
  $("#refresh").onclick = load;
  $("#runPipeline").onclick = runPipeline;
  $("#query").onclick = query;
  $("#ask").onclick = ask;
  await load();
  setInterval(refreshOperation, 1500);
});

async function load() {
  overview = await get("/api/overview");
  renderOverview();
  renderReports();
  await loadTree(activeRoot);
  await loadDb();
}

function renderOverview() {
  const k = overview.executive?.business_kpis || {};
  const q = overview.executive?.data_quality || {};
  const c = overview.counts || {};
  $("#metrics").innerHTML = [
    ["Revenue", usd(k.total_sales_revenue)],
    ["Orders", num(k.total_orders)],
    ["Sales Rows", num(c.salesRows)],
    ["Retention", pct(q.retention_rate)]
  ].map(([a,b]) => `<div class="card"><span>${a}</span><strong>${b}</strong></div>`).join("");
  $("#quick").innerHTML = overview.importantFiles.map((file) => `<div class="quick"><div><b>${file.name}</b><div class="muted">${file.path} · ${bytes(file.size)}</div></div><button onclick="openFile('${file.path}')">عرض</button></div>`).join("");
  $("#roots").innerHTML = overview.roots.map((root) => `<button class="root ${root.key===activeRoot?"active":""}" onclick="loadTree('${root.key}')">${root.label}</button>`).join("");
}

async function loadTree(root) {
  activeRoot = root;
  if (overview) $("#roots").innerHTML = overview.roots.map((r) => `<button class="root ${r.key===activeRoot?"active":""}" onclick="loadTree('${r.key}')">${r.label}</button>`).join("");
  const data = await get(`/api/tree?root=${encodeURIComponent(root)}`);
  $("#tree").innerHTML = `<div class="tree">${treeHtml(data.items)}</div>`;
}

function treeHtml(items) {
  return items.map((item) => item.type === "directory"
    ? `<div><div class="tree button"><b>${item.name}</b></div><div class="children">${treeHtml(item.children || [])}</div></div>`
    : `<button onclick="openFile('${item.path}')"><span>${item.name}</span><small>${bytes(item.size)}</small></button>`).join("");
}

async function openFile(path) {
  const file = await get(`/api/file?path=${encodeURIComponent(path)}`);
  show("files", "الملفات والكود");
  $("#fileName").textContent = file.name || file.path;
  $("#fileContent").textContent = file.type === "text" ? file.content : `ملف ثنائي: ${file.path}\nالحجم: ${bytes(file.size)}`;
}

async function loadDb() {
  const meta = await get("/api/db/meta");
  $("#objects").innerHTML = meta.exists ? meta.objects.map((object) => `<button class="object" onclick="setSql('SELECT * FROM ${object.name} LIMIT 50;')"><b>${object.name}</b><span>${object.type}${object.count !== null ? ` · ${num(object.count)}` : ""}</span></button>`).join("") : "شغل Pipeline أولًا لإنشاء قاعدة البيانات.";
}

function setSql(sql) {
  $("#sql").value = sql;
  query();
}

async function query() {
  const result = await post("/api/db/query", { sql: $("#sql").value });
  $("#result").innerHTML = table(result.rows, `${result.shownRows} / ${result.rowCount} rows`);
}

function table(rows, caption) {
  if (!rows.length) return `<div class="quick">${caption} - لا توجد نتائج</div>`;
  const cols = Object.keys(rows[0]);
  return `<div class="table"><table><caption>${caption}</caption><thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${escapeHtml(r[c])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

async function runPipeline() {
  await post("/api/operation/run", { days: $("#days").value, customers: $("#customers").value, products: $("#products").value });
  show("run", "تشغيل المشروع");
  refreshOperation();
}

async function refreshOperation() {
  const op = await get("/api/operation/status");
  $("#log").textContent = op.lines.length ? op.lines.join("\n") : "جاهز للتشغيل.";
  if (!op.running && op.exitCode === 0) await loadDb();
}

function renderReports() {
  const reports = ["reports/dashboard.html", "reports/executive_summary.md", "reports/data_quality_report.md", "reports/sql_assistant_examples.sql", "metadata/catalog.json"];
  $("#reportsList").innerHTML = reports.map((path) => `<div class="quick"><b>${path}</b><button onclick="openFile('${path}')">عرض</button></div>`).join("");
}

async function ask() {
  const result = await post("/api/assistant/sql", { question: $("#question").value });
  $("#answer").textContent = result.sql;
  $("#sql").value = result.sql;
}

function show(view, title) {
  document.querySelectorAll(".view").forEach((el) => el.classList.toggle("active", el.id === view));
  document.querySelectorAll("aside button").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $("#title").textContent = title;
}

async function get(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function post(url, body) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function usd(v){return Number(v||0).toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0})}
function num(v){return Number(v||0).toLocaleString("en-US")}
function pct(v){return `${(Number(v||0)*100).toFixed(1)}%`}
function bytes(v){v=Number(v||0);return v<1024?`${v} B`:v<1048576?`${(v/1024).toFixed(1)} KB`:`${(v/1048576).toFixed(1)} MB`}
function escapeHtml(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
