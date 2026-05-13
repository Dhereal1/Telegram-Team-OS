type NamedUser = {
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export function formatPersonName(user: NamedUser | null | undefined) {
  if (!user) return "Unassigned";
  if (user.username) return `@${user.username}`;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || "Unknown user";
}

export function formatShortDate(input: string | Date | null | undefined) {
  if (!input) return "No due date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(input));
}

export function formatDateTime(input: string | Date | null | undefined) {
  if (!input) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(input));
}

export function formatRelativeTime(input: string | Date) {
  const now = Date.now();
  const target = new Date(input).getTime();
  const diffMinutes = Math.round((target - now) / 60000);
  const absMinutes = Math.abs(diffMinutes);

  if (absMinutes < 1) return "just now";
  if (absMinutes < 60) return diffMinutes < 0 ? `${absMinutes}m ago` : `in ${absMinutes}m`;

  const diffHours = Math.round(diffMinutes / 60);
  const absHours = Math.abs(diffHours);
  if (absHours < 24) return diffHours < 0 ? `${absHours}h ago` : `in ${absHours}h`;

  const diffDays = Math.round(diffHours / 24);
  const absDays = Math.abs(diffDays);
  if (absDays < 7) return diffDays < 0 ? `${absDays}d ago` : `in ${absDays}d`;

  return formatShortDate(input);
}

export function formatTaskStatus(status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED") {
  return {
    TODO: "To do",
    IN_PROGRESS: "In progress",
    BLOCKED: "Blocked",
    DONE: "Done",
    CANCELED: "Canceled",
  }[status];
}

export function formatPriority(priority: "LOW" | "NORMAL" | "HIGH" | "URGENT") {
  return {
    LOW: "Low",
    NORMAL: "Normal",
    HIGH: "High",
    URGENT: "Urgent",
  }[priority];
}

export function getDueState(dueAt: string | Date | null | undefined) {
  if (!dueAt) return { tone: "neutral", label: "No due date" } as const;
  const due = new Date(dueAt).getTime();
  const diffHours = (due - Date.now()) / 3600000;

  if (diffHours < 0) return { tone: "danger", label: `Overdue ${formatRelativeTime(dueAt)}` } as const;
  if (diffHours <= 24) return { tone: "warn", label: `Due ${formatRelativeTime(dueAt)}` } as const;
  return { tone: "neutral", label: `Due ${formatShortDate(dueAt)}` } as const;
}

export function humanizeActivityAction(action: string) {
  return {
    "task.created": "created a task",
    "task.updated": "updated a task",
    "task.assigned": "assigned a task",
    "task.status_changed": "changed task status",
    "task.archived": "archived a task",
    "report.submitted": "submitted a report",
    "report.reviewed": "reviewed a report",
    "telegram.webhook_received": "used Telegram",
  }[action] ?? action.replaceAll(".", " ");
}
