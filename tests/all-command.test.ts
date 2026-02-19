import { describe, it, expect } from "vitest";
import { mergeProviders } from "../src/formatter.js";
import type { CostEntry } from "../src/providers/aws.js";

describe("mergeProviders", () => {
  it("prefixes service names with provider name", () => {
    const results = [
      { name: "AWS", entries: [{ date: "2026-02-01", service: "EC2", amount: 1, currency: "USD" }] },
    ];
    const merged = mergeProviders(results);
    expect(merged[0]?.service).toBe("AWS / EC2");
  });

  it("preserves original currency (USD stays USD)", () => {
    const results = [
      { name: "OpenAI", entries: [{ date: "2026-02-01", service: "gpt-4", amount: 1.5, currency: "USD" }] },
    ];
    const merged = mergeProviders(results);
    expect(merged[0]?.amount).toBe(1.5);
    expect(merged[0]?.currency).toBe("USD");
  });

  it("preserves original currency (JPY stays JPY)", () => {
    const results = [
      { name: "GCP", entries: [{ date: "2026-02-01", service: "Cloud Run", amount: 123, currency: "JPY" }] },
    ];
    const merged = mergeProviders(results);
    expect(merged[0]?.amount).toBe(123);
    expect(merged[0]?.currency).toBe("JPY");
  });

  it("merges entries from multiple providers", () => {
    const results = [
      { name: "AWS", entries: [{ date: "2026-02-01", service: "EC2", amount: 1, currency: "USD" }] },
      { name: "GCP", entries: [{ date: "2026-02-01", service: "Run", amount: 100, currency: "JPY" }] },
    ];
    const merged = mergeProviders(results);
    expect(merged).toHaveLength(2);
    expect(merged[0]?.service).toBe("AWS / EC2");
    expect(merged[1]?.service).toBe("GCP / Run");
  });

  it("returns empty array when no results", () => {
    expect(mergeProviders([])).toEqual([]);
  });

  it("handles provider with empty entries", () => {
    const results = [
      { name: "AWS", entries: [] as CostEntry[] },
      { name: "GCP", entries: [{ date: "2026-02-01", service: "Run", amount: 50, currency: "JPY" }] },
    ];
    const merged = mergeProviders(results);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.service).toBe("GCP / Run");
  });
});
