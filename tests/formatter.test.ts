import { describe, it, expect } from "vitest";
import { formatTable } from "../src/formatter.js";
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
