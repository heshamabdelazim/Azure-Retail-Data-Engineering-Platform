import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { defaults, paths, rootDir } from "./config.mjs";
import { readCsv, writeCsv } from "./lib/csv.mjs";
import { ensureDir, listFiles, resetDir, safeRelative, sha256, writeJson } from "./lib/fsx.mjs";
import { Random } from "./lib/rng.mjs";
import { addDays, isoDate, isoStamp, money, monthKey, ratio } from "./lib/time.mjs";

const names = ["Nour", "Adam", "Lina", "Omar", "Maya", "Youssef", "Sara", "Malik", "Jana", "Karim", "Hana", "Ziad"];
const surnames = ["Hassan", "Mansour", "Amin", "Younes", "Nasser", "Ibrahim", "Khaled", "Maher", "Saleh", "Fouad"];
const cities = ["Cairo", "Alexandria", "Giza", "Mansoura", "Tanta", "Aswan", "Luxor", "Zagazig"];
const segments = ["Consumer", "SMB", "Corporate"];
const channels = ["Store", "Online", "Mobile App"];
const payments = ["Card", "Cash", "Wallet", "Installments"];
const categories = ["Electronics", "Home", "Grocery", "Beauty", "Sports", "Books"];
const productNames = {
  Electronics: ["Smart Watch", "USB-C Hub", "Wireless Mouse", "Bluetooth Speaker"],
  Home: ["Desk Lamp", "Cotton Sheet Set", "Storage Basket", "Cookware Set"],
  Grocery: ["Premium Coffee", "Olive Oil", "Organic Dates", "Green Tea"],
  Beauty: ["Vitamin C Serum", "Hydrating Cream", "Matte Lipstick", "Sunscreen"],
  Sports: ["Yoga Mat", "Resistance Bands", "Training Gloves", "Fitness Bottle"],
  Books: ["SQL Field Notes", "Retail Analytics Guide", "Cloud Primer", "AI Playbook"]
};

export async function runPipeline(options = {}, logger = () => {}) {
  const settings = normalizeOptions(options);
  const runId = `run_${new Date().toISOString().replaceAll(/[-:.TZ]/g, "").slice(0, 14)}`;
  const startedAt = Date.now();
  const stageMetrics = [];
  const stage = async (name, fn) => {
    const stageStart = Date.now();
    logger(`▶ ${name}`);
    const result = await fn();
    const metric = { stage: name, duration_ms: Date.now() - stageStart, ...(result?.metrics ?? {}) };
    stageMetrics.push(metric);
    logger(`✓ ${name} completed in ${metric.duration_ms}ms`);
    return result;
  };

  ensureDir(paths.reports);
  logger(`Starting Smart Retail Pro pipeline: ${runId}`);
  const source = await stage("source_generation", () => generateSource(settings));
  const bronze = await stage("bronze_ingestion", () => ingestBronze(runId));
  const silver = await stage("silver_transformation", () => transformSilver(bronze));
  const gold = await stage("gold_publishing", () => publishGold(silver));
  const warehouse = await stage("warehouse_loading", () => loadWarehouse(runId, stageMetrics, gold.summary));
  const docs = await stage("documentation_outputs", () => generateReports(source, silver, gold, warehouse));

  const summary = {
    run_id: runId,
    status: "success",
    started_at: new Date(startedAt).toISOString(),
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    stages: stageMetrics,
    outputs: docs.outputs,
    warehouse: warehouse.file
  };
  writeJson(path.join(paths.reports, "pipeline_summary.json"), summary);
  logger(`Pipeline finished successfully in ${(summary.duration_ms / 1000).toFixed(2)}s`);
  return summary;
}

export function cleanOutputs() {
  resetDir(paths.data);
  resetDir(paths.reports);
  resetDir(paths.warehouse);
  resetDir(paths.metadata);
}

