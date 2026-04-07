# アーキテクチャ決定記録

## 認証・インフラ構成

### 決定
- 認証: Supabase OAuth（Google）
- Googleカレンダーアクセス: `signInWithOAuth` の `scopes` に `calendar.readonly` を指定し、`session.provider_token` でCalendar APIを直接呼び出す
- GoogleプロジェクトとSupabaseプロジェクトは**このアプリ専用の新規プロジェクト**を使用

### 理由

**Supabase OAuthを使う理由**  
他の既存アプリ（tsumu, routine, memo_friends）がすべてSupabase OAuthを採用しており、認証方式を統一するため。

**GoogleプロジェクトとSupabaseプロジェクトを分離する理由**  
`calendar.readonly` はGoogleのセンシティブスコープに分類される。センシティブスコープを含むOAuth同意画面はテストモードの場合、事前登録したテストユーザーしかログインできない制限がある。この制限はGoogleプロジェクト単位で適用されるため、既存アプリと同じプロジェクトを使うと既存アプリのユーザーもテストユーザー登録が必要になってしまう。既存アプリはすでに知人に使ってもらっており、その継続利用を妨げないために分離する。

**`provider_token` のリフレッシュ処理を実装する理由**  
Supabaseセッションは長期間有効だが、`provider_token`（GoogleカレンダーAPIのアクセストークン）は1時間で失効する。Supabaseは自動でリフレッシュしないため、API呼び出し時に401が返った場合は `supabase.auth.refreshSession()` でリトライし、それでも取得できない場合は再ログインを促す。

---

## 却下した選択肢

| 選択肢 | 却下理由 |
|---|---|
| Google APIをネイティブOAuthで直接使う（gapi） | 他アプリとの認証方式が統一されない。ログインフローが2回になりUXが悪い |
| 既存のGoogleプロジェクト・Supabaseプロジェクトを共有する | `calendar.readonly` のテストユーザー制限が既存アプリのユーザーに影響する |
| OAuthクライアントIDだけ新規作成して同じSupabaseを使う | Client SecretはSupabaseプロジェクトに1つしか設定できないため不可 |
| このアプリのOAuth同意画面を本番公開（審査）する | センシティブスコープの審査には時間と手間がかかるため当面はテストモードで運用 |
