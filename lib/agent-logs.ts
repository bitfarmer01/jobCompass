import { createInsforgeServer } from "@/lib/insforge-server";

export type AgentLogLevel = "info" | "success" | "warning" | "error";

export type AgentLogEntry = {
  runId: string;
  userId: string;
  message: string; // human readable — feeds the dashboard recent-activity feed
  level: AgentLogLevel;
  jobId?: string;
};

// Best-effort write to agent_logs. Logging must never crash or fail a run, so
// every failure is swallowed after a console.error.
export async function logAgent(entry: AgentLogEntry): Promise<void> {
  try {
    const insforge = await createInsforgeServer();
    const { error } = await insforge.database.from("agent_logs").insert([
      {
        run_id: entry.runId,
        user_id: entry.userId,
        message: entry.message,
        level: entry.level,
        job_id: entry.jobId ?? null,
      },
    ]);
    if (error) throw error;
  } catch (err) {
    console.error("[lib/agent-logs]", err);
  }
}
