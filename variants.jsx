// variants.jsx — Four takes on the daily 4-up board.
// Each is a self-contained React component. Same data, different
// layout/interaction paradigms so the user can compare.

const TODAY_LABEL = 'Day 042 · 2026.04.30';

// Sample data shared across variants
const SAMPLE_DATA = [
  {
    member: MEMBER_BY_ID.dy,
    title: '바운싱 볼 — 무게감',
    kind: 'bouncing-ball',
    tone: 'cream',
    duration: '0:08',
    format: 'mp4',
    streak: 12,
    tags: ['모션', '기초'],
    pins: [
      { x: 62, y: 70, t: '0:03', comments: [
        { author: MEMBER_BY_ID.dk, time: '2h', text: '바닥 닿기 직전에 squash 더 줘도 좋을 듯!' },
      ]},
      { x: 50, y: 28, t: '0:01', comments: [
        { author: MEMBER_BY_ID.se, time: '1h', text: '정점에서 살짝 hang time 주면 무게감 살아요' },
      ]},
    ],
    reactions: { '🔥': 3, '👏': 2 },
  },
  {
    member: MEMBER_BY_ID.dk,
    title: 'Liquid 로고 변형',
    kind: 'liquid',
    tone: 'orange',
    duration: '0:12',
    format: 'mp4',
    streak: 8,
    tags: ['로고', '실험'],
    pins: [
      { x: 45, y: 50, t: '0:06', comments: [
        { author: MEMBER_BY_ID.jw, time: '30m', text: '이거 진짜 좋다. 색 한 톤 더 어둡게?' },
        { author: MEMBER_BY_ID.dk, time: '20m', text: '오 시도해볼게' },
      ]},
    ],
    reactions: { '🔥': 4, '🤯': 2, '💯': 1 },
  },
  {
    member: MEMBER_BY_ID.se,
    title: '캐릭터 워크 사이클',
    kind: 'character',
    tone: 'light',
    duration: '0:04',
    format: 'gif',
    streak: 21,
    tags: ['캐릭터', '루프'],
    pins: [
      { x: 50, y: 60, t: '0:02', comments: [
        { author: MEMBER_BY_ID.dy, time: '4h', text: '팔 타이밍이 다리랑 살짝 어긋나는 느낌' },
      ]},
    ],
    reactions: { '👏': 4, '🔥': 1 },
  },
  {
    member: MEMBER_BY_ID.jw,
    title: null, // hasn't uploaded yet
    kind: null,
    streak: 6,
  },
];

// ═══════════════════════════════════════════════════════════════
// VARIANT 1 — "Studio Wall"
// 2x2 grid, bordered cards. Members live in fixed quadrants. Calm, formal.
// ═══════════════════════════════════════════════════════════════
const Variant1 = () => {
  const [openPin, setOpenPin] = React.useState({ slot: 0, idx: 0 });
  const [reactions, setReactions] = React.useState(() =>
    SAMPLE_DATA.map(d => ({ ...(d.reactions || {}) }))
  );

  return (
    <div style={{
      width: 1280, height: 820,
      background: 'var(--bg)',
      padding: '32px 36px',
      fontFamily: 'var(--font-sans)',
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      {/* Header */}
      <header style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 6 }}>퍼스트펭귄 · daily motion challenge</div>
          <h1 className="t-display" style={{ margin: 0 }}>오늘의 보드</h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
          <div className="chip" style={{ height: 32, padding:'0 12px' }}>
            <Icon name="calendar" size={12}/>
            {TODAY_LABEL}
          </div>
          <button className="btn icon"><Icon name="chevronL"/></button>
          <button className="btn icon"><Icon name="chevronR"/></button>
          <div style={{ width: 12 }}/>
          <button className="btn"><Icon name="archive" size={14}/>아카이브</button>
          <button className="btn primary"><Icon name="upload" size={14}/>오늘 작업 올리기</button>
        </div>
      </header>

      {/* 2x2 grid */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 16,
      }}>
        {SAMPLE_DATA.map((d, i) => (
          <SlotCard
            key={i}
            data={d}
            slotIndex={i}
            openPin={openPin}
            setOpenPin={setOpenPin}
            reactions={reactions[i]}
            onReact={(e) => setReactions(r => {
              const n = [...r];
              n[i] = { ...n[i], [e]: (n[i][e] || 0) + 1 };
              return n;
            })}
          />
        ))}
      </div>
    </div>
  );
};

