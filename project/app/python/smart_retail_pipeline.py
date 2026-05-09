from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import random
import shutil
import sqlite3
import time
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]

PATHS = {
    "app": ROOT_DIR / "app",
    "data": ROOT_DIR / "data",
    "source": ROOT_DIR / "data" / "source",
    "bronze": ROOT_DIR / "data" / "bronze",
    "silver": ROOT_DIR / "data" / "silver",
    "gold": ROOT_DIR / "data" / "gold",
    "warehouse": ROOT_DIR / "warehouse",
    "warehouse_file": ROOT_DIR / "warehouse" / "smart_retail.sqlite",
    "reports": ROOT_DIR / "reports",
    "metadata": ROOT_DIR / "metadata",
    "schema": ROOT_DIR / "app" / "sql" / "schema.sql",
}

DEFAULTS = {
    "days": 14,
    "customers": 160,
    "products": 50,
    "min_orders_per_day": 42,
    "max_orders_per_day": 76,
    "seed": 20260505,
}

NAMES = ["Nour", "Adam", "Lina", "Omar", "Maya", "Youssef", "Sara", "Malik", "Jana", "Karim", "Hana", "Ziad"]
SURNAMES = ["Hassan", "Mansour", "Amin", "Younes", "Nasser", "Ibrahim", "Khaled", "Maher", "Saleh", "Fouad"]
CITIES = ["Cairo", "Alexandria", "Giza", "Mansoura", "Tanta", "Aswan", "Luxor", "Zagazig"]
SEGMENTS = ["Consumer", "SMB", "Corporate"]
CHANNELS = ["Store", "Online", "Mobile App"]
PAYMENTS = ["Card", "Cash", "Wallet", "Installments"]
CATEGORIES = ["Electronics", "Home", "Grocery", "Beauty", "Sports", "Books"]
PRODUCT_NAMES = {
    "Electronics": ["Smart Watch", "USB-C Hub", "Wireless Mouse", "Bluetooth Speaker"],
    "Home": ["Desk Lamp", "Cotton Sheet Set", "Storage Basket", "Cookware Set"],
    "Grocery": ["Premium Coffee", "Olive Oil", "Organic Dates", "Green Tea"],
    "Beauty": ["Vitamin C Serum", "Hydrating Cream", "Matte Lipstick", "Sunscreen"],
    "Sports": ["Yoga Mat", "Resistance Bands", "Training Gloves", "Fitness Bottle"],
    "Books": ["SQL Field Notes", "Retail Analytics Guide", "Cloud Primer", "AI Playbook"],
}


class SmartRandom:
    def __init__(self, seed: int) -> None:
        self._rng = random.Random(seed)

    def integer(self, minimum: int, maximum: int) -> int:
        return self._rng.randint(minimum, maximum)

    def pick(self, values: list):
        return self._rng.choice(values)

    def chance(self, probability: float) -> bool:
        return self._rng.random() < probability


def run_pipeline(options: dict | None = None, logger=print) -> dict:
    settings = normalize_options(options or {})
    run_id = f"run_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    started = time.perf_counter()
    started_at = datetime.now(timezone.utc)
    stage_metrics: list[dict] = []

    def stage(name: str, fn):
        logger(f"* {name}")
        stage_started = time.perf_counter()
        result = fn()
        metric = {"stage": name, "duration_ms": int((time.perf_counter() - stage_started) * 1000)}
        metric.update(result.get("metrics", {}))
        stage_metrics.append(metric)
        logger(f"  {name} completed in {metric['duration_ms']}ms")
        return result

    ensure_dir(PATHS["reports"])
    logger(f"Starting Smart Retail Pro Python pipeline: {run_id}")
    source = stage("source_generation", lambda: generate_source(settings))
    bronze = stage("bronze_ingestion", lambda: ingest_bronze(run_id))
    silver = stage("silver_transformation", lambda: transform_silver(bronze))
    gold = stage("gold_publishing", lambda: publish_gold(silver))
    warehouse = stage("warehouse_loading", lambda: load_warehouse(run_id, stage_metrics, gold["summary"]))
    docs = stage("documentation_outputs", lambda: generate_reports(source, silver, gold, warehouse))

    summary = {
        "run_id": run_id,
        "status": "success",
        "engine": "python",
        "started_at": iso_stamp(started_at),
        "finished_at": iso_stamp(datetime.now(timezone.utc)),
        "duration_ms": int((time.perf_counter() - started) * 1000),
        "stages": stage_metrics,
        "outputs": docs["outputs"],
        "warehouse": str(warehouse["file"]),
    }
    write_json(PATHS["reports"] / "pipeline_summary.json", summary)
    logger(f"Python pipeline finished successfully in {summary['duration_ms'] / 1000:.2f}s")
    return summary


