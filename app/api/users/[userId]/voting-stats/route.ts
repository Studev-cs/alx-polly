import { NextResponse, NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * @swagger
 * /api/users/{userId}/voting-stats:
 *   get:
 *     summary: Get user voting statistics
 *     description: Fetches voting statistics for a specific user.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user.
 *     responses:
 *       200:
 *         description: The user's voting statistics.
 *       500:
 *         description: An error occurred while fetching the stats.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  const userId = params.userId;
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
    const { count: totalVotes, error: votesError } = await supabase
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (votesError) throw votesError;

    const { data: votesWithPolls, error: detailedError } = await supabase
      .from("votes")
      .select("id, created_at, polls (id, question, created_at)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (detailedError) throw detailedError;

    return NextResponse.json({
      totalVotes: totalVotes || 0,
      recentVotes: votesWithPolls || [],
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
