"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPollFormSchema } from "@/lib/validators";
import { getSupabaseServerClient, requireAuth } from "./shared/supabase-client";

const formSchema = createPollFormSchema;

/**
 * Creates a new poll with options
 * Requires authentication
 * @param values - Poll form data
 */
export async function createPoll(
  values: z.infer<typeof formSchema>,
): Promise<void> {
  const validatedFields = formSchema.safeParse(values);

  if (!validatedFields.success) {
    throw new Error(
      JSON.stringify(validatedFields.error.flatten().fieldErrors),
    );
  }

  const user = await requireAuth();
  const supabase = await getSupabaseServerClient();

  const { data: poll, error } = await supabase
    .from("polls")
    .insert({
      question: validatedFields.data.question,
      user_id: user.id,
      starts_at: validatedFields.data.starts_at || null,
      ends_at: validatedFields.data.ends_at || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating poll:", error);
    throw new Error("Could not create poll: " + error.message);
  }

  const { error: optionsError } = await supabase.from("options").insert(
    validatedFields.data.options.map((option) => ({
      poll_id: poll.id,
      value: option.value,
    })),
  );

  if (optionsError) {
    console.error("Error creating options:", optionsError);
    throw new Error("Could not create poll options: " + optionsError.message);
  }

  revalidatePath("/polls");
  redirect("/polls");
}

/**
 * Updates an existing poll
 * Requires authentication and poll ownership
 * @param pollId - ID of poll to update
 * @param values - Updated poll data
 */
export async function editPoll(
  pollId: string,
  values: z.infer<typeof formSchema>,
): Promise<void> {
  const validatedFields = formSchema.safeParse(values);

  if (!validatedFields.success) {
    throw new Error(
      JSON.stringify(validatedFields.error.flatten().fieldErrors),
    );
  }

  const user = await requireAuth();
  const supabase = await getSupabaseServerClient();

  // Update poll details
  const { error: pollUpdateError } = await supabase
    .from("polls")
    .update({
      question: validatedFields.data.question,
      starts_at: validatedFields.data.starts_at || null,
      ends_at: validatedFields.data.ends_at || null,
    })
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (pollUpdateError) {
    console.error("Error updating poll:", pollUpdateError);
    throw new Error("Could not update poll: " + pollUpdateError.message);
  }

  // Handle options: fetch existing, determine additions/deletions/updates
  const { data: existingOptions, error: fetchOptionsError } = await supabase
    .from("options")
    .select("id, value")
    .eq("poll_id", pollId);

  if (fetchOptionsError) {
    console.error("Error fetching existing options:", fetchOptionsError);
    throw new Error(
      "Could not fetch existing options: " + fetchOptionsError.message,
    );
  }

  const currentOptionValues = new Set(
    validatedFields.data.options.map((opt) => opt.value),
  );
  const existingOptionValues = new Set(existingOptions.map((opt) => opt.value));

  // Options to add
  const optionsToAdd = validatedFields.data.options.filter(
    (opt) => !existingOptionValues.has(opt.value),
  );

  if (optionsToAdd.length > 0) {
    const { error: addError } = await supabase.from("options").insert(
      optionsToAdd.map((opt) => ({
        poll_id: pollId,
        value: opt.value,
      })),
    );
    if (addError) {
      console.error("Error adding new options:", addError);
      throw new Error("Could not add new options: " + addError.message);
    }
  }

  // Options to remove
  const optionsToRemove = existingOptions.filter(
    (opt) => !currentOptionValues.has(opt.value),
  );

  if (optionsToRemove.length > 0) {
    const { error: removeError } = await supabase
      .from("options")
      .delete()
      .in(
        "id",
        optionsToRemove.map((opt) => opt.id),
      );
    if (removeError) {
      console.error("Error removing options:", removeError);
      throw new Error("Could not remove options: " + removeError.message);
    }
  }

  revalidatePath("/polls");
  redirect("/polls");
}

/**
 * Deletes a poll and all associated data
 * Requires authentication and poll ownership
 * @param pollId - ID of poll to delete
 */
export async function deletePoll(pollId: string): Promise<void> {
  const user = await requireAuth();
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("polls")
    .delete()
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting poll:", error);
    throw new Error("Could not delete poll: " + error.message);
  }

  revalidatePath("/polls");
  redirect("/polls");
}

/**
 * Duplicates an existing poll
 * Creates a copy of the poll with new timestamps
 * @param pollId - ID of poll to duplicate
 * @param newQuestion - Optional new question for the duplicated poll
 */
export async function duplicatePoll(
  pollId: string,
  newQuestion?: string,
): Promise<string> {
  const user = await requireAuth();
  const supabase = await getSupabaseServerClient();

  // First, get the original poll
  const { data: originalPoll, error: fetchError } = await supabase
    .from("polls")
    .select(
      `
      question,
      starts_at,
      ends_at,
      options (value)
    `,
    )
    .eq("id", pollId)
    .single();

  if (fetchError || !originalPoll) {
    throw new Error("Could not fetch original poll for duplication");
  }

  // Create the new poll
  const { data: newPoll, error: createError } = await supabase
    .from("polls")
    .insert({
      question: newQuestion || `Copy of ${originalPoll.question}`,
      user_id: user.id,
      starts_at: null, // Reset timestamps for the copy
      ends_at: null,
    })
    .select()
    .single();

  if (createError) {
    console.error("Error creating duplicated poll:", createError);
    throw new Error("Could not create poll duplicate: " + createError.message);
  }

  // Create the options for the new poll
  if (originalPoll.options && originalPoll.options.length > 0) {
    const { error: optionsError } = await supabase.from("options").insert(
      originalPoll.options.map((option: any) => ({
        poll_id: newPoll.id,
        value: option.value,
      })),
    );

    if (optionsError) {
      console.error("Error creating options for duplicated poll:", optionsError);
      // Clean up the poll if options failed
      await supabase.from("polls").delete().eq("id", newPoll.id);
      throw new Error("Could not create options for poll duplicate: " + optionsError.message);
    }
  }

  return newPoll.id;
}

/**
 * Archives a poll (soft delete)
 * Sets an archived flag instead of deleting the poll
 * @param pollId - ID of poll to archive
 */
export async function archivePoll(pollId: string): Promise<void> {
  const user = await requireAuth();
  const supabase = await getSupabaseServerClient();

  // Note: This assumes you have an 'archived' column in your polls table
  // If not, this would need to be implemented differently
  const { error } = await supabase
    .from("polls")
    .update({ archived: true })
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error archiving poll:", error);
    throw new Error("Could not archive poll: " + error.message);
  }

  revalidatePath("/polls");
}

/**
 * Restores an archived poll
 * @param pollId - ID of poll to restore
 */
export async function restorePoll(pollId: string): Promise<void> {
  const user = await requireAuth();
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("polls")
    .update({ archived: false })
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error restoring poll:", error);
    throw new Error("Could not restore poll: " + error.message);
  }

  revalidatePath("/polls");
}

/**
 * Validates that a user owns a specific poll
 * @param pollId - Poll ID to check
 * @param userId - User ID to verify ownership
 * @returns Boolean indicating ownership
 */
export async function validatePollOwnership(
  pollId: string,
  userId?: string,
): Promise<boolean> {
  const user = userId ? { id: userId } : await requireAuth();
  const supabase = await getSupabaseServerClient();

  const { data: poll, error } = await supabase
    .from("polls")
    .select("user_id")
    .eq("id", pollId)
    .single();

  if (error || !poll) {
    return false;
  }

  return poll.user_id === user.id;
}
