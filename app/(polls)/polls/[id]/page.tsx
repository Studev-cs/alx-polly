import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSupabaseServerClient } from "@/lib/actions";
import { notFound } from "next/navigation";
import { Poll } from "@/lib/types";
import PollVotingForm from "@/components/poll-voting-form";
import { PollChart } from "@/components/poll-chart";

interface PollDetailPageProps {
  params: { id: string };
}

export default async function PollDetailPage({ params }: PollDetailPageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const supabase = await getSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const currentUser = userError ? null : userData.user;
  const host = process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : "http://localhost:3000";
  const pollResponse = await fetch(`${host}/api/polls/${id}`);
  if (!pollResponse.ok) {
    if (pollResponse.status === 404) {
      notFound();
    }
    // Handle other errors if needed
    throw new Error("Failed to fetch poll");
  }
  const poll: Poll = await pollResponse.json();

  if (!poll) {
    notFound();
  }

  const now = new Date();
  const hasStarted = poll.starts_at ? new Date(poll.starts_at) <= now : true;
  const hasEnded = poll.ends_at ? new Date(poll.ends_at) <= now : false;
  const isActive = hasStarted && !hasEnded;

  let hasVotedLocally = false;
  let votedOptionId: string | null = null;
  if (currentUser) {
    const { data: existingVote } = await supabase
      .from("votes")
      .select("id, option_id")
      .eq("user_id", currentUser.id)
      .eq("poll_id", id)
      .single();
    hasVotedLocally = !!existingVote;
    if (existingVote) {
      votedOptionId = existingVote.option_id;
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{poll.question}</CardTitle>
          <CardDescription>
            Created by {poll.user_name || "Anonymous"}
          </CardDescription>
          <CardDescription>
            {isActive
              ? "This poll is currently active. Cast your vote!"
              : hasEnded
                ? "This poll has ended. View results below."
                : "This poll has not started yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {poll.options && poll.options.length > 0 ? (
              <PollVotingForm
                poll={poll}
                currentUser={currentUser}
                isActive={isActive}
                hasVotedInitial={hasVotedLocally}
                votedOptionId={votedOptionId} // Pass the voted option ID
              />
            ) : (
              <p>No options available for this poll.</p>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          <PollChart
            data={poll.options.map((option) => ({
              name: option.value,
              total: option.vote_count,
            }))}
            barHeight={40}
          />
        </CardContent>
      </Card>
    </div>
  );
}
