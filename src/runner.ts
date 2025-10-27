import type { Benchmark, BenchmarkResult, ModelResults } from "./types";
import OpenAI from "openai";

interface PersistedResults {
    results: BenchmarkResult[];
    lastUpdated: string;
}

export class BenchmarkRunner {
    private static requestQueue: Promise<void> = Promise.resolve();
    private static requestDelay = 5000;
    private static resultsFile = "benchmark-results.json";
    private persistedResults: Map<string, BenchmarkResult> = new Map();

    constructor(
        private benchmarks: Benchmark[],
        private modelIds: string[]
    ) {
        this.loadPersistedResults();
    }

    private loadPersistedResults(): void {
        try {
            const fs = require("fs");
            if (!fs.existsSync(BenchmarkRunner.resultsFile)) return;

            const data = fs.readFileSync(BenchmarkRunner.resultsFile, "utf-8");
            const parsed: PersistedResults = JSON.parse(data);

            for (const result of parsed.results) {
                const key = `${result.modelName}:${result.benchmarkId}`;
                this.persistedResults.set(key, result);
            }
        } catch (error) {
            console.error("Error loading persisted results:", error);
        }
    }

    private async saveResult(result: BenchmarkResult): Promise<void> {
        const key = `${result.modelName}:${result.benchmarkId}`;
        this.persistedResults.set(key, result);

        const allResults: BenchmarkResult[] = Array.from(this.persistedResults.values());
        const data: PersistedResults = {
            results: allResults,
            lastUpdated: new Date().toISOString(),
        };

        await Bun.write(BenchmarkRunner.resultsFile, JSON.stringify(data, null, 2));
    }

    async runAll(): Promise<ModelResults[]> {
        // Check if all results are already cached
        const allCached = this.modelIds.every((modelId) =>
            this.benchmarks.every((benchmark) => {
                const key = `${modelId}:${benchmark.id}`;
                return this.persistedResults.has(key);
            })
        );

        if (allCached) {
            // All results cached, just return them
            const allResults: ModelResults[] = [];
            for (const modelId of this.modelIds) {
                const results: BenchmarkResult[] = [];
                for (const benchmark of this.benchmarks) {
                    const key = `${modelId}:${benchmark.id}`;
                    const cached = this.persistedResults.get(key)!;
                    results.push(cached);
                }
                const passedCount = results.filter((r) => r.passed).length;
                const passRate = (passedCount / results.length) * 100;
                allResults.push({
                    modelName: modelId,
                    results,
                    passRate,
                });
            }
            return allResults;
        }

        // Run models sequentially
        const allResults: ModelResults[] = [];
        for (const modelId of this.modelIds) {
            const result = await this.runModelBenchmarks(modelId);
            allResults.push(result);
        }

        return allResults;
    }

