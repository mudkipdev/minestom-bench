export interface Grader {
    grade(response: string): boolean | Promise<boolean>;
}

export interface Benchmark {
    id: string;
    name: string;
    prompt: string;
    grader: Grader;
}

export interface BenchmarkResult {
    benchmarkId: string;
    modelName: string;
    response: string;
    passed: boolean;
    timeMs: number;
}

export interface ModelResults {
    modelName: string;
    results: BenchmarkResult[];
    passRate: number;
}