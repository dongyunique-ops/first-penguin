-- First Penguin · Supabase schema (v2)
-- 새로운 프로젝트면 이 파일 전체 실행, 이미 v1 돌렸으면 끝의 "MIGRATION" 섹션만 실행

-- ────────────────────────────────────────────
-- 1. Members
-- ────────────────────────────────────────────
create table if not exists public.members (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null,
  initial text not null,
  color text not null default '#2966ff',
  cls text default 'dy',
  created_at timestamptz default now()
);

alter table public.members enable row level security;
drop policy if exists "members readable by all" on public.members;
drop policy if exists "members insert own" on public.members;
drop policy if exists "members update own" on public.members;
create policy "members readable by all" on public.members
  for select using (true);
create policy "members insert own" on public.members
  for insert with check (auth.uid() = id);
create policy "members update own" on public.members
  for update using (auth.uid() = id);

-- ────────────────────────────────────────────
-- 2. Submissions
-- 팀이라 누구든 영상 교체/삭제 가능 (RLS: 모든 로그인 유저 update/delete 허용)
-- ────────────────────────────────────────────
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  day_key date not null,
  title text not null default '제목 없음',
  tags text[] default '{}',
  format text default 'mp4',
  duration text default '—',
  video_url text,
  video_mime text,
  video_path text,
  is_vacation boolean default false,
  submitted_at timestamptz default now(),
  unique (member_id, day_key)
);

-- Add is_vacation column if migrating from earlier schema
alter table public.submissions add column if not exists is_vacation boolean default false;
-- Add description column for video caption
alter table public.submissions add column if not exists description text;

create index if not exists submissions_day_idx on public.submissions(day_key desc);

alter table public.submissions enable row level security;
drop policy if exists "submissions readable by all" on public.submissions;
drop policy if exists "submissions insert own" on public.submissions;
drop policy if exists "submissions update own" on public.submissions;
drop policy if exists "submissions delete own" on public.submissions;
drop policy if exists "submissions update by team" on public.submissions;
drop policy if exists "submissions delete by team" on public.submissions;
create policy "submissions readable by all" on public.submissions
  for select using (true);
create policy "submissions insert by team" on public.submissions
  for insert with check (auth.role() = 'authenticated');
create policy "submissions update by team" on public.submissions
  for update using (auth.role() = 'authenticated');
create policy "submissions delete by team" on public.submissions
  for delete using (auth.role() = 'authenticated');

-- ────────────────────────────────────────────
-- 3. Pins (timestamped + positioned comments inside video)
-- ────────────────────────────────────────────
create table if not exists public.pins (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  author_id uuid not null references public.members(id) on delete cascade,
  x real not null,
  y real not null,
  t_sec real default 0,
  text text not null,
  created_at timestamptz default now()
);

create index if not exists pins_submission_idx on public.pins(submission_id);

alter table public.pins enable row level security;
drop policy if exists "pins readable by all" on public.pins;
drop policy if exists "pins insert own" on public.pins;
drop policy if exists "pins delete own" on public.pins;
drop policy if exists "pins update own" on public.pins;
create policy "pins readable by all" on public.pins
  for select using (true);
create policy "pins insert own" on public.pins
  for insert with check (auth.uid() = author_id);
create policy "pins update own" on public.pins
  for update using (auth.uid() = author_id);
create policy "pins delete own" on public.pins
  for delete using (auth.uid() = author_id);

-- ────────────────────────────────────────────
-- 4. Reactions
-- ────────────────────────────────────────────
create table if not exists public.reactions (
  submission_id uuid not null references public.submissions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  primary key (submission_id, member_id, emoji)
);

alter table public.reactions enable row level security;
drop policy if exists "reactions readable by all" on public.reactions;
drop policy if exists "reactions toggle own" on public.reactions;
drop policy if exists "reactions delete own" on public.reactions;
create policy "reactions readable by all" on public.reactions
  for select using (true);
