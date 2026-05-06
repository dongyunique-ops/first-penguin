// archive.jsx — Timeline view (selected SVG option) for browsing past days.
// Horizontal timeline of dates; each day shows the 4 members' submissions
// stacked. Hover/click → preview. Filterable by member + tag.

const ARCHIVE_DAYS = (() => {
  // Build 14 days of mock data going back from today
  const kinds = ['bouncing-ball', 'morph', 'orbit', 'type', 'wave', 'character', 'logo', 'particles', 'liquid'];
  const tones = ['light', 'cream', 'dark', 'blue', 'orange', 'violet'];
  const tagPool = [
    ['모션', '기초'], ['로고'], ['캐릭터', '루프'], ['실험'],
    ['타이포'], ['파티클'], ['모션', '실험'], ['루프'],
  ];
  const days = [];
  for (let d = 0; d < 14; d++) {
    const dayNum = 42 - d;
    const date = new Date(2026, 3, 30 - d);
    const subs = MEMBERS.map((m, mi) => {
      // skip some submissions to show miss patterns
      const skip = (d === 3 && mi === 1) || (d === 7 && mi === 2) || (d === 0 && mi === 3);
      if (skip) return { member: m, missing: true };
      const seed = (d * 7 + mi * 3) % kinds.length;
      const toneSeed = (d * 11 + mi * 5) % tones.length;
      return {
        member: m,
        kind: kinds[seed],
        tone: tones[toneSeed],
        tags: tagPool[(d + mi) % tagPool.length],
        reactions: ((d + mi) % 9) + 1,
        comments: ((d * 3 + mi * 2) % 6),
        title: ['움직임 연구', '루프 실험', '타이밍 테스트', '컬러 베리에이션', '캐릭터 비트', '리듬 스터디', '로고 모션'][(d+mi)%7],
      };
    });
    days.push({ dayNum, date, subs });
  }
  return days;
})();

const fmtDate = (d) => `${d.getMonth()+1}/${String(d.getDate()).padStart(2,'0')}`;
const fmtWeekday = (d) => ['일','월','화','수','목','금','토'][d.getDay()];

