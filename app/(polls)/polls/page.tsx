import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { getPolls } from "@/lib/actions";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Poll } from "@/lib/types";

export default async function PollsListPage() {
  const polls = await getPolls();

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
            <div key={poll.id} className="border rounded-lg p-4 space-y-2">
              <h2 className="text-lg font-semibold">{poll.question}</h2>
              <ul className="list-disc pl-5">
                {poll.options?.map((option) => (
                  <li key={option.id} className="text-sm">
                    {option.value} ({option.vote_count} votes)
                  </li>
                ))}
              </ul>
              {userId === poll.user_id && (
                <div className="flex space-x-2 mt-4">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm">
                    Delete
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


