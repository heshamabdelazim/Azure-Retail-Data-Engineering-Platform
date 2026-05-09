import { BlobServiceClient } from "@azure/storage-blob";
import sql from "mssql";

const defaults = {
  days: 14,
  customers: 160,
  products: 50,
  minOrdersPerDay: 42,
  maxOrdersPerDay: 76,
  seed: 20260505
};

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

export async function runAzurePipeline(options = {}, context = {}) {
  const settings = normalizeOptions(options);
  const logger = context.logger ?? (() => {});
  const runId = `run_${new Date().toISOString().replaceAll(/[-:.TZ]/g, "").slice(0, 14)}`;
  const startedAt = Date.now();
  const stageMetrics = [];
  const container = await getContainer(context.containerName);
  const pool = await getSqlPool();

  const stage = async (name, fn) => {
    const started = Date.now();
    logger(`* ${name}`);
    const result = await fn();
    const metric = { stage: name, duration_ms: Date.now() - started, ...(result?.metrics ?? {}) };
    stageMetrics.push(metric);
    logger(`  ${name} completed in ${metric.duration_ms}ms`);
    return result;
  };

  logger(`Starting Azure Smart Retail pipeline: ${runId}`);
  const source = await stage("source_generation", () => generateSource(settings));
  const bronze = await stage("data_lake_bronze", () => writeBronze(container, runId, source));
  const silver = await stage("silver_transformation", () => transformSilver(source));
  const gold = await stage("gold_publishing", () => publishGold(silver));
  const lake = await stage("data_lake_outputs", () => writeLakeOutputs(container, runId, source, bronze, silver, gold));
  const warehouse = await stage("azure_sql_loading", () => loadAzureSql(pool, runId, stageMetrics, gold.summary, silver, gold));
  const docs = await stage("documentation_outputs", () => writeReports(container, gold, silver, warehouse));

  const summary = {
    run_id: runId,
    status: "success",
    engine: "azure",
    started_at: new Date(startedAt).toISOString(),
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    stages: stageMetrics,
    outputs: docs.outputs,
    data_lake: lake.prefix,
    warehouse: "Azure SQL Database"
  };
  await uploadJson(container, "reports/pipeline_summary.json", summary);
  logger(`Azure pipeline finished successfully in ${(summary.duration_ms / 1000).toFixed(2)}s`);
  return summary;
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
  const rng = new Random(settings.seed);
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = addDays(end, -(settings.days - 1));
  const customers = buildCustomers(rng, settings.customers, start);
  const products = buildProducts(rng, settings.products);
  const sales = [];
  const events = [];
  let orderCounter = 100000;
  let eventCounter = 700000;

  for (let d = 0; d < settings.days; d += 1) {
    const day = addDays(start, d);
    const dayKey = isoDate(day);
    const orders = rng.int(settings.minOrdersPerDay, settings.maxOrdersPerDay);
    const daySales = [];
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
          sales_channel: rng.pick(channels),
          source_date: dayKey
        };
        injectQualityIssue(rng, row);
        daySales.push(row);
      }
    }
    for (let i = 0; i < Math.max(1, Math.floor(daySales.length * 0.015)); i += 1) daySales.push({ ...rng.pick(daySales) });
    sales.push(...daySales);

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
        device: rng.pick(["Web", "Android", "iOS", "Tablet"]),
        source_date: dayKey
      });
    }
  }

  return {
    settings,
    customers,
    products,
    sales,
    events,
    manifest: {
      generated_at: new Date().toISOString(),
      settings,
      customers: customers.length,
      products: products.length,
      sales_rows: sales.length,
      event_rows: events.length,
      engine: "azure"
    },
    metrics: { source_sales_rows: sales.length, source_event_rows: events.length }
  };
}

