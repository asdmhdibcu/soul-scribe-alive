
-- =========== USERS (profile) ===========
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  reminder_time TIME,
  streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  total_sessions INT NOT NULL DEFAULT 0,
  time_credits INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  coins INT NOT NULL DEFAULT 0,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own" ON public.users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users_delete_own" ON public.users FOR DELETE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========== DIARY ENTRIES ===========
CREATE TABLE public.diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT,
  content TEXT,
  mood_color TEXT,
  mood_x NUMERIC,
  mood_y NUMERIC,
  energy_level INT,
  life_area TEXT,
  ai_tone TEXT,
  session_intent TEXT,
  cards_swiped JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  voice_transcript TEXT,
  one_answer TEXT,
  ai_insight TEXT,
  ai_pattern TEXT,
  tomorrow_plan JSONB,
  focus_word TEXT,
  one_thing TEXT,
  coins_earned INT NOT NULL DEFAULT 0,
  is_private BOOLEAN NOT NULL DEFAULT true,
  price NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diary_entries TO authenticated;
GRANT ALL ON public.diary_entries TO service_role;
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diary_owner_all" ON public.diary_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========== PHOTOS ===========
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES public.diary_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  ai_description TEXT,
  people_detected JSONB,
  location_context TEXT,
  emotion_context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;
GRANT ALL ON public.photos TO service_role;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos_owner_all" ON public.photos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========== FAMILY MEMBERS ===========
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT,
  voice_style TEXT,
  warmth_level INT,
  topics JSONB DEFAULT '[]'::jsonb,
  availability TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family_members_parent_all" ON public.family_members FOR ALL TO authenticated USING (auth.uid() = parent_id OR auth.uid() = child_id) WITH CHECK (auth.uid() = parent_id);

-- =========== CHILD PROFILES ===========
CREATE TABLE public.child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INT,
  avatar TEXT,
  age_group TEXT,
  mood_sharing_enabled BOOLEAN NOT NULL DEFAULT true,
  private_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_profiles TO authenticated;
GRANT ALL ON public.child_profiles TO service_role;
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "child_profiles_parent_all" ON public.child_profiles FOR ALL TO authenticated USING (auth.uid() = parent_id) WITH CHECK (auth.uid() = parent_id);

-- =========== CHILD ENTRIES ===========
CREATE TABLE public.child_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT,
  content TEXT,
  mood_stars INT,
  mood_emoji TEXT,
  cards_swiped JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  voice_transcript TEXT,
  mission TEXT,
  coins_earned INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_entries TO authenticated;
GRANT ALL ON public.child_entries TO service_role;
ALTER TABLE public.child_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "child_entries_parent_all" ON public.child_entries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.child_profiles cp WHERE cp.id = child_id AND cp.parent_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.child_profiles cp WHERE cp.id = child_id AND cp.parent_id = auth.uid()));

-- =========== LEGACY LETTERS ===========
CREATE TABLE public.legacy_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  open_at_age INT,
  open_at_date DATE,
  is_opened BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legacy_letters TO authenticated;
GRANT ALL ON public.legacy_letters TO service_role;
ALTER TABLE public.legacy_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legacy_letters_author_all" ON public.legacy_letters FOR ALL TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

-- =========== FAMILY CAPSULES ===========
CREATE TABLE public.family_capsules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  entries JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_capsules TO authenticated;
GRANT ALL ON public.family_capsules TO service_role;
ALTER TABLE public.family_capsules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family_capsules_owner_all" ON public.family_capsules FOR ALL TO authenticated USING (auth.uid() = family_id) WITH CHECK (auth.uid() = family_id);

-- =========== MARKETPLACE ===========
CREATE TABLE public.marketplace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.diary_entries(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sales_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace TO authenticated;
GRANT ALL ON public.marketplace TO service_role;
ALTER TABLE public.marketplace ENABLE ROW LEVEL SECURITY;
-- Available listings visible to all authenticated users (browse marketplace); seller manages own
CREATE POLICY "marketplace_browse_available" ON public.marketplace FOR SELECT TO authenticated USING (is_available = true OR auth.uid() = seller_id);
CREATE POLICY "marketplace_seller_insert" ON public.marketplace FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "marketplace_seller_update" ON public.marketplace FOR UPDATE TO authenticated USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "marketplace_seller_delete" ON public.marketplace FOR DELETE TO authenticated USING (auth.uid() = seller_id);

-- =========== TRANSACTIONS ===========
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES public.diary_entries(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_party_select" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "transactions_buyer_insert" ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);

-- =========== COINS HISTORY ===========
CREATE TABLE public.coins_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coins_history TO authenticated;
GRANT ALL ON public.coins_history TO service_role;
ALTER TABLE public.coins_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coins_history_owner_all" ON public.coins_history FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========== ACHIEVEMENTS ===========
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_name TEXT NOT NULL,
  badge_icon TEXT,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_owner_all" ON public.achievements FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
