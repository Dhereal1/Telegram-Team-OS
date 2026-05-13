import { TasksTable } from "@/components/dashboard/tasks-table";

export default function TasksPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">Operator-grade task execution with accountability.</p>
      </div>
      <TasksTable />
    </div>
  );
}

