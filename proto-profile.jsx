// proto-profile.jsx — Member profile page (/u/:id).
// Shows: monthly highlight reel · all submissions in a calendar grid ·
// received feedback feed · personal stats.

const ProfilePage = ({ memberId, navigate, openPlayer }) => {
  const [state] = React.useState(initialState);
  const member = MEMBER_BY_ID[memberId];

  // All this member's submissions, newest first
  const all = React.useMemo(() => {
    const arr = [];
    Object.values(state.days).forEach(d => {
      const s = d.subs.find(x => x.memberId === memberId);
      if (s && !s.missing) arr.push({ ...s, dayKey: d.dateKey, dayNum: d.dayNum });
    });
    return arr.sort((a,b) => b.dayKey.localeCompare(a.dayKey));
  }, [state, memberId]);

  // Streak
  const streak = React.useMemo(() => {
    const days = Object.values(state.days).sort((a,b) => b.dateKey.localeCompare(a.dateKey));
    let s = 0;
    for (const d of days) {
      const sub = d.subs.find(x => x.memberId === memberId);
      if (sub && !sub.missing) s++; else break;
    }
    return s;
  }, [state, memberId]);

  // Received feedback
  const receivedFeedback = React.useMemo(() => {
    const fb = [];
    all.forEach(sub => {
      (sub.pins || []).forEach(p => {
        p.comments.forEach(c => {
          if (c.author !== memberId) {
            fb.push({ ...c, dayKey: sub.dayKey, subTitle: sub.title, pinT: p.t });
          }
        });
      });
    });
    return fb.slice(0, 12);
  }, [all, memberId]);

  // Total reactions received
  const totalReactions = React.useMemo(() => {
    return all.reduce((acc, sub) => {
      return acc + Object.entries(sub.reactions || {})
        .filter(([k]) => !k.startsWith('__'))
        .reduce((a,[,v])=>a+v,0);
    }, 0);
  }, [all]);

  // Top tag
  const topTag = React.useMemo(() => {
    const counts = {};
    all.forEach(s => (s.tags || []).forEach(t => counts[t] = (counts[t]||0)+1));
    return Object.entries(counts).sort((a,b) => b[1]-a[1])[0];
  }, [all]);

  // Highlight reel: top 3 by reaction score
  const highlights = React.useMemo(() => {
    return all.map(s => ({
      ...s,
      score: Object.entries(s.reactions || {}).filter(([k])=>!k.startsWith('__')).reduce((a,[,v])=>a+v,0),
    })).sort((a,b) => b.score - a.score).slice(0, 3);
  }, [all]);

  return (
    <div style={{
      width: 1280, minHeight: 820,
      background: 'var(--bg)',
      padding: '24px 36px 36px',
      fontFamily:'var(--font-sans)',
      display:'flex', flexDirection:'column', gap: 22,
    }}>
      {/* Top nav back */}
      <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
        <button className="btn sm" onClick={() => navigate('today')}>
          <Icon name="chevronL" size={11}/>오늘로
        </button>
        <button className="btn sm" onClick={() => navigate('archive')}>
          <Icon name="archive" size={11}/>The Roll
        </button>
        <div style={{ flex: 1 }}/>
        <span className="t-meta">우측의 다른 멤버를 클릭하여 이동</span>
        <div style={{ display:'flex', gap: 4 }}>
          {MEMBERS.map(m => (
            <button key={m.id} onClick={() => navigate('profile', m.id)}
              style={{
                all:'unset', cursor:'pointer',
                width: 26, height: 26, borderRadius: 6,
                display:'grid', placeItems:'center',
                background: m.id === memberId ? m.color : 'transparent',
                color: m.id === memberId ? 'white' : 'var(--ink-2)',
                fontSize: 11, fontWeight: 600,
                border: `1px solid ${m.id === memberId ? m.color : 'var(--line)'}`,
              }}>{m.initial}</button>
          ))}
        </div>
      </div>

      {/* Hero */}
      <header style={{
        display:'grid', gridTemplateColumns:'auto 1fr auto', gap: 28, alignItems:'center',
        padding:'14px 4px',
      }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          background: member.color, color:'white',
          display:'grid', placeItems:'center',
          fontSize: 40, fontWeight: 600, fontFamily:'var(--font-display)',
        }}>{member.initial}</div>
        <div>
          <div className="t-eyebrow">멤버 페이지 · /u/{member.id}</div>
          <h1 className="t-display" style={{ margin:'4px 0 0', fontSize: 56 }}>{member.name}</h1>
          <div style={{ display:'flex', gap: 18, marginTop: 12, alignItems:'center' }}>
            <ProfileMini label="제출" value={`${all.length}회`}/>
            <Sep/>
            <ProfileMini label="현재 스트릭" value={streak >= 1 ? `🔥 ${streak}일` : '—'} accent={streak >= 5}/>
            <Sep/>
            <ProfileMini label="받은 반응" value={totalReactions}/>
            <Sep/>
            <ProfileMini label="자주 쓴 태그" value={topTag ? `#${topTag[0]}` : '—'} sub={topTag ? `${topTag[1]}회` : ''}/>
          </div>
        </div>
        <div style={{
          display:'flex', flexDirection:'column', gap: 6, alignItems:'flex-end',
        }}>
          <button className="btn primary"><Icon name="upload" size={13}/>오늘 작업 올리기</button>
          <button className="btn sm">월간 릴 내보내기</button>
        </div>
      </header>

      {/* Highlights */}
      <section>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontFamily:'var(--font-display)', fontWeight: 400, fontSize: 26 }}>
            하이라이트 릴
          </h2>
          <span className="t-meta">반응이 가장 많았던 작업물</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 12 }}>
          {highlights.length === 0 && (
            <div className="panel" style={{ padding: 30, gridColumn:'1 / -1', textAlign:'center', color:'var(--ink-3)' }}>
              아직 작업물이 없어요.
            </div>
          )}
          {highlights.map((p, i) => (
            <HighlightCard key={i} sub={p} member={member} index={i}
              onClick={() => openPlayer(p, p.dayKey)}/>
          ))}
        </div>
      </section>

      {/* Calendar grid */}
      <section>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontFamily:'var(--font-display)', fontWeight: 400, fontSize: 26 }}>
            모든 작업물
          </h2>
          <span className="t-meta">최신순 · 호버하여 미리보기</span>
        </div>
        <div className="panel" style={{ padding: 18 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(10, 1fr)', gap: 10 }}>
            {all.map(s => (
              <CalendarTile key={s.dayKey} sub={s} member={member}
                onClick={() => openPlayer(s, s.dayKey)}/>
            ))}
            {/* Future days as placeholders */}
            {all.length < 30 && Array.from({length: Math.max(0, 30 - all.length)}).map((_,i) => (
              <div key={`empty-${i}`} style={{
                aspectRatio:'1', borderRadius: 6,
                background:'transparent',
                border:'1px dashed var(--line-2)',
              }}/>
            ))}
          </div>
        </div>
      </section>

      {/* Received feedback */}
      <section>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontFamily:'var(--font-display)', fontWeight: 400, fontSize: 26 }}>
            받은 피드백
          </h2>
          <span className="t-meta">팀이 남긴 댓글들</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10 }}>
          {receivedFeedback.length === 0 && (
            <div className="panel" style={{ padding: 30, gridColumn:'1 / -1', textAlign:'center', color:'var(--ink-3)' }}>
              아직 받은 피드백이 없어요.
            </div>
          )}
          {receivedFeedback.map((f, i) => {
            const author = MEMBER_BY_ID[f.author];
            const date = fromKey(f.dayKey);
            return (
              <div key={i} className="panel" style={{
                padding: 14, display:'flex', flexDirection:'column', gap: 8,
                borderLeft: `3px solid ${author.color}`,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                  <Avatar member={author} size={22}/>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{author.name}</span>
                  <span className="t-mono" style={{
                    fontSize: 10, padding:'1px 5px', background:'var(--bg-2)', borderRadius: 3,
                  }}>@{f.pinT}</span>
                  <span className="t-meta" style={{ marginLeft:'auto' }}>{f.time}</span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color:'var(--ink)' }}>"{f.text}"</div>
                <div className="t-meta" style={{ display:'flex', justifyContent:'space-between' }}>
                  <span>{fmtDate(date)} · {f.subTitle}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

const Sep = () => <div style={{ width: 1, height: 32, background:'var(--line)' }}/>;

const ProfileMini = ({ label, value, sub, accent }) => (
  <div>
    <div className="t-eyebrow" style={{ fontSize: 10, marginBottom: 4 }}>{label}</div>
    <div style={{
      fontFamily:'var(--font-display)', fontSize: 22,
      lineHeight: 1, letterSpacing:'-0.01em',
      color: accent ? 'var(--accent)' : 'var(--ink)',
    }}>{value}</div>
    {sub && <div className="t-meta" style={{ fontSize: 10, marginTop: 2 }}>{sub}</div>}
  </div>
);

const HighlightCard = ({ sub, member, index, onClick }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        all:'unset', cursor:'pointer',
        background:'white', borderRadius: 12, overflow:'hidden',
        border:'1px solid var(--line)',
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        transition:'.15s',
      }}>
      <div style={{ position:'relative' }}>
        <ProtoVideo submission={sub} isPlaying={hover} muted style={{ aspectRatio:'16/9', borderRadius: 0 }}/>
        <div style={{
          position:'absolute', top: 10, left: 10,
          padding:'4px 10px', borderRadius: 999,
          background:'rgba(0,0,0,.7)', color:'white',
          fontSize: 11, fontFamily:'var(--font-mono)',
          display:'flex', alignItems:'center', gap: 4,
        }}>
          <Icon name="flame" size={10}/>{sub.score}
        </div>
        <div style={{
          position:'absolute', top: 10, right: 10,
          fontSize: 11, fontFamily:'var(--font-mono)', fontWeight: 700,
          padding:'4px 10px', borderRadius: 999,
          background:'white', color:'var(--ink)',
        }}>#{index+1}</div>
      </div>
      <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap: 6 }}>
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{sub.title}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span className="t-meta">{fmtDate(fromKey(sub.dayKey))}</span>
          <div style={{ display:'flex', gap: 4 }}>
            {sub.tags?.slice(0,2).map(t => <Tag key={t}>{t}</Tag>)}
          </div>
        </div>
      </div>
    </button>
  );
};

