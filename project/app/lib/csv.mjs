import fs from "node:fs";
import path from "node:path";
import { ensureDir } from "./fsx.mjs";

export function writeCsv(file, rows, headers = null) {
  ensureDir(path.dirname(file));
  const columns = headers ?? [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [columns.map(escapeCsv).join(",")];
  for (const row of rows) lines.push(columns.map((column) => escapeCsv(row[column])).join(","));
  fs.writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
}

export function readCsv(file) {
  const records = parseCsv(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  if (!records.length) return [];
  const headers = records[0].map((value) => value.trim());
  return records.slice(1).filter((record) => record.some(Boolean)).map((record) => {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = record[index] ?? "";
    });
    return row;
  });
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

export function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
