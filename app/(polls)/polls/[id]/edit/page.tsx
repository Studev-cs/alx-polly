import { getPolls, getSupabaseServerClientForActions } from "@/lib/actions";
import { cookies } from "next/headers";
import { Poll } from "@/lib/types";
import { deletePoll, editPoll } from "@/lib/actions";
import { EditPollForm } from "@/components/edit-poll-form";

interface EditPollPageProps {
  params: {
    id: string;
  };
}

export default async function EditPollPage({ params }: EditPollPageProps) {
  const supabase = await getSupabaseServerClientForActions();

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  const _params = await params;

  console.log("EditPollPage - Poll ID:", _params.id);

  const { data: poll, error } = await supabase
    .from("polls")
    .select(
      `
        id,
        created_at,
        question,
        starts_at,
        ends_at,
        user_id,
        options (
          id,
          value,
          created_at
        )
      `,
    )
    .eq("id", _params.id)
    .single();

  if (error || !poll) {
    console.error("EditPollPage - Error fetching poll:", error);
    console.log("EditPollPage - Poll data:", poll);
    throw new Error("Poll not found or unauthorized access.");
  }

  // if (userId !== poll.user_id) {
  //   throw new Error("You are not authorized to edit this poll.");
  // }

  return <EditPollForm poll={poll as Poll} editPollAction={editPoll} />;
}