def clean_outputs() -> None:
    for key in ("data", "reports", "warehouse", "metadata"):
        reset_dir(PATHS[key])


def normalize_options(options: dict) -> dict:
    def number(key: str) -> int:
        try:
            return int(options.get(key, DEFAULTS[key]))
        except (TypeError, ValueError):
            return int(DEFAULTS[key])

    return {
        "days": number("days"),
        "customers": number("customers"),
        "products": number("products"),
        "min_orders_per_day": DEFAULTS["min_orders_per_day"],
        "max_orders_per_day": DEFAULTS["max_orders_per_day"],
        "seed": number("seed"),
    }


def generate_source(settings: dict) -> dict:
    reset_dir(PATHS["source"])
    rng = SmartRandom(settings["seed"])
    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=settings["days"] - 1)
    customers = build_customers(rng, settings["customers"], start)
    products = build_products(rng, settings["products"])

    write_csv(PATHS["source"] / "customers.csv", customers, ["customer_id", "name", "email", "city", "segment", "signup_date"])
    write_csv(PATHS["source"] / "products.csv", products, ["product_id", "sku", "category", "product_name", "price", "active_status"])

    order_counter = 100000
    event_counter = 700000
    sales_rows = 0
    event_rows = 0

    for offset in range(settings["days"]):
        day = start + timedelta(days=offset)
        day_key = day.isoformat()
        sales: list[dict] = []
        events: list[dict] = []
        orders = rng.integer(settings["min_orders_per_day"], settings["max_orders_per_day"])

        for _ in range(orders):
            order_id = f"ORD{order_counter}"
            order_counter += 1
            customer = rng.pick(customers)
            line_count = rng.integer(1, 4)
            for line in range(1, line_count + 1):
                product = rng.pick(products)
                quantity = rng.integer(1, 5)
                gross = money(float(product["price"]) * quantity)
                discount = money(gross * rng.pick([0, 0, 0.05, 0.1, 0.15]))
                row = {
                    "order_id": order_id,
                    "order_line_no": line,
                    "order_datetime": random_stamp(rng, day),
                    "customer_id": customer["customer_id"],
                    "product_id": product["product_id"],
                    "quantity": quantity,
                    "unit_price": product["price"],
                    "discount_amount": discount,
                    "gross_amount": gross,
                    "net_amount": money(gross - discount),
                    "payment_method": rng.pick(PAYMENTS),
                    "sales_channel": rng.pick(CHANNELS),
                }
                inject_quality_issue(rng, row)
                sales.append(row)

        duplicate_count = max(1, int(len(sales) * 0.015))
        for _ in range(duplicate_count):
            sales.append(dict(rng.pick(sales)))

        for _ in range(orders * rng.integer(5, 8)):
            product = rng.pick(products)
            event_type = rng.pick(["product_view", "add_to_cart", "checkout_start", "search"])
            events.append({
                "event_id": f"EVT{event_counter}",
                "event_timestamp": random_stamp(rng, day),
                "customer_id": rng.pick(customers)["customer_id"],
                "session_id": f"SES{rng.integer(10000, 99999)}",
                "event_type": event_type,
                "product_id": "" if event_type == "search" else product["product_id"],
                "search_term": rng.pick(["coffee", "laptop", "gift", "fitness", "beauty"]) if event_type == "search" else "",
                "channel": rng.pick(CHANNELS),
                "device": rng.pick(["Web", "Android", "iOS", "Tablet"]),
            })
            event_counter += 1

        sales_dir = PATHS["source"] / "sales" / f"date={day_key}"
        events_dir = PATHS["source"] / "events" / f"date={day_key}"
        ensure_dir(sales_dir)
        ensure_dir(events_dir)
        write_csv(
            sales_dir / f"sales_{day_key}.csv",
            sales,
            ["order_id", "order_line_no", "order_datetime", "customer_id", "product_id", "quantity", "unit_price",
             "discount_amount", "gross_amount", "net_amount", "payment_method", "sales_channel"],
        )
        with (events_dir / f"events_{day_key}.jsonl").open("w", encoding="utf-8") as handle:
            for event in events:
                handle.write(json.dumps(event, ensure_ascii=False) + "\n")
        sales_rows += len(sales)
        event_rows += len(events)

    manifest = {
        "generated_at": iso_stamp(datetime.now(timezone.utc)),
        "settings": settings,
        "customers": len(customers),
        "products": len(products),
        "sales_rows": sales_rows,
        "event_rows": event_rows,
        "engine": "python",
    }
    write_json(PATHS["source"] / "source_manifest.json", manifest)
    return {"manifest": manifest, "metrics": {"source_sales_rows": sales_rows, "source_event_rows": event_rows}}