async function writeBronze(container, runId, source) {
  const prefix = `data/bronze/${runId}/raw`;
  await uploadCsv(container, `${prefix}/customers.csv`, source.customers);
  await uploadCsv(container, `${prefix}/products.csv`, source.products);
  for (const [date, rows] of groupBy(source.sales, (row) => row.source_date)) {
    await uploadCsv(container, `${prefix}/sales/date=${date}/sales_${date}.csv`, rows);
  }
  for (const [date, rows] of groupBy(source.events, (row) => row.source_date)) {
    await uploadText(container, `${prefix}/events/date=${date}/events_${date}.jsonl`, rows.map((row) => JSON.stringify(row)).join("\n") + "\n", "application/x-ndjson");
  }
  await uploadJson(container, `${prefix}/source_manifest.json`, source.manifest);
  return { prefix, metrics: { bronze_files: 3 + groupBy(source.sales, (row) => row.source_date).size + groupBy(source.events, (row) => row.source_date).size } };
}

function transformSilver(source) {
  const customers = unique(source.customers, "customer_id");
  const products = unique(source.products, "product_id");
  const customerIds = new Set(customers.map((row) => row.customer_id));
  const productIds = new Set(products.map((row) => row.product_id));
  const seen = new Set();
  const sales = [];
  const rejected = [];
  const metrics = { before: 0, duplicates: 0, invalid_quantity: 0, invalid_amount: 0, null_critical: 0, invalid_reference: 0 };

  for (const row of source.sales) {
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

  const events = source.events
    .map((event) => ({ ...event, event_date: isoDate(new Date(event.event_timestamp)), event_timestamp: isoStamp(new Date(event.event_timestamp)) }))
    .filter((event) => customerIds.has(event.customer_id));

  const quality = {
    generated_at: new Date().toISOString(),
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
  return { customers, products, sales, events, rejected, quality, metrics: { silver_sales_rows: sales.length, rejected_sales_rows: rejected.length } };
}

function publishGold(silver) {
  const customerById = new Map(silver.customers.map((row) => [row.customer_id, row]));
  const productById = new Map(silver.products.map((row) => [row.product_id, row]));
  const dailyRows = [...aggregate(silver.sales, (row) => row.order_date).entries()].map(([date, group]) => ({
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

  const channelGroups = [...aggregate(silver.sales, (row) => row.sales_channel).entries()];
  const totalRevenue = channelGroups.reduce((sum, [, group]) => sum + group.revenue, 0);
  const channelRows = channelGroups.map(([sales_channel, group]) => ({ sales_channel, total_sales_revenue: money(group.revenue), total_orders: group.orders.size, total_items_sold: group.items, revenue_share: ratio(group.revenue, totalRevenue) }))
    .sort((a, b) => b.total_sales_revenue - a.total_sales_revenue);
  const behavior = buildBehavior(silver.events, productById);
  const summary = {
    generated_at: new Date().toISOString(),
    engine: "azure",
    business_kpis: {
      total_sales_revenue: money(dailyRows.reduce((sum, row) => sum + row.total_sales_revenue, 0)),
      total_orders: dailyRows.reduce((sum, row) => sum + row.total_orders, 0),
      total_items_sold: dailyRows.reduce((sum, row) => sum + row.total_items_sold, 0)
    },
    data_quality: silver.quality.sales_quality,
    leaders: { top_product: products[0], top_city_segment: citySegment[0], top_channel: channelRows[0] }
  };
  summary.business_kpis.average_order_value = money(summary.business_kpis.total_sales_revenue / summary.business_kpis.total_orders);
  return { dailyRows, products, citySegment, channelRows, behavior, summary, metrics: { gold_daily_rows: dailyRows.length, gold_product_rows: products.length } };
}

async function writeLakeOutputs(container, runId, source, bronze, silver, gold) {
  const prefix = `data`;
  await uploadCsv(container, `${prefix}/silver/dim_customer.csv`, silver.customers);
  await uploadCsv(container, `${prefix}/silver/dim_product.csv`, silver.products);
  await uploadCsv(container, `${prefix}/silver/fact_sales.csv`, silver.sales);
  await uploadCsv(container, `${prefix}/silver/fact_web_event.csv`, silver.events);
  await uploadCsv(container, `${prefix}/silver/rejected_sales.csv`, silver.rejected);
  await uploadJson(container, `${prefix}/silver/data_quality_report.json`, silver.quality);
  await uploadCsv(container, `${prefix}/gold/daily_sales_kpis.csv`, gold.dailyRows);
  await uploadCsv(container, `${prefix}/gold/product_performance.csv`, gold.products);
  await uploadCsv(container, `${prefix}/gold/city_segment_performance.csv`, gold.citySegment);
  await uploadCsv(container, `${prefix}/gold/channel_sales.csv`, gold.channelRows);
  await uploadCsv(container, `${prefix}/gold/behavior_funnel.csv`, gold.behavior);
  await uploadJson(container, `${prefix}/gold/executive_summary.json`, gold.summary);
  return { prefix: `${prefix}/bronze/${runId}`, metrics: { lake_output_files: 12, source_sales_rows: source.sales.length, bronze_files: bronze.metrics.bronze_files } };
}

async function loadAzureSql(pool, runId, stages, summary, silver, gold) {
  await pool.request().batch(sqlSchema());
  await clearTables(pool);
  await bulk(pool, "dim_customer", silver.customers);
  await bulk(pool, "dim_product", silver.products);
  await bulk(pool, "fact_sales", silver.sales);
  await bulk(pool, "fact_web_event", silver.events);
  await bulk(pool, "agg_daily_sales_kpis", gold.dailyRows);
  await bulk(pool, "agg_product_performance", gold.products);
  await bulk(pool, "agg_city_segment_performance", gold.citySegment);
  await bulk(pool, "agg_channel_sales", gold.channelRows);
  await bulk(pool, "agg_behavior_funnel", gold.behavior);
  await pool.request()
    .input("run_id", sql.NVarChar(80), runId)
    .input("completed_at", sql.DateTime2, new Date())
    .input("stages_json", sql.NVarChar(sql.MAX), JSON.stringify(stages))
    .input("summary_json", sql.NVarChar(sql.MAX), JSON.stringify(summary))
    .query("INSERT INTO pipeline_run (run_id, completed_at, stages_json, summary_json) VALUES (@run_id, @completed_at, @stages_json, @summary_json)");
  return { metrics: { warehouse_tables_loaded: 10 } };
}

async function writeReports(container, gold, silver) {
  await uploadJson(container, "reports/executive_summary.json", gold.summary);
  await uploadJson(container, "reports/data_quality_report.json", silver.quality);
  await uploadText(container, "reports/executive_summary.md", markdownSummary(gold.summary), "text/markdown; charset=utf-8");
  await uploadText(container, "reports/data_quality_report.md", markdownQuality(silver.quality), "text/markdown; charset=utf-8");
  await uploadText(container, "reports/dashboard.html", dashboardHtml(gold.summary, gold.products, gold.citySegment, gold.channelRows), "text/html; charset=utf-8");
  await uploadText(container, "reports/sql_assistant_examples.sql", sqlExamples(), "application/sql; charset=utf-8");
  await uploadJson(container, "metadata/catalog.json", catalog());
  return { outputs: { dashboard: "reports/dashboard.html", executive_summary: "reports/executive_summary.md", quality_report: "reports/data_quality_report.md" }, metrics: { report_files: 6 } };
}

async function getContainer(containerName = process.env.DATA_LAKE_CONTAINER || "smartretail") {
  if (!process.env.AZURE_STORAGE_CONNECTION_STRING) throw new Error("AZURE_STORAGE_CONNECTION_STRING is missing.");
  const service = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
  const container = service.getContainerClient(containerName);
  await container.createIfNotExists();
  return container;
}

async function getSqlPool() {
  if (!process.env.SQL_CONNECTION_STRING) throw new Error("SQL_CONNECTION_STRING is missing.");
  if (!globalThis.smartRetailAzureSqlPool) globalThis.smartRetailAzureSqlPool = await sql.connect(process.env.SQL_CONNECTION_STRING);
  return globalThis.smartRetailAzureSqlPool;
}

async function uploadJson(container, name, value) {
  await uploadText(container, name, JSON.stringify(value, null, 2), "application/json; charset=utf-8");
}

async function uploadCsv(container, name, rows) {
  const columns = rows.length ? Object.keys(rows[0]) : [];
  const text = [columns.join(","), ...rows.map((row) => columns.map((column) => escapeCsv(row[column])).join(","))].join("\n") + "\n";
  await uploadText(container, name, text, "text/csv; charset=utf-8");
}

async function uploadText(container, name, text, contentType = "text/plain; charset=utf-8") {
  await container.getBlockBlobClient(name).upload(text, Buffer.byteLength(text), { blobHTTPHeaders: { blobContentType: contentType } });
}

async function clearTables(pool) {
  await pool.request().batch(`
    DELETE FROM pipeline_run;
    DELETE FROM agg_behavior_funnel;
    DELETE FROM agg_channel_sales;
    DELETE FROM agg_city_segment_performance;
    DELETE FROM agg_product_performance;
    DELETE FROM agg_daily_sales_kpis;
    DELETE FROM fact_web_event;
    DELETE FROM fact_sales;
    DELETE FROM dim_product;
    DELETE FROM dim_customer;
  `);
}

async function bulk(pool, tableName, rows) {
  if (!rows.length) return;
  const table = new sql.Table(tableName);
  table.create = false;
  const columns = Object.keys(rows[0]);
  for (const column of columns) table.columns.add(column, columnType(column), { nullable: true });
  for (const row of rows) table.rows.add(...columns.map((column) => normalizeValue(row[column], column)));
  await pool.request().bulk(table);
}

function columnType(column) {
  if (/(count|orders|quantity|items|rank|line_no|sold|rows)$/i.test(column)) return sql.Int;
  if (/(amount|price|revenue|value|rate|share|gross|net|discount)$/i.test(column)) return sql.Decimal(18, 4);
  if (/(datetime|timestamp|completed_at)$/i.test(column)) return sql.DateTime2;
  return sql.NVarChar(400);
}

function normalizeValue(value, column = "") {
  if (value === "") return null;
  if (/(datetime|timestamp|completed_at)$/i.test(column) && typeof value === "string") return new Date(value);
  if (value instanceof Date) return value;
  return value;
}

function sqlSchema() {
  return `
IF OBJECT_ID('vw_data_quality_health', 'V') IS NOT NULL DROP VIEW vw_data_quality_health;
IF OBJECT_ID('vw_behavior_funnel', 'V') IS NOT NULL DROP VIEW vw_behavior_funnel;
IF OBJECT_ID('vw_city_segment_sales', 'V') IS NOT NULL DROP VIEW vw_city_segment_sales;
IF OBJECT_ID('vw_top_products', 'V') IS NOT NULL DROP VIEW vw_top_products;
IF OBJECT_ID('vw_retail_kpi_scorecard', 'V') IS NOT NULL DROP VIEW vw_retail_kpi_scorecard;

IF OBJECT_ID('pipeline_run', 'U') IS NULL CREATE TABLE pipeline_run (run_id NVARCHAR(80) NOT NULL PRIMARY KEY, completed_at DATETIME2 NULL, stages_json NVARCHAR(MAX) NULL, summary_json NVARCHAR(MAX) NULL);
IF OBJECT_ID('agg_behavior_funnel', 'U') IS NULL CREATE TABLE agg_behavior_funnel (product_id NVARCHAR(40), product_name NVARCHAR(200), product_view_count INT, add_to_cart_count INT, checkout_start_count INT, add_to_cart_rate DECIMAL(18,4), checkout_start_rate DECIMAL(18,4));
IF OBJECT_ID('agg_channel_sales', 'U') IS NULL CREATE TABLE agg_channel_sales (sales_channel NVARCHAR(80), total_sales_revenue DECIMAL(18,4), total_orders INT, total_items_sold INT, revenue_share DECIMAL(18,4));
IF OBJECT_ID('agg_city_segment_performance', 'U') IS NULL CREATE TABLE agg_city_segment_performance (city NVARCHAR(80), segment NVARCHAR(80), total_sales_revenue DECIMAL(18,4), total_orders INT, total_items_sold INT, average_order_value DECIMAL(18,4));
IF OBJECT_ID('agg_product_performance', 'U') IS NULL CREATE TABLE agg_product_performance (revenue_rank INT, product_id NVARCHAR(40), sku NVARCHAR(80), category NVARCHAR(80), product_name NVARCHAR(200), price DECIMAL(18,4), active_status NVARCHAR(40), total_sales_revenue DECIMAL(18,4), total_orders INT, total_items_sold INT);
IF OBJECT_ID('agg_daily_sales_kpis', 'U') IS NULL CREATE TABLE agg_daily_sales_kpis (order_date NVARCHAR(20) NOT NULL PRIMARY KEY, total_sales_revenue DECIMAL(18,4), total_orders INT, total_items_sold INT, average_order_value DECIMAL(18,4), discount_impact_rate DECIMAL(18,4));
IF OBJECT_ID('fact_web_event', 'U') IS NULL CREATE TABLE fact_web_event (event_id NVARCHAR(40) NOT NULL PRIMARY KEY, event_timestamp DATETIME2, customer_id NVARCHAR(40), session_id NVARCHAR(40), event_type NVARCHAR(80), product_id NVARCHAR(40), search_term NVARCHAR(200), channel NVARCHAR(80), device NVARCHAR(80), source_date NVARCHAR(20), event_date NVARCHAR(20));
IF OBJECT_ID('fact_sales', 'U') IS NULL CREATE TABLE fact_sales (order_id NVARCHAR(40), order_line_no INT, order_datetime DATETIME2, order_date NVARCHAR(20), year_month NVARCHAR(20), customer_id NVARCHAR(40), product_id NVARCHAR(40), quantity INT, unit_price DECIMAL(18,4), discount_amount DECIMAL(18,4), gross_amount DECIMAL(18,4), net_amount DECIMAL(18,4), payment_method NVARCHAR(80), sales_channel NVARCHAR(80));
IF OBJECT_ID('dim_product', 'U') IS NULL CREATE TABLE dim_product (product_id NVARCHAR(40) NOT NULL PRIMARY KEY, sku NVARCHAR(80), category NVARCHAR(80), product_name NVARCHAR(200), price DECIMAL(18,4), active_status NVARCHAR(40));
IF OBJECT_ID('dim_customer', 'U') IS NULL CREATE TABLE dim_customer (customer_id NVARCHAR(40) NOT NULL PRIMARY KEY, name NVARCHAR(200), email NVARCHAR(200), city NVARCHAR(80), segment NVARCHAR(80), signup_date NVARCHAR(20));

EXEC('CREATE VIEW vw_retail_kpi_scorecard AS SELECT ROUND(SUM(total_sales_revenue), 2) AS total_sales_revenue, SUM(total_orders) AS total_orders, SUM(total_items_sold) AS total_items_sold, ROUND(SUM(total_sales_revenue) / NULLIF(SUM(total_orders), 0), 2) AS average_order_value, ROUND(AVG(discount_impact_rate), 4) AS average_discount_impact_rate FROM agg_daily_sales_kpis');
EXEC('CREATE VIEW vw_top_products AS SELECT revenue_rank, product_id, product_name, category, total_sales_revenue, total_orders, total_items_sold FROM agg_product_performance');
EXEC('CREATE VIEW vw_city_segment_sales AS SELECT city, segment, total_sales_revenue, total_orders, total_items_sold, average_order_value FROM agg_city_segment_performance');
EXEC('CREATE VIEW vw_behavior_funnel AS SELECT * FROM agg_behavior_funnel');
EXEC('CREATE VIEW vw_data_quality_health AS SELECT run_id, JSON_VALUE(summary_json, ''$.data_quality.retention_rate'') AS retention_rate, JSON_VALUE(summary_json, ''$.data_quality.duplicate_rate'') AS duplicate_rate, JSON_VALUE(summary_json, ''$.data_quality.invalid_quantity_rate'') AS invalid_quantity_rate, JSON_VALUE(summary_json, ''$.data_quality.invalid_amount_rate'') AS invalid_amount_rate, JSON_VALUE(summary_json, ''$.data_quality.rejected'') AS rejected_rows FROM pipeline_run');
`;
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

function unique(rows, key) {
  const seen = new Set();
  return rows.filter((row) => {
    if (!row[key] || seen.has(row[key])) return false;
    seen.add(row[key]);
    return true;
  });
}

function groupBy(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return groups;
}

function markdownSummary(summary) {
  return `# Executive Summary

Generated at: ${summary.generated_at}
Engine: Azure

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

Engine: Azure

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

function dashboardHtml(summary, products, citySegment, channelRows) {
  const productRows = products.slice(0, 8).map((row) => `<tr><td>${row.revenue_rank}</td><td>${row.product_name}</td><td>${row.category}</td><td>${row.total_sales_revenue}</td></tr>`).join("");
  const cityRows = citySegment.slice(0, 8).map((row) => `<tr><td>${row.city}</td><td>${row.segment}</td><td>${row.total_sales_revenue}</td></tr>`).join("");
  const channelsHtml = channelRows.map((row) => `<tr><td>${row.sales_channel}</td><td>${row.total_sales_revenue}</td><td>${(row.revenue_share * 100).toFixed(1)}%</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Smart Retail Azure Dashboard</title><style>body{font-family:Segoe UI,Arial;margin:0;background:#f6f7f9;color:#17202a}header{background:#fff;border-bottom:1px solid #d8dee7;padding:24px 40px}main{padding:24px 40px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}.card,.panel{background:#fff;border:1px solid #d8dee7;border-radius:8px;padding:16px}.value{font-size:28px;font-weight:800;margin-top:8px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:16px}table{width:100%;border-collapse:collapse}td{border-bottom:1px solid #d8dee7;padding:9px}</style></head><body><header><h1>Smart Retail Azure Dashboard</h1><p>Generated at ${summary.generated_at}</p></header><main><section class="cards"><div class="card"><span>Revenue</span><div class="value">$${summary.business_kpis.total_sales_revenue.toLocaleString("en-US")}</div></div><div class="card"><span>Orders</span><div class="value">${summary.business_kpis.total_orders.toLocaleString("en-US")}</div></div><div class="card"><span>Items</span><div class="value">${summary.business_kpis.total_items_sold.toLocaleString("en-US")}</div></div><div class="card"><span>Retention</span><div class="value">${(summary.data_quality.retention_rate * 100).toFixed(1)}%</div></div></section><section class="grid"><div class="panel"><h2>Top Products</h2><table>${productRows}</table></div><div class="panel"><h2>City / Segment</h2><table>${cityRows}</table></div><div class="panel"><h2>Channels</h2><table>${channelsHtml}</table></div></section></main></body></html>`;
}

function sqlExamples() {
  return `SELECT * FROM vw_retail_kpi_scorecard;
SELECT TOP 10 * FROM vw_top_products;
SELECT TOP 20 * FROM vw_city_segment_sales;
SELECT * FROM vw_data_quality_health;`;
}

function catalog() {
  return {
    engine: "azure",
    storage: "Azure Data Lake Storage Gen2",
    warehouse: "Azure SQL Database",
    tables: [
      { name: "fact_sales", grain: "one row per clean order line" },
      { name: "fact_web_event", grain: "one row per clean web or app event" },
      { name: "dim_customer", grain: "one row per customer" },
      { name: "dim_product", grain: "one row per product" }
    ]
  };
}

function randomStamp(rng, day) {
  const date = new Date(day);
  date.setUTCHours(rng.int(8, 22), rng.int(0, 59), rng.int(0, 59), 0);
  return isoStamp(date);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function isoStamp(date = new Date()) {
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function monthKey(date) {
  return date.toISOString().slice(0, 7);
}

function money(value) {
  return Math.round(Number(value) * 100) / 100;
}

function ratio(a, b) {
  return b ? Math.round((Number(a) / Number(b)) * 10000) / 10000 : 0;
}

function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

class Random {
  constructor(seed) {
    this.seed = seed >>> 0;
  }
  next() {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }
  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick(values) {
    return values[this.int(0, values.length - 1)];
  }
  chance(probability) {
    return this.next() < probability;
  }
}
