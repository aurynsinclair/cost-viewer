#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { getAwsCosts } from "./providers/aws.js";
import { getOpenAiCosts } from "./providers/openai.js";
import { getGcpCosts } from "./providers/gcp.js";
import { fetchExchangeRate } from "./currency.js";
import { formatTable, fillZeroDays, mergeProviders, type ProviderResult } from "./formatter.js";

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
  .version("0.4.0");

program
  .command("aws")
  .description("Show AWS costs via Cost Explorer API")
  .option("--start <date>", "Start date (YYYY-MM-DD)", defaultStartDate())
  .option("--end <date>", "End date (YYYY-MM-DD)", defaultEndDate())
  .option("--granularity <g>", "DAILY or MONTHLY", "DAILY")
  .option("--profile <name>", "AWS profile name (or env: AWS_PROFILE)")
  .action(async (opts) => {
    const profile = opts.profile ?? process.env["AWS_PROFILE"];
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
          profile,
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
        profile,
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

program
  .command("all")
  .description("Show combined costs from all configured providers")
  .option("--start <date>", "Start date (YYYY-MM-DD)", defaultStartDate())
  .option("--end <date>", "End date (YYYY-MM-DD)", defaultEndDate())
  .option("--profile <name>", "AWS profile name (or env: AWS_PROFILE)")
  .action(async (opts) => {
    let rate: number;
    try {
      rate = await fetchExchangeRate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Error: Failed to fetch exchange rate: ${msg}`);
      process.exit(1);
    }

    const startDate = opts.start;
    const endDate = opts.end;

    const providerPromises: Array<Promise<ProviderResult | null>> = [];

    // AWS: always attempt (uses default credential chain)
    const awsProfile = opts.profile ?? process.env["AWS_PROFILE"];
    providerPromises.push(
      getAwsCosts({ startDate, endDate, granularity: "DAILY", profile: awsProfile })
        .then((entries) => ({ name: "AWS", entries }))
        .catch((err) => {
          console.error(`[AWS] Skipped: ${err instanceof Error ? err.message : String(err)}`);
          return null;
        }),
    );

    // OpenAI: only if API key is configured
    const openaiKey = process.env["OPENAI_ADMIN_API_KEY"];
    if (openaiKey) {
      providerPromises.push(
        getOpenAiCosts({ startDate, endDate, apiKey: openaiKey })
          .then((entries) => ({ name: "OpenAI", entries }))
          .catch((err) => {
            console.error(
              `[OpenAI] Skipped: ${err instanceof Error ? err.message : String(err)}`,
            );
            return null;
          }),
      );
    }

    // GCP: only if all required env vars are set
    const gcpProjectId = process.env["GCP_PROJECT_ID"];
    const gcpDataset = process.env["GCP_BILLING_DATASET"];
    const gcpTable = process.env["GCP_BILLING_TABLE"];
    const gcpKeyFile = process.env["GOOGLE_APPLICATION_CREDENTIALS"];
    if (gcpProjectId && gcpDataset && gcpTable) {
      providerPromises.push(
        getGcpCosts({
          startDate,
          endDate,
          projectId: gcpProjectId,
          dataset: gcpDataset,
          table: gcpTable,
          keyFile: gcpKeyFile,
        })
          .then((entries) => ({ name: "GCP", entries }))
          .catch((err) => {
            console.error(`[GCP] Skipped: ${err instanceof Error ? err.message : String(err)}`);
            return null;
          }),
      );
    }

    const results = (await Promise.all(providerPromises)).filter(
      (r): r is ProviderResult => r !== null,
    );

    if (results.length === 0) {
      console.error(
        "Error: No providers returned data. Check your credentials and environment variables.",
      );
      process.exit(1);
    }

    const merged = mergeProviders(results);
    const entries = fillZeroDays(merged, startDate, endDate);
    const providerNames = results.map((r) => r.name).join(" + ");

    const output = formatTable(entries, {
      title: `Cost Report (${providerNames})`,
      startDate,
      endDate,
      rate,
      sourceCurrency: "mixed",
    });

    console.log(output);
  });

program.parse();
