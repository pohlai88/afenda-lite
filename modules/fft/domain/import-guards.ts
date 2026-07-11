import { assertFftDepositFeatureAction, assertFftPickupFeatureAction } from "@/modules/fft/auth/fft-phase2b";
import {
  FFT_IMPORT_TYPES,
  FFT_IMPORT_TYPE_PERMISSION,
  type FftImportType,
} from "@/modules/fft/domain/import-types";

const SUPPORTED_IMPORT_TYPES = new Set<FftImportType>(FFT_IMPORT_TYPES);

export function parseImportType(value: string): FftImportType | null {
  if (SUPPORTED_IMPORT_TYPES.has(value as FftImportType)) {
    return value as FftImportType;
  }
  return null;
}

export function assertImportFeatureGate(
  importType: FftImportType,
): { error: string } | null {
  if (importType === "deposit_record") {
    return assertFftDepositFeatureAction();
  }
  if (importType === "pickup_confirmation") {
    return assertFftPickupFeatureAction();
  }
  return null;
}

export function importPermissionForType(importType: FftImportType): string {
  return FFT_IMPORT_TYPE_PERMISSION[importType];
}
