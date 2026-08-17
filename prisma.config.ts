import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations run over DIRECT_URL (session pooler / direct connection). The
// transaction pooler in DATABASE_URL multiplexes statements across backends,
// which breaks the advisory locks and session state `prisma migrate` needs.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
