import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://127.0.0.1:3000";
const OUT_DIR = "/tmp/scout-shots";

import { mkdirSync } from "node:fs";
mkdirSync(OUT_DIR, { recursive: true });

const sampleState = {
  profile: {
    name: "Siddharth",
    headline: "Full-stack developer who ships for real users",
    location: "India",
    email: "you@example.com",
    links: [
      { label: "GitHub", url: "https://github.com/you" },
      { label: "Portfolio", url: "https://you.dev" },
    ],
    skills: ["TypeScript", "React", "Node.js"],
    projects: [
      {
        id: "p1",
        name: "Submission tracker for design students",
        problem: "Design students miss deadlines across 5+ platforms.",
        work: "Built an aggregator with reminders.",
        outcome: "Used by 150+ students; ~2k deadline checks a week.",
        users: "Posted in 3 communities; 40 signups in week one.",
        links: ["https://yoursite.com"],
        tags: ["React", "Supabase"],
      },
    ],
  },
  companies: [
    {
      id: "c1",
      name: "Dodge AI",
      url: "https://dodgeai.com",
      jobUrl: "https://dodgeai.com/jobs",
      notes: "Paste the job post here. Sample data for testing the flow.",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stage: "research",
      contacts: [],
      proofTasks: [],
      followUpDate: "",
    },
  ],
  ai: { baseUrl: "", model: "", apiKey: "" },
};

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

async function seed() {
  await page.addInitScript((data) => {
    try {
      localStorage.setItem("scout:v1", JSON.stringify(data));
    } catch (e) {
      console.log("seed error", e);
    }
  }, sampleState);
}

async function shot(name) {
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: false });
  console.log("shot:", name);
}

async function clickByText(text) {
  const el = page.getByRole("button", { name: text, exact: false }).first();
  await el.click();
}

async function waitFor(text, timeout = 60000) {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout });
}

try {
  await seed();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot("01-pipeline");

  await page.getByRole("link", { name: "Dodge AI", exact: true }).click();
  await waitFor("Research dossier");
  await shot("02-workspace-research");

  await clickByText("Build dossier");
  await waitFor("I actually read the sources");
  await shot("03-dossier-built");

  await page.getByText("I actually read the sources").click();
  await page.getByRole("tab", { name: /Fit/ }).click();
  await waitFor("Fit analysis");
  await clickByText("Analyze fit");
  await waitFor("Do you genuinely care");
  await shot("04-fit-analysis");

  await page.getByRole("radio", { name: "Yes" }).check();
  await page.getByRole("tab", { name: /Proof/ }).click();
  await waitFor("Proof task");
  await clickByText("Suggest proof tasks");
  await waitFor("Evidence link");
  await shot("05-proof-tasks");

  await page.getByRole("checkbox").first().check();
  await page.getByRole("tab", { name: /Outreach/ }).click();
  await waitFor("Outreach");
  await clickByText("Draft outreach");
  await waitFor("Fill these in before sending");
  await shot("06-outreach");

  await page.getByRole("tab", { name: /Quality/ }).click();
  await waitFor("Quality check");
  await clickByText("Run quality check");
  await page.getByRole("button", { name: "Re-check" }).waitFor({ timeout: 60000 });
  await shot("07-quality");

  await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  await waitFor("Evidence profile");
  await shot("08-profile");

  await page.goto(`${BASE}/tracker`, { waitUntil: "networkidle" });
  await waitFor("Tracker");
  await shot("09-tracker");

  // Mobile check
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot("10-mobile-pipeline");
  await page.getByRole("link", { name: "Dodge AI", exact: true }).click();
  await waitFor("Research dossier");
  await shot("11-mobile-workspace");

  console.log("FLOW_OK");
} catch (err) {
  console.error("FLOW_FAIL:", err.message);
  await shot("error-state");
  process.exitCode = 1;
} finally {
  await browser.close();
}
