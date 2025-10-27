import type { Grader } from "./types";

/**
 * Strips thinking/reasoning tags from model responses before grading.
 * Handles: <think>, <thinking>, and similar tags (case-insensitive).
 */
function stripThinkingTags(response: string): string {
    return response.replace(/<think>[\s\S]*?<\/think>/gi, "")
                   .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
                   .trim();
}

export class ExactMatchGrader implements Grader {
    constructor(
        private expectedAnswer: string,
        private lineIndex?: number,
        private caseSensitive: boolean = false
    ) {}

    grade(response: string): boolean {
        const cleaned = stripThinkingTags(response);

        if (this.lineIndex !== undefined) {
            const lines = cleaned.split("\n").map((line) => line.trim());

            const actual = this.caseSensitive
                ? lines[this.lineIndex] || ""
                : (lines[this.lineIndex] || "").toLowerCase();

            const expected = this.caseSensitive
                ? this.expectedAnswer
                : this.expectedAnswer.toLowerCase();

            return actual === expected;
        }

        const actual = this.caseSensitive ? cleaned.trim() : cleaned.trim().toLowerCase();
        const expected = this.caseSensitive
            ? this.expectedAnswer
            : this.expectedAnswer.toLowerCase();

        return actual === expected;
    }
}

export class ContainsGrader implements Grader {
    constructor(
        private expectedSubstring: string,
        private caseSensitive: boolean = false
    ) {}

    grade(response: string): boolean {
        const cleaned = stripThinkingTags(response);
        const actual = this.caseSensitive ? cleaned : cleaned.toLowerCase();
        const expected = this.caseSensitive
            ? this.expectedSubstring
            : this.expectedSubstring.toLowerCase();

        return actual.includes(expected);
    }
}

export class CustomGrader implements Grader {
    constructor(private gradeFn: (response: string) => boolean | Promise<boolean>) {}

    grade(response: string): boolean | Promise<boolean> {
        const cleaned = stripThinkingTags(response);
        return this.gradeFn(cleaned);
    }
}

export class RegexGrader implements Grader {
    constructor(private pattern: RegExp) {}

    grade(response: string): boolean {
        const cleaned = stripThinkingTags(response);
        return this.pattern.test(cleaned);
    }
}
