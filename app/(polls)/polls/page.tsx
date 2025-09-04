import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { getPolls, getSupabaseServerClientForActions } from "@/lib/actions";
import { Poll } from "@/lib/types";
import { deletePoll } from "@/lib/actions";
import { DeletePollConfirm } from "@/components/delete-poll-confirm";
import { PollChart } from "@/components/poll-chart";

export default async function PollsListPage() {
  const polls = await getPolls();

  const supabase = await getSupabaseServerClientForActions();

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your polls</h1>
        <Button asChild>
          <Link href="/polls/new">Create poll</Link>
        </Button>
      </div>
      {polls.length === 0 ? (
        <EmptyState title="No polls yet" description="Create your first poll to get started." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {polls.map((poll: Poll) => (
            <div
              key={poll.id}
              className="border rounded-lg p-4 space-y-2 cursor-pointer transition-all duration-200 ease-in-out hover:shadow-md hover:scale-[1.02] hover:border-green-300 dark:hover:border-purple-500"
            >
              <Link href={`/polls/${poll.id}`} className="block space-y-2" tabIndex={-1}>
                <h2 className="text-lg font-semibold">{poll.question}</h2>
                <PollChart
                  data={poll.options.map((option) => ({
                    name: option.value,
                    total: option.vote_count,
                  }))}
                />
              </Link>
              {userId === poll.user_id && (
                <div className="flex space-x-2 mt-4">
                  <form action={`/polls/${poll.id}/edit`}>
                    <Button variant="info" size="sm" type="submit">
                      Edit
                    </Button>
                  </form>
                  <DeletePollConfirm pollId={poll.id} deletePollAction={deletePoll}>
                    <Button variant="destructive" size="sm">
                      Delete
                    </Button>
                  </DeletePollConfirm>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