function normalizeOptions(options) {
  const number = (key) => Number.isFinite(Number(options[key])) ? Number(options[key]) : defaults[key];
  return {
    days: number("days"),
    customers: number("customers"),
    products: number("products"),
    minOrdersPerDay: defaults.minOrdersPerDay,
    maxOrdersPerDay: defaults.maxOrdersPerDay,
    seed: number("seed")
  };
}

function generateSource(settings) {
  resetDir(paths.source);
  const rng = new Random(settings.seed);
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = addDays(end, -(settings.days - 1));
  const customers = buildCustomers(rng, settings.customers, start);
  const products = buildProducts(rng, settings.products);
  writeCsv(path.join(paths.source, "customers.csv"), customers, ["customer_id", "name", "email", "city", "segment", "signup_date"]);
  writeCsv(path.join(paths.source, "products.csv"), products, ["product_id", "sku", "category", "product_name", "price", "active_status"]);

  let orderCounter = 100000;
  let eventCounter = 700000;
  let salesRows = 0;
  let eventRows = 0;
  for (let d = 0; d < settings.days; d += 1) {
    const day = addDays(start, d);
    const dayKey = isoDate(day);
    const sales = [];
    const events = [];
    const orders = rng.int(settings.minOrdersPerDay, settings.maxOrdersPerDay);
    for (let o = 0; o < orders; o += 1) {
      const orderId = `ORD${orderCounter++}`;
      const customer = rng.pick(customers);
      const lineCount = rng.int(1, 4);
      for (let line = 1; line <= lineCount; line += 1) {
        const product = rng.pick(products);
        const quantity = rng.int(1, 5);
        const gross = money(Number(product.price) * quantity);
        const discount = money(gross * rng.pick([0, 0, 0.05, 0.1, 0.15]));
        const row = {
          order_id: orderId,
          order_line_no: line,
          order_datetime: randomStamp(rng, day),
          customer_id: customer.customer_id,
          product_id: product.product_id,
          quantity,
          unit_price: product.price,
          discount_amount: discount,
          gross_amount: gross,
          net_amount: money(gross - discount),
          payment_method: rng.pick(payments),
          sales_channel: rng.pick(channels)
        };
        injectQualityIssue(rng, row);
        sales.push(row);
      }
    }
    for (let i = 0; i < Math.max(1, Math.floor(sales.length * 0.015)); i += 1) sales.push({ ...rng.pick(sales) });
    for (let i = 0; i < orders * rng.int(5, 8); i += 1) {
      const product = rng.pick(products);
      const type = rng.pick(["product_view", "add_to_cart", "checkout_start", "search"]);
      events.push({
        event_id: `EVT${eventCounter++}`,
        event_timestamp: randomStamp(rng, day),
        customer_id: rng.pick(customers).customer_id,
        session_id: `SES${rng.int(10000, 99999)}`,
        event_type: type,
        product_id: type === "search" ? "" : product.product_id,
        search_term: type === "search" ? rng.pick(["coffee", "laptop", "gift", "fitness", "beauty"]) : "",
        channel: rng.pick(channels),
        device: rng.pick(["Web", "Android", "iOS", "Tablet"])
      });
    }
    const salesDir = path.join(paths.source, "sales", `date=${dayKey}`);
    const eventsDir = path.join(paths.source, "events", `date=${dayKey}`);
    ensureDir(salesDir);
    ensureDir(eventsDir);
    writeCsv(path.join(salesDir, `sales_${dayKey}.csv`), sales, [
      "order_id", "order_line_no", "order_datetime", "customer_id", "product_id", "quantity",
      "unit_price", "discount_amount", "gross_amount", "net_amount", "payment_method", "sales_channel"
    ]);
    fs.writeFileSync(path.join(eventsDir, `events_${dayKey}.jsonl`), `${events.map((event) => JSON.stringify(event)).join("\n")}\n`, "utf8");
    salesRows += sales.length;
    eventRows += events.length;
  }
  const manifest = { generated_at: isoStamp(), settings, customers: customers.length, products: products.length, sales_rows: salesRows, event_rows: eventRows };
  writeJson(path.join(paths.source, "source_manifest.json"), manifest);
  return { manifest, metrics: { source_sales_rows: salesRows, source_event_rows: eventRows } };
}

