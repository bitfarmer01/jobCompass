import { NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { RESUME_BUCKET, resumePath } from "@/lib/resume-storage";

// Serves the authenticated user's OWN resume from the private bucket. The path
// is derived from the session — a user can never request another user's file,
// and the bucket has no public URL. `?download=1` switches from inline preview
// to a file download (Content-Disposition: attachment).
export async function GET(request: Request) {
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
      .from(RESUME_BUCKET)
      .download(resumePath(user.id));

    if (error || !blob) {
      return NextResponse.json(
        { success: false, error: "No resume found" },
        { status: 404 },
      );
    }

    const isDownload =
      new URL(request.url).searchParams.get("download") === "1";

    const arrayBuffer = await blob.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="resume.pdf"`,
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
