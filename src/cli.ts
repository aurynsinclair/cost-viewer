#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { getAwsCosts } from "./providers/aws.js";
import { getOpenAiCosts } from "./providers/openai.js";
import { getGcpCosts } from "./providers/gcp.js";
import { fetchExchangeRate } from "./currency.js";
import { formatTable, fillZeroDays } from "./formatter.js";

function defaultStartDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function defaultEndDate(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

const program = new Command();

program
  .name("cost-viewer")
  .description("View cloud/AI service costs in JPY")
  .version("0.3.0");

program
  .command("aws")
  .description("Show AWS costs via Cost Explorer API")
  .option("--start <date>", "Start date (YYYY-MM-DD)", defaultStartDate())
  .option("--end <date>", "End date (YYYY-MM-DD)", defaultEndDate())
  .option("--granularity <g>", "DAILY or MONTHLY", "DAILY")
  .option("--profile <name>", "AWS profile name", "default")
  .action(async (opts) => {
    const granularity = opts.granularity.toUpperCase();
    if (granularity !== "DAILY" && granularity !== "MONTHLY") {
      console.error("Error: --granularity must be DAILY or MONTHLY");
      process.exit(1);
    }

    try {
      const [rawEntries, rate] = await Promise.all([
        getAwsCosts({
          startDate: opts.start,
          endDate: opts.end,
          granularity,
          profile: opts.profile !== "default" ? opts.profile : undefined,
        }),
        fetchExchangeRate(),
      ]);
      const entries = granularity === "DAILY"
        ? fillZeroDays(rawEntries, opts.start, opts.end)
        : rawEntries;

      const output = formatTable(entries, {
        title: "AWS Cost Report",
        startDate: opts.start,
        endDate: opts.end,
        profile: opts.profile,
        rate,
      });

      console.log(output);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error: ${message}`);
      process.exit(1);
    }
  });

program
  .command("openai")
  .description("Show OpenAI costs via Admin API")
  .option("--start <date>", "Start date (YYYY-MM-DD)", defaultStartDate())
  .option("--end <date>", "End date (YYYY-MM-DD)", defaultEndDate())
  .option("--api-key <key>", "OpenAI Admin API key (or env: OPENAI_ADMIN_API_KEY)")
  .action(async (opts) => {
    const apiKey = opts.apiKey ?? process.env["OPENAI_ADMIN_API_KEY"];
    if (!apiKey) {
      console.error("Error: OpenAI Admin API key is required. Use --api-key or set OPENAI_ADMIN_API_KEY.");
      process.exit(1);
    }

    try {
      const [rawEntries, rate] = await Promise.all([
        getOpenAiCosts({ startDate: opts.start, endDate: opts.end, apiKey }),
        fetchExchangeRate(),
      ]);
      const entries = fillZeroDays(rawEntries, opts.start, opts.end);

      const output = formatTable(entries, {
        title: "OpenAI Cost Report",
        startDate: opts.start,
        endDate: opts.end,
        rate,
      });

      console.log(output);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error: ${message}`);
      process.exit(1);
    }
  });

program
  .command("gcp")
  .description("Show GCP costs via BigQuery billing export")
  .option("--start <date>", "Start date (YYYY-MM-DD)", defaultStartDate())
  .option("--end <date>", "End date (YYYY-MM-DD)", defaultEndDate())
  .option("--project <id>", "GCP project ID (or env: GCP_PROJECT_ID)")
  .option("--dataset <name>", "BigQuery dataset name (or env: GCP_BILLING_DATASET)")
  .option("--table <name>", "BigQuery table name (or env: GCP_BILLING_TABLE)")
  .option("--key-file <path>", "Service account JSON key file (or env: GOOGLE_APPLICATION_CREDENTIALS)")
  .action(async (opts) => {
    const projectId = opts.project ?? process.env["GCP_PROJECT_ID"];
    const dataset = opts.dataset ?? process.env["GCP_BILLING_DATASET"];
    const table = opts.table ?? process.env["GCP_BILLING_TABLE"];
    const keyFile = opts.keyFile ?? process.env["GOOGLE_APPLICATION_CREDENTIALS"];

    if (!projectId || !dataset || !table) {
      console.error(
        "Error: GCP project ID, dataset, and table are required.\n" +
          "Use --project, --dataset, --table or set GCP_PROJECT_ID, GCP_BILLING_DATASET, GCP_BILLING_TABLE.",
      );
      process.exit(1);
    }

    try {
      const rawEntries = await getGcpCosts({
        startDate: opts.start,
        endDate: opts.end,
        projectId,
        dataset,
        table,
        keyFile,
      });
      const entries = fillZeroDays(rawEntries, opts.start, opts.end);

      const output = formatTable(entries, {
        title: "GCP Cost Report",
        startDate: opts.start,
        endDate: opts.end,
        rate: 0,
        sourceCurrency: "JPY",
      });

      console.log(output);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error: ${message}`);
      process.exit(1);
    }
  });

program.parse();
