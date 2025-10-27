import "dotenv/config";
import { BenchmarkRunner } from "./runner";
import { benchmarks, models } from "./config";

async function main() {
    const runner = new BenchmarkRunner(benchmarks, models);
    const results = await runner.runAll();
    console.log(BenchmarkRunner.getSummary(results));
}

main().catch(console.error);
