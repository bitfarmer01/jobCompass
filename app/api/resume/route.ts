import { NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";

// Serves the authenticated user's OWN resume from the private bucket. The path
// is derived from the session — a user can never request another user's file,
// and the bucket has no public URL.
export async function GET() {
  try {
    const insforge = await createInsforgeServer();
    const { data: authData, error: authError } =
      await insforge.auth.getCurrentUser();
    const user = authData?.user;
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const { data: blob, error } = await insforge.storage
      .from("resumes")
      .download(`${user.id}/resume.pdf`);

    if (error || !blob) {
      return NextResponse.json(
        { success: false, error: "No resume found" },
        { status: 404 },
      );
    }

    const arrayBuffer = await blob.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="resume.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/resume]", msg);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
