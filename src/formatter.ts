import type { CostEntry } from "./providers/aws.js";
import { convertToJPY } from "./currency.js";

const COL_DATE = 11;
const COL_SERVICE = 30;
const COL_USD = 12;
const COL_JPY = 12;

function pad(s: string, width: number): string {
  return s.length >= width ? s.slice(0, width) : s + " ".repeat(width - s.length);
}

function padLeft(s: string, width: number): string {
  return s.length >= width ? s.slice(0, width) : " ".repeat(width - s.length) + s;
}

function separator(): string {
  return (
    "-".repeat(COL_DATE) +
    " " +
    "-".repeat(COL_SERVICE) +
    " " +
    "-".repeat(COL_USD) +
    " " +
    "-".repeat(COL_JPY)
  );
}

export interface FormatOptions {
  title: string;
  startDate: string;
  endDate: string;
  profile?: string;
  rate: number;
}

export function formatTable(entries: CostEntry[], options: FormatOptions): string {
  const lines: string[] = [];

  lines.push(`${options.title}: ${options.startDate} → ${options.endDate}`);
  const profilePart = options.profile ? `Profile: ${options.profile} | ` : "";
  lines.push(`${profilePart}Exchange rate: 1 USD = ¥${options.rate.toFixed(2)}`);
  lines.push("");

  // Header
  lines.push(
    pad("Date", COL_DATE) +
      " " +
      pad("Service", COL_SERVICE) +
      " " +
      padLeft("USD", COL_USD) +
      " " +
      padLeft("JPY", COL_JPY)
  );
  lines.push(separator());

  let totalUsd = 0;
  for (const entry of entries) {
    const jpy = convertToJPY(entry.amount, options.rate);
    totalUsd += entry.amount;

    lines.push(
      pad(entry.date, COL_DATE) +
        " " +
        pad(entry.service, COL_SERVICE) +
        " " +
        padLeft(`$${entry.amount.toFixed(2)}`, COL_USD) +
        " " +
        padLeft(`¥${jpy.toLocaleString()}`, COL_JPY)
    );
  }

  if (entries.length === 0) {
    lines.push("(no costs found for this period)");
  }

  lines.push(separator());

  const totalJpy = convertToJPY(totalUsd, options.rate);
  lines.push(
    pad("TOTAL", COL_DATE) +
      " " +
      pad("", COL_SERVICE) +
      " " +
      padLeft(`$${totalUsd.toFixed(2)}`, COL_USD) +
      " " +
      padLeft(`¥${totalJpy.toLocaleString()}`, COL_JPY)
  );

  return lines.join("\n");
}
