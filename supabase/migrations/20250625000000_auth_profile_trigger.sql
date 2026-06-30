-- Auto-create profile row when a user signs up via Supabase Auth

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_role user_role;
BEGIN
  BEGIN
    profile_role := COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'buyer'::user_role
    );
  EXCEPTION WHEN OTHERS THEN
    profile_role := 'buyer';
  END;

  INSERT INTO public.profiles (
    id,
    role,
    country,
    phone,
    business_name,
    business_registration_number
  )
  VALUES (
    NEW.id,
    profile_role,
    COALESCE(NEW.raw_user_meta_data->>'country', 'KE'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'business_registration_number'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    country = EXCLUDED.country,
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    business_name = COALESCE(EXCLUDED.business_name, profiles.business_name),
    business_registration_number = COALESCE(
      EXCLUDED.business_registration_number,
      profiles.business_registration_number
    ),
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
