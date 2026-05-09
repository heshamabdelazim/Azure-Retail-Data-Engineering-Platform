import assert from "node:assert/strict";
import fs from "node:fs";
import { parseCsv } from "./lib/csv.mjs";
import { runPipeline } from "./pipeline.mjs";
import { paths } from "./config.mjs";

assert.deepEqual(parseCsv('a,b\n1,"x,y"\n'), [["a", "b"], ["1", "x,y"]]);
const summary = await runPipeline({ days: 2, customers: 20, products: 12, seed: 11 }, () => {});
assert.equal(summary.status, "success");
assert.ok(fs.existsSync(paths.warehouseFile));
assert.ok(fs.existsSync(paths.reports));
console.log("All Smart Retail Pro checks passed.");
