import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  type GetCostAndUsageCommandInput,
  type ResultByTime,
} from "@aws-sdk/client-cost-explorer";
import { fromIni } from "@aws-sdk/credential-providers";

export interface CostEntry {
  date: string;
  service: string;
  amount: number;
  currency: string;
}

export interface AwsCostOptions {
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  granularity: "DAILY" | "MONTHLY";
  profile?: string;
}

export async function getAwsCosts(options: AwsCostOptions): Promise<CostEntry[]> {
  const clientConfig = options.profile
    ? { region: "us-east-1", credentials: fromIni({ profile: options.profile }) }
    : { region: "us-east-1" };

  const client = new CostExplorerClient(clientConfig);

  const input: GetCostAndUsageCommandInput = {
    TimePeriod: {
      Start: options.startDate,
      End: options.endDate,
    },
    Granularity: options.granularity,
    Metrics: ["UnblendedCost"],
    GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
  };

  const response = await client.send(new GetCostAndUsageCommand(input));
  return parseResults(response.ResultsByTime ?? []);
}

function parseResults(results: ResultByTime[]): CostEntry[] {
  const entries: CostEntry[] = [];

  for (const result of results) {
    const date = result.TimePeriod?.Start ?? "unknown";
    for (const group of result.Groups ?? []) {
      const service = group.Keys?.[0] ?? "Unknown";
      const metric = group.Metrics?.["UnblendedCost"];
      const amount = parseFloat(metric?.Amount ?? "0");
      const currency = metric?.Unit ?? "USD";

      if (amount > 0) {
        entries.push({ date, service, amount, currency });
      }
    }
  }

  return entries;
}
