import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ActionError, getAuthenticatedContext } from "@/lib/polls-api-helpers";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const pollId = params.id;
  try {
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
    return NextResponse.json({ id: pollId, restored: true }, { status: 200 });
  } catch (error) {
    if (error instanceof ActionError) {
      return NextResponse.json(
        { message: error.message, details: error.details },
        { status: error.code || 500 },
      );
    }
    console.error(`Error restoring poll ${pollId}:`, error);
    return NextResponse.json(
      { message: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
