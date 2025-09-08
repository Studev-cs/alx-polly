import { z } from "zod";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { createPollFormSchema } from "@/lib/validators";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// ============================================================================
// TYPES
// ============================================================================

export type PollInput = z.infer<typeof createPollFormSchema>;

export interface Poll {
  id: string;
  question: string;
  user_id: string;
  starts_at: string | null;
  ends_at: string | null;
  archived: boolean;
}

export interface Option {
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
export class ActionError extends Error {
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
 * Centralizes Supabase client creation and user authentication for API Routes.
 * @throws {ActionError} If authentication fails.
 */
export async function getAuthenticatedContext(): Promise<{
  supabase: SupabaseClient;
  user: User;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      },
    );
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }
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
export function validatePollInput(values: unknown): PollInput {
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
export async function db_insertPoll(
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
export async function db_insertOptions(
  supabase: SupabaseClient,
  pollId: string,
  options: { value: string }[],
): Promise<void> {
  const { error } = await supabase
    .from("options")
    .insert(options.map((opt) => ({ poll_id: pollId, value: opt.value })));

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
export async function db_updatePollDetails(
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
export async function db_updatePollOptions(
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
  const existingValues = new Set(
    existingOptions.map((opt) => opt.value),
  );

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
  const toRemove = existingOptions.filter(
    (opt) => !newValues.has(opt.value),
  );
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("options")
      .delete()
      .in(
        "id",
        toRemove.map((opt) => opt.id),
      );
    if (error) {
      console.error("Error removing old options:", error);
      throw new ActionError("Failed to remove old options.", 500, error);
    }
  }
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