create policy "reactions toggle own" on public.reactions
  for insert with check (auth.uid() = member_id);
create policy "reactions delete own" on public.reactions
  for delete using (auth.uid() = member_id);

-- ────────────────────────────────────────────
-- 5. Comments — text comments on a submission (no x/y position)
-- ────────────────────────────────────────────
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  author_id uuid not null references public.members(id) on delete cascade,
  text text not null,
  t_sec real,                                -- 영상 재생 시점 (optional, null이면 일반 댓글)
  mentions uuid[] default '{}',              -- @mention된 멤버 id 목록
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists comments_submission_idx on public.comments(submission_id, created_at);

alter table public.comments enable row level security;
drop policy if exists "comments readable by all" on public.comments;
drop policy if exists "comments insert own" on public.comments;
drop policy if exists "comments update own" on public.comments;
drop policy if exists "comments delete own" on public.comments;
create policy "comments readable by all" on public.comments
  for select using (true);
create policy "comments insert own" on public.comments
  for insert with check (auth.uid() = author_id);
create policy "comments update own" on public.comments
  for update using (auth.uid() = author_id);
create policy "comments delete own" on public.comments
  for delete using (auth.uid() = author_id);

-- ────────────────────────────────────────────
-- 6. Realtime
-- ────────────────────────────────────────────
alter publication supabase_realtime add table public.submissions;
alter publication supabase_realtime add table public.pins;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.members;
alter publication supabase_realtime add table public.comments;

-- ────────────────────────────────────────────
-- 7. Storage bucket
-- 'submissions' 버킷을 Storage UI에서 PUBLIC으로 만든 후, 아래 정책 실행
-- ────────────────────────────────────────────
-- 첫 셋업이면 아래 4개를 실행. 이미 처음 셋업했고 권한만 풀고 싶으면
-- MIGRATION 섹션의 한 줄(drop + create)만 실행하면 됩니다.

-- create policy "anyone can read submissions bucket"
--   on storage.objects for select using (bucket_id = 'submissions');
-- create policy "logged-in users can upload to submissions"
--   on storage.objects for insert with check (bucket_id = 'submissions' and auth.role() = 'authenticated');
-- create policy "team can update submissions"
--   on storage.objects for update using (bucket_id = 'submissions' and auth.role() = 'authenticated');
-- create policy "team can delete from submissions"
--   on storage.objects for delete using (bucket_id = 'submissions' and auth.role() = 'authenticated');

-- ════════════════════════════════════════════
-- STORAGE PERMISSION UNLOCK (이미 셋업한 사용자용)
-- 다른 사람 영상도 교체/삭제할 수 있도록 권한 푸는 SQL:
-- ════════════════════════════════════════════
-- drop policy if exists "users can delete own uploads" on storage.objects;
-- drop policy if exists "team can delete from submissions" on storage.objects;
-- create policy "team can delete from submissions"
--   on storage.objects for delete using (bucket_id = 'submissions' and auth.role() = 'authenticated');
-- drop policy if exists "team can update submissions" on storage.objects;
-- create policy "team can update submissions"
--   on storage.objects for update using (bucket_id = 'submissions' and auth.role() = 'authenticated');

-- ════════════════════════════════════════════
-- MIGRATION (v1 → v2): 이미 schema.sql v1 돌린 사람만 이 부분 실행
-- ════════════════════════════════════════════
-- 5번 comments 테이블 생성문 + 그 RLS만 다시 돌리면 됩니다.
-- 또한 submissions의 update/delete 정책을 팀 단위로 바꾸려면:
--   drop policy if exists "submissions update own" on public.submissions;
--   drop policy if exists "submissions delete own" on public.submissions;
--   create policy "submissions update by team" on public.submissions
--     for update using (auth.role() = 'authenticated');
--   create policy "submissions delete by team" on public.submissions
--     for delete using (auth.role() = 'authenticated');
