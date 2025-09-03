"use server";

import { createPollFormSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import { Poll } from "@/lib/types";
import { castVoteFormSchema } from "./validators";
import { PollOption } from "./types";

const formSchema = createPollFormSchema;

export async function getSupabaseServerClientForActions() {
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
    }
  );
}

export async function createPoll(values: z.infer<typeof formSchema>): Promise<void> {
  
  const validatedFields = formSchema.safeParse(values);

  if (!validatedFields.success) {
    throw new Error(JSON.stringify(validatedFields.error.flatten().fieldErrors));
  }

  const supabase = await getSupabaseServerClientForActions();

  const { data: user, error: userError } = await supabase.auth.getUser();

  if (userError || !user.user) {
    throw new Error("User not authenticated.");
  }

  const { data: poll, error } = await supabase
    .from("polls")
    .insert({
      question: validatedFields.data.question,
      user_id: user.user.id,
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
    }))
  );

  if (optionsError) {
    console.error("Error creating options:", optionsError);
    throw new Error("Could not create poll options: " + optionsError.message);
  }

  revalidatePath("/polls");
  redirect("/polls");
}

export async function editPoll(
  pollId: string,
  values: z.infer<typeof formSchema>
): Promise<void> {
  
  const validatedFields = formSchema.safeParse(values);

  if (!validatedFields.success) {
    throw new Error(JSON.stringify(validatedFields.error.flatten().fieldErrors));
  }

  const supabase = await getSupabaseServerClientForActions();

  const { data: user, error: userError } = await supabase.auth.getUser();

  if (userError || !user.user) {
    throw new Error("User not authenticated.");
  }

  // Update poll details
  const { error: pollUpdateError } = await supabase
    .from("polls")
    .update({
      question: validatedFields.data.question,
      starts_at: validatedFields.data.starts_at || null,
      ends_at: validatedFields.data.ends_at || null,
    })
    .eq("id", pollId)
    .eq("user_id", user.user.id);

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
    throw new Error("Could not fetch existing options: " + fetchOptionsError.message);
  }

  const currentOptionValues = new Set(validatedFields.data.options.map((opt) => opt.value));
  const existingOptionValues = new Set(existingOptions.map((opt) => opt.value));

  // Options to add
  const optionsToAdd = validatedFields.data.options.filter(
    (opt) => !existingOptionValues.has(opt.value)
  );

  if (optionsToAdd.length > 0) {
    const { error: addError } = await supabase.from("options").insert(
      optionsToAdd.map((opt) => ({
        poll_id: pollId,
        value: opt.value,
      }))
    );
    if (addError) {
      console.error("Error adding new options:", addError);
      throw new Error("Could not add new options: " + addError.message);
    }
  }

  // Options to remove
  const optionsToRemove = existingOptions.filter(
    (opt) => !currentOptionValues.has(opt.value)
  );

  if (optionsToRemove.length > 0) {
    const { error: removeError } = await supabase
      .from("options")
      .delete()
      .in(
        "id",
        optionsToRemove.map((opt) => opt.id)
      );
    if (removeError) {
      console.error("Error removing options:", removeError);
      throw new Error("Could not remove options: " + removeError.message);
    }
  }

  revalidatePath("/polls");
  redirect("/polls");
}

export async function getPolls(): Promise<Poll[]> {
  
  const supabase = await getSupabaseServerClientForActions();

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
          created_at,
          votes(count)
        )
      `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching polls:", error);
    throw new Error("Could not fetch polls: " + error.message);
  }

  const formattedPolls: Poll[] = polls.map((poll: any) => ({
    id: poll.id,
    created_at: poll.created_at,
    question: poll.question,
    starts_at: poll.starts_at,
    ends_at: poll.ends_at,
    user_id: poll.user_id,
    options: poll.options.map((option: any) => ({
      id: option.id,
      value: option.value,
      created_at: option.created_at,
      poll_id: option.poll_id, // Add poll_id to option type
      vote_count: option.votes[0]?.count || 0,
    })),
  }));

  return formattedPolls;
}

export async function deletePoll(pollId: string): Promise<void> {
  
  const supabase = await getSupabaseServerClientForActions();

  const { data: user, error: userError } = await supabase.auth.getUser();

  if (userError || !user.user) {
    throw new Error("User not authenticated.");
  }

  const { error } = await supabase
    .from("polls")
    .delete()
    .eq("id", pollId)
    .eq("user_id", user.user.id);

  if (error) {
    console.error("Error deleting poll:", error);
    throw new Error("Could not delete poll: " + error.message);
  }

  revalidatePath("/polls");
  redirect("/polls");
}

export async function getPollById(pollId: string): Promise<Poll | null> {
  
  const supabase = await getSupabaseServerClientForActions();

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
          created_at,
          votes(count)
        )
      `
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

  const formattedPoll: Poll = {
    id: poll.id,
    created_at: poll.created_at,
    question: poll.question,
    starts_at: poll.starts_at,
    ends_at: poll.ends_at,
    user_id: poll.user_id,
    options: poll.options.map((option: any) => ({
      id: option.id,
      value: option.value,
      created_at: option.created_at,
      poll_id: option.poll_id, // Add poll_id to option type
      vote_count: option.votes[0]?.count || 0,
    })),
  };

  return formattedPoll;
}

export async function castVote(
  _prevState: {
    error?: string;
    success?: boolean;
    message?: string;
    errors?: { [key: string]: string[] };
  } | null,
  formData: FormData
) {
  const supabase = await getSupabaseServerClientForActions();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
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
      .eq("user_id", userData.user.id)
      .eq("poll_id", pollId) // Assuming poll_id can be derived or passed
      .single();

    if (existingVoteError && existingVoteError.code !== 'PGRST116') { // PGRST116 is 'No rows found'
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
      user_id: userData.user.id,
      poll_id: pollId, // Insert poll_id to enable unique voting per poll
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(`/polls/${pollId}`);
    return { success: true, message: "Vote cast successfully!" };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "An unknown error occurred.",
    };
  }
}
