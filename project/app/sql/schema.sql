CREATE TABLE dim_customer (
  customer_id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  city TEXT,
  segment TEXT,
  signup_date TEXT
);

CREATE TABLE dim_product (
  product_id TEXT PRIMARY KEY,
  sku TEXT,
  category TEXT,
  product_name TEXT,
  price REAL,
  active_status TEXT
);

CREATE TABLE fact_sales (
  order_id TEXT,
  order_line_no INTEGER,
  order_datetime TEXT,
  order_date TEXT,
  year_month TEXT,
  customer_id TEXT,
  product_id TEXT,
  quantity INTEGER,
  unit_price REAL,
  discount_amount REAL,
  gross_amount REAL,
  net_amount REAL,
  payment_method TEXT,
  sales_channel TEXT,
  PRIMARY KEY (order_id, order_line_no)
);

CREATE TABLE fact_web_event (
  event_id TEXT PRIMARY KEY,
  event_timestamp TEXT,
  customer_id TEXT,
  session_id TEXT,
  event_type TEXT,
  product_id TEXT,
  search_term TEXT,
  channel TEXT,
  device TEXT,
  event_date TEXT
);

CREATE TABLE agg_daily_sales_kpis (
  order_date TEXT PRIMARY KEY,
  total_sales_revenue REAL,
  total_orders INTEGER,
  total_items_sold INTEGER,
  average_order_value REAL,
  discount_impact_rate REAL
);

CREATE TABLE agg_product_performance (
  revenue_rank INTEGER,
  product_id TEXT,
  sku TEXT,
  category TEXT,
  product_name TEXT,
  price REAL,
  active_status TEXT,
  total_sales_revenue REAL,
  total_orders INTEGER,
  total_items_sold INTEGER
);

CREATE TABLE agg_city_segment_performance (
  city TEXT,
  segment TEXT,
  total_sales_revenue REAL,
  total_orders INTEGER,
  total_items_sold INTEGER,
  average_order_value REAL
);

CREATE TABLE agg_channel_sales (
  sales_channel TEXT,
  total_sales_revenue REAL,
  total_orders INTEGER,
  total_items_sold INTEGER,
  revenue_share REAL
);

CREATE TABLE agg_behavior_funnel (
  product_id TEXT,
  product_name TEXT,
  product_view_count INTEGER,
  add_to_cart_count INTEGER,
  checkout_start_count INTEGER,
  add_to_cart_rate REAL,
  checkout_start_rate REAL
);

CREATE TABLE pipeline_run (
  run_id TEXT PRIMARY KEY,
  completed_at TEXT,
  stages_json TEXT,
  summary_json TEXT
);

CREATE VIEW vw_retail_kpi_scorecard AS
SELECT
  ROUND(SUM(total_sales_revenue), 2) AS total_sales_revenue,
  SUM(total_orders) AS total_orders,
  SUM(total_items_sold) AS total_items_sold,
  ROUND(SUM(total_sales_revenue) / NULLIF(SUM(total_orders), 0), 2) AS average_order_value,
  ROUND(AVG(discount_impact_rate), 4) AS average_discount_impact_rate
FROM agg_daily_sales_kpis;

CREATE VIEW vw_top_products AS
SELECT revenue_rank, product_id, product_name, category, total_sales_revenue, total_orders, total_items_sold
FROM agg_product_performance
ORDER BY revenue_rank;

CREATE VIEW vw_city_segment_sales AS
SELECT city, segment, total_sales_revenue, total_orders, total_items_sold, average_order_value
FROM agg_city_segment_performance
ORDER BY total_sales_revenue DESC;

CREATE VIEW vw_behavior_funnel AS
SELECT *
FROM agg_behavior_funnel
ORDER BY product_view_count DESC;

CREATE VIEW vw_data_quality_health AS
SELECT
  run_id,
  json_extract(summary_json, '$.data_quality.retention_rate') AS retention_rate,
  json_extract(summary_json, '$.data_quality.duplicate_rate') AS duplicate_rate,
  json_extract(summary_json, '$.data_quality.invalid_quantity_rate') AS invalid_quantity_rate,
  json_extract(summary_json, '$.data_quality.invalid_amount_rate') AS invalid_amount_rate,
  json_extract(summary_json, '$.data_quality.rejected') AS rejected_rows
FROM pipeline_run;