def ingest_bronze(run_id: str) -> dict:
    run_root = PATHS["bronze"] / run_id
    reset_dir(run_root)
    manifest: list[dict] = []
    for file in list_files(PATHS["source"]):
        relative = file.relative_to(PATHS["source"])
        target = run_root / "raw" / relative
        ensure_dir(target.parent)
        shutil.copy2(file, target)
        manifest.append({
            "run_id": run_id,
            "source_file": as_posix(relative),
            "bronze_file": as_posix(target.relative_to(ROOT_DIR)),
            "bytes": file.stat().st_size,
            "sha256": sha256(file),
            "ingested_at": iso_stamp(datetime.now(timezone.utc)),
        })
    write_csv(run_root / "ingestion_manifest.csv", manifest, ["run_id", "source_file", "bronze_file", "bytes", "sha256", "ingested_at"])
    return {"run_root": run_root, "metrics": {"bronze_files": len(manifest)}}


def transform_silver(bronze: dict) -> dict:
    reset_dir(PATHS["silver"])
    raw = bronze["run_root"] / "raw"
    customers = unique_rows(read_csv(raw / "customers.csv"), "customer_id")
    products = unique_rows(read_csv(raw / "products.csv"), "product_id")
    customer_ids = {row["customer_id"] for row in customers}
    product_ids = {row["product_id"] for row in products}
    seen: set[str] = set()
    sales: list[dict] = []
    rejected: list[dict] = []
    metrics = {
        "before": 0,
        "duplicates": 0,
        "invalid_quantity": 0,
        "invalid_amount": 0,
        "null_critical": 0,
        "invalid_reference": 0,
    }

    for file in list_files(raw / "sales"):
        if file.suffix.lower() != ".csv":
            continue
        for row in read_csv(file):
            metrics["before"] += 1
            reasons: list[str] = []
            key = f"{row.get('order_id', '')}|{row.get('order_line_no', '')}"
            if key in seen:
                metrics["duplicates"] += 1
                reasons.append("duplicate_order_line")
            else:
                seen.add(key)

            critical = ["order_id", "order_line_no", "order_datetime", "customer_id", "product_id"]
            if any(not row.get(field) for field in critical):
                metrics["null_critical"] += 1
                reasons.append("missing_critical_field")

            quantity = to_number(row.get("quantity"))
            gross = to_number(row.get("gross_amount"))
            net = to_number(row.get("net_amount"))
            if quantity is None or quantity <= 0:
                metrics["invalid_quantity"] += 1
                reasons.append("invalid_quantity")
            if gross is None or gross <= 0 or net is None or net <= 0:
                metrics["invalid_amount"] += 1
                reasons.append("invalid_amount")
            if row.get("customer_id") not in customer_ids or row.get("product_id") not in product_ids:
                metrics["invalid_reference"] += 1
                reasons.append("invalid_reference")

            order_dt = parse_stamp(row.get("order_datetime", ""))
            if order_dt is None:
                reasons.append("invalid_datetime")

            if reasons:
                rejected.append({**row, "rejection_reason": ";".join(dict.fromkeys(reasons))})
                continue

            assert order_dt is not None and quantity is not None
            sales.append({
                "order_id": row["order_id"],
                "order_line_no": int(float(row["order_line_no"])),
                "order_datetime": iso_stamp(order_dt),
                "order_date": order_dt.date().isoformat(),
                "year_month": order_dt.strftime("%Y-%m"),
                "customer_id": row["customer_id"],
                "product_id": row["product_id"],
                "quantity": int(quantity),
                "unit_price": money(row["unit_price"]),
                "discount_amount": money(row["discount_amount"]),
                "gross_amount": money(row["gross_amount"]),
                "net_amount": money(row["net_amount"]),
                "payment_method": row["payment_method"],
                "sales_channel": row["sales_channel"],
            })

    events: list[dict] = []
    for file in list_files(raw / "events"):
        if file.suffix.lower() != ".jsonl":
            continue
        with file.open("r", encoding="utf-8") as handle:
            for line in handle:
                if not line.strip():
                    continue
                event = json.loads(line)
                event_dt = parse_stamp(event.get("event_timestamp", ""))
                if event_dt is not None and event.get("customer_id") in customer_ids:
                    events.append({**event, "event_timestamp": iso_stamp(event_dt), "event_date": event_dt.date().isoformat()})

    q = {
        **metrics,
        "after": len(sales),
        "rejected": len(rejected),
        "retention_rate": ratio(len(sales), metrics["before"]),
        "duplicate_rate": ratio(metrics["duplicates"], metrics["before"]),
        "invalid_quantity_rate": ratio(metrics["invalid_quantity"], metrics["before"]),
        "invalid_amount_rate": ratio(metrics["invalid_amount"], metrics["before"]),
        "null_critical_rate": ratio(metrics["null_critical"], metrics["before"]),
    }
    quality = {"generated_at": iso_stamp(datetime.now(timezone.utc)), "sales_quality": q}

    write_csv(PATHS["silver"] / "dim_customer.csv", customers, ["customer_id", "name", "email", "city", "segment", "signup_date"])
    write_csv(PATHS["silver"] / "dim_product.csv", products, ["product_id", "sku", "category", "product_name", "price", "active_status"])
    write_csv(PATHS["silver"] / "fact_sales.csv", sales)
    write_csv(PATHS["silver"] / "fact_web_event.csv", events)
    write_csv(PATHS["silver"] / "rejected_sales.csv", rejected, [
        "order_id", "order_line_no", "order_datetime", "customer_id", "product_id", "quantity", "unit_price",
        "discount_amount", "gross_amount", "net_amount", "payment_method", "sales_channel", "rejection_reason",
    ])
    write_json(PATHS["silver"] / "data_quality_report.json", quality)
    return {
        "customers": customers,
        "products": products,
        "sales": sales,
        "events": events,
        "quality": quality,
        "metrics": {"silver_sales_rows": len(sales), "rejected_sales_rows": len(rejected)},
    }


