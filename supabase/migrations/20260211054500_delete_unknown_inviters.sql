-- Delete inviter accounts that appear as "unknown user" in admin dashboard.
-- Criteria:
-- 1) User has at least one referral as inviter.
-- 2) Profile full_name is NULL or empty/whitespace.
--
-- Deleting from auth.users cascades to profiles/referrals/user_roles via FK ON DELETE CASCADE.
WITH unknown_inviters AS (
  SELECT p.user_id
  FROM public.profiles p
  WHERE NULLIF(BTRIM(COALESCE(p.full_name, '')), '') IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.referrals r
      WHERE r.inviter_user_id = p.user_id
    )
)
DELETE FROM auth.users u
USING unknown_inviters ui
WHERE u.id = ui.user_id;