function ingestBronze(runId) {
  const runRoot = path.join(paths.bronze, runId);
  resetDir(runRoot);
  const manifest = [];
  for (const file of listFiles(paths.source)) {
    const relative = safeRelative(paths.source, file);
    const target = path.join(runRoot, "raw", relative);
    ensureDir(path.dirname(target));
    fs.copyFileSync(file, target);
    const stat = fs.statSync(file);
    manifest.push({ run_id: runId, source_file: relative, bronze_file: safeRelative(rootDir, target), bytes: stat.size, sha256: sha256(file), ingested_at: isoStamp() });
  }
  writeCsv(path.join(runRoot, "ingestion_manifest.csv"), manifest, ["run_id", "source_file", "bronze_file", "bytes", "sha256", "ingested_at"]);
  return { runRoot, metrics: { bronze_files: manifest.length } };
}

function transformSilver(bronze) {
  resetDir(paths.silver);
  const raw = path.join(bronze.runRoot, "raw");
  const customers = unique(readCsv(path.join(raw, "customers.csv")), "customer_id");
  const products = unique(readCsv(path.join(raw, "products.csv")), "product_id");
  const customerIds = new Set(customers.map((row) => row.customer_id));
  const productIds = new Set(products.map((row) => row.product_id));
  const seen = new Set();
  const sales = [];
  const rejected = [];
  const metrics = { before: 0, duplicates: 0, invalid_quantity: 0, invalid_amount: 0, null_critical: 0, invalid_reference: 0 };

  for (const file of listFiles(path.join(raw, "sales")).filter((item) => item.endsWith(".csv"))) {
    for (const row of readCsv(file)) {
      metrics.before += 1;
      const reasons = [];
      const key = `${row.order_id}|${row.order_line_no}`;
      const date = new Date(row.order_datetime);
      const quantity = Number(row.quantity);
      const gross = Number(row.gross_amount);
      const net = Number(row.net_amount);
      if (seen.has(key)) { metrics.duplicates += 1; reasons.push("duplicate_order_line"); } else seen.add(key);
      if (!row.order_id || !row.order_line_no || !row.order_datetime || !row.customer_id || !row.product_id) { metrics.null_critical += 1; reasons.push("missing_critical_field"); }
      if (!Number.isFinite(quantity) || quantity <= 0) { metrics.invalid_quantity += 1; reasons.push("invalid_quantity"); }
      if (!Number.isFinite(gross) || gross <= 0 || !Number.isFinite(net) || net <= 0) { metrics.invalid_amount += 1; reasons.push("invalid_amount"); }
      if (!customerIds.has(row.customer_id) || !productIds.has(row.product_id)) { metrics.invalid_reference += 1; reasons.push("invalid_reference"); }
      if (Number.isNaN(date.getTime())) reasons.push("invalid_datetime");
      if (reasons.length) {
        rejected.push({ ...row, rejection_reason: [...new Set(reasons)].join(";") });
      } else {
        sales.push({
          order_id: row.order_id,
          order_line_no: Number(row.order_line_no),
          order_datetime: isoStamp(date),
          order_date: isoDate(date),
          year_month: monthKey(date),
          customer_id: row.customer_id,
          product_id: row.product_id,
          quantity,
          unit_price: money(row.unit_price),
          discount_amount: money(row.discount_amount),
          gross_amount: money(row.gross_amount),
          net_amount: money(row.net_amount),
          payment_method: row.payment_method,
          sales_channel: row.sales_channel
        });
      }
    }
  }

  const events = [];
  for (const file of listFiles(path.join(raw, "events")).filter((item) => item.endsWith(".jsonl"))) {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean)) {
      const event = JSON.parse(line);
      const date = new Date(event.event_timestamp);
      if (!Number.isNaN(date.getTime()) && customerIds.has(event.customer_id)) {
        events.push({ ...event, event_date: isoDate(date), event_timestamp: isoStamp(date) });
      }
    }
  }
  const quality = {
    generated_at: isoStamp(),
    sales_quality: {
      ...metrics,
      after: sales.length,
      rejected: rejected.length,
      retention_rate: ratio(sales.length, metrics.before),
      duplicate_rate: ratio(metrics.duplicates, metrics.before),
      invalid_quantity_rate: ratio(metrics.invalid_quantity, metrics.before),
      invalid_amount_rate: ratio(metrics.invalid_amount, metrics.before),
      null_critical_rate: ratio(metrics.null_critical, metrics.before)
    }
  };

  writeCsv(path.join(paths.silver, "dim_customer.csv"), customers);
  writeCsv(path.join(paths.silver, "dim_product.csv"), products);
  writeCsv(path.join(paths.silver, "fact_sales.csv"), sales);
  writeCsv(path.join(paths.silver, "fact_web_event.csv"), events);
  writeCsv(path.join(paths.silver, "rejected_sales.csv"), rejected);
  writeJson(path.join(paths.silver, "data_quality_report.json"), quality);
  return { customers, products, sales, events, quality, metrics: { silver_sales_rows: sales.length, rejected_sales_rows: rejected.length } };
}

