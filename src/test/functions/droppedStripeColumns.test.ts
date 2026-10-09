// @vitest-environment node
/** Edge Functions must not write columns removed by 20260918210000_drop_stripe_columns.sql. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const DROPPED = ["stripe_customer_id", "stripe_subscription_id", "stripe_price_id"];

describe("functions that used to write stripe_* columns", () => {
  for (const fn of ["check-referral-conversion", "guru-webhook", "fix-family-group"]) {
    it(`${fn} does not reference dropped columns`, () => {
      const src = readFileSync(`supabase/functions/${fn}/index.ts`, "utf8");
      for (const col of DROPPED) expect(src).not.toContain(col);
    });
  }
});
