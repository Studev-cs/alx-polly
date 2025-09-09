CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  question TEXT NOT NULL,
  starts_at timestamp with time zone default now(),
  ends_at timestamp with time zone,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all polls." ON public.polls;
CREATE POLICY "Users can view all polls."
ON public.polls FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create polls." ON public.polls;
CREATE POLICY "Users can create polls."
ON public.polls FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own polls." ON public.polls;
CREATE POLICY "Users can update their own polls."
ON public.polls FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own polls." ON public.polls;
CREATE POLICY "Users can delete their own polls."
ON public.polls FOR DELETE USING (auth.uid() = user_id);



CREATE TABLE IF NOT EXISTS public.options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
  value TEXT NOT NULL
);

ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all options." ON public.options;
CREATE POLICY "Users can view all options."
ON public.options FOR SELECT USING (true);

DROP POLICY IF EXISTS "Poll creators can insert options." ON public.options;
CREATE POLICY "Poll creators can insert options."
ON public.options FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.polls WHERE id = poll_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Poll creators can update options." ON public.options;
CREATE POLICY "Poll creators can update options."
ON public.options FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.polls WHERE id = poll_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Poll creators can delete options." ON public.options;
CREATE POLICY "Poll creators can delete options."
ON public.options FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.polls WHERE id = poll_id AND user_id = auth.uid())
);


CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  option_id UUID REFERENCES public.options(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (option_id, user_id) -- Ensures a user can only vote once per option
);

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all votes." ON public.votes;
CREATE POLICY "Users can view all votes."
ON public.votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can cast votes." ON public.votes;
CREATE POLICY "Authenticated users can cast votes."
ON public.votes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete their own votes." ON public.votes;
CREATE POLICY "Users can delete their own votes."
ON public.votes FOR DELETE USING (auth.uid() = user_id);

-- Performance Indexes
-- Index for fetching options for a poll
CREATE INDEX IF NOT EXISTS idx_options_poll_id ON public.options(poll_id);

-- Index for fetching polls created by a user
CREATE INDEX IF NOT EXISTS idx_polls_user_id ON public.polls(user_id);

-- Index for fetching votes cast by a user
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON public.votes(user_id);

CREATE OR REPLACE FUNCTION get_polls_with_details(
    p_poll_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    question TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    user_id UUID,
    user_name TEXT,
    options JSON
) AS $
BEGIN
    RETURN QUERY
    WITH option_votes AS (
        SELECT
            o.id AS option_id,
            o.poll_id,
            o.value,
            o.created_at AS option_created_at,
            COUNT(v.id) AS vote_count
        FROM options o
        LEFT JOIN votes v ON v.option_id = o.id
        GROUP BY o.id
    ),
    poll_options AS (
        SELECT
            p.id AS poll_id,
            json_agg(
                json_build_object(
                    'id', ov.option_id,
                    'value', ov.value,
                    'created_at', ov.option_created_at,
                    'vote_count', ov.vote_count
                ) ORDER BY ov.option_created_at
            ) AS options
        FROM polls p
        JOIN option_votes ov ON ov.poll_id = p.id
        GROUP BY p.id
    )
    SELECT
        p.id,
        p.created_at,
        p.question,
        p.starts_at,
        p.ends_at,
        p.user_id,
        u.raw_user_meta_data->>'name' AS user_name,
        COALESCE(po.options, '[]'::json) as options
    FROM polls p
    JOIN auth.users u ON p.user_id = u.id
    LEFT JOIN poll_options po ON po.poll_id = p.id
    WHERE (p_poll_id IS NULL OR p.id = p_poll_id)
      AND (p_user_id IS NULL OR p.user_id = p_user_id)
    ORDER BY p.created_at DESC;
END;
$ LANGUAGE plpgsql;
