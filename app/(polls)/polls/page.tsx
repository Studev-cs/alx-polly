import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function PollsListPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your polls</h1>
        <Button asChild>
          <Link href="/polls/new">Create poll</Link>
        </Button>
      </div>
      <EmptyState title="No polls yet" description="Create your first poll to get started." />
    </div>
  );
}


