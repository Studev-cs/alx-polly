"use server";

import { Poll } from "@/lib/types";
import { getSupabaseServerClient } from "./shared/supabase-client";

// Helper to process the result from the RPC function
function processPolls(data: any[] | null, error: any): Poll[] {
  if (error) {
    console.error("Error fetching polls via RPC:", error);
    throw new Error("Could not fetch polls: " + error.message);
  }
  // The RPC returns `options` as a JSON field, which is automatically parsed.
  // We ensure that if a poll has no options, the `options` property is an empty array.
  return (data || []).map(p => ({ ...p, options: p.options || [] }));
}

/**
 * Fetches all polls with their options and vote counts using an RPC.
 * Public access - no authentication required
 * @returns Array of polls with vote counts
 */
export async function getPolls(): Promise<Poll[]> {
  console.log("URL SEEN BY SERVER ACTION:", process.env.NEXT_PUBLIC_SUPABASE_URL); 
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_polls_with_details");
  return processPolls(data, error);
}

/**
 * Fetches a specific poll by ID with options and vote counts using an RPC.
 * Public access - no authentication required
 * @param pollId - The poll ID to fetch
 * @returns Poll data or null if not found
 */
export async function getPollById(pollId: string): Promise<Poll | null> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("get_polls_with_details", { p_poll_id: pollId })
    .single();

  if (error) {
    // Don't throw an error if the poll is simply not found; return null as expected.
    if (error.code === 'PGRST116') { // PostgREST code for "The result contains 0 rows"
      return null;
    }
    console.error("Error fetching poll by ID via RPC:", error);
    throw new Error("Could not fetch poll: " + error.message);
  }

  if (!data) {
    return null;
  }

  // The RPC returns a single object, not an array, for `.single()`
  return { ...data, options: data.options || [] };
}

/**
 * Fetches polls created by a specific user using an RPC.
 * @param userId - The user ID to filter by
 * @returns Array of polls created by the user
 */
export async function getPollsByUser(userId: string): Promise<Poll[]> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_polls_with_details", {
    p_user_id: userId,
  });
  return processPolls(data, error);
}
