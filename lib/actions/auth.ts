"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "./shared/supabase-client";

/**
 * Signs out the current user
 * Clears session and redirects to sign-in page
 */
export async function signOutAction(): Promise<void> {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/signin");
}

/**
 * Gets the current user session info
 * Returns user data if authenticated, null otherwise
 */
export async function getCurrentSession() {
  const supabase = await getSupabaseServerClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error("Error getting session:", error);
    return null;
  }

  return session;
}

/**
 * Refreshes the current user session
 * Useful for ensuring tokens are up to date
 */
export async function refreshSession() {
  const supabase = await getSupabaseServerClient();
  const { data: { session }, error } = await supabase.auth.refreshSession();

  if (error) {
    console.error("Error refreshing session:", error);
    return null;
  }

  return session;
}
