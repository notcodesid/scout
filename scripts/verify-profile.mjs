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

try {
  await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  await page.getByText("Evidence profile").first().waitFor();

  // Fill core fields
  await page.locator("#p-name").fill("Siddharth Test");
  await page.locator("#p-headline").fill("Full-stack developer who ships for real users");
  await page.locator("#p-about").fill("Two years building data infrastructure, side projects used by real people.");
  await page.locator("#p-email").fill("test@example.com");
  await page.locator("#p-github").fill("siddharth-test");

  // Add a link
  await page.getByRole("button", { name: "Add", exact: true }).first().click();
  const linkLabel = page.getByPlaceholder("GitHub");
  await linkLabel.last().fill("GitHub");
  await page.getByPlaceholder("https://...").last().fill("https://github.com/siddharth-test");

  // Add a skill
  await page.getByRole("button", { name: "Add", exact: true }).nth(1).click();
  const skillName = page.getByPlaceholder("TypeScript");
  await skillName.last().fill("TypeScript");
  await page.getByPlaceholder("Years").last().fill("3");

  // Add a project with the proof fields
  await page.getByRole("button", { name: "Add project" }).click();
  const projectName = page.getByPlaceholder("Tool that helps design students track submissions");
  await projectName.fill("Deadline tracker for design students");
  await page
    .getByPlaceholder("Students miss deadlines across 5+ platforms...")
    .fill("Students miss deadlines across 5+ platforms");
  await page
    .getByPlaceholder("Built an aggregator with reminders...")
    .fill("Built an aggregator that pulls deadlines into one view with reminders");
  await page
    .getByPlaceholder("Used by 150 people; ~2k checks a week")
    .fill("Used by 150+ students; ~2k checks a week");
  await page
    .getByPlaceholder("Posted in 3 design communities; 40 signups in week one...")
    .fill("Posted in 3 design communities; 40 signups in week one, 15 stayed active");

  // Add experience
  await page.getByRole("button", { name: "Add", exact: true }).nth(2).click();
  await page.locator("#exp-0-company").fill("Acme Data");
  await page.locator("#exp-0-role").fill("Software Engineer");
  await page.locator("#exp-0-summary").fill("Owned the ingestion pipeline end to end.");

  // Save
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.getByText("Saved", { exact: true }).first().waitFor({ timeout: 20000 });
  console.log("SAVE_OK");

  // Reload and verify persistence
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Evidence profile").first().waitFor();
  const name = await page.locator("#p-name").inputValue();
  const github = await page.locator("#p-github").inputValue();
  const projectCount = await page.getByText(/Project \d+/).count();
  console.log("RELOAD_NAME:", name);
  console.log("RELOAD_GITHUB:", github);
  console.log("RELOAD_PROJECTS:", projectCount);
  if (name !== "Siddharth Test" || github !== "siddharth-test" || projectCount < 1) {
    throw new Error("Persistence check failed");
  }
  console.log("PERSIST_OK");
} catch (err) {
  console.error("FLOW_FAIL:", err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