def publish_gold(silver: dict) -> dict:
    reset_dir(PATHS["gold"])
    customer_by_id = {row["customer_id"]: row for row in silver["customers"]}
    product_by_id = {row["product_id"]: row for row in silver["products"]}

    daily_rows = []
    for order_date, group in sorted(aggregate(silver["sales"], lambda row: row["order_date"]).items()):
        daily_rows.append({
            "order_date": order_date,
            "total_sales_revenue": money(group["revenue"]),
            "total_orders": len(group["orders"]),
            "total_items_sold": group["items"],
            "average_order_value": money(group["revenue"] / len(group["orders"])) if group["orders"] else 0,
            "discount_impact_rate": ratio(group["discount"], group["gross"]),
        })

    product_rows = []
    for product_id, group in aggregate(silver["sales"], lambda row: row["product_id"]).items():
        product_rows.append({
            "product_id": product_id,
            **product_by_id[product_id],
            "total_sales_revenue": money(group["revenue"]),
            "total_orders": len(group["orders"]),
            "total_items_sold": group["items"],
        })
    product_rows.sort(key=lambda row: row["total_sales_revenue"], reverse=True)
    product_rows = [{"revenue_rank": index + 1, **row} for index, row in enumerate(product_rows)]

    city_segment_rows = []
    for key, group in aggregate(silver["sales"], lambda row: f"{customer_by_id[row['customer_id']]['city']}|{customer_by_id[row['customer_id']]['segment']}").items():
        city, segment = key.split("|")
        city_segment_rows.append({
            "city": city,
            "segment": segment,
            "total_sales_revenue": money(group["revenue"]),
            "total_orders": len(group["orders"]),
            "total_items_sold": group["items"],
            "average_order_value": money(group["revenue"] / len(group["orders"])) if group["orders"] else 0,
        })
    city_segment_rows.sort(key=lambda row: row["total_sales_revenue"], reverse=True)

    channel_groups = aggregate(silver["sales"], lambda row: row["sales_channel"])
    total_revenue = sum(group["revenue"] for group in channel_groups.values())
    channel_rows = []
    for channel, group in channel_groups.items():
        channel_rows.append({
            "sales_channel": channel,
            "total_sales_revenue": money(group["revenue"]),
            "total_orders": len(group["orders"]),
            "total_items_sold": group["items"],
            "revenue_share": ratio(group["revenue"], total_revenue),
        })
    channel_rows.sort(key=lambda row: row["total_sales_revenue"], reverse=True)

    behavior = build_behavior(silver["events"], product_by_id)
    business_kpis = {
        "total_sales_revenue": money(sum(row["total_sales_revenue"] for row in daily_rows)),
        "total_orders": sum(row["total_orders"] for row in daily_rows),
        "total_items_sold": sum(row["total_items_sold"] for row in daily_rows),
    }
    business_kpis["average_order_value"] = money(business_kpis["total_sales_revenue"] / business_kpis["total_orders"]) if business_kpis["total_orders"] else 0

    summary = {
        "generated_at": iso_stamp(datetime.now(timezone.utc)),
        "engine": "python",
        "business_kpis": business_kpis,
        "data_quality": silver["quality"]["sales_quality"],
        "leaders": {
            "top_product": product_rows[0] if product_rows else None,
            "top_city_segment": city_segment_rows[0] if city_segment_rows else None,
            "top_channel": channel_rows[0] if channel_rows else None,
        },
    }

    write_csv(PATHS["gold"] / "daily_sales_kpis.csv", daily_rows)
    write_csv(PATHS["gold"] / "product_performance.csv", product_rows)
    write_csv(PATHS["gold"] / "city_segment_performance.csv", city_segment_rows)
    write_csv(PATHS["gold"] / "channel_sales.csv", channel_rows)
    write_csv(PATHS["gold"] / "behavior_funnel.csv", behavior)
    write_json(PATHS["gold"] / "executive_summary.json", summary)
    return {
        "daily_rows": daily_rows,
        "products": product_rows,
        "city_segment": city_segment_rows,
        "channel_rows": channel_rows,
        "behavior": behavior,
        "summary": summary,
        "metrics": {"gold_daily_rows": len(daily_rows), "gold_product_rows": len(product_rows)},
    }


