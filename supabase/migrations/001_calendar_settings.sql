-- カレンダー設定をユーザーごとに保存するテーブル
-- Supabase の SQL Editor でこのファイルの内容を実行してください

create table public.calendar_settings (
  user_id             uuid        primary key references auth.users(id) on delete cascade,
  zone_selection      jsonb       not null default '{"day":[],"week":[],"month":[],"quarter":[],"year":[],"decade":[]}'::jsonb,
  known_calendar_ids  text[]      not null default '{}',
  updated_at          timestamptz not null default now()
);

alter table public.calendar_settings enable row level security;

create policy "Users can manage their own calendar settings"
  on public.calendar_settings
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
