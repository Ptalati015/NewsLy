// Every screen passes axe's accessibility checks, at phone and laptop size
// (this file runs in both demo projects).

import { expect, test } from "@playwright/test";
import { expectNoAccessibilityIssues } from "./helpers";

const SCREENS = [
  ["sign-in", "/sign-in"],
  ["state picker", "/states"],
  ["elections", "/ca"],
  ["races", "/ca/2026-11-03-general"],
  ["candidates", "/ca/2026-11-03-general/governor"],
  ["candidate", "/ca/2026-11-03-general/governor/xavier-becerra"],
  ["account", "/account"],
  ["state not open yet", "/tx"],
  ["page not found", "/ca/1999-01-01-nothing"],
] as const;

for (const [name, path] of SCREENS) {
  test(`${name} screen has no accessibility issues`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expectNoAccessibilityIssues(page);
  });
}

test("the state filter's empty result has no accessibility issues", async ({
  page,
}) => {
  await page.goto("/states");
  await page.getByLabel("Search states").fill("zzz");
  await expect(page.getByText("No state matches")).toBeVisible();
  await expectNoAccessibilityIssues(page);
});
