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

function separator(jpyOnly: boolean): string {
  const base = "-".repeat(COL_DATE) + " " + "-".repeat(COL_SERVICE) + " ";
  return jpyOnly
    ? base + "-".repeat(COL_JPY)
    : base + "-".repeat(COL_USD) + " " + "-".repeat(COL_JPY);
}

export interface FormatOptions {
  title: string;
  startDate: string;
  endDate: string;
  profile?: string;
  rate: number;
  sourceCurrency?: string;
}

export function formatTable(entries: CostEntry[], options: FormatOptions): string {
  const jpyOnly = options.sourceCurrency === "JPY";
  const mixed = options.sourceCurrency === "mixed";
  const lines: string[] = [];

  lines.push(`${options.title}: ${options.startDate} → ${options.endDate}`);
  const profilePart = options.profile ? `Profile: ${options.profile} | ` : "";
  if (jpyOnly) {
    lines.push(profilePart ? `${profilePart}(JPY billing)` : "(JPY billing)");
  } else {
    lines.push(`${profilePart}Exchange rate: 1 USD = ¥${options.rate.toFixed(2)}`);
  }
  lines.push("");

  // Header
  if (jpyOnly) {
    lines.push(
      pad("Date", COL_DATE) + " " + pad("Service", COL_SERVICE) + " " + padLeft("JPY", COL_JPY),
    );
  } else {
    lines.push(
      pad("Date", COL_DATE) +
        " " +
        pad("Service", COL_SERVICE) +
        " " +
        padLeft("USD", COL_USD) +
        " " +
        padLeft("JPY", COL_JPY),
    );
  }
  lines.push(separator(jpyOnly));

  let totalUsd = 0;
  let totalJpy = 0;
  for (const entry of entries) {
    if (jpyOnly) {
      const jpy = Math.round(entry.amount);
      totalJpy += jpy;
      lines.push(
        pad(entry.date, COL_DATE) +
          " " +
          pad(entry.service, COL_SERVICE) +
          " " +
          padLeft(`¥${jpy.toLocaleString()}`, COL_JPY),
      );
    } else if (entry.currency === "JPY") {
      const jpy = Math.round(entry.amount);
      totalJpy += jpy;
      lines.push(
        pad(entry.date, COL_DATE) +
          " " +
          pad(entry.service, COL_SERVICE) +
          " " +
          padLeft("", COL_USD) +
          " " +
          padLeft(`¥${jpy.toLocaleString()}`, COL_JPY),
      );
    } else {
      const jpy = convertToJPY(entry.amount, options.rate);
      totalUsd += entry.amount;
      totalJpy += jpy;
      lines.push(
        pad(entry.date, COL_DATE) +
          " " +
          pad(entry.service, COL_SERVICE) +
          " " +
          padLeft(`$${entry.amount.toFixed(2)}`, COL_USD) +
          " " +
          padLeft(`¥${jpy.toLocaleString()}`, COL_JPY),
      );
    }
  }

  if (entries.length === 0) {
    lines.push("(no costs found for this period)");
  }

  lines.push(separator(jpyOnly));

  if (jpyOnly) {
    lines.push(
      pad("TOTAL", COL_DATE) +
        " " +
        pad("", COL_SERVICE) +
        " " +
        padLeft(`¥${totalJpy.toLocaleString()}`, COL_JPY),
    );
  } else if (mixed) {
    lines.push(
      pad("TOTAL", COL_DATE) +
        " " +
        pad("", COL_SERVICE) +
        " " +
        padLeft("", COL_USD) +
        " " +
        padLeft(`¥${totalJpy.toLocaleString()}`, COL_JPY),
    );
  } else {
    lines.push(
      pad("TOTAL", COL_DATE) +
        " " +
        pad("", COL_SERVICE) +
        " " +
        padLeft(`$${totalUsd.toFixed(2)}`, COL_USD) +
        " " +
        padLeft(`¥${totalJpy.toLocaleString()}`, COL_JPY),
    );
  }

  return lines.join("\n");
}

export function fillZeroDays(entries: CostEntry[], startDate: string, endDate: string): CostEntry[] {
  const datesWithEntry = new Set(entries.map(e => e.date));
  const entryCurrency = entries.length > 0 ? entries[0].currency : "USD";
  const filled = [...entries];

  const start = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    if (!datesWithEntry.has(dateStr)) {
      filled.push({ date: dateStr, service: "-", amount: 0, currency: entryCurrency });
    }
  }

  return filled.sort((a, b) => a.date.localeCompare(b.date));
}

export interface ProviderResult {
  name: string;
  entries: CostEntry[];
}

export function mergeProviders(results: ProviderResult[]): CostEntry[] {
  const allEntries: CostEntry[] = [];
  for (const result of results) {
    for (const entry of result.entries) {
      allEntries.push({ ...entry, service: `${result.name} / ${entry.service}` });
    }
  }
  return allEntries;
}
