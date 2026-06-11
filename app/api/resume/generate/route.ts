import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { generateResumeContent } from "@/agent/resume-generator";
import { createInsforgeServer } from "@/lib/insforge-server";
import { createPostHogServer } from "@/lib/posthog-server";
import { renderResumePdfBuffer } from "@/lib/resume-pdf";
import { overwriteResume, resumePath } from "@/lib/resume-storage";
import type { Profile } from "@/types";

// Analytics must never decide the response — capture failures are logged and
// swallowed so a PostHog outage can't fail a generation that succeeded.
async function captureResumeGenerated(userId: string, success: boolean) {
  try {
    const posthog = createPostHogServer();
    posthog.capture({
      distinctId: userId,
      event: "resume_generated",
      properties: { userId, success },
    });
    await posthog.shutdown();
  } catch (err) {
    console.error("[api/resume/generate] posthog:", err);
  }
}

export async function POST() {
  try {
    const insforge = await createInsforgeServer();
    const { data: authData, error: authError } =
      await insforge.auth.getCurrentUser();
    const user = authData?.user;

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } = await insforge.database
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found. Please complete your profile first." },
        { status: 422 },
      );
    }

    if (!profile.full_name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Please add your name to your profile before generating a resume." },
        { status: 422 },
      );
    }

    const result = await generateResumeContent(profile as Profile);

    if (!result.success || !result.data) {
      await captureResumeGenerated(user.id, false);
      return NextResponse.json(
        { success: false, error: result.error ?? "Failed to generate resume content." },
        { status: 500 },
      );
    }

    const buffer = await renderResumePdfBuffer(profile as Profile, result.data);

    // Wrap in Uint8Array to satisfy BlobPart's ArrayBufferView<ArrayBuffer> constraint
    const blob = new Blob([new Uint8Array(buffer)], { type: "application/pdf" });

    const { error: uploadError } = await overwriteResume(insforge, user.id, blob);
    if (uploadError) {
      console.error("[api/resume/generate] upload failed:", uploadError);
      // The previous file (if any) was already removed by the overwrite — clear
      // the stale pointer so the profile never references a missing file.
      await insforge.database
        .from("profiles")
        .update({ resume_pdf_url: null })
        .eq("id", user.id);
      revalidatePath("/profile");
      await captureResumeGenerated(user.id, false);
      return NextResponse.json(
        { success: false, error: "Failed to save the generated resume. Please try again." },
        { status: 500 },
      );
    }

    const { error: updateError } = await insforge.database
      .from("profiles")
      .update({ resume_pdf_url: resumePath(user.id) })
      .eq("id", user.id);

    if (updateError) {
      // The PDF is in storage but the profile may not reference it (NULL for a
      // first-time generation) — report failure so the user retries; the retry
      // overwrites the file and repairs the pointer.
      console.error("[api/resume/generate] profile update failed:", updateError);
      await captureResumeGenerated(user.id, false);
      return NextResponse.json(
        { success: false, error: "Resume was generated but could not be saved to your profile. Please try again." },
        { status: 500 },
      );
    }

    revalidatePath("/profile");
    await captureResumeGenerated(user.id, true);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/resume/generate]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
