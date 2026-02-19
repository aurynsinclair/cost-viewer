import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOpenAiCosts } from "../../src/providers/openai.js";

beforeEach(() => {
  vi.restoreAllMocks();
});

const baseOptions = {
  startDate: "2026-02-01",
  endDate: "2026-02-19",
  apiKey: "sk-admin-test",
};

describe("getOpenAiCosts", () => {
  it("returns parsed cost entries from API response", async () => {
    // 実際のAPIは1バケット内に複数の results を持つ配列構造
    const mockResponse = {
      data: [
        {
          start_time: 1738368000, // 2026-02-01 UTC
          end_time: 1738454400,
          results: [
            { amount: { currency: "usd", value: "0.13" }, line_item: "gpt-4-turbo-usage" },
            { amount: { currency: "usd", value: "0.02" }, line_item: "gpt-3.5-turbo-usage" },
          ],
        },
      ],
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const entries = await getOpenAiCosts(baseOptions);

    expect(entries).toHaveLength(2);
    expect(entries[0]?.service).toBe("gpt-4-turbo-usage");
    expect(entries[0]?.amount).toBe(0.13);
    expect(entries[0]?.currency).toBe("USD");
    expect(entries[1]?.service).toBe("gpt-3.5-turbo-usage");
  });

  it("filters out zero-cost entries", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [{
          start_time: 1738368000,
          end_time: 1738454400,
          results: [{ amount: { currency: "usd", value: "0" }, line_item: "some-service" }],
        }],
      }),
    }));

    const entries = await getOpenAiCosts(baseOptions);
    expect(entries).toHaveLength(0);
  });

  it("handles empty results array within a bucket", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [{ start_time: 1738368000, end_time: 1738454400, results: [] }],
      }),
    }));

    const entries = await getOpenAiCosts(baseOptions);
    expect(entries).toEqual([]);
  });

  it("handles empty data array", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    }));

    const entries = await getOpenAiCosts(baseOptions);
    expect(entries).toEqual([]);
  });

  it("throws on HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: () => Promise.resolve('{"error":"invalid api key"}'),
    }));

    await expect(getOpenAiCosts(baseOptions)).rejects.toThrow("OpenAI API error: 401");
  });

  it("sends Authorization header with api key", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await getOpenAiCosts(baseOptions);

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)?.["Authorization"]).toBe("Bearer sk-admin-test");
  });

  it("includes group_by line_item in request URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await getOpenAiCosts(baseOptions);

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("group_by");
    expect(url).toContain("line_item");
  });

  it("uses (other) as service name when line_item is null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [{
          start_time: 1738368000,
          end_time: 1738454400,
          results: [{ amount: { currency: "usd", value: "0.05" }, line_item: null }],
        }],
      }),
    }));

    const entries = await getOpenAiCosts(baseOptions);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.service).toBe("(other)");
    expect(entries[0]?.amount).toBe(0.05);
  });
});

