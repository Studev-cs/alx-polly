export type PollOption = {
  id: string;
  poll_id: string;
  value: string;
  created_at: string;
  vote_count?: number;
};

export type Poll = {
  id: string;
  created_at: string;
  question: string;
  starts_at: string | null;
  ends_at: string | null;
  user_id: string;
  options?: PollOption[];
  vote_count?: number;
};

export type Vote = {
  id: string;
  created_at: string;
  option_id: string;
  user_id: string;
};


