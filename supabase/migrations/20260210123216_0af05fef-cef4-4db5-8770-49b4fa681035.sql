
-- Make email column nullable in profiles since we're switching to phone-based auth
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

-- Update handle_new_user to use phone as primary identifier and generate a fake email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (user_id, email, phone_number, full_name, vodafone_cash)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'vodafone_cash', '')
  );

  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Add user to contacts if phone number provided
  IF NEW.raw_user_meta_data->>'phone_number' IS NOT NULL AND NEW.raw_user_meta_data->>'phone_number' != '' THEN
    PERFORM public.add_user_as_contact(
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone_number'),
      NEW.raw_user_meta_data->>'phone_number'
    );
  END IF;

  RETURN NEW;
END;
$function$;
