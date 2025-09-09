import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  ActionError,
  getAuthenticatedContext,
  db_insertPoll,
  db_insertOptions,
} from "@/lib/polls-api-helpers";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const pollId = params.id;
  try {
    const { supabase, user } = await getAuthenticatedContext();
    const { newQuestion } = (await request.json()) as { newQuestion?: string };

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

    revalidatePath("/polls");
    return NextResponse.json({ id: duplicatedPoll.id }, { status: 201 });
  } catch (error) {
    if (error instanceof ActionError) {
      return NextResponse.json(
        { message: error.message, details: error.details },
        { status: error.code || 500 },
      );
    }
    console.error(`Error duplicating poll ${pollId}:`, error);
    return NextResponse.json(
      { message: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
