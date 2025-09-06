"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SupabaseClient, User } from "@supabase/supabase-js";

import { createPollFormSchema } from "@/lib/validators";
import { getSupabaseServerClient, requireAuth } from "./shared/supabase-client";

// ============================================================================
// TYPES
// ============================================================================

type PollInput = z.infer<typeof createPollFormSchema>;

interface Poll {
  id: string;
  question: string;
  user_id: string;
  starts_at: string | null;
  ends_at: string | null;
  archived: boolean;
}

interface Option {
  id: string;
  value: string;
  poll_id: string;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Custom error class for server actions to standardize error responses.
 */
class ActionError extends Error {
  constructor(
    public message: string,
    public code?: number,
    public details?: Record<string, any> | Error | z.ZodError,
  ) {
    super(message);
    this.name = "ActionError";
  }
}

// ============================================================================
// CONTEXT & VALIDATION
// ============================================================================

/**
 * Centralizes Supabase client creation and user authentication.
 * @throws {ActionError} If authentication fails.
 */
async function getAuthenticatedContext(): Promise<{
  supabase: SupabaseClient;
  user: User;
}> {
  try {
    const user = await requireAuth();
    const supabase = await getSupabaseServerClient();
    return { supabase, user };
  } catch (error) {
    throw new ActionError("Authentication required", 401, error as Error);
  }
}

/**
 * Encapsulates and validates poll input data.
 * @param values - The raw form input.
 * @returns The validated poll data.
 * @throws {Error} If validation fails, with a JSON stringified payload.
 */
function validatePollInput(values: unknown): PollInput {
  const validationResult = createPollFormSchema.safeParse(values);
  if (!validationResult.success) {
    const errorPayload = {
      isValidationError: true,
      details: validationResult.error.flatten().fieldErrors,
    };
    // Throw a plain error with a JSON string for client-side parsing.
    throw new Error(JSON.stringify(errorPayload));
  }
  return validationResult.data;
}

// ============================================================================
// DATABASE OPERATIONS (MODULARIZED)
// ============================================================================

/**
 * Inserts a new poll into the database.
 */
async function db_insertPoll(
  supabase: SupabaseClient,
  pollData: Pick<Poll, "question" | "user_id" | "starts_at" | "ends_at">,
): Promise<Pick<Poll, "id">> {
  const { data: poll, error } = await supabase
    .from("polls")
    .insert(pollData)
    .select("id")
    .single();

  if (error || !poll) {
    console.error("Error inserting poll:", error);
    throw new ActionError("Failed to create poll in database.", 500, error);
  }
  return poll;
}

/**
 * Inserts poll options into the database.
 */
async function db_insertOptions(
  supabase: SupabaseClient,
  pollId: string,
  options: { value: string }[],
): Promise<void> {
  const { error } = await supabase.from("options").insert(
    options.map((opt) => ({ poll_id: pollId, value: opt.value })),
  );

  if (error) {
    console.error("Error inserting options:", error);
    // Clean up the created poll if options fail
    await supabase.from("polls").delete().eq("id", pollId);
    throw new ActionError("Failed to create poll options.", 500, error);
  }
}

/**
 * Updates an existing poll's details.
 */
async function db_updatePollDetails(
  supabase: SupabaseClient,
  pollId: string,
  userId: string,
  data: Pick<Poll, "question" | "starts_at" | "ends_at">,
) {
  const { error } = await supabase
    .from("polls")
    .update(data)
    .eq("id", pollId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating poll details:", error);
    throw new ActionError("Failed to update poll details.", 500, error);
  }
}

/**
 * Manages poll options during an update, adding new ones and removing old ones.
 */
async function db_updatePollOptions(
  supabase: SupabaseClient,
  pollId: string,
  newOptions: { value: string }[],
) {
  const { data: existingOptions, error: fetchError } = await supabase
    .from("options")
    .select("id, value")
    .eq("poll_id", pollId);

  if (fetchError) {
    console.error("Error fetching existing options:", fetchError);
    throw new ActionError("Failed to fetch existing options.", 500, fetchError);
  }

  const newValues = new Set(newOptions.map((opt) => opt.value));
  const existingValues = new Set(existingOptions.map((opt) => opt.value));

  // Add options
  const toAdd = newOptions.filter((opt) => !existingValues.has(opt.value));
  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("options")
      .insert(toAdd.map((opt) => ({ poll_id: pollId, value: opt.value })));
    if (error) {
      console.error("Error adding new options:", error);
      throw new ActionError("Failed to add new options.", 500, error);
    }
  }

  // Remove options
  const toRemove = existingOptions.filter((opt) => !newValues.has(opt.value));
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("options")
      .delete()
      .in("id", toRemove.map((opt) => opt.id));
    if (error) {
      console.error("Error removing old options:", error);
      throw new ActionError("Failed to remove old options.", 500, error);
    }
  }
}

