#!/usr/bin/env node
import { Command } from "commander";
import { getAwsCosts } from "./providers/aws.js";
import { fetchExchangeRate } from "./currency.js";
import { formatTable } from "./formatter.js";

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
  .version("0.1.0");

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
      const [entries, rate] = await Promise.all([
        getAwsCosts({
          startDate: opts.start,
          endDate: opts.end,
          granularity,
          profile: opts.profile !== "default" ? opts.profile : undefined,
        }),
        fetchExchangeRate(),
      ]);

      const output = formatTable(entries, {
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

program.parse();
