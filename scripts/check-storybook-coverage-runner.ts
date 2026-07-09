import {
  UI_SURFACE_REGISTRY,
  uiEvaluationMatrix,
} from "../lib/governance/ui-decision-matrix";

process.stdout.write(
  JSON.stringify({
    registryIds: UI_SURFACE_REGISTRY.map((surface) => surface.surfaceId),
    matrixIds: uiEvaluationMatrix.map((row) => row.surfaceId),
  }),
);
