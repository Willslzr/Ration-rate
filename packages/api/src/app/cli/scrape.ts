import "dotenv/config";
import { createContainer } from "../container.js";

async function main(): Promise<void> {
  const container = createContainer();

  try {
    const activeTargets = container.targets.filter((target) => target.active);
    const summary = await container.useCases.scrapeAllTargets.execute(activeTargets);

    console.log(
      `Scrape finished: ${summary.succeeded.length} succeeded, ${summary.failed.length} failed.`,
    );
    if (summary.failed.length > 0) {
      console.error(`Failed sources: ${summary.failed.join(", ")}`);
    }

    process.exitCode = summary.failed.length > 0 ? 1 : 0;
  } finally {
    await container.dispose();
  }
}

main().catch((error: unknown) => {
  console.error("Scrape run crashed:", error);
  process.exitCode = 1;
});
