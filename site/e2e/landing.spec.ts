import { test, expect } from "@playwright/test";

// ──────────────────────────────────────
// 1. Routing
// ──────────────────────────────────────
test.describe("Routing", () => {
  test("/ renders Landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "AI Agent Governance Interface" })).toBeVisible();
  });

  test("/spec renders Spec page", async ({ page }) => {
    await page.goto("/spec");
    await expect(page.locator("article")).toBeVisible();
  });

  test("/demo renders Demo page", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByRole("heading", { name: "Interactive Demo" })).toBeVisible();
  });
});

// ──────────────────────────────────────
// 2. Landing page sections
// ──────────────────────────────────────
test.describe("Landing page sections", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Hero section visible with CTAs", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "AI Agent Governance Interface" })).toBeVisible();
    await expect(page.locator("text=ERC Draft")).toBeVisible();
    const readSpec = page.locator("button", { hasText: "Read Full Spec" });
    const tryDemo = page.locator("button", { hasText: "Try Demo" });
    await expect(readSpec).toBeVisible();
    await expect(tryDemo).toBeVisible();
  });

  test("Problem section has 4 cards", async ({ page }) => {
    await expect(page.locator("text=Why This Standard?")).toBeVisible();
    await expect(page.locator("text=No AI Identity")).toBeVisible();
    await expect(page.locator("text=Permanent Delegation")).toBeVisible();
    await expect(page.locator("text=Rationale Manipulation")).toBeVisible();
    await expect(page.locator("text=No Cross-DAO Reputation")).toBeVisible();
  });

  test("Interfaces section has 4 interface cards", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Four Interfaces" })).toBeVisible();
    await expect(page.getByText("IAgentRegistry", { exact: true })).toBeVisible();
    await expect(page.getByText("IAgentDelegation", { exact: true })).toBeVisible();
    await expect(page.getByText("IRationaleCommitment", { exact: true })).toBeVisible();
    await expect(page.getByText("ICredibilityRegistry", { exact: true })).toBeVisible();
  });

  test("Lifecycle section has 8 steps", async ({ page }) => {
    await expect(page.locator("text=Governance Lifecycle")).toBeVisible();
    for (let i = 1; i <= 8; i++) {
      await expect(page.locator(`text="${i}"`).first()).toBeVisible();
    }
  });

  test("Code preview section shows Solidity", async ({ page }) => {
    await expect(page.locator("text=Built on Solidity Interfaces")).toBeVisible();
    await expect(page.locator("text=interface IAgentRegistry")).toBeVisible();
  });

  test("Bottom CTA section visible", async ({ page }) => {
    await expect(page.locator("text=Ready to Integrate?")).toBeVisible();
  });
});

// ──────────────────────────────────────
// 3. Navigation
// ──────────────────────────────────────
test.describe("Navigation", () => {
  test("Hero 'Read Full Spec' navigates to /spec", async ({ page }) => {
    await page.goto("/");
    await page.locator("button", { hasText: "Read Full Spec" }).click();
    await expect(page).toHaveURL("/spec");
    await expect(page.locator("article")).toBeVisible();
  });

  test("Hero 'Try Demo' navigates to /demo", async ({ page }) => {
    await page.goto("/");
    await page.locator("button", { hasText: "Try Demo" }).click();
    await expect(page).toHaveURL("/demo");
    await expect(page.getByRole("heading", { name: "Interactive Demo" })).toBeVisible();
  });

  test("Header logo navigates to /", async ({ page }) => {
    await page.goto("/spec");
    await page.locator("text=ERC-AI-GOV").click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "AI Agent Governance Interface" })).toBeVisible();
  });

  test("Header Spec link navigates to /spec", async ({ page }) => {
    await page.goto("/");
    await page.locator("header button", { hasText: "Spec" }).click();
    await expect(page).toHaveURL("/spec");
  });

  test("Header Demo link navigates to /demo", async ({ page }) => {
    await page.goto("/");
    await page.locator("header button", { hasText: "Demo" }).click();
    await expect(page).toHaveURL("/demo");
  });
});

// ──────────────────────────────────────
// 4. i18n
// ──────────────────────────────────────
test.describe("i18n", () => {
  test("Korean locale renders landing in Korean", async ({ page }) => {
    await page.goto("/");
    await page.locator("button", { hasText: "한" }).click();
    await expect(page.getByRole("heading", { name: "AI 에이전트 거버넌스 인터페이스" })).toBeVisible();
    await expect(page.locator("text=왜 이 표준이 필요한가?")).toBeVisible();
  });

  test("Chinese locale renders landing in Chinese", async ({ page }) => {
    await page.goto("/");
    await page.locator("button", { hasText: "中" }).click();
    await expect(page.getByRole("heading", { name: "AI 代理治理接口" })).toBeVisible();
  });

  test("Japanese locale renders landing in Japanese", async ({ page }) => {
    await page.goto("/");
    await page.locator("button", { hasText: "日" }).click();
    await expect(page.getByRole("heading", { name: "AI エージェントガバナンスインターフェース" })).toBeVisible();
  });
});

// ──────────────────────────────────────
// 5. Theme
// ──────────────────────────────────────
test.describe("Theme", () => {
  test("Theme toggle switches between dark and light", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");

    await expect(html).toHaveAttribute("data-theme", "dark");

    await page.locator("button[aria-label='Toggle theme']").click();
    await expect(html).toHaveAttribute("data-theme", "light");

    await page.locator("button[aria-label='Toggle theme']").click();
    await expect(html).toHaveAttribute("data-theme", "dark");
  });
});

// ──────────────────────────────────────
// 6. Demo page structure
// ──────────────────────────────────────
test.describe("Demo page", () => {
  test("Demo page has step rail with 8 steps", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByRole("button", { name: /Register Agent/ }).first()).toBeVisible();
    await expect(page.locator("text=Delegate").first()).toBeVisible();
    await expect(page.locator("text=Create Proposal")).toBeVisible();
    await expect(page.locator("text=View Credibility")).toBeVisible();
  });

  test("Demo page has wallet connect button", async ({ page }) => {
    await page.goto("/demo");
    const walletBtn = page.locator("w3m-button").first();
    await expect(walletBtn).toBeAttached();
  });
});
