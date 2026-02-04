-- Create posts table for advertising posts
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contacts table for WhatsApp contacts
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (public access for this app)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required for this simple app)
CREATE POLICY "Posts are viewable by everyone" 
ON public.posts 
FOR SELECT 
USING (true);

CREATE POLICY "Posts can be created by everyone" 
ON public.posts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Posts can be updated by everyone" 
ON public.posts 
FOR UPDATE 
USING (true);

CREATE POLICY "Posts can be deleted by everyone" 
ON public.posts 
FOR DELETE 
USING (true);

CREATE POLICY "Contacts are viewable by everyone" 
ON public.contacts 
FOR SELECT 
USING (true);

CREATE POLICY "Contacts can be created by everyone" 
ON public.contacts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Contacts can be updated by everyone" 
ON public.contacts 
FOR UPDATE 
USING (true);

CREATE POLICY "Contacts can be deleted by everyone" 
ON public.contacts 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();