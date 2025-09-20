import { NextResponse, NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseContext, ActionError } from "@/lib/polls-api-helpers";
import { castVoteFormSchema } from "@/lib/validators";

/**
 * @swagger
 * /api/polls/{id}/vote:
 *   get:
 *     summary: Get user's vote for a poll
 *     description: Checks if a user has voted in a poll and returns their vote.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the poll.
 *     responses:
 *       200:
 *         description: The user's vote information.
 *       404:
 *         description: Vote not found.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { supabase, user, anonymousId } = await getSupabaseContext(request);

    let voterId: string | null = null;
    let isAnonymous = false;

    if (user) {
      voterId = user.id;
    } else if (anonymousId) {
      voterId = anonymousId;
      isAnonymous = true;
    } else {
      return NextResponse.json({ message: "No vote found for this user or anonymous user" }, { status: 404 });
    }

    const { data: vote, error } = await supabase
      .from("votes")
      .select("option_id")
      .eq("poll_id", params.id)
      .or(
        isAnonymous
          ? `anonymous_user_id.eq.${voterId}`
          : `user_id.eq.${voterId}`,
      )
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (!vote) {
      return NextResponse.json({ message: "Vote not found" }, { status: 404 });
    }

    return NextResponse.json(vote);
  } catch (error: any) {
    console.error("Error in GET /api/polls/[id]/vote:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/polls/{id}/vote:
 *   post:
 *     summary: Cast a vote on a poll
 *     description: Casts a vote for a specific option in a poll.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the poll.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               optionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vote cast successfully.
 *       400:
 *         description: Validation error or poll not active.
 */
export async function POST(
  request: NextRequest,
  context: { params: { id: string } },
) {
  try {
    const { id } = await context.params;
    const { supabase, user, anonymousId } = await getSupabaseContext(request);
    const body = await request.json();
    const validatedFields = castVoteFormSchema.safeParse({
      optionId: body.optionId,
      pollId: id,
    });

    if (!validatedFields.success) {
      return NextResponse.json({ errors: validatedFields.error.flatten().fieldErrors }, { status: 400 });
    }

    const { optionId, pollId } = validatedFields.data;

    let voterId: string | null = null;
    let isAnonymous = false;

    if (user) {
      voterId = user.id;
    } else if (anonymousId) {
      voterId = anonymousId;
      isAnonymous = true;
    } else {
      return NextResponse.json({ message: "Authentication required or anonymous ID missing" }, { status: 401 });
    }

    // Check if user/anonymous user has already voted in this poll
    const { data: existingVote, error: fetchVoteError } = await supabase
      .from("votes")
      .select("id")
      .eq("poll_id", pollId)
      .or(
        isAnonymous
          ? `anonymous_user_id.eq.${voterId}`
          : `user_id.eq.${voterId}`,
      )
      .maybeSingle();

    if (fetchVoteError) {
      throw fetchVoteError;
    }

    if (existingVote) {
      return NextResponse.json({ message: "You have already voted in this poll." }, { status: 400 });
    }

    const { error } = await supabase.from("votes").insert({
      option_id: optionId,
      poll_id: pollId,
      ...(isAnonymous ? { anonymous_user_id: voterId } : { user_id: voterId }),
    });

    if (error) throw error;

    revalidatePath(`/polls/${pollId}`);
    return NextResponse.json({ message: "Vote cast successfully" });
  } catch (error: any) {
    console.error("Error in POST /api/polls/[id]/vote:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/polls/{id}/vote:
 *   put:
 *     summary: Change a vote on a poll
 *     description: Changes a user's vote to a different option.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the poll.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newOptionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vote changed successfully.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    const { newOptionId } = await request.json();

    const { error } = await supabase
      .from("votes")
      .update({ option_id: newOptionId })
      .eq("user_id", user.id)
      .eq("poll_id", params.id);

    if (error) throw error;

    revalidatePath(`/polls/${params.id}`);
    return NextResponse.json({ message: "Vote changed successfully" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/polls/{id}/vote:
 *   delete:
 *     summary: Remove a vote from a poll
 *     description: Removes a user's vote from a poll.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the poll.
 *     responses:
 *       200:
 *         description: Vote removed successfully.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { supabase, user } = await getAuthenticatedContext();

    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("user_id", user.id)
      .eq("poll_id", params.id);

    if (error) throw error;

    revalidatePath(`/polls/${params.id}`);
    return NextResponse.json({ message: "Vote removed successfully" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}