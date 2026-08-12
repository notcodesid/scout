import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://127.0.0.1:3000";
const USERNAME = process.env.GH_USER || "notcodesid";

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

page.on("pageerror", (err) => console.log("PAGEERROR:", err.message.slice(0, 300)));

try {
  await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  await page.getByText("Build your evidence profile").first().waitFor();
  const title = await page.locator("h2").first().innerText();
  console.log("WIZARD_STEP:", title);

  if (title !== "GitHub") {
    await page.getByRole("button", { name: /GitHub/ }).first().click();
    await page.waitForTimeout(300);
  }

  await page.locator("#p-github").fill(USERNAME);
  await page.getByRole("button", { name: "Analyze GitHub" }).click();
  await page.getByText("GitHub evidence score").first().waitFor({ timeout: 30000 });

  const body = await page.evaluate(() => document.body.innerText);
  console.log("SCORE_LINE:", (body.match(/GitHub evidence score/g) || []).length > 0);
  console.log("STRENGTHS_SECTION:", body.includes("What's working"));
  console.log("REPO_STATS:", body.includes("Repos") && body.includes("Stars"));
  console.log("GITHUB_ANALYSIS_OK");
} catch (err) {
  console.error("FLOW_FAIL:", err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
