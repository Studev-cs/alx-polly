CREATE TABLE public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  question TEXT NOT NULL,
  starts_at timestamp with time zone default now(),
  ends_at timestamp with time zone,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all polls."
ON public.polls FOR SELECT USING (true);

CREATE POLICY "Users can create polls."
ON public.polls FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own polls."
ON public.polls FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own polls."
ON public.polls FOR DELETE USING (auth.uid() = user_id);



CREATE TABLE public.options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
  value TEXT NOT NULL
);

ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all options."
ON public.options FOR SELECT USING (true);

CREATE POLICY "Poll creators can insert options."
ON public.options FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.polls WHERE id = poll_id AND user_id = auth.uid())
);

CREATE POLICY "Poll creators can update options."
ON public.options FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.polls WHERE id = poll_id AND user_id = auth.uid())
);

CREATE POLICY "Poll creators can delete options."
ON public.options FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.polls WHERE id = poll_id AND user_id = auth.uid())
);


CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  option_id UUID REFERENCES public.options(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (option_id, user_id) -- Ensures a user can only vote once per option
);

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all votes."
ON public.votes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can cast votes."
ON public.votes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own votes."
ON public.votes FOR DELETE USING (auth.uid() = user_id);

-- Performance Indexes
-- Index for fetching options for a poll
CREATE INDEX idx_options_poll_id ON public.options(poll_id);

-- Index for fetching polls created by a user
CREATE INDEX idx_polls_user_id ON public.polls(user_id);

-- Index for fetching votes cast by a user
CREATE INDEX idx_votes_user_id ON public.votes(user_id);