def load_warehouse(run_id: str, stages: list[dict], summary: dict) -> dict:
    ensure_dir(PATHS["warehouse"])
    PATHS["warehouse_file"].unlink(missing_ok=True)
    with sqlite3.connect(PATHS["warehouse_file"]) as connection:
        connection.executescript(PATHS["schema"].read_text(encoding="utf-8"))
        load_csv(connection, "dim_customer", PATHS["silver"] / "dim_customer.csv")
        load_csv(connection, "dim_product", PATHS["silver"] / "dim_product.csv")
        load_csv(connection, "fact_sales", PATHS["silver"] / "fact_sales.csv")
        load_csv(connection, "fact_web_event", PATHS["silver"] / "fact_web_event.csv")
        load_csv(connection, "agg_daily_sales_kpis", PATHS["gold"] / "daily_sales_kpis.csv")
        load_csv(connection, "agg_product_performance", PATHS["gold"] / "product_performance.csv")
        load_csv(connection, "agg_city_segment_performance", PATHS["gold"] / "city_segment_performance.csv")
        load_csv(connection, "agg_channel_sales", PATHS["gold"] / "channel_sales.csv")
        load_csv(connection, "agg_behavior_funnel", PATHS["gold"] / "behavior_funnel.csv")
        connection.execute(
            "INSERT INTO pipeline_run VALUES (?, ?, ?, ?)",
            (run_id, iso_stamp(datetime.now(timezone.utc)), json.dumps(stages), json.dumps(summary)),
        )
    return {"file": PATHS["warehouse_file"], "metrics": {"warehouse_size_bytes": PATHS["warehouse_file"].stat().st_size}}


