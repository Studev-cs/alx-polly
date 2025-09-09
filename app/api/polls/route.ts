import { NextResponse, NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { Poll } from "@/lib/types";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  ActionError,
  getAuthenticatedContext,
  validatePollInput,
  db_insertPoll,
  db_insertOptions,
} from "@/lib/polls-api-helpers";

/**
 * @swagger
 * /api/polls:
 *   get:
 *     summary: Fetches polls
 *     description: Fetches all polls or polls by a specific user if a userId query parameter is provided.
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: The ID of the user to fetch polls for.
 *     responses:
 *       200:
 *         description: A list of polls.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Poll'
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

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
    let query = supabase.rpc("get_polls_with_details", userId ? { p_user_id: userId } : {});

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching polls:", error);
      return NextResponse.json({ message: "Could not fetch polls", error: error.message }, { status: 500 });
    }

    const polls = (data || []).map((p: any) => ({ ...p, options: p.options || [] }));
    return NextResponse.json(polls);
  } catch (error: any) {
    return NextResponse.json({ message: "An unexpected error occurred.", error: error.message }, { status: 500 });
  }
}



export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    const reqBody = await request.json();
    const { question, options, starts_at, ends_at } = validatePollInput(reqBody);

    const poll = await db_insertPoll(supabase, {
      question,
      user_id: user.id,
      starts_at: starts_at || null,
      ends_at: ends_at || null,
    });

    await db_insertOptions(supabase, poll.id, options);

    revalidatePath("/polls");
    // Instead of redirect, client should handle it.
    // We return the new poll id.
    return NextResponse.json({ id: poll.id }, { status: 201 });
  } catch (error) {
    if (error instanceof ActionError) {
      return NextResponse.json(
        { message: error.message, details: error.details },
        { status: error.code || 500 },
      );
    }
    if (error instanceof Error && error.message.includes("isValidationError")) {
      const payload = JSON.parse(error.message);
      console.log(error)
      return NextResponse.json(
        { message: "Validation failed", details: payload.details },
        { status: 400 },
      );
    }
    console.error("Error creating poll:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
