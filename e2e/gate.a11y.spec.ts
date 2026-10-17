// The real sign-in screen (with the Google button) passes axe's
// accessibility checks, with and without a message.

import { expect, test } from "@playwright/test";
import { expectNoAccessibilityIssues } from "./helpers";

for (const path of ["/sign-in", "/sign-in?reason=not_allowed"]) {
  test(`sign-in screen at ${path} has no accessibility issues`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(
      page.getByRole("button", { name: "Continue with Google" }),
    ).toBeVisible();
    await expectNoAccessibilityIssues(page);
  });
}
