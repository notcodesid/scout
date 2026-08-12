import { prisma } from "./prisma";
import type { GithubReportInfo } from "./types";

const GITHUB_API = "https://api.github.com";
const SINGLETON_ID = "me";

interface GHUser {
  login: string;
  public_repos: number;
  followers: number;
}

interface GHRepo {
  name: string;
  description: string | null;
  fork: boolean;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  pushed_at: string;
  homepage: string | null;
  archived: boolean;
}

interface GHEvent {
  type: string;
}

async function gh<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "scout-job-copilot",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("GitHub user not found. Double-check the username.");
    }
    if (res.status === 403 || res.status === 429) {
      throw new Error(
        "GitHub rate limit hit. Public API allows ~60 requests/hour; try again later or set GITHUB_TOKEN."
      );
    }
    throw new Error(`GitHub API error (${res.status})`);
  }
  return res.json() as Promise<T>;
}

const TUTORIAL_RE =
  /(todo|tutorial|clone|course|bootcamp|demo|portfolio|weather|calculator|netflix|spotify|chat[- ]?app|blog[- ]?app|ecommerce)/i;
const LEETCODE_RE =
  /(leetcode|hackerrank|codechef|codeforces|dsa|competitive|100[- ]?days|algorithms|data[- ]?structures)/i;

function analyze(
  user: GHUser,
  repos: GHRepo[],
  recentPushes: number
): Omit<GithubReportInfo, "username" | "fetchedAt"> {
  const now = Date.now();
  const original = repos.filter((r) => !r.fork);
  const withDesc = repos.filter((r) => (r.description || "").trim().length > 0);
  const active90 = repos.filter(
    (r) => now - new Date(r.pushed_at).getTime() < 90 * 24 * 60 * 60 * 1000
  ).length;
  const stars = repos.reduce((s, r) => s + r.stargazers_count, 0);
  const top = [...repos]
    .sort(
      (a, b) =>
        b.stargazers_count - a.stargazers_count ||
        b.forks_count - a.forks_count ||
        new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()
    )
    .slice(0, 5);
  const tutorialRepos = top.filter((r) => TUTORIAL_RE.test(r.name));
  const lcRepos = repos.filter((r) => LEETCODE_RE.test(r.name));

  const strengths: string[] = [];
  const redFlags: string[] = [];

  if (original.length >= 3) {
    strengths.push(`${original.length} original projects, not forks`);
  }
  if (stars >= 10) strengths.push(`${stars} total stars across repos`);
  else if (stars >= 1) strengths.push(`${stars} stars — small but real signal`);
  if (withDesc.length >= Math.max(1, Math.floor(repos.length / 2))) {
    strengths.push(`${withDesc.length} repos with real descriptions`);
  }
  if (active90 > 0) {
    strengths.push(`Active recently — ${active90} repo(s) pushed in the last 90 days`);
  }
  if (recentPushes > 0) strengths.push("Visible public activity in the last 90 days");
  if (repos.some((r) => r.homepage)) strengths.push("Live links on some repos");

  if (original.length === 0) redFlags.push("Everything is a fork — no original work");
  if (repos.length < 2) redFlags.push("Very few repos — 3 real repos beat 30 empty ones");
  if (tutorialRepos.length > 0) {
    redFlags.push(
      `Top repos look like tutorial output: ${tutorialRepos
        .slice(0, 3)
        .map((r) => r.name)
        .join(", ")}`
    );
  }
  if (lcRepos.length >= 2) {
    redFlags.push("LeetCode/DSA repos dominate — that's interview prep, not building");
  }
  if (repos.length > 0 && withDesc.length === 0) {
    redFlags.push("No repo has a description — add context and explain why you built it");
  }
  if (active90 === 0 && repos.length > 0) {
    redFlags.push("No pushes in 90 days — an empty contribution graph says a lot");
  }
  if (repos.length > 0 && repos.every((r) => r.archived)) {
    redFlags.push("Everything is archived");
  }

  let score = 20;
  score += Math.min(20, original.length * 4);
  score += Math.min(15, stars);
  score += Math.min(10, active90 * 2);
  score += Math.min(10, withDesc.length * 2);
  score += Math.min(10, user.followers);
  score += repos.length >= 3 ? 10 : repos.length * 3;
  score -= tutorialRepos.length * 5;
  score -= lcRepos.length * 3;
  score = Math.max(0, Math.min(100, score));

  const newestPush = repos.length
    ? new Date(Math.max(...repos.map((r) => new Date(r.pushed_at).getTime())))
    : null;

  return {
    followers: user.followers,
    publicRepos: user.public_repos,
    totalStars: stars,
    score,
    summary: `${user.login} has ${repos.length} repo(s), ${stars} star(s), ${user.followers} follower(s). ${
      active90 > 0 ? "Active in the last 90 days." : "Little recent activity."
    }`,
    strengths,
    redFlags,
    topRepos: top.map(
      (r) =>
        `${r.name} ★${r.stargazers_count}${r.language ? ` · ${r.language}` : ""}${
          r.description ? ` — ${r.description.slice(0, 90)}` : ""
        }`
    ),
    activityNote: newestPush
      ? `Most recent push: ${newestPush.toISOString().slice(0, 10)}. ${active90} repo(s) active in the last 90 days.`
      : "No public repos found.",
  };
}

export async function analyzeGithub(username: string): Promise<GithubReportInfo> {
  const clean = username.trim().replace(/^@/, "");
  if (!clean) throw new Error("Enter a GitHub username first.");

  const token = process.env.GITHUB_TOKEN;
  const user = await gh<GHUser>(`/users/${encodeURIComponent(clean)}`, token);
  const repos = await gh<GHRepo[]>(
    `/users/${encodeURIComponent(clean)}/repos?per_page=100&sort=pushed`,
    token
  );

  let recentPushes = 0;
  try {
    const events = await gh<GHEvent[]>(
      `/users/${encodeURIComponent(clean)}/events/public?per_page=30`,
      token
    );
    recentPushes = events.filter((e) => e.type === "PushEvent").length;
  } catch {
    // events are optional; analysis still works without them
  }

  const report = {
    username: clean,
    fetchedAt: new Date().toISOString(),
    ...analyze(user, repos, recentPushes),
  };

  await prisma.user.upsert({
    where: { id: SINGLETON_ID },
    update: { githubUsername: clean },
    create: { id: SINGLETON_ID, githubUsername: clean },
  });
  await prisma.githubReport.upsert({
    where: { userId: SINGLETON_ID },
    update: report,
    create: { userId: SINGLETON_ID, ...report },
  });

  return report;
}
