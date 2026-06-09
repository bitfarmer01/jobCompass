import { createInsforgeServer } from "@/lib/insforge-server";

export type CurrentUser = {
  id: string;
  email: string;
  name?: string;
};

// Server-side identity read for the navbar / app shell. The proxy refreshes the
// access token on every request, so reading it here succeeds without a write —
// any failure (incl. a refresh attempt that can't set cookies in a Server
// Component) degrades to logged-out rather than crashing the render.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const insforge = await createInsforgeServer();
    const { data, error } = await insforge.auth.getCurrentUser();
    const user = data?.user;
    if (error || !user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.profile?.name,
    };
  } catch {
    return null;
  }
}
