import { Startup } from "@/components/StartupCard";

export interface FundingRound {
  stage: string;
  amount: string;
  date: string;
  investors?: string[];
}

export interface StartupFull extends Startup {
  longDescription?: string;
  fundingRounds?: FundingRound[];
  totalFunding?: string;
  employees?: string;
  industry?: string;
  twitter?: string;
  linkedin?: string;
}

export const startups: StartupFull[] = [
  {
    id: "1",
    name: "Doublezero",
    description: "A platform that provides developers with everything they need to build, operate, and monetize autonomous agents. Focus on creating tools while Doublezero handles reasoning frameworks, state management, analytics, and monetization.",
    longDescription: "Doublezero is revolutionizing how developers build and deploy autonomous AI agents. Our comprehensive platform handles the complex infrastructure—reasoning frameworks, state management, analytics, and monetization—so developers can focus purely on creating powerful tools. With an intuitive UI that allows play, pause, rewind, and human intervention, plus an integrated marketplace for sharing agents and tools, Doublezero is the complete solution for the autonomous agent economy.",
    website: "https://doublezero.tech",
    tags: ["Developer Tools", "AI", "Infrastructure", "Agents"],
    founded: "2025",
    teamSize: 2,
    location: "San Francisco",
    batch: "W25",
    industry: "Developer Tools",
    twitter: "https://twitter.com/doublezerotech",
    linkedin: "https://linkedin.com/company/doublezero",
    totalFunding: "$2.5M",
    employees: "2-10",
    fundingRounds: [
      { stage: "Seed", amount: "$2.5M", date: "Jan 2025", investors: ["Y Combinator", "Andreessen Horowitz Scout"] },
    ],
    founders: [
      { name: "Albrey Brown", linkedin: "https://linkedin.com/in/albreybrown" },
      { name: "Scott Moss", linkedin: "https://linkedin.com/in/willscottmoss" },
    ],
  },
  {
    id: "2",
    name: "Dench",
    description: "AI Secretary to pre-qualify leads for law firms. Voice AI Agent streamlines lead qualification for high-volume law firms, efficiently handling initial client screening.",
    longDescription: "Dench transforms how law firms handle inbound leads with our AI-powered voice secretary. High-volume practices struggle with initial client screening—it's time-consuming and often handled inconsistently. Our Voice AI Agent conducts professional intake calls 24/7, qualifying leads based on your criteria, scheduling consultations, and seamlessly integrating with your existing CRM. Law firms using Dench see 40% more qualified consultations while reducing intake costs by 60%.",
    website: "https://dench.com",
    tags: ["AI", "Legal", "LegalTech", "B2B", "Voice AI"],
    founded: "2025",
    teamSize: 2,
    location: "San Francisco",
    batch: "W25",
    industry: "LegalTech",
    totalFunding: "$2M",
    employees: "2-10",
    fundingRounds: [
      { stage: "Seed", amount: "$2M", date: "Jan 2025", investors: ["Y Combinator", "Initialized Capital"] },
    ],
    founders: [
      { name: "Mark Rachapoom", linkedin: "https://linkedin.com/in/markrachapoom" },
      { name: "Kumar Abhirup", linkedin: "https://linkedin.com/in/kumarabhirup" },
    ],
  },
  {
    id: "3",
    name: "Parley",
    description: "Automating flat-fee legal work, starting with work visas + green cards. Parley automates visa applications for immigration lawyers using LLMs, doing 80% of the reading, writing, and compiling work.",
    longDescription: "Immigration lawyers spend 20+ hours on each visa application—reading documents, writing forms, and compiling evidence. Parley uses advanced LLMs to automate 80% of this work. We integrate directly into a lawyer's workflow, handling the reading, writing, and compiling required to file visa applications. Starting with work visas and green cards, Parley is building the future of flat-fee legal work at scale.",
    website: "https://parley.so",
    tags: ["AI", "Legal", "SaaS", "Immigration", "LegalTech"],
    founded: "2025",
    teamSize: 3,
    location: "San Francisco",
    batch: "W25",
    industry: "LegalTech",
    totalFunding: "$2.2M",
    employees: "2-10",
    fundingRounds: [
      { stage: "Seed", amount: "$2.2M", date: "Jan 2025", investors: ["Y Combinator", "Pioneer Fund"] },
    ],
    founders: [
      { name: "Sarah Chen", linkedin: "https://linkedin.com/in/sarahchen" },
      { name: "Michael Rodriguez", linkedin: "https://linkedin.com/in/michaelrodriguez" },
    ],
  },
  {
    id: "4",
    name: "ACX Therapeutics",
    description: "The only company that has successfully recreated synthetically the compounds that bacteria use to kill microbes for therapeutic development. Applications in humans, animals, and crops.",
    longDescription: "ACX Therapeutics has achieved what was thought impossible—synthetically recreating the antimicrobial compounds bacteria naturally produce. Our patentable technology opens new frontiers in therapeutic development for humans, veterinary medicine, and agricultural applications. Starting with crop pathogen elimination, we're developing solutions that are harmful to pests but beneficial for humans, addressing antibiotic resistance with nature-inspired innovation.",
    website: "https://acxtherapeutics.com",
    tags: ["Biotech", "Healthcare", "Agriculture", "Drug Discovery"],
    founded: "2024",
    teamSize: 8,
    location: "Boston",
    batch: "W24",
    industry: "Biotech",
    totalFunding: "$8M",
    employees: "2-10",
    fundingRounds: [
      { stage: "Pre-Seed", amount: "$1M", date: "Jun 2024", investors: ["Y Combinator"] },
      { stage: "Seed", amount: "$7M", date: "Oct 2024", investors: ["Andreessen Horowitz Bio", "Khosla Ventures"] },
    ],
    founders: [
      { name: "Dr. Emily Watson", linkedin: "https://linkedin.com/in/emilywatson" },
      { name: "Dr. James Lee", linkedin: "https://linkedin.com/in/jameslee" },
    ],
  },
  {
    id: "5",
    name: "Nexus AI",
    description: "Building the next generation of AI infrastructure for enterprise. Our platform enables companies to deploy, scale, and manage AI models with unprecedented efficiency.",
    longDescription: "Enterprise AI deployment is broken—fragmented tools, unpredictable costs, and scaling nightmares. Nexus AI provides a unified platform for deploying, scaling, and managing AI models across your organization. Our infrastructure handles everything from model optimization to cost management, enabling teams to go from prototype to production in days instead of months. Trusted by Fortune 500 companies processing billions of AI requests.",
    website: "https://nexusai.com",
    tags: ["AI", "Infrastructure", "Enterprise", "MLOps"],
    founded: "2024",
    teamSize: 12,
    location: "San Francisco",
    batch: "S24",
    industry: "AI Infrastructure",
    totalFunding: "$15M",
    employees: "11-50",
    fundingRounds: [
      { stage: "Seed", amount: "$5M", date: "Mar 2024", investors: ["Y Combinator", "Sequoia Scout"] },
      { stage: "Series A", amount: "$10M", date: "Sep 2024", investors: ["Greylock Partners", "Index Ventures"] },
    ],
    founders: [
      { name: "Alex Kim", linkedin: "https://linkedin.com/in/alexkim" },
      { name: "Priya Patel", linkedin: "https://linkedin.com/in/priyapatel" },
    ],
  },
  {
    id: "6",
    name: "ClimateTech Labs",
    description: "Developing carbon capture technology using novel materials. Our breakthrough approach is 10x more efficient than existing solutions, making carbon removal economically viable.",
    longDescription: "Climate change demands solutions at gigaton scale, but current carbon capture is too expensive. ClimateTech Labs has developed proprietary materials that capture CO2 10x more efficiently than existing solutions. Our modular direct air capture units can be deployed anywhere, from industrial sites to urban areas. We're making carbon removal economically viable at the scale the planet needs.",
    website: "https://climatetechlabs.com",
    tags: ["Climate", "Deep Tech", "Carbon Capture", "Sustainability"],
    founded: "2024",
    teamSize: 15,
    location: "Boulder",
    batch: "S24",
    industry: "Climate Tech",
    totalFunding: "$25M",
    employees: "11-50",
    fundingRounds: [
      { stage: "Seed", amount: "$5M", date: "Feb 2024", investors: ["Y Combinator", "Breakthrough Energy Ventures"] },
      { stage: "Series A", amount: "$20M", date: "Nov 2024", investors: ["Lowercarbon Capital", "Congruent Ventures"] },
    ],
    founders: [
      { name: "Dr. Maria Santos", linkedin: "https://linkedin.com/in/mariasantos" },
      { name: "Thomas Green", linkedin: "https://linkedin.com/in/thomasgreen" },
    ],
  },
  {
    id: "7",
    name: "RoboKit",
    description: "Open-source robotics platform for developers. We provide modular hardware and software components that make building custom robots as easy as building web apps.",
    longDescription: "Building robots shouldn't require a PhD in mechanical engineering. RoboKit provides modular hardware components and an intuitive software SDK that makes custom robot development accessible to any developer. Our open-source platform includes sensors, actuators, and pre-built modules that snap together—plus a simulation environment to test before you build. Join thousands of developers building the next generation of robots.",
    website: "https://robokit.dev",
    tags: ["Robotics", "Hardware", "Developer Tools", "Open Source"],
    founded: "2024",
    teamSize: 6,
    location: "Seattle",
    batch: "W24",
    industry: "Robotics",
    totalFunding: "$4M",
    employees: "2-10",
    fundingRounds: [
      { stage: "Seed", amount: "$4M", date: "Jan 2024", investors: ["Y Combinator", "Amplify Partners"] },
    ],
    founders: [
      { name: "Jake Morrison", linkedin: "https://linkedin.com/in/jakemorrison" },
      { name: "Luna Chen", linkedin: "https://linkedin.com/in/lunachen" },
    ],
  },
  {
    id: "8",
    name: "FinStack",
    description: "API-first banking infrastructure for startups. We provide everything founders need to launch financial products - from accounts to payments to lending - in days, not months.",
    longDescription: "Launching financial products traditionally takes 6-12 months of regulatory work, banking partnerships, and infrastructure development. FinStack compresses this to days. Our API-first platform provides everything from accounts and cards to payments and lending—all with built-in compliance. Whether you're embedding payments in your SaaS or launching a neobank, FinStack handles the complexity so you can focus on your product.",
    website: "https://finstack.io",
    tags: ["Fintech", "API", "Banking", "Infrastructure"],
    founded: "2023",
    teamSize: 25,
    location: "New York",
    batch: "S23",
    industry: "Fintech",
    totalFunding: "$35M",
    employees: "11-50",
    fundingRounds: [
      { stage: "Seed", amount: "$5M", date: "Jun 2023", investors: ["Y Combinator", "Ribbit Capital"] },
      { stage: "Series A", amount: "$30M", date: "Mar 2024", investors: ["a]6z", "Stripe"] },
    ],
    founders: [
      { name: "David Park", linkedin: "https://linkedin.com/in/davidpark" },
      { name: "Rachel Cohen", linkedin: "https://linkedin.com/in/rachelcohen" },
    ],
  },
  {
    id: "9",
    name: "SecureAuth",
    description: "Zero-trust authentication platform for modern applications. Our passwordless solution combines biometrics, device trust, and behavioral analytics for unbreakable security.",
    longDescription: "Passwords are the weakest link in security—80% of breaches involve compromised credentials. SecureAuth eliminates passwords entirely with a zero-trust platform combining biometrics, device trust, and behavioral analytics. Our invisible security layer continuously verifies users without friction, stopping account takeovers before they happen. Enterprise-grade security that your users will actually love.",
    website: "https://secureauth.com",
    tags: ["Security", "Authentication", "Enterprise", "B2B"],
    founded: "2023",
    teamSize: 18,
    location: "San Francisco",
    batch: "S23",
    industry: "Security",
    totalFunding: "$20M",
    employees: "11-50",
    fundingRounds: [
      { stage: "Seed", amount: "$4M", date: "Jul 2023", investors: ["Y Combinator", "CRV"] },
      { stage: "Series A", amount: "$16M", date: "Apr 2024", investors: ["Bessemer Venture Partners", "Menlo Ventures"] },
    ],
    founders: [
      { name: "Kevin Zhang", linkedin: "https://linkedin.com/in/kevinzhang" },
      { name: "Aisha Johnson", linkedin: "https://linkedin.com/in/aishajohnson" },
    ],
  },
  {
    id: "10",
    name: "DataBridge",
    description: "Real-time data synchronization for distributed systems. We solve the hardest problems in data consistency, enabling teams to build reliable global applications.",
    longDescription: "Building globally distributed applications with consistent data is one of the hardest problems in software. DataBridge solves it with a real-time sync engine that handles conflict resolution, offline support, and eventual consistency automatically. Our SDK drops into any stack, giving your application the data layer of a world-class distributed system. Used by companies serving millions of users across continents.",
    website: "https://databridge.io",
    tags: ["Data", "Infrastructure", "Developer Tools", "Database"],
    founded: "2023",
    teamSize: 10,
    location: "Austin",
    batch: "W23",
    industry: "Developer Tools",
    totalFunding: "$12M",
    employees: "2-10",
    fundingRounds: [
      { stage: "Seed", amount: "$3M", date: "Feb 2023", investors: ["Y Combinator", "First Round Capital"] },
      { stage: "Series A", amount: "$9M", date: "Dec 2023", investors: ["Accel", "Redpoint Ventures"] },
    ],
    founders: [
      { name: "Chris Anderson", linkedin: "https://linkedin.com/in/chrisanderson" },
      { name: "Maya Singh", linkedin: "https://linkedin.com/in/mayasingh" },
    ],
  },
  {
    id: "11",
    name: "HealthPilot",
    description: "AI-powered health monitoring for chronic conditions. Our wearable device and companion app provide personalized insights and early warning alerts for patients and caregivers.",
    longDescription: "Managing chronic conditions shouldn't mean constant worry. HealthPilot combines an advanced wearable sensor with AI-powered analytics to provide continuous monitoring for conditions like diabetes, heart disease, and COPD. Our platform learns each patient's unique patterns, detecting anomalies early and alerting caregivers before emergencies occur. We're giving patients and families peace of mind with proactive, personalized health management.",
    website: "https://healthpilot.com",
    tags: ["Healthcare", "AI", "Wearables", "Consumer"],
    founded: "2024",
    teamSize: 14,
    location: "Boston",
    batch: "W24",
    industry: "Healthcare",
    totalFunding: "$18M",
    employees: "11-50",
    fundingRounds: [
      { stage: "Seed", amount: "$4M", date: "Jan 2024", investors: ["Y Combinator", "GV"] },
      { stage: "Series A", amount: "$14M", date: "Oct 2024", investors: ["Andreessen Horowitz Bio", "General Catalyst"] },
    ],
    founders: [
      { name: "Dr. Sarah Lin", linkedin: "https://linkedin.com/in/sarahlin" },
      { name: "Mark Thompson", linkedin: "https://linkedin.com/in/markthompson" },
    ],
  },
  {
    id: "12",
    name: "Quantum Sense",
    description: "Quantum computing made accessible. Our platform abstracts the complexity of quantum hardware, letting developers write quantum algorithms in familiar programming languages.",
    longDescription: "Quantum computing promises to solve problems impossible for classical computers—but the barrier to entry is impossibly high. Quantum Sense abstracts away the complexity with a platform that lets any developer write quantum algorithms in Python. Our hybrid runtime automatically optimizes for available quantum hardware, handling error correction and qubit mapping. We're democratizing quantum computing for the next generation of breakthrough applications.",
    website: "https://quantumsense.io",
    tags: ["Quantum Computing", "Developer Tools", "Deep Tech"],
    founded: "2024",
    teamSize: 8,
    location: "Cambridge",
    batch: "S24",
    industry: "Deep Tech",
    totalFunding: "$10M",
    employees: "2-10",
    fundingRounds: [
      { stage: "Seed", amount: "$3M", date: "May 2024", investors: ["Y Combinator", "DCVC"] },
      { stage: "Series A", amount: "$7M", date: "Dec 2024", investors: ["Playground Global", "Future Ventures"] },
    ],
    founders: [
      { name: "Dr. Robert Chen", linkedin: "https://linkedin.com/in/robertchen" },
      { name: "Dr. Anna Kowalski", linkedin: "https://linkedin.com/in/annakowalski" },
    ],
  },
];

export const getRelatedStartups = (startup: StartupFull, allStartups: StartupFull[]): StartupFull[] => {
  return allStartups
    .filter((s) => s.id !== startup.id)
    .filter((s) => 
      s.industry === startup.industry || 
      s.tags.some((tag) => startup.tags.includes(tag))
    )
    .slice(0, 3);
};
