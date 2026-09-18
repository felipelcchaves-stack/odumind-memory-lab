-- public.calcular_proxima_revisao (defined in migration 20251116213035) is a
-- full SM-2 spaced-repetition implementation, but nothing in the frontend
-- calls it -- the algorithm that actually runs is the TypeScript
-- reimplementation calculateAdaptiveInterval() in src/lib/adaptiveLearning.ts.
-- Leaving it undocumented risks a future change being applied to only one of
-- the two copies. Not dropping it (still callable/harmless, no reason to risk
-- a live schema change for a pure documentation fix) -- just marking it
-- clearly orphaned so nobody mistakes it for the live algorithm.
COMMENT ON FUNCTION public.calcular_proxima_revisao(DECIMAL, INTEGER, INTEGER) IS
  'ORPHANED: not called from anywhere in the app. The live spaced-repetition '
  'algorithm is calculateAdaptiveInterval() in src/lib/adaptiveLearning.ts. '
  'This SQL copy predates that TS reimplementation and has drifted out of '
  'sync with it; do not tune this function expecting it to affect scheduling.';
