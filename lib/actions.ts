import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createPollFormSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const formSchema = createPollFormSchema;

export async function createPoll(values: z.infer<typeof formSchema>): Promise<void> {
  "use server";

  const validatedFields = formSchema.safeParse(values);

  if (!validatedFields.success) {
    throw new Error(JSON.stringify(validatedFields.error.flatten().fieldErrors));
  }

  const supabase = createServerSupabaseClient();

  const { data: user, error: userError } = await supabase.auth.getUser();

  if (userError || !user.user) {
    throw new Error("User not authenticated.");
  }

  const { data: poll, error } = await supabase
    .from("polls")
    .insert({
      question: validatedFields.data.question,
      user_id: user.user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating poll:", error);
    throw new Error("Could not create poll.");
  }

  const { error: optionsError } = await supabase.from("options").insert(
    validatedFields.data.options.map((option) => ({
      poll_id: poll.id,
      value: option.value,
    }))
  );

  if (optionsError) {
    console.error("Error creating options:", optionsError);
    throw new Error("Could not create poll options.");
  }

  revalidatePath("/polls");
  redirect("/polls");
}
