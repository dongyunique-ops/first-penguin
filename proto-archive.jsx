// proto-archive.jsx — The Roll: timeline + best-of sections, with hover GIF
// playback and date-click navigation back to the Contact Sheet.

const ArchivePage = ({ tweaks, viewKey, navigate }) => {
  const [state] = React.useState(initialState);
  // We DON'T persist changes here — Archive is read-only into store
  const days = React.useMemo(() => {
    const arr = Object.values(state.days)
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
      .slice(0, 21); // last 3 weeks
    return arr;
  }, [state]);

  const [activeFilter, setActiveFilter] = React.useState('all');
  const [activeTag, setActiveTag] = React.useState(null);
  const [hovered, setHovered] = React.useState(null); // dayKey-memberId

  // Best-of computation
  const bestOfWeek = React.useMemo(() => {
    const flat = [];
    days.slice(0, 7).forEach(d => d.subs.forEach(s => {
      if (s.missing) return;
      const score = Object.entries(s.reactions || {})
        .filter(([k]) => !k.startsWith('__'))
        .reduce((a,[,v])=>a+v,0);
      flat.push({ ...s, dayKey: d.dateKey, score });
    }));
    return flat.sort((a,b) => b.score - a.score).slice(0, 3);
  }, [days]);

  const bestOfMonth = React.useMemo(() => {
    const flat = [];
    days.forEach(d => d.subs.forEach(s => {
      if (s.missing) return;
      const score = Object.entries(s.reactions || {})
        .filter(([k]) => !k.startsWith('__'))
        .reduce((a,[,v])=>a+v,0);
      flat.push({ ...s, dayKey: d.dateKey, score });
    }));
    return flat.sort((a,b) => b.score - a.score).slice(0, 4);
  }, [days]);

  // Stats
  const totalSubmissions = days.reduce((acc, d) => acc + d.subs.filter(s => !s.missing).length, 0);
  const totalDays = days.length;
  const teamCompletion = Math.round(totalSubmissions / (totalDays * 4) * 100);
  const memberStreaks = MEMBERS.map(m => {
    let streak = 0;
    for (const d of days) {
      const sub = d.subs.find(s => s.memberId === m.id);
      if (sub && !sub.missing) streak++;
      else break;
    }
    return { member: m, streak };
  });

  return (
    <div style={{
      width: 1280, minHeight: 820,
      background: 'var(--bg)',
      padding: '24px 36px 36px',
      fontFamily: 'var(--font-sans)',
      display:'flex', flexDirection:'column', gap: 18,
    }}>
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <div className="t-eyebrow">아카이브 · 지난 {totalDays}일</div>
          <h1 className="t-display" style={{ margin:'4px 0 0' }}>The Roll</h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
          <button className="btn" onClick={() => navigate('today')}>
            <Icon name="home" size={13}/>오늘로
          </button>
        </div>
      </header>

      {/* Stats strip */}
      <div style={{
        display:'flex', gap: 0, alignItems:'stretch',
        background:'white', borderRadius: 12, border:'1px solid var(--line)',
        overflow:'hidden',
      }}>
        <Stat2 label="누적 작업" value={totalSubmissions} suffix="개"/>
        <div className="divider-v"/>
        <Stat2 label="팀 완주율" value={`${teamCompletion}%`} accent/>
        <div className="divider-v"/>
        <StreakStat streaks={memberStreaks}/>
        <div className="divider-v"/>
        <Stat2 label="이번 주 베스트" value={bestOfWeek[0] ? `${MEMBER_BY_ID[bestOfWeek[0].memberId].name} · ${bestOfWeek[0].title}` : '—'} sub={bestOfWeek[0] ? `🔥 ${bestOfWeek[0].score} 반응` : ''} small/>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', alignItems:'center', gap: 8, flexWrap:'wrap' }}>
        <span className="t-eyebrow" style={{ marginRight: 4 }}>필터</span>
        <FilterChip2 label="전체" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')}/>
        {MEMBERS.map(m => (
          <FilterChip2 key={m.id} label={m.name} member={m}
            active={activeFilter === m.id}
            onClick={() => setActiveFilter(activeFilter === m.id ? 'all' : m.id)}/>
        ))}
        <span style={{ width: 1, height: 16, background:'var(--line)', margin:'0 4px' }}/>
        {['모션', '로고', '캐릭터', '실험', '타이포', '루프'].map(t => (
          <button key={t}
            onClick={() => setActiveTag(activeTag === t ? null : t)}
            className="chip tag"
            style={{
              cursor:'pointer',
              background: activeTag === t ? 'var(--ink)' : 'transparent',
              color: activeTag === t ? '#fff7e6' : 'var(--ink-2)',
              borderColor: activeTag === t ? 'var(--ink)' : 'var(--line)',
            }}>
            <Icon name="hash" size={10} stroke={2}/>{t}
          </button>
        ))}
      </div>

      {/* Best of week — horizontal feature */}
      {bestOfWeek.length > 0 && (
        <BestOfRow title="이번 주 베스트" picks={bestOfWeek} navigate={navigate}/>
      )}

      {/* Timeline */}
      <div className="panel" style={{
        padding: '20px 0', display:'flex', flexDirection:'column', overflow:'hidden',
      }}>
        <div style={{ padding:'0 24px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div className="t-eyebrow">타임라인 · 멤버 × 일자</div>
          <span className="t-meta">호버하여 미리보기 · 클릭으로 그날 컨택트 시트로</span>
        </div>
        <div style={{
          display:'grid', gridTemplateColumns: '64px 1fr',
        }}>
          <div style={{ display:'flex', flexDirection:'column', padding:'40px 0 28px', justifyContent:'space-between' }}>
            {MEMBERS.map(m => {
              const streak = memberStreaks.find(s => s.member.id === m.id).streak;
              return (
                <div key={m.id} style={{
                  display:'flex', alignItems:'center', gap: 8, padding: '0 16px', flex: 1,
                  opacity: activeFilter === 'all' || activeFilter === m.id ? 1 : 0.3,
                }}>
                  <Avatar member={m} size={26}/>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{m.name}</div>
                    <div className="t-mono" style={{ fontSize: 10, color: streak >= 5 ? 'var(--accent)' : 'var(--ink-3)' }}>
                      {streak >= 1 ? `🔥 ${streak}` : '· · ·'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ overflowX:'auto', overflowY:'hidden' }} className="scroll">
            <div style={{ display:'inline-flex', flexDirection:'column', minWidth:'100%', padding:'0 24px' }}>
              {/* Date axis */}
              <div style={{ display:'flex', gap: 12, padding:'0 0 12px' }}>
                {days.slice().reverse().map((d, di) => {
                  const isToday = d.dateKey === todayKey();
                  const date = fromKey(d.dateKey);
                  return (
                    <button key={d.dateKey}
                      onClick={() => navigate('today', d.dateKey)}
                      className="dateaxis"
                      style={{
                        all:'unset', cursor:'pointer',
                        width: 76, textAlign:'center',
                      }}>
                      <div className="t-mono" style={{
                        fontSize: 10, color:'var(--ink-3)',
                        fontWeight: isToday ? 700 : 400,
                      }}>Day {d.dayNum}</div>
                      <div style={{
                        fontSize: 13, fontWeight: isToday ? 700 : 500,
                        color: isToday ? 'var(--accent)' : 'var(--ink)',
                        marginTop: 2,
                      }}>{fmtDate(date)}</div>
                      <div className="t-meta" style={{ fontSize: 10 }}>{wkday(date)}</div>
                    </button>
                  );
                })}
              </div>

              {/* Rows */}
              <div style={{ display:'flex', flexDirection:'column', position:'relative' }}>
                <div style={{
                  position:'absolute', inset:0,
                  backgroundImage: 'linear-gradient(to bottom, transparent calc(25% - 1px), var(--line) 25%, transparent 25%)',
                  backgroundSize: '100% 25%',
                  pointerEvents:'none',
                }}/>
                {MEMBERS.map(m => (
                  <div key={m.id} style={{
                    display:'flex', gap: 12, alignItems:'center', flex: 1, minHeight: 80,
                    opacity: activeFilter === 'all' || activeFilter === m.id ? 1 : 0.3,
                  }}>
                    {days.slice().reverse().map(d => {
                      const sub = d.subs.find(s => s.memberId === m.id);
                      return (
                        <TimelineCell2 key={d.dateKey}
                          sub={sub} member={m} dayKey={d.dateKey}
                          isHovered={hovered === `${d.dateKey}-${m.id}`}
                          activeTag={activeTag}
                          onHover={(h) => setHovered(h ? `${d.dateKey}-${m.id}` : null)}
                          onClick={() => navigate('today', d.dateKey)}/>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Best of month */}
      <BestOfRow title="이번 달 하이라이트" picks={bestOfMonth} navigate={navigate} compact/>
    </div>
  );
};

const Stat2 = ({ label, value, sub, suffix, accent, small }) => (
  <div style={{ flex: 1, padding:'14px 18px' }}>
    <div className="t-eyebrow" style={{ marginBottom: 6 }}>{label}</div>
    <div style={{
      fontFamily:'var(--font-display)',
      fontSize: small ? 16 : 28,
      letterSpacing:'-0.02em', lineHeight: 1.1,
      color: accent ? 'var(--accent)' : 'var(--ink)',
    }}>
      {value}{suffix && <span style={{ fontSize: 14, color:'var(--ink-3)', marginLeft: 4, fontFamily:'var(--font-sans)' }}>{suffix}</span>}
    </div>
    {sub && <div className="t-meta" style={{ marginTop: 4 }}>{sub}</div>}
  </div>
);

const StreakStat = ({ streaks }) => {
  const max = Math.max(...streaks.map(s => s.streak), 1);
  return (
    <div style={{ flex: 1.3, padding:'14px 18px' }}>
      <div className="t-eyebrow" style={{ marginBottom: 8 }}>현재 스트릭</div>
      <div style={{ display:'flex', flexDirection:'column', gap: 5 }}>
        {streaks.map(({ member, streak }) => (
          <div key={member.id} style={{ display:'flex', alignItems:'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, width: 28 }}>{member.name}</span>
            <div style={{ flex: 1, height: 6, background:'var(--bg-2)', borderRadius: 3, overflow:'hidden' }}>
              <div style={{
                height:'100%', width: `${(streak / max) * 100}%`,
                background: member.color, borderRadius: 3,
                transition:'width .4s',
              }}/>
            </div>
            <span className="t-mono" style={{
              fontSize: 11, width: 28, textAlign:'right',
              color: streak >= 5 ? 'var(--accent)' : 'var(--ink-2)', fontWeight: 600,
            }}>{streak}d</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const FilterChip2 = ({ label, member, active, onClick }) => (
  <button onClick={onClick}
    style={{
      cursor:'pointer',
      height: 26, padding:'0 10px 0 8px',
      background: active ? 'var(--ink)' : 'white',
      color: active ? '#fff7e6' : 'var(--ink-2)',
      border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
      borderRadius:'999px',
      display:'inline-flex', alignItems:'center', gap: 6,
      fontFamily:'var(--font-sans)', fontSize: 12, fontWeight: 500,
    }}>
    {member && (
      <span style={{ width: 8, height: 8, borderRadius:'50%', background: member.color }}/>
    )}
    {label}
  </button>
);

const TimelineCell2 = ({ sub, member, dayKey, isHovered, activeTag, onHover, onClick }) => {
  const dim = activeTag && sub && !sub.missing && !sub.tags?.includes(activeTag);
  if (!sub || sub.missing) {
    return (
      <div style={{ width: 76, height: 64, display:'grid', placeItems:'center' }}>
        <div style={{
          width: 8, height: 8, borderRadius:'50%',
          background:'transparent', border:'1.5px dashed var(--line-2)',
        }}/>
      </div>
    );
  }
  const reactionTotal = Object.entries(sub.reactions || {})
    .filter(([k]) => !k.startsWith('__'))
    .reduce((a,[,v])=>a+v,0);
  return (
    <button
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onClick}
      style={{
        all:'unset',
        width: 76, height: 64, position:'relative',
        borderRadius: 6, overflow:'hidden', cursor:'pointer',
        boxShadow: isHovered ? '0 6px 20px rgba(0,0,0,.18), 0 0 0 2px var(--ink)' : '0 1px 3px rgba(0,0,0,.08)',
        transform: isHovered ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform .15s, box-shadow .15s, opacity .15s',
        opacity: dim ? 0.18 : 1,
      }}>
      <ProtoVideo
        submission={sub}
        isPlaying={isHovered}
        muted
        style={{ width:'100%', height:'100%', borderRadius: 0, aspectRatio:'auto' }}/>
      {reactionTotal > 4 && (
        <div style={{
          position:'absolute', top: 3, right: 3,
          fontSize: 8, fontWeight: 600, padding:'1px 4px', borderRadius: 8,
          background:'rgba(0,0,0,.7)', color:'white',
          fontFamily:'var(--font-mono)',
        }}>🔥{reactionTotal}</div>
      )}
      {isHovered && (
        <div style={{
          position:'absolute', left:'50%', top:'100%', marginTop: 8,
          transform:'translateX(-50%)', zIndex: 30,
          background:'white', borderRadius: 8, boxShadow:'var(--shadow-lg)',
          padding: 10, width: 200,
          fontSize: 12, lineHeight: 1.4, textAlign:'left',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{sub.title}</div>
          <div className="t-meta" style={{ marginBottom: 6 }}>
            {member.name} · {(sub.pins || []).length}개 댓글 · 🔥 {reactionTotal}
          </div>
          <div style={{ display:'flex', gap: 4, flexWrap:'wrap' }}>
            {sub.tags?.map(t => <Tag key={t}>{t}</Tag>)}
          </div>
          <div className="t-meta" style={{ marginTop: 6, color:'var(--accent)', fontWeight: 600 }}>
            클릭 → 그날 컨택트 시트로
          </div>
        </div>
      )}
    </button>
  );
};

const BestOfRow = ({ title, picks, navigate, compact }) => {
  const [hovered, setHovered] = React.useState(null);
  return (
    <section>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 10 }}>
        <h2 className="t-h1" style={{ margin: 0, fontFamily:'var(--font-display)', fontWeight: 400, fontSize: compact ? 22 : 26 }}>
          {title}
        </h2>
        <span className="t-meta">반응 수 기준</span>
      </div>
      <div style={{
        display:'grid',
        gridTemplateColumns: compact ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
        gap: 12,
      }}>
        {picks.map((p, i) => {
          const member = MEMBER_BY_ID[p.memberId];
          const date = fromKey(p.dayKey);
          const isHover = hovered === i;
          return (
            <button key={i}
              onClick={() => navigate('today', p.dayKey)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                all:'unset', cursor:'pointer',
                background:'white', borderRadius: 10, overflow:'hidden',
                border:'1px solid var(--line)',
                boxShadow: isHover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                transform: isHover ? 'translateY(-2px)' : 'translateY(0)',
                transition: 'transform .15s, box-shadow .15s',
                display:'flex', flexDirection:'column',
              }}>
              <div style={{ position:'relative' }}>
                <ProtoVideo submission={p} isPlaying={isHover} muted
                  style={{ aspectRatio:'16/9', borderRadius: 0 }}/>
                <div style={{
                  position:'absolute', top: 8, left: 8,
                  padding:'3px 8px', borderRadius: 999,
                  background:'rgba(0,0,0,.7)', color:'white',
                  fontSize: 10, fontFamily:'var(--font-mono)',
                  display:'flex', alignItems:'center', gap: 4,
                }}>
                  <Icon name="flame" size={9}/>{p.score}
                </div>
                <div style={{
                  position:'absolute', top: 8, right: 8,
                  fontSize: 10, fontFamily:'var(--font-mono)', fontWeight: 600,
                  padding:'3px 8px', borderRadius: 999,
                  background:'white', color:'var(--ink)',
                }}>#{i+1}</div>
              </div>
              <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap: 4 }}>
                <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                  <Avatar member={member} size={18}/>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{member.name}</span>
                  <span className="t-mono" style={{ fontSize: 10, color:'var(--ink-3)', marginLeft:'auto' }}>
                    {fmtDate(date)} {wkday(date)}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{p.title}</div>
                {!compact && (
                  <div style={{ display:'flex', gap: 4, flexWrap:'wrap', marginTop: 2 }}>
                    {p.tags?.slice(0,2).map(t => <Tag key={t}>{t}</Tag>)}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

Object.assign(window, { ArchivePage });