def generate_reports(source: dict, silver: dict, gold: dict, warehouse: dict) -> dict:
    reset_dir(PATHS["reports"])
    ensure_dir(PATHS["metadata"])
    write_json(PATHS["reports"] / "executive_summary.json", gold["summary"])
    write_json(PATHS["reports"] / "data_quality_report.json", silver["quality"])
    (PATHS["reports"] / "executive_summary.md").write_text(markdown_summary(gold["summary"]), encoding="utf-8")
    (PATHS["reports"] / "data_quality_report.md").write_text(markdown_quality(silver["quality"]), encoding="utf-8")
    (PATHS["reports"] / "dashboard.html").write_text(dashboard_html(gold["summary"], gold["products"], gold["city_segment"], gold["channel_rows"]), encoding="utf-8")
    (PATHS["reports"] / "sql_assistant_examples.sql").write_text(sql_examples(), encoding="utf-8")
    write_json(PATHS["metadata"] / "catalog.json", catalog())
    return {
        "outputs": {
            "dashboard": str(PATHS["reports"] / "dashboard.html"),
            "warehouse": str(warehouse["file"]),
            "executive_summary": str(PATHS["reports"] / "executive_summary.md"),
            "quality_report": str(PATHS["reports"] / "data_quality_report.md"),
        },
        "metrics": {"report_files": 5, "source_sales_rows": source["manifest"]["sales_rows"]},
    }


def build_customers(rng: SmartRandom, count: int, start: date) -> list[dict]:
    customers = []
    for index in range(count):
        first = rng.pick(NAMES)
        last = rng.pick(SURNAMES)
        customers.append({
            "customer_id": f"CUST{index + 1:04d}",
            "name": f"{first} {last}",
            "email": f"{first}.{last}.{index + 1}@example.com".lower(),
            "city": rng.pick(CITIES),
            "segment": rng.pick(SEGMENTS),
            "signup_date": (start - timedelta(days=rng.integer(30, 900))).isoformat(),
        })
    return customers


def build_products(rng: SmartRandom, count: int) -> list[dict]:
    products = []
    for index in range(count):
        category = rng.pick(CATEGORIES)
        products.append({
            "product_id": f"PROD{index + 1:04d}",
            "sku": f"{category[:3].upper()}-{index + 1:05d}",
            "category": category,
            "product_name": f"{rng.pick(PRODUCT_NAMES[category])} {rng.pick(['Basic', 'Plus', 'Pro', 'Max'])}",
            "price": money(rng.integer(8, 260) + rng.pick([0.49, 0.95, 0.99])),
            "active_status": "active" if rng.chance(0.94) else "inactive",
        })
    return products


def inject_quality_issue(rng: SmartRandom, row: dict) -> None:
    if rng.chance(0.006):
        row["customer_id"] = "CUST9999"
    if rng.chance(0.006):
        row["product_id"] = "PROD9999"
    if rng.chance(0.008):
        row["customer_id"] = ""
    if rng.chance(0.008):
        row["order_datetime"] = ""
    if rng.chance(0.01):
        row["quantity"] = -abs(int(row["quantity"]))
    if rng.chance(0.01):
        row["net_amount"] = -abs(float(row["net_amount"]))


def random_stamp(rng: SmartRandom, day: date) -> str:
    value = datetime(day.year, day.month, day.day, rng.integer(8, 22), rng.integer(0, 59), rng.integer(0, 59), tzinfo=timezone.utc)
    return iso_stamp(value)


def unique_rows(rows: list[dict], key: str) -> list[dict]:
    seen = set()
    result = []
    for row in rows:
        value = row.get(key)
        if value and value not in seen:
            seen.add(value)
            result.append(row)
    return result


def aggregate(rows: list[dict], key_fn) -> dict:
    groups = defaultdict(lambda: {"revenue": 0.0, "gross": 0.0, "discount": 0.0, "items": 0, "orders": set()})
    for row in rows:
        key = key_fn(row)
        group = groups[key]
        group["revenue"] += float(row["net_amount"])
        group["gross"] += float(row["gross_amount"])
        group["discount"] += float(row["discount_amount"])
        group["items"] += int(row["quantity"])
        group["orders"].add(row["order_id"])
    return groups


