import { chromium } from "playwright-core";

// WARNING: this test walks the whole profile wizard and OVERWRITES the current
// profile in Postgres with test data. Run it only against a throwaway DB.

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://127.0.0.1:3000";

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

page.on("pageerror", (err) => console.log("PAGEERROR:", err.message.slice(0, 300)));

async function stepTitle() {
  return page.locator("h2").first().innerText();
}

async function continueTo(expectedHeading) {
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText(expectedHeading, { exact: true }).first().waitFor({ timeout: 20000 });
  console.log("STEP:", await stepTitle());
}

try {
  await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  await page.getByText("Build your evidence profile").first().waitFor();
  console.log("STEP:", await stepTitle()); // Basics

  // 1. Basics
  await page.locator("#p-name").fill("Siddharth");
  await page.locator("#p-headline").fill("Full-stack developer who ships for real users");
  await page.locator("#p-about").fill("Two years building data infrastructure, side projects used by real people.");
  await page.locator("#p-email").fill("test@example.com");
  await continueTo("Position");

  // 2. Position
  await page.locator("#p-roles").fill("Full-stack engineer, Frontend engineer");
  await continueTo("GitHub");

  // 3. GitHub — analyze a real public account
  await page.locator("#p-github").fill("octocat");
  await page.getByRole("button", { name: "Analyze GitHub" }).click();
  await page.getByText("GitHub evidence score").first().waitFor({ timeout: 30000 });
  console.log("GITHUB_ANALYSIS_OK");
  await continueTo("Links");

  // 4. Links
  await page.getByRole("button", { name: "Add link" }).click();
  await page.getByPlaceholder("GitHub").last().fill("GitHub");
  await page.getByPlaceholder("https://...").last().fill("https://github.com/siddharth-test");
  await continueTo("Skills");

  // 5. Skills
  await page.getByRole("button", { name: "Add skill" }).click();
  await page.getByPlaceholder("TypeScript").last().fill("TypeScript");
  await page.getByPlaceholder("Years").last().fill("3");
  await continueTo("Projects");

  // 6. Projects (proof fields)
  await page.getByRole("button", { name: "Add project" }).click();
  await page
    .getByPlaceholder("Tool that helps design students track submissions")
    .fill("Deadline tracker for design students");
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
    .fill("Posted in 3 design communities; 40 signups in week one");
  await continueTo("Experience");

  // 7. Experience
  await page.getByRole("button", { name: "Add experience" }).click();
  await page.locator("#exp-0-company").fill("Acme Data");
  await page.locator("#exp-0-role").fill("Software Engineer");
  await page.locator("#exp-0-summary").fill("Owned the ingestion pipeline end to end.");
  await continueTo("Education");

  // 8. Education — skip, continue
  await continueTo("Review your profile");

  // Review: 6 of 7 complete (education empty)
  const reviewText = await page.evaluate(() => document.body.innerText);
  if (!reviewText.includes("7/8")) throw new Error("Review count mismatch");
  if (!reviewText.includes("GitHub evidence score")) throw new Error("Review missing GitHub");
  if (
    !reviewText.includes("Deadline tracker for design students") ||
    !reviewText.includes("Used by 150+ students; ~2k checks a week") ||
    !reviewText.includes("Acme Data")
  ) {
    throw new Error("Review does not show full answers");
  }
  console.log("REVIEW_OK");

  // Finish
  await page.getByRole("button", { name: "Finish" }).click();
  await page.getByText("Profile saved", { exact: true }).first().waitFor({ timeout: 20000 });
  console.log("FINISH_OK");

  // Reload: wizard should resume at Education (first incomplete step)
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Build your evidence profile").first().waitFor();
  console.log("RESUME_STEP:", await stepTitle());
  const apiProfile = await page.evaluate(async () => {
    const res = await fetch("/api/profile");
    return res.json();
  });
  console.log("API_NAME:", apiProfile.name);
  console.log("API_GITHUB:", apiProfile.githubUsername);
  if (
    apiProfile.name !== "Siddharth" ||
    apiProfile.githubUsername !== "siddharth-test" ||
    apiProfile.projects?.length !== 1 ||
    apiProfile.githubReport?.username !== "octocat"
  ) {
    throw new Error("Persistence check failed");
  }
  console.log("PERSIST_OK");
} catch (err) {
  console.error("FLOW_FAIL:", err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
