// auth-screen.jsx — Sign-in gate. Shown when no session.

const AuthScreen = ({ onSignIn, configured }) => (
  <div style={{
    minHeight: '100vh', width: '100%',
    display: 'grid', placeItems: 'center',
    background: 'var(--bg)',
    fontFamily: 'var(--font-sans)',
    padding: 40,
  }}>
    <div style={{
      width: 460, background: 'white',
      borderRadius: 16, border: '1px solid var(--line)',
      boxShadow: 'var(--shadow-md)',
      padding: 40,
      display: 'flex', flexDirection: 'column', gap: 22,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontStyle: 'italic',
        fontSize: 44, lineHeight: 1, letterSpacing: '-0.02em',
      }}>
        first penguin
      </div>
      <div style={{ color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.55 }}>
        매일 한 컷, 팀이 함께 만드는 영상 일지.
        구글 계정으로 로그인하면 본인 슬롯이 자동 생성됩니다.
      </div>

      {configured ? (
        <button onClick={onSignIn} style={{
          all: 'unset',
          cursor: 'pointer',
          padding: '14px 18px',
          background: 'var(--ink)',
          color: 'white',
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 600,
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.6-.4-3.9z"/>
          </svg>
          Google로 로그인
        </button>
      ) : (
        <div style={{
          padding: 18, background: 'var(--bg-2)',
          borderRadius: 8, border: '1px dashed var(--line)',
          fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55,
        }}>
          ⚠️ Supabase가 아직 연결되지 않았어요.<br/>
          <code style={{ fontFamily:'var(--font-mono)', fontSize: 12 }}>.env</code> 파일에
          {' '}<code style={{ fontFamily:'var(--font-mono)', fontSize: 12 }}>SUPABASE_URL</code>과
          {' '}<code style={{ fontFamily:'var(--font-mono)', fontSize: 12 }}>SUPABASE_ANON_KEY</code>를
          {' '}채우고 빌드하세요. 자세한 안내는 <code style={{ fontFamily:'var(--font-mono)', fontSize: 12 }}>README.md</code>를 참고하세요.
        </div>
      )}

      <div style={{
        fontSize: 12, color: 'var(--ink-3)',
        paddingTop: 14, borderTop: '1px solid var(--line)',
      }}>
        4명 협업용 사적 공간입니다. 외부 공유는 권장하지 않아요.
      </div>
    </div>
  </div>
);

Object.assign(window, { AuthScreen });
