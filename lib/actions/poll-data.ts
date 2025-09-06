"use server";

import { Poll } from "@/lib/types";
import { getSupabaseServerClient } from "./shared/supabase-client";

/**
 * Fetches all polls with their options and vote counts
 * Public access - no authentication required
 * @returns Array of polls with vote counts
 */
export async function getPolls(): Promise<Poll[]> {
  const supabase = await getSupabaseServerClient();

  const { data: polls, error } = await supabase
    .from("polls")
    .select(
      `
        id,
        created_at,
        question,
        starts_at,
        ends_at,
        user_id,
        options (
          id,
          value,
          created_at
        )
      `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching polls:", error);
    throw new Error("Could not fetch polls: " + error.message);
  }

  const formattedPolls: Poll[] = await Promise.all(
    polls.map(async (poll: any) => {
      const optionsWithVotes = await Promise.all(
        poll.options.map(async (option: any) => {
          const { count } = await supabase
            .from("votes")
            .select("", { count: "exact" })
            .eq("option_id", option.id);
          return {
            ...option,
            vote_count: count || 0,
          };
        }),
      );

      return {
        ...poll,
        options: optionsWithVotes,
      };
    }),
  );

  return formattedPolls;
}

/**
 * Fetches a specific poll by ID with options and vote counts
 * Public access - no authentication required
 * @param pollId - The poll ID to fetch
 * @returns Poll data or null if not found
 */
export async function getPollById(pollId: string): Promise<Poll | null> {
  const supabase = await getSupabaseServerClient();

  const { data: poll, error } = await supabase
    .from("polls")
    .select(
      `
        id,
        created_at,
        question,
        starts_at,
        ends_at,
        user_id,
        options (
          id,
          value,
          created_at
        )
      `,
    )
    .eq("id", pollId)
    .single();

  if (error) {
    console.error("Error fetching poll by ID:", error);
    throw new Error("Could not fetch poll: " + error.message);
  }

  if (!poll) {
    return null;
  }

  const optionsWithVotes = await Promise.all(
    poll.options.map(async (option: any) => {
      const { count } = await supabase
        .from("votes")
        .select("", { count: "exact" })
        .eq("option_id", option.id);
      return {
        ...option,
        vote_count: count || 0,
      };
    }),
  );

  const formattedPoll: Poll = {
    ...poll,
    options: optionsWithVotes,
  };

  return formattedPoll;
}

/**
 * Fetches polls created by a specific user
 * @param userId - The user ID to filter by
 * @returns Array of polls created by the user
 */
export async function getPollsByUser(userId: string): Promise<Poll[]> {
  const supabase = await getSupabaseServerClient();

  const { data: polls, error } = await supabase
    .from("polls")
    .select(
      `
        id,
        created_at,
        question,
        starts_at,
        ends_at,
        user_id,
        options (
          id,
          value,
          created_at
        )
      `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user polls:", error);
    throw new Error("Could not fetch user polls: " + error.message);
  }

  const formattedPolls: Poll[] = await Promise.all(
    polls.map(async (poll: any) => {
      const optionsWithVotes = await Promise.all(
        poll.options.map(async (option: any) => {
          const { count } = await supabase
            .from("votes")
            .select("", { count: "exact" })
            .eq("option_id", option.id);
          return {
            ...option,
            vote_count: count || 0,
          };
        }),
      );

      return {
        ...poll,
        options: optionsWithVotes,
      };
    }),
  );

  return formattedPolls;
}