    private async runModelBenchmarks(modelId: string): Promise<ModelResults> {
        const promptGroups = new Map<string, Benchmark[]>();
        for (const benchmark of this.benchmarks) {
            const existing = promptGroups.get(benchmark.prompt) || [];
            existing.push(benchmark);
            promptGroups.set(benchmark.prompt, existing);
        }

        // Check if this model needs any work
        const needsWork = Array.from(promptGroups.values()).some((benchmarksGroup) =>
            benchmarksGroup.some((b) => {
                const key = `${modelId}:${b.id}`;
                return !this.persistedResults.has(key);
            })
        );

        if (needsWork) {
            console.log(`\x1b[90m\n━━━ Benchmarking ${modelId} ━━━\x1b[0m`);
        }

        const results: BenchmarkResult[] = [];

        for (const [prompt, benchmarksGroup] of promptGroups) {
            // Check if all benchmarks in this group are already cached
            const allCached = benchmarksGroup.every((b) => {
                const key = `${modelId}:${b.id}`;
                return this.persistedResults.has(key);
            });

            if (allCached) {
                // Use cached results
                for (const benchmark of benchmarksGroup) {
                    const key = `${modelId}:${benchmark.id}`;
                    const cached = this.persistedResults.get(key)!;
                    results.push(cached);
                }
                continue;
            }

            const startTime = performance.now();
            try {
                const rawResponse = await this.callModel(modelId, prompt);
                const response = this.cleanResponse(rawResponse);
                const endTime = performance.now();

                for (const benchmark of benchmarksGroup) {
                    const passed = await benchmark.grader.grade(response);
                    const result: BenchmarkResult = {
                        benchmarkId: benchmark.id,
                        modelName: modelId,
                        response,
                        rawResponse,
                        passed,
                        timeMs: endTime - startTime,
                    };
                    results.push(result);
                    await this.saveResult(result);
                }
            } catch (error) {
                const endTime = performance.now();
                console.error(`Error running prompt group:`, error);

                for (const benchmark of benchmarksGroup) {
                    const result: BenchmarkResult = {
                        benchmarkId: benchmark.id,
                        modelName: modelId,
                        response: "",
                        rawResponse: "",
                        passed: false,
                        timeMs: endTime - startTime,
                    };
                    results.push(result);
                    await this.saveResult(result);
                }
            }
        }

        const sortedResults = this.benchmarks.map((benchmark) =>
            results.find((r) => r.benchmarkId === benchmark.id)
        );

        const passedCount = results.filter((r) => r.passed).length;
        const passRate = (passedCount / results.length) * 100;

        return {
            modelName: modelId,
            results: sortedResults.filter((r) => r !== undefined) as BenchmarkResult[],
            passRate,
        };
    }

    private cleanResponse(response: string): string {
        let cleaned = response.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

        // Extract content from markdown code blocks (```java code```, ``` code ```, etc.)
        cleaned = cleaned.replace(/```[a-z]*\n?([\s\S]*?)```/g, "$1").trim();

        // Strip inline code backticks
        cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

        // If there's still content wrapped in backticks, remove them
        cleaned = cleaned.replace(/^`+|`+$/g, "").trim();

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
                max_tokens: 10000,
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

    static getSummary(allResults: ModelResults[], colored: boolean = true): string {
        let summary = "\n=== BENCHMARK SUMMARY ===\n\n";

        const sorted = [...allResults].sort((a, b) => b.passRate - a.passRate);

        // Find the longest model name for alignment
        const maxNameLength = Math.max(...sorted.map(r => r?.modelName?.length || 0));

        for (let i = 0; i < sorted.length; i++) {
            const result = sorted[i];
            if (result == undefined) continue;

            // Create visual bar chart
            const barLength = 50;
            const filledLength = Math.round((result.passRate / 100) * barLength);
            const emptyLength = barLength - filledLength;
            const bar = "█".repeat(filledLength) + "░".repeat(emptyLength);

            // Color the bar based on pass rate (only if colored is true)
            let colorCode = "";
            let resetCode = "";
            if (colored) {
                if (result.passRate >= 80) colorCode = "\x1b[32m"; // green
                else if (result.passRate >= 60) colorCode = "\x1b[33m"; // yellow
                else colorCode = "\x1b[31m"; // red
                resetCode = "\x1b[0m";
            }

            const paddedName = result.modelName.padEnd(maxNameLength);
            const percentage = result.passRate.toFixed(1).padStart(5);
            const passed = result.results.filter((r) => r.passed).length;
            const total = result.results.length;

            summary += `${paddedName} ${colorCode}${bar}${resetCode} ${percentage}% (${passed}/${total})\n`;
        }

        return summary;
    }

    static async updateReadme(allResults: ModelResults[]): Promise<void> {
        const fs = require("fs");
        const readmePath = ".github/README.md";

        if (!fs.existsSync(readmePath)) {
            console.error("README.md not found");
            return;
        }

        const readmeContent = fs.readFileSync(readmePath, "utf-8");
        const summary = BenchmarkRunner.getSummary(allResults, false);

        // Replace the content between ```\n and \n```
        const updated = readmeContent.replace(
            /```\n[\s\S]*?\n```/,
            `\`\`\`\n${summary}\n\`\`\``
        );

        await Bun.write(readmePath, updated);
    }
}
