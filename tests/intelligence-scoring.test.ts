import { describe, expect, it } from "vitest";
import { clampScore, severityFromScore } from "@/modules/intelligence/scoring";

describe("intelligence scoring", () => {
  it("clamps to 0..100", () => {
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(50.2)).toBe(50);
    expect(clampScore(999)).toBe(100);
  });

  it("maps severity thresholds", () => {
    expect(severityFromScore(0)).toBe("INFO");
    expect(severityFromScore(55)).toBe("WARNING");
    expect(severityFromScore(90)).toBe("CRITICAL");
  });
});

