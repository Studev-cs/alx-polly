import { CreatePollFormClient } from "@/components/create-poll-form";
import { createPoll } from "@/lib/actions";

export default function NewPollPage() {
  return <CreatePollFormClient createPollAction={createPoll} />;
}


