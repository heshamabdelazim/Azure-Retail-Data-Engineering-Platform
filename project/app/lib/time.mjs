export function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function isoStamp(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function monthKey(date) {
  return date.toISOString().slice(0, 7);
}

export function money(value) {
  return Number(Number(value || 0).toFixed(2));
}

export function ratio(a, b) {
  const bottom = Number(b);
  return bottom ? Number((Number(a) / bottom).toFixed(4)) : 0;
}
