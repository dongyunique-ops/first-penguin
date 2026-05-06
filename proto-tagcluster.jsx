// proto-tagcluster.jsx — Tag bubble cluster + radar visualization.
// Shows: which tags dominate this month, who uses what, click to filter.

const TagCluster = ({ days, navigate, onSelectTag, activeTag }) => {
  // Aggregate tags
  const tagData = React.useMemo(() => {
    const counts = {};
    days.forEach(d => d.subs.forEach(s => {
      if (s.missing) return;
      (s.tags || []).forEach(t => {
        if (!counts[t]) counts[t] = { tag: t, total: 0, byMember: {}, recentSubs: [] };
        counts[t].total += 1;
        counts[t].byMember[s.memberId] = (counts[t].byMember[s.memberId] || 0) + 1;
        if (counts[t].recentSubs.length < 3) {
          counts[t].recentSubs.push({ ...s, dayKey: d.dateKey });
        }
      });
    }));
    return Object.values(counts).sort((a,b) => b.total - a.total);
  }, [days]);

  if (tagData.length === 0) return null;

  const max = tagData[0].total;
  const min = Math.min(...tagData.map(t => t.total));

  // Layout bubbles in a horizontal flow, bigger = more frequent
  const bubble = (t, i) => {
    const ratio = (t.total - min) / Math.max(1, max - min);
    const size = 60 + ratio * 70; // 60–130px
    const isActive = activeTag === t.tag;
    return (
      <button
        key={t.tag}
        onClick={() => onSelectTag(isActive ? null : t.tag)}
        style={{
          all: 'unset', cursor: 'pointer',
          width: size, height: size, borderRadius: '50%',
          background: isActive ? 'var(--ink)' : 'white',
          color: isActive ? '#fff7e6' : 'var(--ink)',
          border: `1.5px solid ${isActive ? 'var(--ink)' : 'var(--line)'}`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 0, flexShrink: 0,
          transition: 'transform .15s, box-shadow .15s',
          boxShadow: isActive ? '0 8px 24px rgba(0,0,0,.18)' : '0 2px 8px rgba(0,0,0,.06)',
          position: 'relative',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.06)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 12 + ratio * 10,
          letterSpacing: '-0.01em',
          fontWeight: 500,
          lineHeight: 1,
        }}>#{t.tag}</span>
        <span className="t-mono" style={{
          fontSize: 9 + ratio * 2,
          opacity: .65,
          marginTop: 4,
        }}>{t.total}</span>
        {/* Member dots */}
        <div style={{
          position: 'absolute', bottom: -6, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', gap: 2,
          padding: '2px 5px',
          background: isActive ? 'var(--ink)' : 'white',
          border: `1px solid ${isActive ? 'var(--ink)' : 'var(--line)'}`,
          borderRadius: 999,
        }}>
          {MEMBERS.map(m => t.byMember[m.id] ? (
            <span key={m.id} style={{
              width: 6, height: 6, borderRadius: '50%', background: m.color,
            }}/>
          ) : null)}
        </div>
      </button>
    );
  };

  return (
    <section className="panel" style={{ padding: '20px 24px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 16 }}>
        <div>
          <div className="t-eyebrow">태그 클러스터 · 지난 {days.length}일</div>
          <h2 style={{ margin: '4px 0 0', fontFamily:'var(--font-display)', fontWeight: 400, fontSize: 26 }}>
            팀이 자주 다룬 주제
          </h2>
        </div>
        <span className="t-meta">크기 = 빈도 · 점 = 사용한 멤버 · 클릭하여 필터</span>
      </div>

      {/* Bubble cluster */}
      <div style={{
        display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'center',
        gap: 24, padding: '20px 0 28px',
      }}>
        {tagData.slice(0, 12).map(bubble)}
      </div>

      {/* Active tag detail */}
      {activeTag && (() => {
        const detail = tagData.find(t => t.tag === activeTag);
        if (!detail) return null;
        return (
          <div style={{
            borderTop:'1px solid var(--line)', paddingTop: 18, marginTop: 8,
            display:'grid', gridTemplateColumns:'200px 1fr', gap: 24,
          }}>
            <div>
              <div className="t-eyebrow" style={{ marginBottom: 8 }}>#{detail.tag}</div>
              <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
                {MEMBERS.map(m => {
                  const c = detail.byMember[m.id] || 0;
                  if (!c) return null;
                  const pct = (c / detail.total) * 100;
                  return (
                    <div key={m.id} style={{ display:'flex', alignItems:'center', gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, width: 30 }}>{m.name}</span>
                      <div style={{ flex: 1, height: 5, background:'var(--bg-2)', borderRadius: 3, overflow:'hidden' }}>
                        <div style={{ width: `${pct}%`, height:'100%', background: m.color }}/>
                      </div>
                      <span className="t-mono" style={{ fontSize: 10, color:'var(--ink-3)' }}>{c}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="t-eyebrow" style={{ marginBottom: 8 }}>최근 작업물</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 10 }}>
                {detail.recentSubs.map(s => {
                  const m = MEMBER_BY_ID[s.memberId];
                  return (
                    <button key={s.dayKey + s.memberId}
                      onClick={() => navigate('today', s.dayKey)}
                      style={{
                        all:'unset', cursor:'pointer',
                        borderRadius: 8, overflow:'hidden',
                        background:'white', border:'1px solid var(--line)',
                      }}>
                      <ProtoVideo submission={s} isPlaying muted
                        style={{ aspectRatio:'16/9', borderRadius: 0 }}/>
                      <div style={{ padding:'8px 10px', display:'flex', alignItems:'center', gap: 6 }}>
                        <Avatar member={m} size={16}/>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{m.name}</span>
                        <span className="t-mono" style={{ fontSize: 10, color:'var(--ink-3)', marginLeft:'auto' }}>
                          {fmtDate(fromKey(s.dayKey))} ({wkday(fromKey(s.dayKey))})
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
};

Object.assign(window, { TagCluster });
