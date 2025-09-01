import { createPollFormSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import { Poll } from "@/lib/types";

const formSchema = createPollFormSchema;

export async function createPoll(values: z.infer<typeof formSchema>): Promise<void> {
  "use server";

  const validatedFields = formSchema.safeParse(values);

  if (!validatedFields.success) {
    throw new Error(JSON.stringify(validatedFields.error.flatten().fieldErrors));
  }

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          return (await cookieStore).get(name)?.value;
        },
        async set(name: string, value: string, options: object) {
          (await cookieStore).set({ name, value, ...options });
        },
        async remove(name: string, options: object) {
          (await cookieStore).set({ name, value: "", ...options });
        },
      },
    }
  );

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

export async function getPolls(): Promise<Poll[]> {
  "use server";

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          return (await cookieStore).get(name)?.value;
        },
        async set(name: string, value: string, options: object) {
          (await cookieStore).set({ name, value, ...options });
        },
        async remove(name: string, options: object) {
          (await cookieStore).set({ name, value: "", ...options });
        },
      },
    }
  );

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
