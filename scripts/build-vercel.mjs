import { execSync } from "node:child_process";

const dbUrl = process.env.DATABASE_URL ?? "";
const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");
const genCmd = isPostgres
  ? "npx prisma generate --schema=prisma/schema.postgres.prisma"
  : "npx prisma generate";

execSync(genCmd, { stdio: "inherit" });
execSync("npx next build", { stdio: "inherit" });
