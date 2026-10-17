// A production build with Supabase settings but no session: everything is
// behind sign-in, and the sign-in routes refuse anything off-script. No real
// Supabase or Google is contacted.

import { expect, test } from "@playwright/test";
import { expectNoSideScroll, expectTouchTargets, snap } from "./helpers";

test("sends visitors without a session to sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  await expectTouchTargets(page);
  await expectNoSideScroll(page);
  await snap(page, "01-sign-in");

  await page.goto("/ca/2026-11-03-general?x=1");
  await expect(page).toHaveURL(
    /\/sign-in\?next=%2Fca%2F2026-11-03-general%3Fx%3D1$/,
  );
  await expect(page.locator('input[name="next"]')).toHaveValue(
    "/ca/2026-11-03-general?x=1",
  );
});

test("locks every screen and form", async ({ request }) => {
  for (const path of [
    "/states",
    "/ca",
    "/ca/2026-11-03-general/governor",
    "/account",
  ]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(303);
    expect(res.headers().location, path).toContain("/sign-in");
  }
  const select = await request.post("/states/select", {
    form: { state: "CA" },
    maxRedirects: 0,
  });
  expect(select.status()).toBe(303);
  expect(select.headers().location).toContain("/sign-in");
});

test("ignores a forged session cookie", async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: "sb-127-auth-token",
      value: "base64-eyJub3QiOiJhIHNlc3Npb24ifQ",
      url: baseURL!,
    },
    { name: "nl_last_seen", value: String(Date.now()), url: baseURL! },
  ]);
  const page = await context.newPage();
  await page.goto("/states");
  await expect(page).toHaveURL(/\/sign-in/);
  await context.close();
});

test("starts Google sign-in through Supabase with PKCE", async ({
  request,
  baseURL,
}) => {
  const res = await request.post("/auth/sign-in", {
    form: { next: "/ca" },
    headers: { origin: baseURL! },
    maxRedirects: 0,
  });
  expect(res.status()).toBe(303);
  const location = new URL(res.headers().location!);
  expect(location.origin).toBe("http://127.0.0.1:54321");
  expect(location.pathname).toBe("/auth/v1/authorize");
  expect(location.searchParams.get("provider")).toBe("google");
  expect(location.searchParams.get("code_challenge_method")).toBe("s256");
  expect(location.searchParams.get("redirect_to")).toBe(
    `${baseURL}/auth/callback?next=%2Fca`,
  );
  const verifier = res
    .headersArray()
    .find(
      (h) =>
        h.name.toLowerCase() === "set-cookie" &&
        h.value.includes("code-verifier"),
    );
  expect(verifier?.value).toMatch(/HttpOnly/i);
});

test("refuses sign-in posts from other sites", async ({ request }) => {
  const foreign = await request.post("/auth/sign-in", {
    headers: { origin: "https://evil.example" },
    maxRedirects: 0,
  });
  expect(foreign.status()).toBe(403);
  const missing = await request.post("/auth/sign-in", { maxRedirects: 0 });
  expect(missing.status()).toBe(403);
});

test("drops open-redirect attempts", async ({ request, baseURL }) => {
  const res = await request.post("/auth/sign-in", {
    form: { next: "//evil.example/steal" },
    headers: { origin: baseURL! },
    maxRedirects: 0,
  });
  const location = new URL(res.headers().location!);
  expect(location.searchParams.get("redirect_to")).toBe(
    `${baseURL}/auth/callback`,
  );
});

test("explains failed or cancelled callbacks", async ({ page }) => {
  await page.goto("/auth/callback?error=access_denied");
  await expect(page).toHaveURL(/reason=cancelled/);
  await expect(page.getByRole("status")).toHaveText("Sign-in was cancelled.");

  await page.goto("/auth/callback");
  await expect(page.getByRole("status")).toHaveText(
    "Sign-in didn't work. Please try again.",
  );

  await page.goto("/sign-in?reason=idle");
  await expect(page.getByRole("status")).toContainText("7 days away");
  await page.goto("/sign-in?reason=max_age");
  await expect(page.getByRole("status")).toContainText("30 days after sign-in");
});

test("sends security headers", async ({ request }) => {
  const res = await request.get("/sign-in");
  const headers = res.headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"]).toBeUndefined();
});
