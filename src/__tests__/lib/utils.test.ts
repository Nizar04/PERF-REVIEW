import {
  getInitials,
  calculateCompletionRate,
  scoreToLabel,
  scoreToColor,
  formatScore,
  truncate,
  groupBy,
  slugify,
} from "@/lib/utils";

describe("getInitials", () => {
  it("returns initials for full name", () => {
    expect(getInitials("Alice Dupont")).toBe("AD");
  });

  it("returns single initial for one word", () => {
    expect(getInitials("Alice")).toBe("A");
  });

  it("returns empty string for empty input", () => {
    expect(getInitials("")).toBe("");
  });

  it("handles more than 2 words — takes first 2", () => {
    expect(getInitials("Jean-Pierre Martin")).toBe("JM");
  });
});

describe("calculateCompletionRate", () => {
  it("returns 100 for all completed", () => {
    expect(calculateCompletionRate(10, 10)).toBe(100);
  });

  it("returns 0 for none completed", () => {
    expect(calculateCompletionRate(0, 10)).toBe(0);
  });

  it("returns 0 for zero total", () => {
    expect(calculateCompletionRate(5, 0)).toBe(0);
  });

  it("rounds to nearest integer", () => {
    expect(calculateCompletionRate(1, 3)).toBe(33);
  });
});

describe("scoreToLabel", () => {
  it("maps score 1 to Insuffisant", () => {
    expect(scoreToLabel(1)).toBe("Insuffisant");
  });

  it("maps score 3 to Atteint", () => {
    expect(scoreToLabel(3)).toBe("Atteint");
  });

  it("maps score 5 to Exceptionnel", () => {
    expect(scoreToLabel(5)).toBe("Exceptionnel");
  });

  it("returns Unknown for out-of-range score", () => {
    expect(scoreToLabel(6)).toBe("Unknown");
  });
});

describe("formatScore", () => {
  it("formats score to 1 decimal", () => {
    expect(formatScore(3.8)).toBe("3.8");
    expect(formatScore(4.0)).toBe("4.0");
  });
});

describe("truncate", () => {
  it("truncates long strings", () => {
    expect(truncate("Hello world", 5)).toBe("Hello...");
  });

  it("does not truncate short strings", () => {
    expect(truncate("Hi", 10)).toBe("Hi");
  });
});

describe("groupBy", () => {
  it("groups array items by key", () => {
    const items = [
      { type: "a", val: 1 },
      { type: "b", val: 2 },
      { type: "a", val: 3 },
    ];
    const result = groupBy(items, (i) => i.type);
    expect(result["a"]).toHaveLength(2);
    expect(result["b"]).toHaveLength(1);
  });
});

describe("slugify", () => {
  it("converts string to slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("Évaluation 2025!")).toBe("valuation-2025");
  });
});