def build_behavior(events: list[dict], product_by_id: dict) -> list[dict]:
    groups = defaultdict(lambda: {"views": 0, "carts": 0, "checkouts": 0})
    for event in events:
        product_id = event.get("product_id")
        if not product_id:
            continue
        if event.get("event_type") == "product_view":
            groups[product_id]["views"] += 1
        if event.get("event_type") == "add_to_cart":
            groups[product_id]["carts"] += 1
        if event.get("event_type") == "checkout_start":
            groups[product_id]["checkouts"] += 1

    rows = []
    for product_id, group in groups.items():
        rows.append({
            "product_id": product_id,
            "product_name": product_by_id.get(product_id, {}).get("product_name", ""),
            "product_view_count": group["views"],
            "add_to_cart_count": group["carts"],
            "checkout_start_count": group["checkouts"],
            "add_to_cart_rate": ratio(group["carts"], group["views"]),
            "checkout_start_rate": ratio(group["checkouts"], group["carts"]),
        })
    rows.sort(key=lambda row: row["product_view_count"], reverse=True)
    return rows


def load_csv(connection: sqlite3.Connection, table_name: str, file: Path) -> None:
    rows = read_csv(file)
    if not rows:
        return
    columns = list(rows[0].keys())
    quoted_columns = ",".join(f'"{column}"' for column in columns)
    placeholders = ",".join("?" for _ in columns)
    sql = f"INSERT INTO {table_name} ({quoted_columns}) VALUES ({placeholders})"
    values = [[normalize_value(row.get(column, "")) for column in columns] for row in rows]
    connection.executemany(sql, values)


def markdown_summary(summary: dict) -> str:
    kpi = summary["business_kpis"]
    quality = summary["data_quality"]
    top_product = summary["leaders"]["top_product"] or {}
    return f"""# Executive Summary

Generated at: {summary["generated_at"]}
Engine: Python

| KPI | Value |
| --- | ---: |
| Total revenue | {kpi["total_sales_revenue"]} |
| Total orders | {kpi["total_orders"]} |
| Total items sold | {kpi["total_items_sold"]} |
| Average order value | {kpi["average_order_value"]} |
| Data retention | {quality["retention_rate"] * 100:.2f}% |

Top product: {top_product.get("product_name", "n/a")}
"""


def markdown_quality(quality: dict) -> str:
    q = quality["sales_quality"]
    return f"""# Data Quality Report

Engine: Python

| KPI | Value |
| --- | ---: |
| Rows before cleaning | {q["before"]} |
| Rows after cleaning | {q["after"]} |
| Rejected rows | {q["rejected"]} |
| Duplicate rate | {q["duplicate_rate"] * 100:.2f}% |
| Invalid quantity rate | {q["invalid_quantity_rate"] * 100:.2f}% |
| Invalid amount rate | {q["invalid_amount_rate"] * 100:.2f}% |
| Retention rate | {q["retention_rate"] * 100:.2f}% |
"""


