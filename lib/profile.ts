import { prisma } from "./prisma";
import type { EvidenceProfile } from "./types";

const SINGLETON_ID = "me";

export function emptyProfile(): EvidenceProfile {
  return {
    id: undefined,
    name: "",
    headline: "",
    about: "",
    location: "",
    email: "",
    phone: "",
    phoneCountry: "US",
    linkedinUrl: "",
    hasLinkedin: true,
    lookingFor: "",
    resumeFileName: "",
    resumeText: "",
    onboardedAt: null,
    timezone: "",
    githubUsername: "",
    availability: "",
    remote: false,
    openToRelocate: false,
    targetRoles: [],
    links: [],
    skills: [],
    projects: [],
    education: [],
    experience: [],
  };
}

export async function getProfile(): Promise<EvidenceProfile> {
  const user = await prisma.user.findUnique({
    where: { id: SINGLETON_ID },
    include: {
      links: { orderBy: { sortOrder: "asc" } },
      skills: { orderBy: { sortOrder: "asc" } },
      projects: { orderBy: { sortOrder: "asc" } },
      education: { orderBy: { sortOrder: "asc" } },
      experience: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!user) return emptyProfile();

  return {
    id: user.id,
    name: user.name,
    headline: user.headline,
    about: user.about,
    email: user.email,
    phone: user.phone,
    phoneCountry: user.phoneCountry,
    linkedinUrl: user.linkedinUrl,
    hasLinkedin: user.hasLinkedin,
    lookingFor: user.lookingFor,
    resumeFileName: user.resumeFileName,
    resumeText: user.resumeText,
    onboardedAt: user.onboardedAt ? user.onboardedAt.toISOString() : null,
    location: user.location,
    timezone: user.timezone,
    githubUsername: user.githubUsername,
    availability: user.availability,
    remote: user.remote,
    openToRelocate: user.openToRelocate,
    targetRoles: user.targetRoles,
    links: user.links.map((l) => ({ label: l.label, url: l.url })),
    skills: user.skills.map((s) => ({ name: s.name, years: s.years })),
    projects: user.projects.map((p) => ({
      id: p.id,
      name: p.name,
      problem: p.problem,
      work: p.work,
      outcome: p.outcome,
      users: p.users,
      links: p.links,
      tags: p.tags,
      startDate: p.startDate,
      endDate: p.endDate,
    })),
    education: user.education.map((e) => ({
      school: e.school,
      degree: e.degree,
      field: e.field,
      startDate: e.startDate,
      endDate: e.endDate,
      notes: e.notes,
    })),
    experience: user.experience.map((x) => ({
      company: x.company,
      role: x.role,
      startDate: x.startDate,
      endDate: x.endDate,
      current: x.current,
      summary: x.summary,
      bullets: x.bullets,
    })),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function saveProfile(input: EvidenceProfile): Promise<EvidenceProfile> {
  const data = {
    name: input.name ?? "",
    headline: input.headline ?? "",
    about: input.about ?? "",
    email: input.email ?? "",
    phone: input.phone ?? "",
    phoneCountry: input.phoneCountry ?? "US",
    linkedinUrl: input.linkedinUrl ?? "",
    hasLinkedin: input.hasLinkedin ?? true,
    lookingFor: input.lookingFor ?? "",
    resumeFileName: input.resumeFileName ?? "",
    resumeText: input.resumeText ?? "",
    location: input.location ?? "",
    timezone: input.timezone ?? "",
    githubUsername: input.githubUsername ?? "",
    availability: input.availability ?? "",
    remote: input.remote ?? false,
    openToRelocate: input.openToRelocate ?? false,
    targetRoles: input.targetRoles ?? [],
  };

  await prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { id: SINGLETON_ID },
      update: data,
      create: { id: SINGLETON_ID, ...data },
    });

    await tx.profileLink.deleteMany({ where: { userId: SINGLETON_ID } });
    await tx.skill.deleteMany({ where: { userId: SINGLETON_ID } });
    await tx.project.deleteMany({ where: { userId: SINGLETON_ID } });
    await tx.education.deleteMany({ where: { userId: SINGLETON_ID } });
    await tx.experience.deleteMany({ where: { userId: SINGLETON_ID } });

    if (input.links?.length) {
      await tx.profileLink.createMany({
        data: input.links.map((l, i) => ({
          userId: SINGLETON_ID,
          label: l.label,
          url: l.url,
          sortOrder: i,
        })),
      });
    }
    if (input.skills?.length) {
      await tx.skill.createMany({
        data: input.skills.map((s, i) => ({
          userId: SINGLETON_ID,
          name: s.name,
          years: Math.max(0, Math.min(50, Number(s.years) || 0)),
          sortOrder: i,
        })),
      });
    }
    if (input.projects?.length) {
      await tx.project.createMany({
        data: input.projects.map((p, i) => ({
          userId: SINGLETON_ID,
          name: p.name,
          problem: p.problem ?? "",
          work: p.work ?? "",
          outcome: p.outcome ?? "",
          users: p.users ?? "",
          links: p.links ?? [],
          tags: p.tags ?? [],
          startDate: p.startDate ?? "",
          endDate: p.endDate ?? "",
          sortOrder: i,
        })),
      });
    }
    if (input.education?.length) {
      await tx.education.createMany({
        data: input.education.map((e, i) => ({
          userId: SINGLETON_ID,
          school: e.school,
          degree: e.degree ?? "",
          field: e.field ?? "",
          startDate: e.startDate ?? "",
          endDate: e.endDate ?? "",
          notes: e.notes ?? "",
          sortOrder: i,
        })),
      });
    }
    if (input.experience?.length) {
      await tx.experience.createMany({
        data: input.experience.map((x, i) => ({
          userId: SINGLETON_ID,
          company: x.company,
          role: x.role,
          startDate: x.startDate ?? "",
          endDate: x.endDate ?? "",
          current: x.current ?? false,
          summary: x.summary ?? "",
          bullets: x.bullets ?? [],
          sortOrder: i,
        })),
      });
    }
  });

  return getProfile();
}
