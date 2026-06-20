# Plan

日〜十年の複数スケールでイベントを俯瞰するタイムライン。Google Calendar連携あり。

## スタック
- React + Vite / Supabase / Google Calendar API

## 重要な制約
- タイムゾーン設定は Supabase に永続化する
- 認証は Google OAuth（Calendar APIのスコープも含む）
- SQL変更は必ず `supabase/migrations/YYYYMMDD_説明.sql` に保存する
- Supabase anon key の環境変数名は `VITE_SUPABASE_PUBLISHABLE_KEY`

## よく使うコマンド
```bash
npm run dev
npm run build
npx tsc --noEmit
```
