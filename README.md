# 퍼스트펭귄 — 실제 협업 사이트 배포 가이드

4명이 실제로 함께 쓰는 사이트로 띄우려면 다음 3가지가 필요해요:
1. **Supabase** (DB + 스토리지 + 로그인) — 무료
2. **Vercel** (호스팅 + 도메인) — 무료
3. **Google Cloud** (구글 로그인용) — 무료

전체 30~40분 정도 걸려요. 순서대로 따라오세요.

---

## 1단계 · Supabase 프로젝트 만들기

1. https://supabase.com 가입 (GitHub 계정으로 가능)
2. **New project** 클릭
   - Name: `first-penguin`
   - Database password: 안전하게 보관
   - Region: `Northeast Asia (Seoul)`
3. 프로젝트 생성 후 좌측 사이드바 **Settings → API** 에서 두 값을 복사:
   - `Project URL` (예: `https://xxxx.supabase.co`)
   - `anon public` 키 (긴 JWT 문자열)

## 2단계 · 데이터베이스 스키마 만들기

1. 좌측 **SQL Editor → New query**
2. `supabase/schema.sql` 파일을 통째로 붙여넣기
3. **Run** 클릭. 에러 없이 끝나면 OK.

## 3단계 · Storage 버킷 만들기

1. 좌측 **Storage → New bucket**
2. Name: `submissions`, **Public bucket** 체크 → Create
3. 다시 **SQL Editor**로 가서 아래 3개 정책 실행 (schema.sql 맨 아래 주석에 있어요):

```sql
create policy "anyone can read submissions bucket"
  on storage.objects for select using (bucket_id = 'submissions');
create policy "logged-in users can upload to submissions"
  on storage.objects for insert
  with check (bucket_id = 'submissions' and auth.role() = 'authenticated');
create policy "users can delete own uploads"
  on storage.objects for delete
  using (bucket_id = 'submissions' and auth.uid()::text = (storage.foldername(name))[1]);
```

## 4단계 · Google 로그인 설정

### 4-1. Google Cloud 쪽
1. https://console.cloud.google.com 접속, 프로젝트 새로 만들기 (이름은 아무거나)
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
3. 처음이면 OAuth consent screen 먼저 설정 — User Type `External`, 앱 이름 `퍼스트펭귄`, 이메일만 채우고 저장
4. 다시 Create Credentials:
   - Application type: `Web application`
   - Authorized redirect URIs: Supabase의 **Authentication → Providers → Google** 화면에 표시된 callback URL을 복사 붙여넣기 (예: `https://xxxx.supabase.co/auth/v1/callback`)
5. 생성 후 `Client ID`와 `Client secret` 복사

### 4-2. Supabase 쪽
1. **Authentication → Providers → Google** 활성화
2. 위에서 받은 Client ID와 Secret 붙여넣기 → Save
3. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (개발용) — 배포 후 본인 도메인으로 바꿈
   - Redirect URLs에 `https://*.vercel.app/**` 추가

## 5단계 · 코드에 Supabase 연결

1. 프로젝트 루트에 `.env` 파일 만들기 (`.env.example` 복사):
   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
2. `index.html`을 열고 4명의 멤버 정보를 본인 팀에 맞게 수정 (`shared.jsx`의 `MEMBERS` 배열)

## 6단계 · 로컬 테스트

```bash
npx serve .
```
http://localhost:3000 접속 → 구글 로그인 → 업로드 테스트

## 7단계 · Vercel 배포

1. https://vercel.com 가입 (GitHub 계정)
2. 이 폴더를 GitHub에 push (또는 Vercel CLI 사용):
   ```bash
   npm i -g vercel
   vercel
   ```
3. **Vercel 대시보드 → Settings → Environment Variables** 에 두 값 추가:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. 배포 후 받은 도메인 (예: `first-penguin.vercel.app`)을 Supabase **Authentication → URL Configuration → Site URL**에 등록

## 8단계 · 팀원 초대

각 팀원이 본인의 구글 계정으로 사이트에 접속하면 자동으로 `members` 테이블에 등록돼요. 단 4명만 허용하려면 `members` 테이블에서 5번째 사용자 가입 시 차단하는 트리거를 추가하거나, Supabase Auth의 화이트리스트를 쓰면 됩니다.

---

## 문제 해결

- **로그인 후 빈 화면**: Redirect URL이 잘못됐을 가능성. Google Cloud의 redirect URI = Supabase callback URL인지 다시 확인
- **업로드 실패**: Storage 정책이 빠졌거나 버킷이 Public이 아닐 가능성
- **다른 사람의 작업물이 안 보임**: RLS 정책이 막고 있을 가능성. SQL Editor에서 `select * from submissions;` 가 보이는지 확인

---

전체 작업이 어렵게 느껴지면, Supabase 가입까지만 하고 알려주세요 — Project URL과 anon key를 받으면 나머지는 도와드릴 수 있어요.
