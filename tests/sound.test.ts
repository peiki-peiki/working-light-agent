import { describe, expect, it } from "vitest";
import { shouldPlayAttentionSound } from "../src/main/sound";

describe("attention sound rules", () => {
  it("plays on animal sound states when the state changes", () => {
    expect(shouldPlayAttentionSound("idle", "working")).toBe(true);
    expect(shouldPlayAttentionSound("working", "waiting")).toBe(true);
    expect(shouldPlayAttentionSound("working", "done")).toBe(true);
    expect(shouldPlayAttentionSound("done", "error")).toBe(true);
  });

  it("does not play for unchanged states or idle transitions", () => {
    expect(shouldPlayAttentionSound("working", "working")).toBe(false);
    expect(shouldPlayAttentionSound("done", "idle")).toBe(false);
  });
});
