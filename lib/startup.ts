import "server-only";

import validateEnv from "@/lib/env";

export function runStartupChecks() {
  // Next.js doesn't have a single universal "startup hook" for App Router.
  // For Node.js runtime deployments, prefer wiring env validation in `instrumentation.ts`
  // so misconfiguration fails loud and early.
  validateEnv();
  console.log("Startup checks: env ok");
}

