import { TeamTable } from "@/components/dashboard/team-table";
import { TeamScores } from "@/components/dashboard/team-scores";

export default function TeamPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">Members, roles, and access control (Telegram-first).</p>
      </div>
      <TeamTable />
      <div className="pt-2">
        <h2 className="text-lg font-semibold tracking-tight">Performance — last 7 days</h2>
      </div>
      <TeamScores />
    </div>
  );
}