function publishGold(silver) {
  resetDir(paths.gold);
  const customerById = new Map(silver.customers.map((row) => [row.customer_id, row]));
  const productById = new Map(silver.products.map((row) => [row.product_id, row]));
  const daily = aggregate(silver.sales, (row) => row.order_date);
  const dailyRows = [...daily.entries()].map(([date, group]) => ({
    order_date: date,
    total_sales_revenue: money(group.revenue),
    total_orders: group.orders.size,
    total_items_sold: group.items,
    average_order_value: money(group.revenue / group.orders.size),
    discount_impact_rate: ratio(group.discount, group.gross)
  })).sort((a, b) => a.order_date.localeCompare(b.order_date));

  const products = [...aggregate(silver.sales, (row) => row.product_id).entries()]
    .map(([productId, group]) => ({ product_id: productId, ...productById.get(productId), total_sales_revenue: money(group.revenue), total_orders: group.orders.size, total_items_sold: group.items }))
    .sort((a, b) => b.total_sales_revenue - a.total_sales_revenue)
    .map((row, index) => ({ revenue_rank: index + 1, ...row }));

  const citySegment = [...aggregate(silver.sales, (row) => {
    const customer = customerById.get(row.customer_id);
    return `${customer.city}|${customer.segment}`;
  }).entries()].map(([key, group]) => {
    const [city, segment] = key.split("|");
    return { city, segment, total_sales_revenue: money(group.revenue), total_orders: group.orders.size, total_items_sold: group.items, average_order_value: money(group.revenue / group.orders.size) };
  }).sort((a, b) => b.total_sales_revenue - a.total_sales_revenue);

  const channel = [...aggregate(silver.sales, (row) => row.sales_channel).entries()];
  const totalRevenue = channel.reduce((sum, [, group]) => sum + group.revenue, 0);
  const channelRows = channel.map(([sales_channel, group]) => ({ sales_channel, total_sales_revenue: money(group.revenue), total_orders: group.orders.size, total_items_sold: group.items, revenue_share: ratio(group.revenue, totalRevenue) }))
    .sort((a, b) => b.total_sales_revenue - a.total_sales_revenue);

  const behavior = buildBehavior(silver.events, productById);
  const summary = {
    generated_at: isoStamp(),
    business_kpis: {
      total_sales_revenue: money(dailyRows.reduce((sum, row) => sum + row.total_sales_revenue, 0)),
      total_orders: dailyRows.reduce((sum, row) => sum + row.total_orders, 0),
      total_items_sold: dailyRows.reduce((sum, row) => sum + row.total_items_sold, 0)
    },
    data_quality: silver.quality.sales_quality,
    leaders: { top_product: products[0], top_city_segment: citySegment[0], top_channel: channelRows[0] }
  };
  summary.business_kpis.average_order_value = money(summary.business_kpis.total_sales_revenue / summary.business_kpis.total_orders);

  writeCsv(path.join(paths.gold, "daily_sales_kpis.csv"), dailyRows);
  writeCsv(path.join(paths.gold, "product_performance.csv"), products);
  writeCsv(path.join(paths.gold, "city_segment_performance.csv"), citySegment);
  writeCsv(path.join(paths.gold, "channel_sales.csv"), channelRows);
  writeCsv(path.join(paths.gold, "behavior_funnel.csv"), behavior);
  writeJson(path.join(paths.gold, "executive_summary.json"), summary);
  return { dailyRows, products, citySegment, channelRows, behavior, summary, metrics: { gold_daily_rows: dailyRows.length, gold_product_rows: products.length } };
}

