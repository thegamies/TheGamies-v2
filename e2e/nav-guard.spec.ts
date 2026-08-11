import { expect, test } from "@playwright/test";

test.describe("unsaved navigation guard", () => {
  test("clean page navigates without a prompt", async ({ page }) => {
    await page.goto("/dev/nav-guard");
    await expect(page.getByTestId("status")).toHaveText("clean");
    await page.getByTestId("leave-link").click();
    await expect(page).toHaveURL("/");
  });

  test("dirty stay keeps you on the page", async ({ page }) => {
    await page.goto("/dev/nav-guard");
    await page.getByTestId("toggle-dirty").click();
    await expect(page.getByTestId("status")).toHaveText("dirty");

    await page.getByTestId("leave-link").click();
    await expect(page.getByTestId("unsaved-stay")).toBeVisible();
    await page.getByTestId("unsaved-stay").click();
    await expect(page).toHaveURL(/\/dev\/nav-guard/);
    await expect(page.getByTestId("status")).toHaveText("dirty");
  });

  test("dirty header link stay keeps you on the page", async ({ page }) => {
    await page.goto("/dev/nav-guard");
    await page.getByTestId("toggle-dirty").click();
    await expect(page.getByTestId("status")).toHaveText("dirty");

    await page.getByTestId("header-games").click();
    await expect(page.getByTestId("unsaved-stay")).toBeVisible();
    await page.getByTestId("unsaved-stay").click();
    await expect(page).toHaveURL(/\/dev\/nav-guard/);
  });

  test("dirty leave navigates once", async ({ page }) => {
    await page.goto("/dev/nav-guard");
    await page.getByTestId("toggle-dirty").click();
    await expect(page.getByTestId("status")).toHaveText("dirty");

    await page.getByTestId("leave-link").click();
    await expect(page.getByTestId("unsaved-leave")).toBeVisible();
    await page.getByTestId("unsaved-leave").click();
    await expect(page).toHaveURL("/");
  });
});