const CalendarTile = ({ sub, member, onClick }) => {
  const [hover, setHover] = React.useState(false);
  const reactionTotal = Object.entries(sub.reactions || {})
    .filter(([k]) => !k.startsWith('__'))
    .reduce((a,[,v])=>a+v,0);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        all:'unset', cursor:'pointer', position:'relative',
        aspectRatio:'1', borderRadius: 6, overflow:'hidden',
        boxShadow: hover ? '0 6px 20px rgba(0,0,0,.18), 0 0 0 2px var(--ink)' : 'var(--shadow-sm)',
        transform: hover ? 'scale(1.05)' : 'scale(1)',
        transition: '.15s',
      }}>
      <ProtoVideo submission={sub} isPlaying={hover} muted style={{ width:'100%', height:'100%', aspectRatio:'auto', borderRadius: 0 }}/>
      <div style={{
        position:'absolute', bottom: 0, left: 0, right: 0,
        padding:'12px 6px 4px',
        background:'linear-gradient(to top, rgba(0,0,0,.7), transparent)',
        color:'white',
        fontSize: 9, fontFamily:'var(--font-mono)',
        display:'flex', justifyContent:'space-between',
      }}>
        <span>{fmtDate(fromKey(sub.dayKey))}</span>
        {reactionTotal > 0 && <span>🔥{reactionTotal}</span>}
      </div>
    </button>
  );
};

Object.assign(window, { ProfilePage });
