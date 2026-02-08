-- Add phone_number column to posts table
ALTER TABLE public.posts
ADD COLUMN phone_number text;

-- Add comment for documentation
COMMENT ON COLUMN public.posts.phone_number IS 'WhatsApp number for users to contact when applying to this post';