const SlotCard = ({ data, slotIndex, openPin, setOpenPin, reactions, onReact }) => {
  const empty = !data.title;
  if (empty) {
    return (
      <div className="panel" style={{
        padding: 16, display:'flex', flexDirection:'column', gap: 12,
        background: 'rgba(255,255,255,0.5)',
        borderStyle: 'dashed', borderColor: 'var(--line-2)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
          <Avatar member={data.member} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{data.member.name}</div>
            <div className="t-meta" style={{ color: 'var(--miss)', display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--miss)' }}/>
              아직 안 올림
            </div>
          </div>
          <span className="chip streak"><Icon name="flame" size={10}/>{data.streak}</span>
        </div>
        <div className="empty-slot" style={{ flex: 1, aspectRatio: 'auto' }}>
          <Icon name="upload" size={20}/>
          <div className="t-meta">파일을 끌어다 놓거나 URL을 붙여넣기</div>
          <div style={{ display:'flex', gap: 6, marginTop: 4 }}>
            <button className="btn sm"><Icon name="upload" size={11}/>업로드</button>
            <button className="btn sm">URL 붙여넣기</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="panel" style={{
      padding: 16, display:'flex', flexDirection:'column', gap: 10,
      background: 'var(--surface)',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
        <Avatar member={data.member} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{data.member.name}</div>
          <div className="t-meta">{data.title}</div>
        </div>
        <span className="chip streak"><Icon name="flame" size={10}/>{data.streak}</span>
        <button className="btn icon sm" style={{ width: 26, height: 26 }}><Icon name="more" size={14}/></button>
      </div>

      {/* Video area */}
      <div style={{ position:'relative' }}>
        <VideoFrame kind={data.kind} tone={data.tone} />
        {data.pins?.map((p, idx) => (
          <CommentPin
            key={idx} x={p.x} y={p.y}
            member={p.comments[0].author}
            count={p.comments.length}
            open={openPin.slot === slotIndex && openPin.idx === idx}
            onClick={() => setOpenPin(o =>
              o.slot === slotIndex && o.idx === idx ? { slot:-1, idx:-1 } : { slot: slotIndex, idx }
            )}
            comments={p.comments}
          />
        ))}
        {/* Video controls */}
        <div style={{
          position:'absolute', left: 8, right: 8, bottom: 8,
          display:'flex', alignItems:'center', gap: 6,
          background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)',
          borderRadius: 8, padding: '6px 8px',
          color: 'white',
        }}>
          <button style={ctrlBtn}><Icon name="pause" size={11}/></button>
          <span className="t-mono" style={{ color:'rgba(255,255,255,.85)' }}>{data.duration}</span>
          <div style={{ flex:1, height:3, background:'rgba(255,255,255,.2)', borderRadius:2, position:'relative' }}>
            <div style={{ position:'absolute', inset:'0 60% 0 0', background:'white', borderRadius:2 }}/>
            {data.pins?.map((p, idx) => (
              <div key={idx} style={{
                position:'absolute', left: `${(idx+1)*22}%`, top:-3, width: 8, height: 8,
                borderRadius:'50%', background: p.comments[0].author.color, border:'1.5px solid white'
              }}/>
            ))}
          </div>
          <button style={ctrlBtn}><Icon name="loop" size={11}/></button>
          <button style={ctrlBtn}><Icon name="speed" size={11}/></button>
          <button style={ctrlBtn}><Icon name="download" size={11}/></button>
        </div>
      </div>

      {/* Footer: tags + reactions */}
      <div style={{ display:'flex', alignItems:'center', gap: 8, justifyContent:'space-between' }}>
        <div style={{ display:'flex', gap: 4, flexWrap:'wrap' }}>
          {data.tags.map(t => <Tag key={t}>{t}</Tag>)}
          <span className="chip" style={{ background:'transparent', color:'var(--ink-3)' }}>
            <Icon name="comment" size={10} stroke={2}/>{data.pins?.length || 0}
          </span>
        </div>
        <ReactionBar reactions={reactions} onReact={onReact} />
      </div>
    </div>
  );
};

const ctrlBtn = {
  background: 'transparent', border: 0, color: 'white',
  cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center',
  padding: 4, borderRadius: 4,
};

// ═══════════════════════════════════════════════════════════════
// VARIANT 2 — "Salon Hang"
// Asymmetric magazine grid. Today's "featured" piece (most reactions) is
// largest. Others scaled down. Editorial / curatorial feel.
// ═══════════════════════════════════════════════════════════════
const Variant2 = () => {
  // Sort by reaction count desc; missing = last
  const ordered = [...SAMPLE_DATA]
    .map((d, i) => ({ ...d, _i: i, _score: Object.values(d.reactions || {}).reduce((a,b)=>a+b,0) }))
    .sort((a,b) => (a.title ? b._score - a._score : 1));

  const [hero, ...rest] = ordered;
  const [openPin, setOpenPin] = React.useState(null);

  return (
    <div style={{
      width: 1280, height: 820,
      background: 'var(--bg)',
      padding: '28px 40px 32px',
      fontFamily: 'var(--font-sans)',
      display: 'flex', flexDirection: 'column', gap: 18,
    }}>
      {/* Editorial masthead */}
      <header style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        paddingBottom: 14, borderBottom: '1px solid var(--ink)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap: 16 }}>
          <div className="t-display" style={{ fontSize: 36, lineHeight: 1, fontStyle:'italic' }}>
            First Penguin
          </div>
          <span className="chip" style={{ background: 'var(--ink)', color:'white' }}>VOL. 042</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
          <span className="t-mono" style={{ color:'var(--ink-2)' }}>{TODAY_LABEL}</span>
          <button className="btn"><Icon name="archive" size={14}/>아카이브</button>
          <button className="btn primary"><Icon name="upload" size={14}/>오늘 올리기</button>
        </div>
      </header>

      {/* Hero + 3 supporting */}
      <div style={{ flex: 1, display:'grid', gridTemplateColumns:'1.55fr 1fr', gap: 18, minHeight: 0 }}>
        {/* Hero */}
        <article style={{ display:'flex', flexDirection:'column', gap: 12 }}>
          <div style={{ display:'flex', alignItems:'baseline', gap: 12 }}>
            <span className="t-eyebrow">오늘의 페더드</span>
            <span className="t-meta">· 가장 많은 반응</span>
          </div>
          <div style={{ position:'relative', flex: 1, minHeight: 0 }}>
            <div style={{ position:'absolute', inset:0 }}>
              <VideoFrame kind={hero.kind} tone={hero.tone} style={{ height:'100%', width:'100%', aspectRatio:'auto', borderRadius: 4 }}/>
            </div>
            {hero.pins?.map((p, idx) => (
              <CommentPin key={idx} x={p.x} y={p.y}
                member={p.comments[0].author}
                count={p.comments.length}
                open={openPin === `h${idx}`}
                onClick={() => setOpenPin(o => o === `h${idx}` ? null : `h${idx}`)}
                comments={p.comments}/>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 6 }}>
                <Avatar member={hero.member} size={24}/>
                <span style={{ fontWeight:600, fontSize: 13 }}>{hero.member.name}</span>
                <span className="t-meta">·</span>
                {hero.tags.map(t => <Tag key={t}>{t}</Tag>)}
              </div>
              <h2 style={{
                margin:0,
                fontFamily:'var(--font-display)', fontWeight:400,
                fontSize: 34, letterSpacing: '-0.02em', lineHeight: 1.05,
              }}>{hero.title}</h2>
            </div>
            <ReactionBar reactions={hero.reactions} onReact={()=>{}} />
          </div>
        </article>

        {/* Supporting column */}
        <div style={{ display:'flex', flexDirection:'column', gap: 14, minHeight: 0 }}>
          {rest.map((d, i) => <SalonItem key={i} data={d} index={i} openPin={openPin} setOpenPin={setOpenPin}/>)}
        </div>
      </div>
    </div>
  );
};

const SalonItem = ({ data, index, openPin, setOpenPin }) => {
  const empty = !data.title;
  return (
    <div style={{
      flex: 1, display:'grid', gridTemplateColumns: '120px 1fr', gap: 14, alignItems:'center',
      paddingTop: index === 0 ? 0 : 14,
      borderTop: index === 0 ? 0 : '1px solid var(--line)',
      minHeight: 0,
    }}>
      {empty ? (
        <div className="empty-slot" style={{ aspectRatio:'16/10', borderRadius: 4 }}>
          <Icon name="upload" size={16}/>
        </div>
      ) : (
        <div style={{ position:'relative', aspectRatio:'16/10' }}>
          <VideoFrame kind={data.kind} tone={data.tone} style={{ borderRadius: 4 }}/>
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 4 }}>
          <Avatar member={data.member} size={20}/>
          <span style={{ fontWeight: 600, fontSize: 12 }}>{data.member.name}</span>
          {empty && (
            <span style={{ fontSize:11, color:'var(--miss)' }}>· 미제출</span>
          )}
        </div>
        <div style={{
          fontFamily:'var(--font-display)', fontSize: 18,
          letterSpacing:'-0.01em', lineHeight: 1.1,
          color: empty ? 'var(--ink-3)' : 'var(--ink)',
        }}>
          {data.title || '오늘의 작업이 비어 있습니다'}
        </div>
        {!empty && (
          <div style={{ display:'flex', alignItems:'center', gap: 6, marginTop: 6 }}>
            <span className="t-mono">{data.duration}</span>
            <span className="t-meta">·</span>
            <span className="t-meta"><Icon name="comment" size={9} stroke={2} style={{verticalAlign:'-1px', marginRight:2}}/>{data.pins?.length || 0}</span>
            <span className="t-meta">·</span>
            {data.tags.slice(0,1).map(t => <Tag key={t}>{t}</Tag>)}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// VARIANT 3 — "Contact Sheet"
// Filmstrip style: 4 large frames in a single row (no chrome around clips),
// captions and comments stack underneath like a film contact sheet. The
// strip itself feels like a roll of film.
// ═══════════════════════════════════════════════════════════════
const Variant3 = () => {
  const [openPin, setOpenPin] = React.useState(null);

  return (
    <div style={{
      width: 1280, height: 820,
      background: 'var(--bg)',
      padding: '28px 36px',
      fontFamily: 'var(--font-sans)',
      display: 'flex', flexDirection: 'column', gap: 18,
    }}>
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <div className="t-eyebrow">CONTACT SHEET · ROLL 042</div>
          <h1 className="t-display" style={{ margin:'4px 0 0', fontSize: 44 }}>
            2026 · 04 · 30
          </h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
          <span className="t-mono" style={{ color:'var(--ink-2)' }}>3 / 4 submitted</span>
          <div style={{ width: 12 }}/>
          <button className="btn icon"><Icon name="chevronL"/></button>
          <button className="btn icon"><Icon name="chevronR"/></button>
          <button className="btn"><Icon name="archive" size={14}/>롤 아카이브</button>
          <button className="btn primary"><Icon name="upload" size={14}/>제출</button>
        </div>
      </header>

      {/* Filmstrip */}
      <div style={{
        background: '#15140f',
        borderRadius: 6,
        padding: '14px 16px',
        position: 'relative',
        boxShadow: 'var(--shadow-md)',
      }}>
        {/* Sprocket holes */}
        <div style={{
          display:'flex', justifyContent:'space-between', marginBottom: 10,
        }}>
          {Array.from({length: 24}).map((_,i)=>(
            <div key={i} style={{ width: 14, height: 8, background: 'var(--bg)', borderRadius: 1 }}/>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 10 }}>
          {SAMPLE_DATA.map((d, i) => (
            <ContactFrame key={i} data={d} index={i} openPin={openPin} setOpenPin={setOpenPin}/>
          ))}
        </div>

        <div style={{
          display:'flex', justifyContent:'space-between', marginTop: 10,
        }}>
          {Array.from({length: 24}).map((_,i)=>(
            <div key={i} style={{ width: 14, height: 8, background: 'var(--bg)', borderRadius: 1 }}/>
          ))}
        </div>
      </div>

      {/* Captions / comments below */}
      <div style={{ flex: 1, display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 16, minHeight: 0 }}>
        {SAMPLE_DATA.map((d, i) => <ContactCaption key={i} data={d} index={i}/>)}
      </div>
    </div>
  );
};

const ContactFrame = ({ data, index, openPin, setOpenPin }) => {
  const empty = !data.title;
  return (
    <div style={{ position:'relative' }}>
      <div className="t-mono" style={{ color:'#fff7e6', fontSize: 9, marginBottom: 4, opacity:.6 }}>
        FRAME {String(index + 1).padStart(2, '0')} · {data.member.name.toUpperCase?.() || data.member.name}
      </div>
      {empty ? (
        <div style={{
          aspectRatio: '4/3',
          background: '#222220',
          border: '1px dashed rgba(255,255,255,.2)',
          display:'grid', placeItems:'center',
          color: 'rgba(255,255,255,.4)',
          fontSize: 11, fontFamily:'var(--font-mono)',
        }}>NO EXPOSURE</div>
      ) : (
        <div style={{ position:'relative' }}>
          <VideoFrame kind={data.kind} tone={data.tone} style={{ aspectRatio:'4/3', borderRadius: 0 }}/>
          {data.pins?.map((p, idx) => (
            <CommentPin key={idx} x={p.x} y={p.y}
              member={p.comments[0].author}
              count={p.comments.length}
              open={openPin === `${index}-${idx}`}
              onClick={() => setOpenPin(o => o === `${index}-${idx}` ? null : `${index}-${idx}`)}
              comments={p.comments}/>
          ))}
        </div>
      )}
    </div>
  );
};

const ContactCaption = ({ data, index }) => {
  const empty = !data.title;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap: 8, minHeight: 0 }}>
      <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
        <Avatar member={data.member} size={22}/>
        <span style={{ fontWeight: 600, fontSize: 12 }}>{data.member.name}</span>
        {!empty && (
          <>
            <span className="t-mono" style={{ color:'var(--ink-3)' }}>·</span>
            <span className="t-mono" style={{ color:'var(--ink-3)' }}>{data.duration}</span>
            <span className="t-mono" style={{
              fontSize: 9, padding:'1px 4px', background:'var(--ink)', color:'#fff7e6', borderRadius: 2,
            }}>{data.format.toUpperCase()}</span>
          </>
        )}
      </div>
      {empty ? (
        <div style={{ fontSize: 12, color:'var(--miss)' }}>● 오늘 미제출</div>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 500, color:'var(--ink)' }}>{data.title}</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap: 4 }}>
            {data.tags.map(t => <Tag key={t}>{t}</Tag>)}
          </div>
          {data.pins?.[0] && (
            <div style={{
              fontSize: 12, lineHeight: 1.45, color:'var(--ink-2)',
              borderLeft: `2px solid ${data.pins[0].comments[0].author.color}`,
              paddingLeft: 8, marginTop: 2,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontWeight: 600, fontSize: 11 }}>{data.pins[0].comments[0].author.name}</span>
                <span className="t-mono" style={{ fontSize: 10, color:'var(--ink-3)' }}>@{data.pins[0].t}</span>
              </div>
              "{data.pins[0].comments[0].text}"
            </div>
          )}
          <ReactionBar reactions={data.reactions} onReact={()=>{}}/>
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// VARIANT 4 — "Stage + Studios"
// Big featured player on the left (the one currently being viewed),
// the other three as small tiles on the right, click to swap. Closer
// to a review-room feel — like a single shared screening with side picks.
// ═══════════════════════════════════════════════════════════════
const Variant4 = () => {
  const submitted = SAMPLE_DATA.filter(d => d.title);
  const [activeId, setActiveId] = React.useState(submitted[0].member.id);
  const active = SAMPLE_DATA.find(d => d.member.id === activeId) || submitted[0];
  const others = SAMPLE_DATA.filter(d => d.member.id !== active.member.id);
  const [openPin, setOpenPin] = React.useState(0);

  return (
    <div style={{
      width: 1280, height: 820,
      background: 'var(--bg)',
      padding: '24px 28px',
      fontFamily: 'var(--font-sans)',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Top nav */}
      <header style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        padding: '10px 14px',
        background:'white', borderRadius: 12, border: '1px solid var(--line)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap: 14 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background:'var(--ink)',
            display:'grid', placeItems:'center', color:'#fff7e6', fontWeight: 700,
            fontSize: 13, letterSpacing:'-0.05em',
          }}>fp</div>
          <div style={{ display:'flex', gap: 4 }}>
            <button className="btn sm" style={{ background:'var(--bg-2)', borderColor:'transparent' }}>
              <Icon name="home" size={11}/>오늘
            </button>
            <button className="btn sm" style={{ borderColor:'transparent', background:'transparent' }}>
              <Icon name="archive" size={11}/>아카이브
            </button>
            <button className="btn sm" style={{ borderColor:'transparent', background:'transparent' }}>
              <Icon name="star" size={11}/>베스트
            </button>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
          <span className="chip"><Icon name="calendar" size={10}/>{TODAY_LABEL}</span>
          <span className="chip streak"><Icon name="flame" size={10}/>팀 스트릭 8일</span>
          <button className="btn primary sm"><Icon name="upload" size={11}/>오늘 올리기</button>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display:'grid', gridTemplateColumns:'1fr 320px', gap: 14, minHeight: 0 }}>
        {/* Stage */}
        <section style={{ display:'flex', flexDirection:'column', gap: 12, minHeight: 0 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
            <Avatar member={active.member} size={32}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{active.member.name}</div>
              <div className="t-meta">{active.title} · {active.duration} · {active.format?.toUpperCase()}</div>
            </div>
            <div style={{ display:'flex', gap: 4 }}>
              {active.tags?.map(t => <Tag key={t}>{t}</Tag>)}
            </div>
            <button className="btn icon"><Icon name="download" size={13}/></button>
          </div>

          {/* Player */}
          <div style={{ position:'relative', flex: 1, minHeight: 0, borderRadius: 12, overflow:'hidden' }}>
            <div style={{ position:'absolute', inset: 0 }}>
              <VideoFrame kind={active.kind} tone={active.tone} style={{ width:'100%', height:'100%', aspectRatio:'auto', borderRadius: 0 }}/>
            </div>
            {active.pins?.map((p, idx) => (
              <CommentPin key={`${active.member.id}-${idx}`} x={p.x} y={p.y}
                member={p.comments[0].author}
                count={p.comments.length}
                open={openPin === idx}
                onClick={() => setOpenPin(o => o === idx ? -1 : idx)}
                comments={p.comments}/>
            ))}

            {/* Overlay control bar */}
            <div style={{
              position:'absolute', left: 12, right: 12, bottom: 12,
              background:'rgba(15,14,12,0.7)', backdropFilter:'blur(12px)',
              padding: '10px 14px', borderRadius: 10, color:'white',
              display:'flex', alignItems:'center', gap: 12,
            }}>
              <button style={{...ctrlBtn, width: 30, height: 30, borderRadius: '50%', background:'white', color:'var(--ink)'}}>
                <Icon name="play" size={12}/>
              </button>
              <span className="t-mono" style={{ color:'rgba(255,255,255,.85)', fontSize: 11 }}>0:03 / {active.duration}</span>

              <div style={{ flex:1, height: 4, background:'rgba(255,255,255,.18)', borderRadius: 2, position:'relative' }}>
                <div style={{ position:'absolute', inset:'0 65% 0 0', background:'white', borderRadius: 2 }}/>
                {active.pins?.map((p, idx) => (
                  <div key={idx} style={{
                    position:'absolute', left: `${(idx+1) * 22}%`, top: -4, width: 12, height: 12,
                    borderRadius:'50%', background: p.comments[0].author.color, border:'2px solid white',
                    cursor:'pointer',
                  }}/>
                ))}
              </div>

              <div style={{ display:'flex', gap: 4 }}>
                <button style={ctrlBtn}><Icon name="loop" size={13}/></button>
                <button style={ctrlBtn}><Icon name="speed" size={13}/></button>
                <button style={ctrlBtn}><Icon name="comment" size={13}/></button>
                <button style={ctrlBtn}><Icon name="sound" size={13}/></button>
              </div>
            </div>
          </div>

          {/* Reactions strip */}
          <div style={{ display:'flex', alignItems:'center', gap: 10, justifyContent:'space-between' }}>
            <ReactionBar reactions={active.reactions} onReact={()=>{}}/>
            <div style={{ display:'flex', gap: 4 }}>
              <button className="btn sm"><Icon name="comment" size={11}/>핀 추가</button>
              <button className="btn sm"><Icon name="pin" size={11}/>댓글 {active.pins?.length || 0}</button>
            </div>
          </div>
        </section>

        {/* Sidebar — others */}
        <aside style={{ display:'flex', flexDirection:'column', gap: 10, minHeight: 0 }}>
          <div className="t-eyebrow" style={{ paddingLeft: 4 }}>다른 작업물 · 3</div>
          {others.map(d => (
            <button key={d.member.id}
              onClick={() => d.title && setActiveId(d.member.id)}
              style={{
                all:'unset', cursor: d.title ? 'pointer' : 'default',
                background:'white', border:'1px solid var(--line)', borderRadius: 10,
                padding: 10, display:'flex', flexDirection:'column', gap: 8,
                opacity: d.title ? 1 : 0.85,
              }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                <Avatar member={d.member} size={22}/>
                <div style={{ flex: 1, fontWeight: 600, fontSize: 12 }}>{d.member.name}</div>
                {!d.title && <span style={{ fontSize:10, color:'var(--miss)', display:'flex', alignItems:'center', gap: 3 }}>
                  <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--miss)'}}/>미제출
                </span>}
                {d.title && <span className="t-mono" style={{ color:'var(--ink-3)' }}>{d.duration}</span>}
              </div>
              {d.title ? (
                <VideoFrame kind={d.kind} tone={d.tone} style={{ borderRadius: 6, aspectRatio:'16/10' }}/>
              ) : (
                <div className="empty-slot" style={{ aspectRatio:'16/10', borderRadius: 6 }}>
                  <Icon name="plus" size={16}/>
                  <div className="t-meta" style={{ fontSize: 10 }}>업로드 대기</div>
                </div>
              )}
              {d.title && (
                <div style={{ display:'flex', alignItems:'center', gap: 6, justifyContent:'space-between' }}>
                  <div style={{ fontSize: 11, color:'var(--ink-2)', flex: 1, minWidth: 0,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {d.title}
                  </div>
                  <span className="t-meta" style={{ fontSize: 10 }}>
                    <Icon name="comment" size={9} stroke={2} style={{ verticalAlign:'-1px', marginRight: 2 }}/>
                    {d.pins?.length || 0}
                  </span>
                </div>
              )}
            </button>
          ))}
        </aside>
      </div>
    </div>
  );
};

Object.assign(window, { Variant1, Variant2, Variant3, Variant4, SAMPLE_DATA, TODAY_LABEL });
