import { prisma } from "./prisma";
import type { ResumeExtract } from "./ai";
import { getProfile } from "./profile";
import type { EvidenceProfile } from "./types";

const SINGLETON_ID = "me";

export async function isOnboarded(): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: SINGLETON_ID },
    select: { onboardedAt: true },
  });
  return Boolean(user?.onboardedAt);
}

// Step 1 — contact. Upserts so the very first save creates the singleton row.
export async function saveContactStep(input: {
  name: string;
  phone: string;
  phoneCountry: string;
  linkedinUrl: string;
  hasLinkedin: boolean;
  email: string;
}): Promise<void> {
  const data = {
    name: input.name.trim(),
    phone: input.phone.trim(),
    phoneCountry: input.phoneCountry || "US",
    linkedinUrl: input.hasLinkedin ? input.linkedinUrl.trim() : "",
    hasLinkedin: input.hasLinkedin,
  };
  await prisma.user.upsert({
    where: { id: SINGLETON_ID },
    update: data,
    create: { id: SINGLETON_ID, email: input.email, ...data },
  });
}

// Step 2 — resume. The extracted profile is written as a whole: relations are
// replaced rather than merged, because re-uploading a resume should reflect the
// new document, not accumulate stale rows from the old one. Anything the user
// already typed by hand (name, phone, LinkedIn) wins over the extraction.
export async function applyResumeExtract(input: {
  fileName: string;
  resumeText: string;
  extract: ResumeExtract;
}): Promise<EvidenceProfile> {
  const { extract } = input;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { id: SINGLETON_ID } });

    const keep = (typed: string | undefined, parsed: string) =>
      typed && typed.trim() ? typed : parsed;

    await tx.user.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        name: extract.name,
        headline: extract.headline,
        about: extract.about,
        email: extract.email,
        phone: extract.phone,
        location: extract.location,
        githubUsername: extract.githubUsername,
        lookingFor: extract.lookingFor,
        targetRoles: extract.targetRoles,
        resumeFileName: input.fileName,
        resumeText: input.resumeText,
      },
      update: {
        name: keep(existing?.name, extract.name),
        headline: keep(existing?.headline, extract.headline),
        about: keep(existing?.about, extract.about),
        email: keep(existing?.email, extract.email),
        phone: keep(existing?.phone, extract.phone),
        location: keep(existing?.location, extract.location),
        githubUsername: keep(existing?.githubUsername, extract.githubUsername),
        lookingFor: keep(existing?.lookingFor, extract.lookingFor),
        targetRoles: existing?.targetRoles.length
          ? existing.targetRoles
          : extract.targetRoles,
        resumeFileName: input.fileName,
        resumeText: input.resumeText,
      },
    });

    await tx.skill.deleteMany({ where: { userId: SINGLETON_ID } });
    await tx.project.deleteMany({ where: { userId: SINGLETON_ID } });
    await tx.education.deleteMany({ where: { userId: SINGLETON_ID } });
    await tx.experience.deleteMany({ where: { userId: SINGLETON_ID } });

    if (extract.skills.length) {
      await tx.skill.createMany({
        data: dedupeByName(extract.skills).map((s, i) => ({
          userId: SINGLETON_ID,
          name: s.name,
          years: s.years,
          sortOrder: i,
        })),
      });
    }
    if (extract.projects.length) {
      await tx.project.createMany({
        data: extract.projects.map((p, i) => ({
          userId: SINGLETON_ID,
          name: p.name,
          problem: p.problem,
          work: p.work,
          outcome: p.outcome,
          users: p.users,
          links: p.links,
          tags: p.tags,
          startDate: p.startDate,
          endDate: p.endDate,
          sortOrder: i,
        })),
      });
    }
    if (extract.education.length) {
      await tx.education.createMany({
        data: extract.education.map((e, i) => ({
          userId: SINGLETON_ID,
          school: e.school,
          degree: e.degree,
          field: e.field,
          startDate: e.startDate,
          endDate: e.endDate,
          notes: e.notes,
          sortOrder: i,
        })),
      });
    }
    if (extract.experience.length) {
      await tx.experience.createMany({
        data: extract.experience.map((x, i) => ({
          userId: SINGLETON_ID,
          company: x.company,
          role: x.role,
          startDate: x.startDate,
          endDate: x.endDate,
          current: x.current,
          summary: x.summary,
          bullets: x.bullets,
          sortOrder: i,
        })),
      });
    }

    // Links found in the resume seed step 3, where the user confirms them.
    if (extract.links.length) {
      const existingLinks = await tx.profileLink.findMany({
        where: { userId: SINGLETON_ID },
      });
      const seen = new Set(existingLinks.map((l) => l.url.toLowerCase()));
      const fresh = extract.links.filter((l) => !seen.has(l.url.toLowerCase()));
      if (fresh.length) {
        await tx.profileLink.createMany({
          data: fresh.map((l, i) => ({
            userId: SINGLETON_ID,
            label: l.label,
            url: l.url,
            sortOrder: existingLinks.length + i,
          })),
        });
      }
    }
  });

  return getProfile();
}

function dedupeByName<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const key = i.name.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Step 3 — work links, then mark onboarding done.
export async function saveWorkStep(input: {
  githubUsername: string;
  links: { label: string; url: string }[];
  complete: boolean;
}): Promise<EvidenceProfile> {
  await prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        githubUsername: input.githubUsername,
        ...(input.complete ? { onboardedAt: new Date() } : {}),
      },
      update: {
        githubUsername: input.githubUsername,
        ...(input.complete ? { onboardedAt: new Date() } : {}),
      },
    });

    await tx.profileLink.deleteMany({ where: { userId: SINGLETON_ID } });
    const links = input.links.filter((l) => l.url.trim());
    if (links.length) {
      await tx.profileLink.createMany({
        data: links.map((l, i) => ({
          userId: SINGLETON_ID,
          label: l.label.trim() || "Link",
          url: l.url.trim(),
          sortOrder: i,
        })),
      });
    }
  });

  return getProfile();
}
