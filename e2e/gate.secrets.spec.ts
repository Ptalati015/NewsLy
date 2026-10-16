// The production build never sends a server-only key, signed out or after a
// failed sign-in.

import { test } from "@playwright/test";
import { expectNoServerKeysServed } from "./helpers";

test("serves no server-only key", async ({ page }) => {
  await expectNoServerKeysServed(page, [
    "/",
    "/ca/2026-11-03-general",
    "/sign-in?reason=not_allowed",
    "/auth/callback?error=server_error",
  ]);
});