function loadWarehouse(runId, stages, summary) {
  ensureDir(paths.warehouse);
  fs.rmSync(paths.warehouseFile, { force: true });
  const db = new DatabaseSync(paths.warehouseFile);
  try {
    db.exec(fs.readFileSync(paths.schema, "utf8"));
    loadCsv(db, "dim_customer", path.join(paths.silver, "dim_customer.csv"));
    loadCsv(db, "dim_product", path.join(paths.silver, "dim_product.csv"));
    loadCsv(db, "fact_sales", path.join(paths.silver, "fact_sales.csv"));
    loadCsv(db, "fact_web_event", path.join(paths.silver, "fact_web_event.csv"));
    loadCsv(db, "agg_daily_sales_kpis", path.join(paths.gold, "daily_sales_kpis.csv"));
    loadCsv(db, "agg_product_performance", path.join(paths.gold, "product_performance.csv"));
    loadCsv(db, "agg_city_segment_performance", path.join(paths.gold, "city_segment_performance.csv"));
    loadCsv(db, "agg_channel_sales", path.join(paths.gold, "channel_sales.csv"));
    loadCsv(db, "agg_behavior_funnel", path.join(paths.gold, "behavior_funnel.csv"));
    db.prepare("INSERT INTO pipeline_run VALUES (?, ?, ?, ?)").run(runId, isoStamp(), JSON.stringify(stages), JSON.stringify(summary));
  } finally {
    db.close();
  }
  return { file: paths.warehouseFile, metrics: { warehouse_size_bytes: fs.statSync(paths.warehouseFile).size } };
}

function generateReports(source, silver, gold, warehouse) {
  resetDir(paths.reports);
  ensureDir(paths.metadata);
  writeJson(path.join(paths.reports, "executive_summary.json"), gold.summary);
  writeJson(path.join(paths.reports, "data_quality_report.json"), silver.quality);
  fs.writeFileSync(path.join(paths.reports, "executive_summary.md"), markdownSummary(gold.summary), "utf8");
  fs.writeFileSync(path.join(paths.reports, "data_quality_report.md"), markdownQuality(silver.quality), "utf8");
  fs.writeFileSync(path.join(paths.reports, "dashboard.html"), dashboardHtml(gold.summary, gold.products, gold.citySegment, gold.channelRows), "utf8");
  fs.writeFileSync(path.join(paths.reports, "sql_assistant_examples.sql"), sqlExamples(), "utf8");
  writeJson(path.join(paths.metadata, "catalog.json"), catalog());
  return {
    outputs: {
      dashboard: path.join(paths.reports, "dashboard.html"),
      warehouse: warehouse.file,
      executive_summary: path.join(paths.reports, "executive_summary.md"),
      quality_report: path.join(paths.reports, "data_quality_report.md")
    },
    metrics: { report_files: 5, source_sales_rows: source.manifest.sales_rows }
  };
}