const ArchiveTimeline = () => {
  const [activeFilter, setActiveFilter] = React.useState('all');
  const [activeTag, setActiveTag] = React.useState(null);
  const [hovered, setHovered] = React.useState(null); // { dayIdx, memberIdx }

  const filteredSubs = (subs) => {
    return subs.map(s => {
      const dim = (activeFilter !== 'all' && s.member.id !== activeFilter) ||
                  (activeTag && !s.tags?.includes(activeTag));
      return { ...s, dim };
    });
  };

  // Simple stat strip
  const totalSubmissions = ARCHIVE_DAYS.reduce((acc, d) => acc + d.subs.filter(s => !s.missing).length, 0);
  const totalDays = ARCHIVE_DAYS.length;
  const teamCompletion = Math.round(totalSubmissions / (totalDays * 4) * 100);

  return (
    <div style={{
      width: 1280, height: 820,
      background: 'var(--bg)',
      padding: '28px 36px',
      fontFamily: 'var(--font-sans)',
      display:'flex', flexDirection:'column', gap: 18,
    }}>
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <div className="t-eyebrow">아카이브 · 지난 14일</div>
          <h1 className="t-display" style={{ margin:'4px 0 0' }}>The Roll</h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
          <button className="btn sm"><Icon name="grid" size={11}/>그리드</button>
          <button className="btn sm" style={{ background:'var(--ink)', color:'white', borderColor:'var(--ink)'}}>
            <Icon name="calendar" size={11}/>타임라인
          </button>
          <div style={{ width: 8 }}/>
          <button className="btn"><Icon name="home" size={13}/>오늘로</button>
        </div>
      </header>

      {/* Stats */}
      <div style={{ display:'flex', gap: 0, alignItems:'stretch',
        background:'white', borderRadius: 12, border:'1px solid var(--line)',
        overflow:'hidden',
      }}>
        <Stat label="누적 작업" value={totalSubmissions} suffix="개"/>
        <div className="divider-v"/>
        <Stat label="팀 완주율" value={`${teamCompletion}%`} accent/>
        <div className="divider-v"/>
        <Stat label="가장 활발한 멤버" value="성은" sub="14/14 일"/>
        <div className="divider-v"/>
        <Stat label="이번 주 베스트" value="도경 · Liquid 로고" sub="🔥 12  👏 8" small/>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', alignItems:'center', gap: 8, flexWrap:'wrap' }}>
        <span className="t-eyebrow" style={{ marginRight: 4 }}>필터</span>
        <FilterChip label="전체" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')}/>
        {MEMBERS.map(m => (
          <FilterChip key={m.id} label={m.name} member={m}
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

      {/* Timeline */}
      <div className="panel" style={{
        flex: 1, padding: '20px 0', display:'flex', flexDirection:'column',
        overflow:'hidden', minHeight: 0,
      }}>
        {/* Member labels (rows) */}
        <div style={{
          display:'grid', gridTemplateColumns: '64px 1fr',
          flex: 1, minHeight: 0,
        }}>
          <div style={{ display:'flex', flexDirection:'column', gap: 0,
            padding:'40px 0 28px', justifyContent:'space-between' }}>
            {MEMBERS.map(m => (
              <div key={m.id} style={{
                display:'flex', alignItems:'center', gap: 8,
                padding: '0 16px', flex: 1,
                opacity: activeFilter === 'all' || activeFilter === m.id ? 1 : 0.3,
              }}>
                <Avatar member={m} size={26}/>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{m.name}</div>
                  <div className="t-mono" style={{ fontSize: 10, color:'var(--ink-3)' }}>
                    {ARCHIVE_DAYS.filter(d => !d.subs.find(s => s.member.id === m.id)?.missing).length}/14
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable timeline */}
          <div style={{ overflowX:'auto', overflowY:'hidden' }} className="scroll">
            <div style={{
              display:'inline-flex', flexDirection:'column', gap: 0,
              minWidth:'100%', padding:'0 24px',
            }}>
              {/* Date axis (top) */}
              <div style={{ display:'flex', gap: 12, padding:'0 0 12px', position:'relative' }}>
                {ARCHIVE_DAYS.slice().reverse().map((d, di) => {
                  const isToday = di === ARCHIVE_DAYS.length - 1;
                  return (
                    <div key={d.dayNum} style={{ width: 76, textAlign:'center' }}>
                      <div className="t-mono" style={{
                        fontSize: 10, color:'var(--ink-3)',
                        fontWeight: isToday ? 700 : 400,
                      }}>
                        Day {d.dayNum}
                      </div>
                      <div style={{
                        fontSize: 13,
                        fontWeight: isToday ? 700 : 500,
                        color: isToday ? 'var(--accent)' : 'var(--ink)',
                        marginTop: 2,
                      }}>
                        {fmtDate(d.date)}
                      </div>
                      <div className="t-meta" style={{ fontSize: 10 }}>{fmtWeekday(d.date)}</div>
                    </div>
                  );
                })}
              </div>

              {/* Rows */}
              <div style={{ display:'flex', flexDirection:'column', flex: 1, position:'relative' }}>
                {/* Horizontal grid lines */}
                <div style={{
                  position:'absolute', inset:0,
                  backgroundImage: 'linear-gradient(to bottom, transparent calc(25% - 1px), var(--line) 25%, transparent 25%)',
                  backgroundSize: '100% 25%',
                  pointerEvents:'none',
                }}/>
                {MEMBERS.map((m, mi) => (
                  <div key={m.id} style={{
                    display:'flex', gap: 12, alignItems:'center',
                    flex: 1, minHeight: 80,
                    opacity: activeFilter === 'all' || activeFilter === m.id ? 1 : 0.3,
                  }}>
                    {ARCHIVE_DAYS.slice().reverse().map((d, di) => {
                      const sub = d.subs.find(s => s.member.id === m.id);
                      return (
                        <TimelineCell key={d.dayNum}
                          sub={sub} member={m}
                          isHovered={hovered?.day === di && hovered?.member === mi}
                          activeTag={activeTag}
                          onHover={(h) => setHovered(h ? { day: di, member: mi } : null)}/>
                      );
                    })}
                  </div>
                ))}

                {/* Today line */}
                <div style={{
                  position:'absolute',
                  right: 38, top: -28, bottom: -8,
                  width: 0, borderLeft: '1.5px dashed var(--accent)',
                  pointerEvents:'none',
                }}>
                  <div style={{
                    position:'absolute', top: -22, left: -18,
                    fontSize: 10, fontFamily:'var(--font-mono)', color:'var(--accent)',
                    fontWeight: 700, letterSpacing:'0.1em',
                  }}>NOW</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value, sub, suffix, accent, small }) => (
  <div style={{ flex: 1, padding:'14px 18px' }}>
    <div className="t-eyebrow" style={{ marginBottom: 6 }}>{label}</div>
    <div style={{
      fontFamily:'var(--font-display)',
      fontSize: small ? 18 : 28,
      letterSpacing:'-0.02em', lineHeight: 1.05,
      color: accent ? 'var(--accent)' : 'var(--ink)',
    }}>
      {value}{suffix && <span style={{ fontSize: 14, color:'var(--ink-3)', marginLeft: 4, fontFamily:'var(--font-sans)' }}>{suffix}</span>}
    </div>
    {sub && <div className="t-meta" style={{ marginTop: 4 }}>{sub}</div>}
  </div>
);

const FilterChip = ({ label, member, active, onClick }) => (
  <button onClick={onClick}
    className="chip"
    style={{
      cursor:'pointer',
      height: 26, padding:'0 10px 0 8px',
      background: active ? 'var(--ink)' : 'white',
      color: active ? '#fff7e6' : 'var(--ink-2)',
      border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
      gap: 6, fontFamily:'var(--font-sans)', fontSize: 12, fontWeight: 500,
    }}>
    {member && (
      <span style={{
        width: 8, height: 8, borderRadius:'50%', background: member.color,
      }}/>
    )}
    {label}
  </button>
);

const TimelineCell = ({ sub, member, isHovered, activeTag, onHover }) => {
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
  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        width: 76, height: 64, position:'relative',
        borderRadius: 6, overflow:'hidden', cursor:'pointer',
        boxShadow: isHovered ? '0 6px 20px rgba(0,0,0,.18), 0 0 0 2px var(--ink)' : '0 1px 3px rgba(0,0,0,.08)',
        transform: isHovered ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform .15s, box-shadow .15s, opacity .15s',
        opacity: dim ? 0.18 : 1,
      }}>
      <VideoFrame kind={sub.kind} tone={sub.tone}
        style={{ width:'100%', height:'100%', borderRadius: 0, aspectRatio:'auto' }}/>
      {/* Reaction badge */}
      {sub.reactions > 4 && (
        <div style={{
          position:'absolute', top: 3, right: 3,
          fontSize: 8, fontWeight: 600, padding:'1px 4px', borderRadius: 8,
          background:'rgba(0,0,0,.7)', color:'white',
          fontFamily:'var(--font-mono)',
        }}>🔥{sub.reactions}</div>
      )}
      {/* Hover preview */}
      {isHovered && (
        <div style={{
          position:'absolute', left:'50%', top:'100%', marginTop: 8,
          transform:'translateX(-50%)', zIndex: 10,
          background:'white', borderRadius: 8, boxShadow:'var(--shadow-lg)',
          padding: 10, width: 200,
          fontSize: 12, lineHeight: 1.4,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{sub.title}</div>
          <div className="t-meta" style={{ marginBottom: 6 }}>
            {member.name} · {sub.comments}개 댓글 · {sub.reactions} 반응
          </div>
          <div style={{ display:'flex', gap: 4, flexWrap:'wrap' }}>
            {sub.tags?.map(t => <Tag key={t}>{t}</Tag>)}
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { ArchiveTimeline });
