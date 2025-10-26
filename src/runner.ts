import type { Benchmark, BenchmarkResult, ModelResults } from "./types";
import OpenAI from "openai";

export class BenchmarkRunner {
    private static requestQueue: Promise<void> = Promise.resolve();
    private static requestDelay = 5000;

    constructor(
        private benchmarks: Benchmark[],
        private modelIds: string[]
    ) {}

    async runAll(): Promise<ModelResults[]> {
        console.log(
            `Running ${this.benchmarks.length} benchmarks against ${this.modelIds.length} models in parallel...\n`
        );

        const allResults = await Promise.all(
            this.modelIds.map((modelId) => this.runModelBenchmarks(modelId))
        );

        return allResults;
    }

    private async runModelBenchmarks(modelId: string): Promise<ModelResults> {
        console.log(`\nTesting model: ${modelId}`);

        const results = await Promise.all(
            this.benchmarks.map((benchmark) => this.runSingleBenchmark(modelId, benchmark))
        );

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const benchmark = this.benchmarks[i];
            if (result == undefined || benchmark == undefined) continue;

            if (result.passed) {
                console.log(`\x1b[32m  ✓ ${benchmark.name}\x1b[0m`);
            } else {
                console.log(`\x1b[31m  ✗ ${benchmark.name} (${result.response})\x1b[0m`);
            }
        }

        const passedCount = results.filter((r) => r.passed).length;
        const passRate = (passedCount / results.length) * 100;

        console.log(`  Pass rate: ${passRate.toFixed(1)}%`);

        return {
            modelName: modelId,
            results,
            passRate,
        };
    }

    private async runSingleBenchmark(
        modelId: string,
        benchmark: Benchmark
    ): Promise<BenchmarkResult> {
        const startTime = performance.now();

        try {
            const rawResponse = await this.callModel(modelId, benchmark.prompt);
            const response = this.cleanResponse(rawResponse);
            const passed = await benchmark.grader.grade(response);
            const endTime = performance.now();

            return {
                benchmarkId: benchmark.id,
                modelName: modelId,
                response,
                passed,
                timeMs: endTime - startTime,
            };
        } catch (error) {
            const endTime = performance.now();
            console.error(`Error running benchmark ${benchmark.id}:`, error);

            return {
                benchmarkId: benchmark.id,
                modelName: modelId,
                response: "",
                passed: false,
                timeMs: endTime - startTime,
            };
        }
    }

    private cleanResponse(response: string): string {
        let cleaned = response.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        return cleaned;
    }

    private async callModel(modelId: string, prompt: string): Promise<string> {
        await BenchmarkRunner.requestQueue;

        BenchmarkRunner.requestQueue = BenchmarkRunner.requestQueue.then(
            () => new Promise((resolve) => setTimeout(resolve, BenchmarkRunner.requestDelay))
        );

        const client = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY || "",
        });

        try {
            const response = await client.chat.completions.create({
                model: modelId,
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                max_tokens: 1000,
            });

            return response.choices[0]?.message?.content?.trim() || "";
        } catch (error: any) {
            if (error?.status === 429) {
                await new Promise((resolve) => setTimeout(resolve, 10000));
                return this.callModel(modelId, prompt);
            }
            throw error;
        }
    }

    static getSummary(allResults: ModelResults[]): string {
        let summary = "\n=== BENCHMARK SUMMARY ===\n\n";

        const sorted = [...allResults].sort((a, b) => b.passRate - a.passRate);

        for (let i = 0; i < sorted.length; i++) {
            const result = sorted[i];
            if (result == undefined) continue;
            summary += `${i + 1}. ${result.modelName}\n`;
            summary += `   Pass Rate: ${result.passRate.toFixed(1)}%\n`;
            summary += `   Passed: ${result.results.filter((r) => r.passed).length}/${result.results.length}\n\n`;
        }

        return summary;
    }
}
