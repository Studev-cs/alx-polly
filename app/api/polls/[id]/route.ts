import { NextResponse, NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { Poll } from "@/lib/types";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
/**
 * @swagger
 * /api/polls/{id}:
 *   get:
 *     summary: Fetches a specific poll by ID
 *     description: Fetches a poll by its ID with options and vote counts.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the poll to fetch.
 *     responses:
 *       200:
 *         description: The poll data.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Poll'
 *       404:
 *         description: Poll not found.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const pollId = params.id;
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );

  try {
    const { data, error } = await supabase
      .rpc("get_polls_with_details", { p_poll_id: pollId })
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ message: "Poll not found" }, { status: 404 });
      }
      console.error(`Error fetching poll ${pollId}:`, error);
      return NextResponse.json({ message: "Could not fetch poll", error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ message: "Poll not found" }, { status: 404 });
    }

    const poll = { ...data, options: data.options || [] };
    return NextResponse.json(poll);
  } catch (error: any) {
    return NextResponse.json({ message: "An unexpected error occurred.", error: error.message }, { status: 500 });
  }
}


import {
  ActionError,
  getAuthenticatedContext,
  validatePollInput,
  db_updatePollDetails,
  db_updatePollOptions,
} from "@/lib/polls-api-helpers";
import { SupabaseClient } from "@supabase/supabase-js";

async function deletePollForId(
  supabase: SupabaseClient,
  pollId: string,
  userId: string,
) {
  const { error } = await supabase
    .from("polls")
    .delete()
    .eq("id", pollId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting poll:", error);
    throw new ActionError("Failed to delete poll.", 500, error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const pollId = params.id;
  try {
    const { supabase, user } = await getAuthenticatedContext();
    const reqBody = await request.json();
    const { question, options, starts_at, ends_at } = validatePollInput(reqBody);

    await db_updatePollDetails(supabase, pollId, user.id, {
      question,
      starts_at: starts_at || null,
      ends_at: ends_at || null,
    });

    await db_updatePollOptions(supabase, pollId, options);

    revalidatePath("/polls");
    revalidatePath(`/polls/${pollId}`);
    return NextResponse.json({ id: pollId }, { status: 200 });
  } catch (error) {
    if (error instanceof ActionError) {
      return NextResponse.json(
        { message: error.message, details: error.details },
        { status: error.code || 500 },
      );
    }
    if (error instanceof Error && error.message.includes("isValidationError")) {
      const payload = JSON.parse(error.message);
      return NextResponse.json(
        { message: "Validation failed", details: payload.details },
        { status: 400 },
      );
    }
    console.error(`Error updating poll ${pollId}:`, error);
    return NextResponse.json(
      { message: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const pollId = params.id;
  try {
    const { supabase, user } = await getAuthenticatedContext();
    await deletePollForId(supabase, pollId, user.id);

    revalidatePath("/polls");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ActionError) {
      return NextResponse.json(
        { message: error.message, details: error.details },
        { status: error.code || 500 },
      );
    }
    console.error(`Error deleting poll ${pollId}:`, error);
    return NextResponse.json(
      { message: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
