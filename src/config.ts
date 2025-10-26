import type { Benchmark } from "./types";
import { ExactMatchGrader } from "./graders";

export const MODEL_IDS = [
    // "openai/gpt-5",
    // "anthropic/claude-sonnet-4.5",
    // "google/gemini-2.5-pro",
    // "x-ai/grok-4-fast",
    // "x-ai/grok-code-fast-1",

    "minimax/minimax-m2:free",
    "meituan/longcat-flash-chat:free",
    "deepseek/deepseek-chat-v3.1:free",
    "openai/gpt-oss-20b:free",
    "z-ai/glm-4.5-air:free",
    "qwen/qwen3-coder:free",
    "moonshotai/kimi-k2:free",
    "moonshotai/kimi-dev-72b:free"
];

export const BENCHMARKS: Benchmark[] = [
    {
        id: "math-basic-addition",
        name: "Basic Addition",
        prompt: "What is 25 + 37? Reply with only the number.",
        grader: new ExactMatchGrader("62"),
    },
    {
        id: "math-multiplication",
        name: "Multiplication",
        prompt: "What is 12 * 8? Reply with only the number.",
        grader: new ExactMatchGrader("96"),
    },
    {
        id: "capital-france",
        name: "Capital of France",
        prompt: "What is the capital of France? Reply with only the city name.",
        grader: new ExactMatchGrader("Paris"),
    },
    {
        id: "capital-japan",
        name: "Capital of Japan",
        prompt: "What is the capital of Japan? Reply with only the city name.",
        grader: new ExactMatchGrader("Tokyo"),
    },
    {
        id: "programming-language",
        name: "Python Identification",
        prompt:
            "What programming language is known for its use of indentation? Reply with only the language name.",
        grader: new ExactMatchGrader("Python"),
    },
    {
        id: "color-sky",
        name: "Color of Sky",
        prompt: "What color is a clear daytime sky? Reply with only the color.",
        grader: new ExactMatchGrader("blue"),
    },
    {
        id: "planets-count",
        name: "Number of Planets",
        prompt: "How many planets are in our solar system? Reply with only the number.",
        grader: new ExactMatchGrader("8"),
    },
    {
        id: "boolean-logic",
        name: "Boolean Logic",
        prompt: "What is true AND false? Reply with only 'true' or 'false'.",
        grader: new ExactMatchGrader("false"),
    },
    {
        id: "square-root",
        name: "Square Root",
        prompt: "What is the square root of 144? Reply with only the number.",
        grader: new ExactMatchGrader("12"),
    }
];