function buildCustomers(rng, count, start) {
  return Array.from({ length: count }, (_, index) => {
    const first = rng.pick(names);
    const last = rng.pick(surnames);
    return {
      customer_id: `CUST${String(index + 1).padStart(4, "0")}`,
      name: `${first} ${last}`,
      email: `${first}.${last}.${index + 1}@example.com`.toLowerCase(),
      city: rng.pick(cities),
      segment: rng.pick(segments),
      signup_date: isoDate(addDays(start, -rng.int(30, 900)))
    };
  });
}

function buildProducts(rng, count) {
  return Array.from({ length: count }, (_, index) => {
    const category = rng.pick(categories);
    return {
      product_id: `PROD${String(index + 1).padStart(4, "0")}`,
      sku: `${category.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(5, "0")}`,
      category,
      product_name: `${rng.pick(productNames[category])} ${rng.pick(["Basic", "Plus", "Pro", "Max"])}`,
      price: money(rng.int(8, 260) + rng.pick([0.49, 0.95, 0.99])),
      active_status: rng.chance(0.94) ? "active" : "inactive"
    };
  });
}

function injectQualityIssue(rng, row) {
  if (rng.chance(0.006)) row.customer_id = "CUST9999";
  if (rng.chance(0.006)) row.product_id = "PROD9999";
  if (rng.chance(0.008)) row.customer_id = "";
  if (rng.chance(0.008)) row.order_datetime = "";
  if (rng.chance(0.01)) row.quantity = -Math.abs(Number(row.quantity));
  if (rng.chance(0.01)) row.net_amount = -Math.abs(Number(row.net_amount));
}

function randomStamp(rng, day) {
  const date = new Date(day);
  date.setUTCHours(rng.int(8, 22), rng.int(0, 59), rng.int(0, 59), 0);
  return isoStamp(date);
}

function unique(rows, key) {
  const seen = new Set();
  return rows.filter((row) => {
    if (!row[key] || seen.has(row[key])) return false;
    seen.add(row[key]);
    return true;
  });
}

function aggregate(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    const group = groups.get(key) ?? { revenue: 0, gross: 0, discount: 0, items: 0, orders: new Set() };
    group.revenue += Number(row.net_amount);
    group.gross += Number(row.gross_amount);
    group.discount += Number(row.discount_amount);
    group.items += Number(row.quantity);
    group.orders.add(row.order_id);
    groups.set(key, group);
  }
  return groups;
}

function buildBehavior(events, productById) {
  const groups = new Map();
  for (const event of events) {
    if (!event.product_id) continue;
    const group = groups.get(event.product_id) ?? { product_id: event.product_id, views: 0, carts: 0, checkouts: 0 };
    if (event.event_type === "product_view") group.views += 1;
    if (event.event_type === "add_to_cart") group.carts += 1;
    if (event.event_type === "checkout_start") group.checkouts += 1;
    groups.set(event.product_id, group);
  }
  return [...groups.values()].map((group) => ({
    product_id: group.product_id,
    product_name: productById.get(group.product_id)?.product_name ?? "",
    product_view_count: group.views,
    add_to_cart_count: group.carts,
    checkout_start_count: group.checkouts,
    add_to_cart_rate: ratio(group.carts, group.views),
    checkout_start_rate: ratio(group.checkouts, group.carts)
  })).sort((a, b) => b.product_view_count - a.product_view_count);
}

