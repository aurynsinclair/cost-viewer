import { BigQuery } from "@google-cloud/bigquery";
import type { CostEntry } from "./aws.js";

export interface GcpCostOptions {
  startDate: string;
  endDate: string;
  projectId: string;
  dataset: string;
  table: string;
  keyFile?: string;
}

export async function getGcpCosts(options: GcpCostOptions): Promise<CostEntry[]> {
  const clientConfig: { projectId: string; keyFilename?: string } = {
    projectId: options.projectId,
  };
  if (options.keyFile) {
    clientConfig.keyFilename = options.keyFile;
  }
  const bigquery = new BigQuery(clientConfig);

  const fqTable = `${options.projectId}.${options.dataset}.${options.table}`;
  const query = `
    SELECT
      FORMAT_DATE('%Y-%m-%d', DATE(usage_start_time)) AS date,
      service.description AS service,
      SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS amount,
      currency
    FROM \`${fqTable}\`
    WHERE usage_start_time >= TIMESTAMP(@startDate)
      AND usage_start_time < TIMESTAMP(@endDate)
    GROUP BY date, service, currency
    HAVING amount > 0
    ORDER BY date, service
  `;

  const [rows] = await bigquery.query({
    query,
    params: { startDate: options.startDate, endDate: options.endDate },
  });

  return parseRows(rows as BillingRow[]);
}

interface BillingRow {
  date: string | { value: string };
  service: string;
  amount: number | string;
  currency: string;
}

function parseRows(rows: BillingRow[]): CostEntry[] {
  return rows
    .map((row) => ({
      date: typeof row.date === "string" ? row.date : row.date.value,
      service: row.service ?? "Unknown",
      amount: Number(row.amount),
      currency: row.currency ?? "JPY",
    }))
    .filter((e) => isFinite(e.amount) && e.amount > 0);
}
