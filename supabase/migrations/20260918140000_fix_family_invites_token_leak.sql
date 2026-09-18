-- Security fix: "Anyone can view invites by token" used USING (true), which
-- grants SELECT on every row in family_invites regardless of which token the
-- client actually queried for -- RLS policies can't be parameterized by a
-- client-side .eq() filter, so this leaked every pending invite's email/token
-- platform-wide. Replace the open-table policy with a SECURITY DEFINER
-- function that returns only the single row matching a given token, so the
-- unauthenticated "accept invite" preview flow (FamiliaAceitar.tsx) keeps
-- working without exposing the rest of the table.

DROP POLICY IF EXISTS "Anyone can view invites by token" ON public.family_invites;

CREATE OR REPLACE FUNCTION public.get_family_invite_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  family_group_id uuid,
  email text,
  status text,
  expires_at timestamp with time zone,
  group_name text,
  max_members integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fi.id,
    fi.family_group_id,
    fi.email,
    fi.status,
    fi.expires_at,
    fg.group_name,
    fg.max_members
  FROM public.family_invites fi
  JOIN public.family_groups fg ON fg.id = fi.family_group_id
  WHERE fi.token = p_token
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_family_invite_by_token(text) TO anon, authenticated;
