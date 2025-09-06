"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: object) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // This error is expected when called from a Server Component.
            // The client will still work for read-only operations.
          }
        },
        remove(name: string, options: object) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            // This error is expected when called from a Server Component.
            // The client will still work for read-only operations.
          }
        },
      },
    },
  );
}

/**
 * Gets the current authenticated user from Supabase
 * @returns User data or null if not authenticated
 */
export async function getCurrentUser() {
  const supabase = await getSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return null;
  }

  return userData.user;
}

/**
 * Ensures the user is authenticated, throws error if not
 * @returns Authenticated user data
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  return user;
}
