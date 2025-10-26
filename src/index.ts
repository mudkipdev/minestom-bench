import "dotenv/config";
import { BenchmarkRunner } from "./runner";
import { BENCHMARKS, MODEL_IDS } from "./config";

async function main() {
    console.log("🚀 Starting LocalBench...\n");
    const runner = new BenchmarkRunner(BENCHMARKS, MODEL_IDS);
    const results = await runner.runAll();
    console.log(BenchmarkRunner.getSummary(results));
    console.log("✅ Benchmarking complete!");
}

main().catch(console.error);
