import { describe, it, expect, vi } from "vitest";

// AWS SDKをモック
vi.mock("@aws-sdk/client-cost-explorer", () => {
  return {
    CostExplorerClient: vi.fn().mockImplementation(() => ({
      send: vi.fn(),
    })),
    GetCostAndUsageCommand: vi.fn(),
  };
});

vi.mock("@aws-sdk/credential-providers", () => ({
  fromIni: vi.fn(() => ({})),
}));

import { getAwsCosts } from "../../src/providers/aws.js";
import { CostExplorerClient } from "@aws-sdk/client-cost-explorer";

describe("getAwsCosts", () => {
  it("returns parsed cost entries from API response", async () => {
    const mockSend = vi.fn().mockResolvedValue({
      ResultsByTime: [
        {
          TimePeriod: { Start: "2026-02-01", End: "2026-02-02" },
          Groups: [
            {
              Keys: ["Amazon EC2"],
              Metrics: {
                UnblendedCost: { Amount: "1.23", Unit: "USD" },
              },
            },
            {
              Keys: ["Amazon S3"],
              Metrics: {
                UnblendedCost: { Amount: "0.45", Unit: "USD" },
              },
            },
          ],
        },
      ],
    });

    vi.mocked(CostExplorerClient).mockImplementation(() => ({
      send: mockSend,
    }) as unknown as InstanceType<typeof CostExplorerClient>);

    const entries = await getAwsCosts({
      startDate: "2026-02-01",
      endDate: "2026-02-19",
      granularity: "DAILY",
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      date: "2026-02-01",
      service: "Amazon EC2",
      amount: 1.23,
      currency: "USD",
    });
    expect(entries[1]).toEqual({
      date: "2026-02-01",
      service: "Amazon S3",
      amount: 0.45,
      currency: "USD",
    });
  });

  it("filters out zero-cost entries", async () => {
    const mockSend = vi.fn().mockResolvedValue({
      ResultsByTime: [
        {
          TimePeriod: { Start: "2026-02-01", End: "2026-02-02" },
          Groups: [
            {
              Keys: ["Amazon CloudWatch"],
              Metrics: { UnblendedCost: { Amount: "0", Unit: "USD" } },
            },
          ],
        },
      ],
    });

    vi.mocked(CostExplorerClient).mockImplementation(() => ({
      send: mockSend,
    }) as unknown as InstanceType<typeof CostExplorerClient>);

    const entries = await getAwsCosts({
      startDate: "2026-02-01",
      endDate: "2026-02-19",
      granularity: "DAILY",
    });

    expect(entries).toHaveLength(0);
  });

  it("handles empty results", async () => {
    const mockSend = vi.fn().mockResolvedValue({ ResultsByTime: [] });

    vi.mocked(CostExplorerClient).mockImplementation(() => ({
      send: mockSend,
    }) as unknown as InstanceType<typeof CostExplorerClient>);

    const entries = await getAwsCosts({
      startDate: "2026-02-01",
      endDate: "2026-02-19",
      granularity: "DAILY",
    });

    expect(entries).toEqual([]);
  });
});
