// The six screens in demo mode (seed files, sample candidates), at phone size.

import { expect, test } from "@playwright/test";
import { expectNoSideScroll, expectTouchTargets, snap } from "./helpers";

test("walks from the state picker to a candidate page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/states$/);
  await expect(
    page.getByRole("heading", { name: "Choose your state" }),
  ).toBeVisible();
  await expect(page.getByText("Coming soon")).toHaveCount(49);
  await expectTouchTargets(page);
  await expectNoSideScroll(page);
  await snap(page, "02-states");

  await page.getByRole("button", { name: /California/ }).click();
  await expect(page).toHaveURL(/\/ca$/);
  await expect(page.getByRole("heading", { name: "California" })).toBeVisible();
  await expect(page.getByText("Tuesday, November 3, 2026")).toBeVisible();
  await expect(page.getByText("12 statewide races")).toBeVisible();
  await expectTouchTargets(page);
  await expectNoSideScroll(page);
  await snap(page, "03-elections");

  await page.getByRole("link", { name: /General Election/ }).click();
  await expect(page).toHaveURL(/\/ca\/2026-11-03-general$/);
  await expect(
    page.getByRole("heading", { name: "Statewide offices" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Board of Equalization" }),
  ).toBeVisible();
  for (const office of [
    "Governor",
    "Lieutenant Governor",
    "Attorney General",
    "Secretary of State",
    "Treasurer",
    "Controller",
    "Insurance Commissioner",
    "Superintendent of Public Instruction",
  ]) {
    await expect(
      page.getByRole("link", { name: new RegExp(`^${office}`) }),
    ).toBeVisible();
  }
  for (const district of [1, 2, 3, 4]) {
    await expect(
      page.getByRole("link", { name: new RegExp(`^District ${district}`) }),
    ).toBeVisible();
  }
  await expect(
    page.getByRole("link", { name: /Superintendent of Public Instruction/ }),
  ).toContainText("Nonpartisan");
  await expectTouchTargets(page);
  await expectNoSideScroll(page);
  await snap(page, "04-races");

  await page.getByRole("link", { name: /^Governor/ }).click();
  await expect(page).toHaveURL(/\/governor$/);
  await expect(
    page.getByText("Sample candidates, not the real ballot"),
  ).toBeVisible();
  const cards = page.getByRole("main").getByRole("listitem");
  await expect(cards).toHaveCount(2);
  await expectTouchTargets(page);
  await expectNoSideScroll(page);
  await snap(page, "05-candidates");

  await cards.first().getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Alex Rivera",
  );
  await expect(
    page.getByText("Democratic Party · running for Governor"),
  ).toBeVisible();
  await expect(
    page.getByText("Sample candidate, not a real person"),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "This week" })).toBeVisible();
  await expectTouchTargets(page);
  await expectNoSideScroll(page);
  await snap(page, "06-candidate");

  // Back links climb the same path.
  await page.getByRole("link", { name: "Governor" }).click();
  await expect(page).toHaveURL(/\/governor$/);
  await page.getByRole("link", { name: "Races" }).click();
  await expect(page).toHaveURL(/\/2026-11-03-general$/);
  await page.getByRole("link", { name: "Elections" }).click();
  await expect(page).toHaveURL(/\/ca$/);
  await page.getByRole("link", { name: "States" }).click();
  await expect(page).toHaveURL(/\/states$/);
});

test("filters the state list", async ({ page }) => {
  await page.goto("/states");
  const search = page.getByLabel("Search states");
  await search.fill("new");
  await expect(page.getByRole("listitem")).toHaveCount(4);
  await search.fill("zzz");
  await expect(page.getByText("No state matches")).toBeVisible();
});

test("shows the district races with sample people", async ({ page }) => {
  await page.goto("/ca/2026-11-03-general/board-of-equalization-2");
  await expect(
    page.getByRole("heading", { name: "Board of Equalization, District 2" }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(2);
});

test("says when a state isn't open yet, and 404s on bad links", async ({
  page,
}) => {
  await page.goto("/tx");
  await expect(page.getByRole("heading", { name: "Texas" })).toBeVisible();
  await expect(
    page.getByText("The beta covers California first."),
  ).toBeVisible();

  // Screens stream behind a loading skeleton, so a bad link shows the
  // not-found screen (marked noindex) after the 200 has already been sent.
  for (const path of [
    "/zz",
    "/ca/not-an-election",
    "/ca/2026-11-03-general/mayor",
    "/ca/2026-11-03-general/governor/nobody",
    "/tx/2026-11-03-general",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Page not found" }),
      path,
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
      "content",
      /noindex/,
    );
  }
});

test("account screen explains how long the session lasts", async ({ page }) => {
  await page.goto("/account");
  await expect(page.getByText("30 days after you sign in")).toBeVisible();
  await expect(page.getByText("7 days without using the app")).toBeVisible();
  await expectTouchTargets(page);
});

test("sign-in screen in demo mode", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Election news in one place",
  );
  await expect(page.getByRole("link", { name: "Open the demo" })).toBeVisible();
  await expectNoSideScroll(page);
});
