import { expect, type Page } from "@playwright/test";

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

export async function snap(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/screens/${name}.png`,
    fullPage: true,
  });
}