def dashboard_html(summary: dict, products: list[dict], city_segment: list[dict], channels: list[dict]) -> str:
    product_rows = "".join(
        f"<tr><td>{row['revenue_rank']}</td><td>{html.escape(row['product_name'])}</td><td>{html.escape(row['category'])}</td><td>{row['total_sales_revenue']}</td></tr>"
        for row in products[:8]
    )
    city_rows = "".join(
        f"<tr><td>{html.escape(row['city'])}</td><td>{html.escape(row['segment'])}</td><td>{row['total_sales_revenue']}</td></tr>"
        for row in city_segment[:8]
    )
    channel_rows = "".join(
        f"<tr><td>{html.escape(row['sales_channel'])}</td><td>{row['total_sales_revenue']}</td><td>{row['revenue_share'] * 100:.1f}%</td></tr>"
        for row in channels
    )
    kpi = summary["business_kpis"]
    quality = summary["data_quality"]
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Smart Retail Dashboard</title><style>
body{{font-family:Segoe UI,Arial,sans-serif;margin:0;background:#f6f7f9;color:#17202a}}header{{background:#fff;border-bottom:1px solid #d8dee7;padding:24px 40px}}main{{padding:24px 40px}}.cards{{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}}.card,.panel{{background:#fff;border:1px solid #d8dee7;border-radius:8px;padding:16px;box-shadow:0 8px 24px #17202a12}}.value{{font-size:28px;font-weight:800;margin-top:8px}}.grid{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:16px}}table{{width:100%;border-collapse:collapse}}td,th{{border-bottom:1px solid #d8dee7;padding:9px;text-align:left}}@media(max-width:850px){{.grid{{grid-template-columns:1fr}}}}
</style></head><body><header><h1>Smart Retail Dashboard</h1><p>Generated by Python at {summary["generated_at"]}</p></header><main><section class="cards">
<div class="card"><span>Revenue</span><div class="value">${kpi["total_sales_revenue"]:,.0f}</div></div>
<div class="card"><span>Orders</span><div class="value">{kpi["total_orders"]:,}</div></div>
<div class="card"><span>Items</span><div class="value">{kpi["total_items_sold"]:,}</div></div>
<div class="card"><span>Retention</span><div class="value">{quality["retention_rate"] * 100:.1f}%</div></div>
</section><section class="grid"><div class="panel"><h2>Top Products</h2><table><tbody>{product_rows}</tbody></table></div><div class="panel"><h2>City / Segment</h2><table><tbody>{city_rows}</tbody></table></div><div class="panel"><h2>Channels</h2><table><tbody>{channel_rows}</tbody></table></div></section></main></body></html>"""


def sql_examples() -> str:
    return """SELECT * FROM vw_retail_kpi_scorecard;
SELECT * FROM vw_top_products LIMIT 10;
SELECT * FROM vw_city_segment_sales LIMIT 20;
SELECT * FROM vw_data_quality_health;"""


def catalog() -> dict:
    return {
        "engine": "python",
        "tables": [
            {"name": "fact_sales", "grain": "one row per clean order line"},
            {"name": "fact_web_event", "grain": "one row per clean web or app event"},
            {"name": "dim_customer", "grain": "one row per customer"},
            {"name": "dim_product", "grain": "one row per product"},
        ],
    }


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def reset_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def list_files(path: Path) -> list[Path]:
    if not path.exists():
        return []
    return sorted(item for item in path.rglob("*") if item.is_file())


def read_csv(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict], fieldnames: list[str] | None = None) -> None:
    ensure_dir(path.parent)
    if fieldnames is None:
        fieldnames = list(rows[0].keys()) if rows else []
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        if fieldnames:
            writer.writeheader()
            writer.writerows(rows)


def write_json(path: Path, value: dict) -> None:
    ensure_dir(path.parent)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def as_posix(path: Path) -> str:
    return path.as_posix()


def money(value) -> float:
    try:
        return round(float(value) + 1e-9, 2)
    except (TypeError, ValueError):
        return 0.0


def ratio(numerator, denominator) -> float:
    denominator = float(denominator or 0)
    if denominator == 0:
        return 0.0
    return round(float(numerator) / denominator, 4)


def iso_stamp(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_stamp(value: str) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None


def to_number(value) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def normalize_value(value):
    if value == "":
        return None
    number = to_number(value)
    return number if number is not None else value


def main() -> int:
    parser = argparse.ArgumentParser(description="Smart Retail Pro Python pipeline")
    subparsers = parser.add_subparsers(dest="command")
    run_parser = subparsers.add_parser("run", help="Run the Python data pipeline")
    run_parser.add_argument("--days", type=int, default=DEFAULTS["days"])
    run_parser.add_argument("--customers", type=int, default=DEFAULTS["customers"])
    run_parser.add_argument("--products", type=int, default=DEFAULTS["products"])
    run_parser.add_argument("--seed", type=int, default=DEFAULTS["seed"])
    subparsers.add_parser("clean", help="Clean generated data, reports, metadata, and warehouse")
    args = parser.parse_args()

    if args.command == "clean":
        clean_outputs()
        print("Generated outputs cleaned.")
        return 0

    options = {
        "days": getattr(args, "days", DEFAULTS["days"]),
        "customers": getattr(args, "customers", DEFAULTS["customers"]),
        "products": getattr(args, "products", DEFAULTS["products"]),
        "seed": getattr(args, "seed", DEFAULTS["seed"]),
    }
    summary = run_pipeline(options)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
