-- ============================================================================
-- TezGrowth Supabase Migration
-- Paste and run this entire script in Supabase Dashboard -> SQL Editor.
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS).
-- ============================================================================

-- 1. ENQUIRIES (LEADS) TABLE
CREATE TABLE IF NOT EXISTS public.enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  business text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  service text NOT NULL,
  budget text NOT NULL,
  message text,
  source text NOT NULL DEFAULT 'contact',
  status text NOT NULL DEFAULT 'New',
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Safely add new columns if enquiries table already existed
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'contact';
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'New';
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- Public visitors can only INSERT leads (never read/update/delete)
DROP POLICY IF EXISTS "Public can insert enquiries" ON public.enquiries;
CREATE POLICY "Public can insert enquiries"
  ON public.enquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated single admin can read, update, and delete leads
DROP POLICY IF EXISTS "Admin can read enquiries" ON public.enquiries;
CREATE POLICY "Admin can read enquiries"
  ON public.enquiries
  FOR SELECT
  TO authenticated
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin can update enquiries" ON public.enquiries;
CREATE POLICY "Admin can update enquiries"
  ON public.enquiries
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin can delete enquiries" ON public.enquiries;
CREATE POLICY "Admin can delete enquiries"
  ON public.enquiries
  FOR DELETE
  TO authenticated
  USING (auth.role() = 'authenticated');


-- 2. REELS TABLE
CREATE TABLE IF NOT EXISTS public.reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  source_type text NOT NULL CHECK (source_type IN ('storage_mp4', 'mp4', 'youtube', 'instagram')),
  url text NOT NULL,
  storage_path text,
  poster_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

-- Public visitors can only read active reels
DROP POLICY IF EXISTS "Public can read active reels" ON public.reels;
CREATE POLICY "Public can read active reels"
  ON public.reels
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Authenticated admin can read all reels (including hidden) and manage them
DROP POLICY IF EXISTS "Admin can manage reels" ON public.reels;
CREATE POLICY "Admin can manage reels"
  ON public.reels
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- 3. STORAGE BUCKET FOR UPLOADED REELS
INSERT INTO storage.buckets (id, name, public)
VALUES ('reels', 'reels', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view reel videos" ON storage.objects;
CREATE POLICY "Public can view reel videos"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'reels');

DROP POLICY IF EXISTS "Admin can upload reel videos" ON storage.objects;
CREATE POLICY "Admin can upload reel videos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'reels' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin can update reel videos" ON storage.objects;
CREATE POLICY "Admin can update reel videos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'reels' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'reels' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin can delete reel videos" ON storage.objects;
CREATE POLICY "Admin can delete reel videos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'reels' AND auth.role() = 'authenticated');


-- 4. SEED DEMO REEL (only if reels table is currently empty)
INSERT INTO public.reels (title, source_type, url, poster_url, sort_order, is_active)
SELECT
  'TezGrowth Demo Reel',
  'youtube',
  'https://www.youtube.com/shorts/YkwQOtqk5wA',
  'https://i.ytimg.com/vi/YkwQOtqk5wA/hqdefault.jpg',
  0,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.reels);
