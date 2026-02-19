import { describe, it, expect } from "vitest";
import { formatTable, fillZeroDays } from "../src/formatter.js";
import type { CostEntry } from "../src/providers/aws.js";

const baseOptions = {
  title: "AWS Cost Report",
  startDate: "2026-02-01",
  endDate: "2026-02-19",
  profile: "default",
  rate: 150,
};

describe("formatTable", () => {
  it("includes header with title, date range and exchange rate", () => {
    const output = formatTable([], baseOptions);
    expect(output).toContain("AWS Cost Report: 2026-02-01 → 2026-02-19");
    expect(output).toContain("Exchange rate: 1 USD = ¥150.00");
  });

  it("uses the provided title", () => {
    const output = formatTable([], { ...baseOptions, title: "OpenAI Cost Report" });
    expect(output).toContain("OpenAI Cost Report: 2026-02-01 → 2026-02-19");
  });

  it("shows profile when provided", () => {
    const output = formatTable([], baseOptions);
    expect(output).toContain("Profile: default");
  });

  it("omits profile line when not provided", () => {
    const output = formatTable([], { ...baseOptions, profile: undefined });
    expect(output).not.toContain("Profile:");
    expect(output).toContain("Exchange rate:");
  });

  it("shows a message when no entries", () => {
    const output = formatTable([], baseOptions);
    expect(output).toContain("(no costs found for this period)");
  });

  it("formats entries with USD and JPY values", () => {
    const entries: CostEntry[] = [
      { date: "2026-02-01", service: "Amazon EC2", amount: 1.23, currency: "USD" },
    ];
    const output = formatTable(entries, baseOptions);
    expect(output).toContain("$1.23");
    expect(output).toContain("¥185"); // Math.round(1.23 * 150) = 185
    expect(output).toContain("Amazon EC2");
  });

  it("calculates and shows total", () => {
    const entries: CostEntry[] = [
      { date: "2026-02-01", service: "Amazon EC2", amount: 2.00, currency: "USD" },
      { date: "2026-02-01", service: "Amazon S3", amount: 1.00, currency: "USD" },
    ];
    const output = formatTable(entries, baseOptions);
    expect(output).toContain("TOTAL");
    expect(output).toContain("$3.00");
    expect(output).toContain("¥450"); // 3 * 150
  });
});

describe("formatTable with JPY source currency", () => {
  const jpyOptions = {
    title: "GCP Cost Report",
    startDate: "2026-02-01",
    endDate: "2026-02-20",
    rate: 0,
    sourceCurrency: "JPY",
  };

  it("shows JPY billing header instead of exchange rate", () => {
    const output = formatTable([], jpyOptions);
    expect(output).toContain("GCP Cost Report");
    expect(output).toContain("JPY billing");
    expect(output).not.toContain("Exchange rate");
  });

  it("shows only JPY column without USD", () => {
    const entries: CostEntry[] = [
      { date: "2026-02-01", service: "Cloud Run", amount: 123, currency: "JPY" },
    ];
    const output = formatTable(entries, jpyOptions);
    expect(output).toContain("¥123");
    expect(output).not.toContain("$");
  });

  it("calculates JPY total correctly", () => {
    const entries: CostEntry[] = [
      { date: "2026-02-01", service: "Cloud Run", amount: 100, currency: "JPY" },
      { date: "2026-02-01", service: "BigQuery", amount: 50, currency: "JPY" },
    ];
    const output = formatTable(entries, jpyOptions);
    expect(output).toContain("TOTAL");
    expect(output).toContain("¥150");
  });
});

describe("formatTable with mixed currency", () => {
  const mixedOptions = {
    title: "Cost Report (AWS + GCP)",
    startDate: "2026-02-01",
    endDate: "2026-02-20",
    rate: 150,
    sourceCurrency: "mixed",
  };

  it("shows USD amount for USD entries and blank for JPY entries", () => {
    const entries: CostEntry[] = [
      { date: "2026-02-01", service: "AWS / EC2", amount: 1.23, currency: "USD" },
      { date: "2026-02-01", service: "GCP / Cloud Run", amount: 100, currency: "JPY" },
    ];
    const output = formatTable(entries, mixedOptions);
    expect(output).toContain("$1.23");
    expect(output).toContain("¥185"); // Math.round(1.23 * 150)
    expect(output).toContain("¥100");
  });

  it("shows exchange rate in header", () => {
    const output = formatTable([], mixedOptions);
    expect(output).toContain("Exchange rate: 1 USD = ¥150.00");
  });

  it("shows only JPY in TOTAL row", () => {
    const entries: CostEntry[] = [
      { date: "2026-02-01", service: "AWS / EC2", amount: 1.00, currency: "USD" },
      { date: "2026-02-01", service: "GCP / Run", amount: 100, currency: "JPY" },
    ];
    const output = formatTable(entries, mixedOptions);
    const totalLine = output.split("\n").find(l => l.startsWith("TOTAL"));
    expect(totalLine).toContain("¥250"); // 150 + 100
    expect(totalLine).not.toContain("$");
  });
});

describe("fillZeroDays", () => {
  it("inserts a '-' entry for dates with no costs", () => {
    const entries: CostEntry[] = [
      { date: "2026-02-16", service: "tts", amount: 0.005, currency: "USD" },
    ];
    const filled = fillZeroDays(entries, "2026-02-15", "2026-02-18");

    expect(filled).toHaveLength(3); // Feb 15 (zero), Feb 16 (tts), Feb 17 (zero)
    expect(filled.find(e => e.date === "2026-02-15")?.service).toBe("-");
    expect(filled.find(e => e.date === "2026-02-17")?.service).toBe("-");
    expect(filled.find(e => e.date === "2026-02-15")?.amount).toBe(0);
  });

  it("does not insert zero for a date that already has an entry", () => {
    const entries: CostEntry[] = [
      { date: "2026-02-16", service: "tts", amount: 0.005, currency: "USD" },
    ];
    const filled = fillZeroDays(entries, "2026-02-16", "2026-02-17");

    expect(filled).toHaveLength(1);
    expect(filled[0]?.service).toBe("tts");
  });

  it("returns entries sorted by date", () => {
    const entries: CostEntry[] = [
      { date: "2026-02-18", service: "tts", amount: 0.005, currency: "USD" },
    ];
    const filled = fillZeroDays(entries, "2026-02-16", "2026-02-19");

    expect(filled.map(e => e.date)).toEqual(["2026-02-16", "2026-02-17", "2026-02-18"]);
  });

  it("uses the currency from existing entries for zero-day fills", () => {
    const entries: CostEntry[] = [
      { date: "2026-02-16", service: "Cloud Run", amount: 100, currency: "JPY" },
    ];
    const filled = fillZeroDays(entries, "2026-02-15", "2026-02-18");
    const zeroDayEntry = filled.find(e => e.date === "2026-02-15");
    expect(zeroDayEntry?.currency).toBe("JPY");
  });
});
