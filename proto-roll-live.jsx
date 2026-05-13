// proto-roll-live.jsx — Aggregate view: all submissions from all members, all days.
// Realtime data source.

const RollLive = ({ tweaks, members, days, openPlayer, navigate }) => {
  const allSubs = React.useMemo(() => {
    const arr = [];
    Object.values(days).forEach(d => {
      d.subs.forEach(s => {
        if (!s.missing && s.id) arr.push({ ...s, dayKey: d.dateKey });
      });
    });
    return arr.sort((a, b) => b.dayKey.localeCompare(a.dayKey));
  }, [days]);

  const byDay = React.useMemo(() => {
    const map = {};
    allSubs.forEach(s => {
      if (!map[s.dayKey]) map[s.dayKey] = [];
      map[s.dayKey].push(s);
    });
    return map;
  }, [allSubs]);

  return (
    <div style={{
      padding: '24px 36px 60px',
      fontFamily: 'var(--font-sans)',
      display: 'flex', flexDirection: 'column', gap: 22,
    }}>
      <header>
        <div className="t-eyebrow">전체 아카이브</div>
        <h1 className="t-display" style={{ margin: '4px 0 0', fontSize: 56, lineHeight: 1, fontFamily: "'배민워크체', 'BM WORK', 'BMHANNAPro', sans-serif" }}>
          전체보기
        </h1>
        <div className="t-meta" style={{ marginTop: 8 }}>
          {allSubs.length}개 작업 · {Object.keys(byDay).length}일치
        </div>
      </header>

      {Object.keys(byDay).length === 0 && (
        <div className="panel" style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3)' }}>
          아직 올라온 작업이 없어요. <br/>
          <button className="btn primary sm" style={{ marginTop: 14 }}
            onClick={() => navigate('today')}>오늘 컨택트시트로 가기</button>
        </div>
      )}

      {Object.entries(byDay).map(([dayKey, subs]) => {
        const date = fromKey(dayKey);
        return (
          <section key={dayKey}>
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 12,
              marginBottom: 10, paddingBottom: 8,
              borderBottom: '1px solid var(--line)',
            }}>
              <h2 style={{
                margin: 0,
                fontFamily: "'배민워크체', 'BM WORK', 'BMHANNAPro', sans-serif",
                fontWeight: 500, fontSize: 26,
              }}>
                {fmtKor(date)}
              </h2>
              <span className="t-meta">{wkday(date)}요일 · {subs.length}/{members.length}명</span>
              <div style={{ flex: 1 }}/>
              <button className="btn sm" onClick={() => navigate('today', dayKey)}>
                이 날 컨택트시트
              </button>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
            }}>
              {subs.map(s => {
                const member = members.find(m => m.id === s.memberId);
                return <RollTile key={s.id} sub={s} member={member}
                  onClick={() => openPlayer(s, dayKey)}/>;
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};

const RollTile = ({ sub, member, onClick }) => {
  const [hover, setHover] = React.useState(false);
  const reactionTotal = Object.entries(sub.reactions || {})
    .filter(([k]) => !k.startsWith('__'))
    .reduce((a, [, v]) => a + v, 0);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        all: 'unset', cursor: 'pointer',
        background: 'white', borderRadius: 10, overflow: 'hidden',
        border: '1px solid var(--line)',
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: '.15s',
      }}>
      <ProtoVideo submission={sub} isPlaying={hover} muted
        style={{ aspectRatio: '16/10', borderRadius: 0 }}/>
      <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {member && <Avatar member={member} size={20}/>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 600,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{sub.title}</div>
          <div className="t-meta" style={{ fontSize: 10 }}>{member?.name}</div>
        </div>
        {reactionTotal > 0 && (
          <span className="t-mono" style={{
            fontSize: 10, padding: '1px 5px',
            background: 'var(--bg-2)', borderRadius: 3,
          }}>🔥{reactionTotal}</span>
        )}
      </div>
    </button>
  );
};

Object.assign(window, { RollLive });
