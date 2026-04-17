import Table from "cli-table3";

export interface JsonOptions {
  json?: boolean;
}

export function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printRecord(
  record: Record<string, unknown> | undefined,
  options: JsonOptions = {},
): void {
  if (!record) {
    console.log("(empty)");
    return;
  }
  if (options.json) {
    outputJson(record);
    return;
  }
  const table = new Table({ head: ["Field", "Value"] });
  for (const [key, value] of Object.entries(record)) {
    table.push([key, formatCell(value)]);
  }
  console.log(table.toString());
}

export function printTable(
  rows: Array<Record<string, unknown>>,
  options: JsonOptions & { columns?: string[] } = {},
): void {
  if (options.json) {
    outputJson(rows);
    return;
  }
  if (rows.length === 0) {
    console.log("(no rows)");
    return;
  }
  const columns = options.columns ?? Object.keys(rows[0] ?? {});
  const table = new Table({ head: columns });
  for (const row of rows) {
    table.push(columns.map((col) => formatCell(row[col])));
  }
  console.log(table.toString());
}

export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function formatNumber(value: string | number | undefined): string {
  if (value === undefined || value === null || value === "") return "";
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString("ko-KR");
}
