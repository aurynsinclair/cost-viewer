import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@google-cloud/bigquery", () => ({
  BigQuery: vi.fn().mockImplementation(() => ({
    query: vi.fn(),
  })),
}));

import { getGcpCosts } from "../../src/providers/gcp.js";
import { BigQuery } from "@google-cloud/bigquery";

beforeEach(() => {
  vi.restoreAllMocks();
});

const baseOptions = {
  startDate: "2026-02-01",
  endDate: "2026-02-20",
  projectId: "my-project",
  dataset: "billing",
  table: "gcp_billing_export_v1_ABC123",
};

describe("getGcpCosts", () => {
  it("returns parsed cost entries from BigQuery rows", async () => {
    const mockRows = [
      { date: "2026-02-01", service: "Compute Engine", amount: 123, currency: "JPY" },
      { date: "2026-02-01", service: "Cloud Storage", amount: 45, currency: "JPY" },
    ];
    const mockQuery = vi.fn().mockResolvedValue([mockRows]);
    vi.mocked(BigQuery).mockImplementation(() => ({ query: mockQuery }) as unknown as BigQuery);

    const entries = await getGcpCosts(baseOptions);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      date: "2026-02-01",
      service: "Compute Engine",
      amount: 123,
      currency: "JPY",
    });
    expect(entries[1]?.service).toBe("Cloud Storage");
  });

  it("handles BigQuery DATE object format", async () => {
    const mockRows = [
      { date: { value: "2026-02-01" }, service: "BigQuery", amount: 10, currency: "JPY" },
    ];
    const mockQuery = vi.fn().mockResolvedValue([mockRows]);
    vi.mocked(BigQuery).mockImplementation(() => ({ query: mockQuery }) as unknown as BigQuery);

    const entries = await getGcpCosts(baseOptions);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.date).toBe("2026-02-01");
  });

  it("returns empty array for empty result set", async () => {
    const mockQuery = vi.fn().mockResolvedValue([[]]);
    vi.mocked(BigQuery).mockImplementation(() => ({ query: mockQuery }) as unknown as BigQuery);

    const entries = await getGcpCosts(baseOptions);
    expect(entries).toEqual([]);
  });

  it("filters out non-finite amounts", async () => {
    const mockRows = [
      { date: "2026-02-01", service: "Test", amount: NaN, currency: "JPY" },
    ];
    const mockQuery = vi.fn().mockResolvedValue([mockRows]);
    vi.mocked(BigQuery).mockImplementation(() => ({ query: mockQuery }) as unknown as BigQuery);

    const entries = await getGcpCosts(baseOptions);
    expect(entries).toEqual([]);
  });

  it("passes keyFilename to BigQuery when keyFile is provided", async () => {
    const mockQuery = vi.fn().mockResolvedValue([[]]);
    vi.mocked(BigQuery).mockImplementation(() => ({ query: mockQuery }) as unknown as BigQuery);

    await getGcpCosts({ ...baseOptions, keyFile: "/path/to/key.json" });

    expect(BigQuery).toHaveBeenCalledWith({
      projectId: "my-project",
      keyFilename: "/path/to/key.json",
    });
  });

  it("omits keyFilename when keyFile is not provided", async () => {
    const mockQuery = vi.fn().mockResolvedValue([[]]);
    vi.mocked(BigQuery).mockImplementation(() => ({ query: mockQuery }) as unknown as BigQuery);

    await getGcpCosts(baseOptions);

    expect(BigQuery).toHaveBeenCalledWith({ projectId: "my-project" });
  });

  it("passes parameterized dates to BigQuery query", async () => {
    const mockQuery = vi.fn().mockResolvedValue([[]]);
    vi.mocked(BigQuery).mockImplementation(() => ({ query: mockQuery }) as unknown as BigQuery);

    await getGcpCosts(baseOptions);

    const callArgs = mockQuery.mock.calls[0][0] as { params: { startDate: string; endDate: string } };
    expect(callArgs.params.startDate).toBe("2026-02-01");
    expect(callArgs.params.endDate).toBe("2026-02-20");
  });
});
