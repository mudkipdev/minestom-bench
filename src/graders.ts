import type { Grader } from "./types";

export class ExactMatchGrader implements Grader {
    constructor(
        private expectedAnswer: string,
        private caseSensitive: boolean = false
    ) {}

    grade(response: string): boolean {
        const actual = this.caseSensitive ? response.trim() : response.trim().toLowerCase();
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
        const actual = this.caseSensitive ? response : response.toLowerCase();
        const expected = this.caseSensitive
            ? this.expectedSubstring
            : this.expectedSubstring.toLowerCase();

        return actual.includes(expected);
    }
}

export class CustomGrader implements Grader {
    constructor(private gradeFn: (response: string) => boolean | Promise<boolean>) {}

    grade(response: string): boolean | Promise<boolean> {
        return this.gradeFn(response);
    }
}

export class RegexGrader implements Grader {
    constructor(private pattern: RegExp) {}

    grade(response: string): boolean {
        return this.pattern.test(response);
    }
}
