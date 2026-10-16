// The server-only keys never reach the browser, on any screen, in any
// response (HTML, the React payload, scripts or styles).

import { test } from "@playwright/test";
import { expectNoServerKeysServed } from "./helpers";

test("serves no server-only key on any screen", async ({ page }) => {
  await expectNoServerKeysServed(page, [
    "/sign-in",
    "/states",
    "/ca",
    "/ca/2026-11-03-general",
    "/ca/2026-11-03-general/governor",
    "/ca/2026-11-03-general/governor/alex-rivera",
    "/account",
    "/tx",
  ]);
});
