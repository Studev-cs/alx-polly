"use server";

import { revalidatePath } from "next/cache";
import { castVoteFormSchema } from "@/lib/validators";
import { getSupabaseServerClient, getCurrentUser } from "./shared/supabase-client";

/**
 * Casts a vote for a specific poll option
 * Requires authentication and validates poll timing
 * @param _prevState - Previous form state (for useActionState)
 * @param formData - Form data containing optionId and pollId
 */
export async function castVote(
  _prevState: {
    error?: string;
    success?: boolean;
    message?: string;
    errors?: { [key: string]: string[] };
  } | null,
  formData: FormData,
) {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: "User not authenticated.",
    };
  }

  const validatedFields = castVoteFormSchema.safeParse({
    optionId: formData.get("optionId"),
    pollId: formData.get("pollId"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to cast vote.",
    };
  }

  const { optionId, pollId } = validatedFields.data;

  try {
    // Check if the user has already voted in this poll
    const { data: existingVote, error: existingVoteError } = await supabase
      .from("votes")
      .select("id")
      .eq("user_id", user.id)
      .eq("poll_id", pollId)
      .single();

    if (existingVoteError && existingVoteError.code !== "PGRST116") {
      // PGRST116 is 'No rows found'
      throw new Error(existingVoteError.message);
    }

    if (existingVote) {
      return { error: "You have already voted in this poll." };
    }

    // Check if the poll is active
    const { data: pollData, error: pollError } = await supabase
      .from("polls")
      .select("starts_at, ends_at")
      .eq("id", pollId)
      .single();

    if (pollError || !pollData) {
      throw new Error("Poll not found.");
    }

    const now = new Date();
    const startsAt = pollData.starts_at ? new Date(pollData.starts_at) : null;
    const endsAt = pollData.ends_at ? new Date(pollData.ends_at) : null;

    if (startsAt && now < startsAt) {
      return { error: "This poll has not started yet." };
    }
    if (endsAt && now > endsAt) {
      return { error: "This poll has already ended." };
    }

    const { error } = await supabase.from("votes").insert({
      option_id: optionId,
      user_id: user.id,
      poll_id: pollId,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(`/polls/${pollId}`);
    return { success: true, message: "Vote cast successfully!" };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "An unknown error occurred.",
    };
  }
}

/**
 * Checks if a user has voted in a specific poll
 * @param pollId - The poll ID to check
 * @param userId - Optional user ID (defaults to current user)
 * @returns Boolean indicating if user has voted
 */
export async function hasUserVoted(
  pollId: string,
  userId?: string,
): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  const user = userId ? { id: userId } : await getCurrentUser();

  if (!user) {
    return false;
  }

  const { data: vote, error } = await supabase
    .from("votes")
    .select("id")
    .eq("user_id", user.id)
    .eq("poll_id", pollId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error checking user vote:", error);
    return false;
  }

  return !!vote;
}

/**
 * Gets the option that a user voted for in a specific poll
 * @param pollId - The poll ID to check
 * @param userId - Optional user ID (defaults to current user)
 * @returns The option ID the user voted for, or null
 */
export async function getUserVote(
  pollId: string,
  userId?: string,
): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  const user = userId ? { id: userId } : await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data: vote, error } = await supabase
    .from("votes")
    .select("option_id")
    .eq("user_id", user.id)
    .eq("poll_id", pollId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching user vote:", error);
    return null;
  }

  return vote?.option_id || null;
}

/**
 * Removes a user's vote from a poll (if allowed)
 * @param pollId - The poll ID to remove vote from
 * @returns Success/error response
 */
export async function removeVote(pollId: string) {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: "User not authenticated.",
    };
  }

  try {
    // Check if poll allows vote changes (you might want to add this logic)
    const { data: pollData, error: pollError } = await supabase
      .from("polls")
      .select("starts_at, ends_at")
      .eq("id", pollId)
      .single();

    if (pollError || !pollData) {
      throw new Error("Poll not found.");
    }

    const now = new Date();
    const endsAt = pollData.ends_at ? new Date(pollData.ends_at) : null;

    if (endsAt && now > endsAt) {
      return { error: "Cannot change vote after poll has ended." };
    }

    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("user_id", user.id)
      .eq("poll_id", pollId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(`/polls/${pollId}`);
    return { success: true, message: "Vote removed successfully!" };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "An unknown error occurred.",
    };
  }
}

/**
 * Changes a user's vote to a different option
 * @param pollId - The poll ID
 * @param newOptionId - The new option to vote for
 * @returns Success/error response
 */
export async function changeVote(pollId: string, newOptionId: string) {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: "User not authenticated.",
    };
  }

  try {
    // Check if poll allows vote changes
    const { data: pollData, error: pollError } = await supabase
      .from("polls")
      .select("starts_at, ends_at")
      .eq("id", pollId)
      .single();

    if (pollError || !pollData) {
      throw new Error("Poll not found.");
    }

    const now = new Date();
    const endsAt = pollData.ends_at ? new Date(pollData.ends_at) : null;

    if (endsAt && now > endsAt) {
      return { error: "Cannot change vote after poll has ended." };
    }

    // Update the existing vote
    const { error } = await supabase
      .from("votes")
      .update({ option_id: newOptionId })
      .eq("user_id", user.id)
      .eq("poll_id", pollId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(`/polls/${pollId}`);
    return { success: true, message: "Vote changed successfully!" };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "An unknown error occurred.",
    };
  }
}

/**
 * Gets voting statistics for a user
 * @param userId - Optional user ID (defaults to current user)
 * @returns User voting statistics
 */
export async function getUserVotingStats(userId?: string) {
  const supabase = await getSupabaseServerClient();
  const user = userId ? { id: userId } : await getCurrentUser();

  if (!user) {
    return null;
  }

  try {
    // Get total votes by user
    const { count: totalVotes, error: votesError } = await supabase
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (votesError) {
      throw new Error(votesError.message);
    }

    // Get votes with poll info for more detailed stats
    const { data: votesWithPolls, error: detailedError } = await supabase
      .from("votes")
      .select(
        `
        id,
        created_at,
        polls (
          id,
          question,
          created_at
        )
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (detailedError) {
      throw new Error(detailedError.message);
    }

    return {
      totalVotes: totalVotes || 0,
      recentVotes: votesWithPolls || [],
    };
  } catch (error) {
    console.error("Error fetching user voting stats:", error);
    return null;
  }
}
