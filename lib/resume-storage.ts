import { createInsforgeServer } from "@/lib/insforge-server";

type InsforgeServer = Awaited<ReturnType<typeof createInsforgeServer>>;

export const RESUME_BUCKET = "resumes";

export const resumePath = (userId: string): string => `${userId}/resume.pdf`;

// SDK v1.3.1 has no upsert option — overwrite is remove-then-upload. remove()
// throws when the file doesn't exist (first write), so it is guarded here, once,
// for every caller.
export async function overwriteResume(
  insforge: InsforgeServer,
  userId: string,
  file: File | Blob,
): Promise<{ error: string | null }> {
  const bucket = insforge.storage.from(RESUME_BUCKET);
  const path = resumePath(userId);

  try {
    await bucket.remove(path);
  } catch {
    // Nothing to remove — first write for this user.
  }

  const { error } = await bucket.upload(path, file);
  return { error: error ? error.message : null };
}
