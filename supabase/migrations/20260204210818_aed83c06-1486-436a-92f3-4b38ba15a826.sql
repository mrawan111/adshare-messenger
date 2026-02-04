-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_admin());

-- User roles RLS policies
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.is_admin());

-- Update posts policies: only admins can create/update/delete
DROP POLICY IF EXISTS "Posts can be created by everyone" ON public.posts;
DROP POLICY IF EXISTS "Posts can be updated by everyone" ON public.posts;
DROP POLICY IF EXISTS "Posts can be deleted by everyone" ON public.posts;

CREATE POLICY "Admins can create posts"
ON public.posts FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update posts"
ON public.posts FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete posts"
ON public.posts FOR DELETE
USING (public.is_admin());

-- Update contacts policies: only admins can manage
DROP POLICY IF EXISTS "Contacts can be created by everyone" ON public.contacts;
DROP POLICY IF EXISTS "Contacts can be updated by everyone" ON public.contacts;
DROP POLICY IF EXISTS "Contacts can be deleted by everyone" ON public.contacts;
DROP POLICY IF EXISTS "Contacts are viewable by everyone" ON public.contacts;

CREATE POLICY "Admins can view contacts"
ON public.contacts FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can create contacts"
ON public.contacts FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update contacts"
ON public.contacts FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete contacts"
ON public.contacts FOR DELETE
USING (public.is_admin());

-- Service role function to add contact (bypasses RLS)
CREATE OR REPLACE FUNCTION public.add_user_as_contact(
  _name TEXT,
  _phone_number TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.contacts (name, phone_number)
  VALUES (_name, _phone_number)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();