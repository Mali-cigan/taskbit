-- Create pages table for storing workspace pages
CREATE TABLE public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  icon TEXT NOT NULL DEFAULT '📄',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security for pages
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own pages
CREATE POLICY "Users can view their own pages"
  ON public.pages FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own pages
CREATE POLICY "Users can insert their own pages"
  ON public.pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pages
CREATE POLICY "Users can update their own pages"
  ON public.pages FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own pages
CREATE POLICY "Users can delete their own pages"
  ON public.pages FOR DELETE
  USING (auth.uid() = user_id);

-- Create blocks table for storing content blocks within pages
CREATE TABLE public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL DEFAULT '',
  checked BOOLEAN,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security for blocks
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Users can view blocks in their own pages
CREATE POLICY "Users can view their own blocks"
  ON public.blocks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert blocks in their own pages
CREATE POLICY "Users can insert their own blocks"
  ON public.blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update blocks in their own pages
CREATE POLICY "Users can update their own blocks"
  ON public.blocks FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete blocks in their own pages
CREATE POLICY "Users can delete their own blocks"
  ON public.blocks FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_pages_user_id ON public.pages(user_id);
CREATE INDEX idx_pages_position ON public.pages(user_id, position);
CREATE INDEX idx_blocks_page_id ON public.blocks(page_id);
CREATE INDEX idx_blocks_user_id ON public.blocks(user_id);
CREATE INDEX idx_blocks_position ON public.blocks(page_id, position);

-- Create trigger to update updated_at timestamp for pages
CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to update updated_at timestamp for blocks
CREATE TRIGGER update_blocks_updated_at
  BEFORE UPDATE ON public.blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();