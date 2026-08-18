import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://127.0.0.1:3000";

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

page.on("pageerror", (err) => console.log("PAGEERROR:", err.message.slice(0, 300)));

async function clickByText(text) {
  await page.getByRole("button", { name: text, exact: false }).first().click();
}

async function waitFor(text, timeout = 60000) {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout });
}

try {
  // 1. Pipeline: add a company through the UI (persisted to Postgres)
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await waitFor("Pipeline");
  await page.getByRole("button", { name: "Add company", exact: true }).first().click();
  await page.locator("#c-name").fill("Acme Labs");
  await page.locator("#c-url").fill("https://acme.com");
  await page.locator("#c-notes").fill(
    "Paste: building an AI note-taking tool for teams. Job post mentions a full-stack role shipping fast."
  );
  await page.getByRole("button", { name: "Add to pipeline" }).click();
  await page.getByRole("link", { name: "Acme Labs", exact: true }).waitFor({ timeout: 20000 });
  console.log("COMPANY_ADDED");

  // 2. Research
  await page.getByRole("link", { name: "Acme Labs", exact: true }).click();
  await waitFor("Research dossier");
  await clickByText("Build dossier");
  await waitFor("I actually read the sources");
  console.log("DOSSIER_OK");

  await page.getByText("I actually read the sources").click();
  await page.getByRole("tab", { name: /Fit/ }).click();
  await waitFor("Fit analysis");

  // 3. Fit
  await clickByText("Analyze fit");
  await waitFor("Do you genuinely care");
  console.log("FIT_OK");
  await page.getByRole("radio", { name: "Yes" }).check();

  // 4. Proof
  await page.getByRole("tab", { name: /Proof/ }).click();
  await waitFor("Proof task");
  await clickByText("Suggest proof tasks");
  await waitFor("Evidence link");
  console.log("PROOF_OK");
  await page.getByRole("checkbox").first().check();

  // 5. Outreach
  await page.getByRole("tab", { name: /Outreach/ }).click();
  await waitFor("Outreach");
  await clickByText("Draft outreach");
  await waitFor("Fill these in before sending");
  console.log("OUTREACH_OK");

  // 6. Quality
  await page.getByRole("tab", { name: /Quality/ }).click();
  await waitFor("Quality check");
  await clickByText("Run quality check");
  await page.getByRole("button", { name: "Re-check" }).waitFor({ timeout: 60000 });
  console.log("QUALITY_OK");

  // 7. Reload persistence + tracker
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Acme Labs", exact: true }).waitFor();
  await page.goto(`${BASE}/tracker`, { waitUntil: "networkidle" });
  await waitFor("Tracker");
  await page.getByRole("link", { name: "Acme Labs" }).waitFor();
  console.log("PERSIST_OK");

  // 8. Mobile sanity
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Acme Labs", exact: true }).waitFor();
  console.log("MOBILE_OK");

  console.log("FLOW_OK");
} catch (err) {
  console.error("FLOW_FAIL:", err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
