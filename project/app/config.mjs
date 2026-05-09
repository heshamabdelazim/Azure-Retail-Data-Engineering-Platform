import path from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

export const paths = {
  app: path.join(rootDir, "app"),
  data: path.join(rootDir, "data"),
  source: path.join(rootDir, "data", "source"),
  bronze: path.join(rootDir, "data", "bronze"),
  silver: path.join(rootDir, "data", "silver"),
  gold: path.join(rootDir, "data", "gold"),
  warehouse: path.join(rootDir, "warehouse"),
  warehouseFile: path.join(rootDir, "warehouse", "smart_retail.sqlite"),
  reports: path.join(rootDir, "reports"),
  metadata: path.join(rootDir, "metadata"),
  public: path.join(rootDir, "app", "public"),
  schema: path.join(rootDir, "app", "sql", "schema.sql")
};

export const defaults = {
  days: 14,
  customers: 160,
  products: 50,
  minOrdersPerDay: 42,
  maxOrdersPerDay: 76,
  seed: 20260505
};
