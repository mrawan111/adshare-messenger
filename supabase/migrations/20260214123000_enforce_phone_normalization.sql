-- Normalize Egyptian phone formats and enforce uniqueness on normalized values.
-- This protects signup even if a client submits +20 / spaced variants.

CREATE OR REPLACE FUNCTION public.normalize_egyptian_phone(_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits TEXT;
BEGIN
  IF _phone IS NULL THEN
    RETURN NULL;
  END IF;

  digits := regexp_replace(_phone, '\D', '', 'g');

  IF digits = '' THEN
    RETURN '';
  END IF;

  -- 00201XXXXXXXXX -> 01XXXXXXXXX
  IF digits ~ '^00201[0-9]{9}$' THEN
    RETURN '0' || substring(digits FROM 5);
  END IF;

  -- 201XXXXXXXXX -> 01XXXXXXXXX
  IF digits ~ '^201[0-9]{9}$' THEN
    RETURN '0' || substring(digits FROM 3);
  END IF;

  -- 1XXXXXXXXX -> 01XXXXXXXXX
  IF digits ~ '^1[0-9]{9}$' THEN
    RETURN '0' || digits;
  END IF;

  RETURN digits;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_and_validate_profile_numbers()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.phone_number := COALESCE(public.normalize_egyptian_phone(NEW.phone_number), '');
  NEW.vodafone_cash := NULLIF(public.normalize_egyptian_phone(NEW.vodafone_cash), '');

  IF NEW.phone_number = '' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'PHONE_NUMBER_REQUIRED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id <> NEW.user_id
      AND public.normalize_egyptian_phone(p.phone_number) = NEW.phone_number
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'PHONE_NUMBER_ALREADY_EXISTS';
  END IF;

  IF NEW.vodafone_cash IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id <> NEW.user_id
        AND p.vodafone_cash IS NOT NULL
        AND public.normalize_egyptian_phone(p.vodafone_cash) = NEW.vodafone_cash
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'VODAFONE_CASH_ALREADY_EXISTS';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_and_validate_profile_numbers_trigger ON public.profiles;
CREATE TRIGGER normalize_and_validate_profile_numbers_trigger
BEFORE INSERT OR UPDATE OF phone_number, vodafone_cash ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.normalize_and_validate_profile_numbers();

CREATE INDEX IF NOT EXISTS profiles_phone_number_normalized_idx
ON public.profiles (public.normalize_egyptian_phone(phone_number));

CREATE INDEX IF NOT EXISTS profiles_vodafone_cash_normalized_idx
ON public.profiles (public.normalize_egyptian_phone(vodafone_cash))
WHERE vodafone_cash IS NOT NULL AND btrim(vodafone_cash) <> '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  normalized_phone TEXT;
  normalized_vodafone_cash TEXT;
BEGIN
  normalized_phone := COALESCE(public.normalize_egyptian_phone(NEW.raw_user_meta_data->>'phone_number'), '');
  normalized_vodafone_cash := NULLIF(public.normalize_egyptian_phone(NEW.raw_user_meta_data->>'vodafone_cash'), '');

  -- Create profile for new user (profile trigger enforces normalized uniqueness)
  INSERT INTO public.profiles (user_id, email, phone_number, full_name, vodafone_cash)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    normalized_phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    normalized_vodafone_cash
  );

  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Add user to contacts if phone number provided
  IF normalized_phone != '' THEN
    PERFORM public.add_user_as_contact(
      COALESCE(NEW.raw_user_meta_data->>'full_name', normalized_phone),
      normalized_phone
    );
  END IF;

  RETURN NEW;
END;
$function$;
