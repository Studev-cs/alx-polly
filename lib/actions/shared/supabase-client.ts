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
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: object) {
          cookieStore.set({ name, value: "", ...options });
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