// ============================================================================
// PUBLIC SERVER ACTIONS
// ============================================================================

/**
 * Creates a new poll with options.
 * Requires authentication.
 * @param values - Poll form data.
 */
export async function createPoll(values: PollInput): Promise<void> {
  const { question, options, starts_at, ends_at } = validatePollInput(values);
  const { supabase, user } = await getAuthenticatedContext();

  const poll = await db_insertPoll(supabase, {
    question,
    user_id: user.id,
    starts_at: starts_at || null,
    ends_at: ends_at || null,
  });

  await db_insertOptions(supabase, poll.id, options);

  revalidatePath("/polls");
  redirect("/polls");
}

/**
 * Updates an existing poll.
 * Requires authentication and poll ownership.
 * @param pollId - ID of the poll to update.
 * @param values - Updated poll data.
 */
export async function editPoll(pollId: string, values: PollInput): Promise<void> {
  const { question, options, starts_at, ends_at } = validatePollInput(values);
  const { supabase, user } = await getAuthenticatedContext();

  await db_updatePollDetails(supabase, pollId, user.id, {
    question,
    starts_at: starts_at || null,
    ends_at: ends_at || null,
  });

  await db_updatePollOptions(supabase, pollId, options);

  revalidatePath("/polls");
  redirect("/polls");
}

/**
 * Deletes a poll and all associated data.
 * Requires authentication and poll ownership.
 * @param pollId - ID of the poll to delete.
 */
export async function deletePoll(pollId: string): Promise<void> {
  const { supabase, user } = await getAuthenticatedContext();
  const { error } = await supabase
    .from("polls")
    .delete()
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting poll:", error);
    throw new ActionError("Failed to delete poll.", 500, error);
  }

  revalidatePath("/polls");
  redirect("/polls");
}

/**
 * Duplicates an existing poll.
 * Creates a copy of the poll with new timestamps.
 * @param pollId - ID of the poll to duplicate.
 * @param newQuestion - Optional new question for the duplicated poll.
 * @returns The ID of the new poll.
 */
export async function duplicatePoll(
  pollId: string,
  newQuestion?: string,
): Promise<string> {
  const { supabase, user } = await getAuthenticatedContext();

  const { data: originalPoll, error: fetchError } = await supabase
    .from("polls")
    .select("question, options (value)")
    .eq("id", pollId)
    .single<{ question: string; options: { value: string }[] }>();

  if (fetchError || !originalPoll) {
    throw new ActionError(
      "Could not fetch original poll for duplication.",
      404,
      fetchError,
    );
  }

  const duplicatedPoll = await db_insertPoll(supabase, {
    question: newQuestion || `Copy of ${originalPoll.question}`,
    user_id: user.id,
    starts_at: null,
    ends_at: null,
  });

  if (originalPoll.options && originalPoll.options.length > 0) {
    await db_insertOptions(
      supabase,
      duplicatedPoll.id,
      originalPoll.options,
    );
  }

  return duplicatedPoll.id;
}

/**
 * Archives a poll (soft delete).
 * @param pollId - ID of the poll to archive.
 */
export async function archivePoll(pollId: string): Promise<void> {
  const { supabase, user } = await getAuthenticatedContext();
  const { error } = await supabase
    .from("polls")
    .update({ archived: true })
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error archiving poll:", error);
    throw new ActionError("Failed to archive poll.", 500, error);
  }

  revalidatePath("/polls");
}

/**
 * Restores an archived poll.
 * @param pollId - ID of the poll to restore.
 */
export async function restorePoll(pollId: string): Promise<void> {
  const { supabase, user } = await getAuthenticatedContext();
  const { error } = await supabase
    .from("polls")
    .update({ archived: false })
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error restoring poll:", error);
    throw new ActionError("Failed to restore poll.", 500, error);
  }

  revalidatePath("/polls");
}

/**
 * Validates that a user owns a specific poll.
 * @param pollId - Poll ID to check.
 * @param userId - Optional user ID to verify against. If not provided, authenticates the current user.
 * @returns Boolean indicating ownership.
 */
export async function validatePollOwnership(
  pollId: string,
  userId?: string,
): Promise<boolean> {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    const effectiveUserId = userId || user.id;

    const { data: poll, error } = await supabase
      .from("polls")
      .select("user_id")
      .eq("id", pollId)
      .single();

    if (error || !poll) {
      return false;
    }

    return poll.user_id === effectiveUserId;
  } catch (error) {
    // If authentication fails (e.g., no user), they can't be the owner.
    if (error instanceof ActionError && error.code === 401) {
      return false;
    }
    // Re-throw other unexpected errors
    throw error;
  }
}
