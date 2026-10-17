import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { SERVER_KEY_SENTINELS } from "./sentinels";

// Every visible link and button must be at least 44 px tall (the design's
// phone-first rule). Inline text links inside paragraphs are exempt.
export async function expectTouchTargets(page: Page) {
  const small = await page.evaluate(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(
        "main a, main button, header a, header button",
      ),
    );
    return els
      .filter((el) => el.offsetParent !== null && !el.closest("p"))
      .map((el) => ({
        text: el.innerText || el.getAttribute("aria-label"),
        h: el.getBoundingClientRect().height,
      }))
      .filter((el) => el.h < 44);
  });
  expect(small).toEqual([]);
}

export async function expectNoSideScroll(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

// Phone screenshots go in test-results/screens/, others in a folder named
// after the Playwright project.
export async function snap(page: Page, name: string) {
  const project = test.info().project.name;
  const folder = project === "demo" ? "" : `${project}/`;
  await page.screenshot({
    path: `test-results/screens/${folder}${name}.png`,
    fullPage: true,
  });
}

// Opens each path and reads every response the page loads from the app
// (HTML, the React payload, scripts, styles), failing if any of them
// contains a server-only key.
export async function expectNoServerKeysServed(page: Page, paths: string[]) {
  const sentinels = Object.values(SERVER_KEY_SENTINELS);
  const appOrigin = new URL(test.info().project.use.baseURL ?? "").origin;
  const leaks: string[] = [];
  const reads: Promise<void>[] = [];
  page.on("response", (response) => {
    if (new URL(response.url()).origin !== appOrigin) return;
    reads.push(
      response
        .text()
        .then((body) => {
          for (const sentinel of sentinels)
            if (body.includes(sentinel)) leaks.push(response.url());
        })
        // Redirects and aborted requests have no body to read.
        .catch(() => undefined),
    );
  });
  for (const path of paths) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  await Promise.all(reads);
  expect(reads.length).toBeGreaterThan(paths.length);
  expect(leaks).toEqual([]);
}

// Runs axe (every rule it has, not only the WCAG A and AA ones) on the page
// as it is now. Any violation fails, whatever its impact, with the rule and
// the elements it flagged.
export async function expectNoAccessibilityIssues(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(
    violations.map((v) => ({
      rule: v.id,
      impact: v.impact,
      elements: v.nodes.map((n) => n.target.join(" ")),
    })),
  ).toEqual([]);
}
