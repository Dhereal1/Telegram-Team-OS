export const dynamic = "force-dynamic";

export async function GET() {
  // Liveness: no external dependencies, just confirms the process is running.
  return Response.json({ status: "ok", ts: Date.now() });
}

