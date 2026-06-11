import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

import { extractProfileFromResume } from "@/agent/extractor";
import { createInsforgeServer } from "@/lib/insforge-server";
import { createPostHogServer } from "@/lib/posthog-server";
import { RESUME_BUCKET, resumePath } from "@/lib/resume-storage";

const MIN_TEXT_LENGTH = 100;

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

    const { data: blob, error: downloadError } = await insforge.storage
      .from(RESUME_BUCKET)
      .download(resumePath(user.id));

    if (downloadError || !blob) {
      return NextResponse.json(
        { success: false, error: "No resume found. Please upload a PDF first." },
        { status: 404 },
      );
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    let text = "";
    try {
      const parser = new PDFParse({ data: buffer });
      const pdfData = await parser.getText();
      text = pdfData.text?.trim() ?? "";
    } catch (parseErr) {
      console.error("[api/resume/extract] pdf parse failed:", parseErr);
      return NextResponse.json(
        { success: false, error: "Could not extract text from this PDF. Please try a different file." },
        { status: 422 },
      );
    }

    if (text.length < MIN_TEXT_LENGTH) {
      return NextResponse.json(
        { success: false, error: "Could not extract text from this PDF. Please try a different file." },
        { status: 422 },
      );
    }

    const result = await extractProfileFromResume(text);

    const posthog = createPostHogServer();
    const fieldsExtracted = result.data
      ? Object.values(result.data).filter((v) =>
          Array.isArray(v) ? v.length > 0 : v !== "" && v !== null && v !== undefined,
        ).length
      : 0;
    posthog.capture({
      distinctId: user.id,
      event: "resume_extracted",
      properties: {
        userId: user.id,
        success: result.success,
        fields_extracted: fieldsExtracted,
      },
    });
    await posthog.shutdown();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[api/resume/extract]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