function loadCsv(db, table, file) {
  const rows = readCsv(file);
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const sql = `INSERT INTO ${table} (${columns.map((column) => `"${column}"`).join(",")}) VALUES (${columns.map(() => "?").join(",")})`;
  const statement = db.prepare(sql);
  db.exec("BEGIN");
  try {
    for (const row of rows) statement.run(...columns.map((column) => normalizeValue(row[column])));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function normalizeValue(value) {
  if (value === "") return null;
  return /^-?\d+(\.\d+)?$/.test(String(value)) ? Number(value) : value;
}

function markdownSummary(summary) {
  return `# Executive Summary

Generated at: ${summary.generated_at}

| KPI | Value |
| --- | ---: |
| Total revenue | ${summary.business_kpis.total_sales_revenue} |
| Total orders | ${summary.business_kpis.total_orders} |
| Total items sold | ${summary.business_kpis.total_items_sold} |
| Average order value | ${summary.business_kpis.average_order_value} |
| Data retention | ${(summary.data_quality.retention_rate * 100).toFixed(2)}% |

Top product: ${summary.leaders.top_product?.product_name ?? "n/a"}
`;
}

function markdownQuality(quality) {
  const q = quality.sales_quality;
  return `# Data Quality Report

| KPI | Value |
| --- | ---: |
| Rows before cleaning | ${q.before} |
| Rows after cleaning | ${q.after} |
| Rejected rows | ${q.rejected} |
| Duplicate rate | ${(q.duplicate_rate * 100).toFixed(2)}% |
| Invalid quantity rate | ${(q.invalid_quantity_rate * 100).toFixed(2)}% |
| Invalid amount rate | ${(q.invalid_amount_rate * 100).toFixed(2)}% |
| Retention rate | ${(q.retention_rate * 100).toFixed(2)}% |
`;
}

function dashboardHtml(summary, products, citySegment, channels) {
  const productRows = products.slice(0, 8).map((row) => `<tr><td>${row.revenue_rank}</td><td>${row.product_name}</td><td>${row.category}</td><td>${row.total_sales_revenue}</td></tr>`).join("");
  const cityRows = citySegment.slice(0, 8).map((row) => `<tr><td>${row.city}</td><td>${row.segment}</td><td>${row.total_sales_revenue}</td></tr>`).join("");
  const channelRows = channels.map((row) => `<tr><td>${row.sales_channel}</td><td>${row.total_sales_revenue}</td><td>${(row.revenue_share * 100).toFixed(1)}%</td></tr>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Smart Retail Dashboard</title><style>
body{font-family:Segoe UI,Arial,sans-serif;margin:0;background:#f6f7f9;color:#17202a}header{background:#fff;border-bottom:1px solid #d8dee7;padding:24px 40px}main{padding:24px 40px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}.card,.panel{background:#fff;border:1px solid #d8dee7;border-radius:8px;padding:16px;box-shadow:0 8px 24px #17202a12}.value{font-size:28px;font-weight:800;margin-top:8px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:16px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #d8dee7;padding:9px;text-align:left}@media(max-width:850px){.grid{grid-template-columns:1fr}}
</style></head><body><header><h1>Smart Retail Dashboard</h1><p>Generated at ${summary.generated_at}</p></header><main><section class="cards">
<div class="card"><span>Revenue</span><div class="value">$${summary.business_kpis.total_sales_revenue.toLocaleString("en-US")}</div></div>
<div class="card"><span>Orders</span><div class="value">${summary.business_kpis.total_orders.toLocaleString("en-US")}</div></div>
<div class="card"><span>Items</span><div class="value">${summary.business_kpis.total_items_sold.toLocaleString("en-US")}</div></div>
<div class="card"><span>Retention</span><div class="value">${(summary.data_quality.retention_rate * 100).toFixed(1)}%</div></div>
</section><section class="grid"><div class="panel"><h2>Top Products</h2><table><tbody>${productRows}</tbody></table></div><div class="panel"><h2>City / Segment</h2><table><tbody>${cityRows}</tbody></table></div><div class="panel"><h2>Channels</h2><table><tbody>${channelRows}</tbody></table></div></section></main></body></html>`;
}

function sqlExamples() {
  return `SELECT * FROM vw_retail_kpi_scorecard;
SELECT * FROM vw_top_products LIMIT 10;
SELECT * FROM vw_city_segment_sales LIMIT 20;
SELECT * FROM vw_data_quality_health;`;
}

function catalog() {
  return {
    tables: [
      { name: "fact_sales", grain: "one row per clean order line" },
      { name: "fact_web_event", grain: "one row per clean web or app event" },
      { name: "dim_customer", grain: "one row per customer" },
      { name: "dim_product", grain: "one row per product" }
    ]
  };
}
