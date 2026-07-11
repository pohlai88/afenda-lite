import { describe, expect, it } from "vitest";
import {
  FFT_NATIVE_FIELD_CLASS,
  FFT_NATIVE_SELECT_CLASS,
  FFT_NATIVE_TEXTAREA_CLASS,
} from "@/features/fft/fft-form-controls";

describe("trade-form-controls (P2-AC-05)", () => {
  it("exposes Input-parity classes for native FormData fields", () => {
    expect(FFT_NATIVE_FIELD_CLASS).toContain("h-9");
    expect(FFT_NATIVE_FIELD_CLASS).toContain("border-input");
    expect(FFT_NATIVE_FIELD_CLASS).toContain("shadow-xs");
    expect(FFT_NATIVE_FIELD_CLASS).toContain("focus-visible:ring-3");
    expect(FFT_NATIVE_SELECT_CLASS).toContain("h-9");
    expect(FFT_NATIVE_TEXTAREA_CLASS).toContain("min-h-16");
  });
});
