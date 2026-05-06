// shared.jsx — Common primitives shared across all variants.
// Members, icons, video frames, comment pins, reaction bars.

const MEMBERS = [
  { id: 'dy', name: '동윤',  initial: '동', cls: 'dy', color: '#2966ff' },
  { id: 'dk', name: '도경',  initial: '도', cls: 'dk', color: '#ff5a1f' },
  { id: 'se', name: '성은',  initial: '성', cls: 'se', color: '#6b3fa0' },
  { id: 'jw', name: '지운',  initial: '지', cls: 'jw', color: '#2f8f4f' },
];

const MEMBER_BY_ID = Object.fromEntries(MEMBERS.map(m => [m.id, m]));

// ────────────── Icons (stroke-based, 1.5px, 16x16 base) ──────────────
const Icon = ({ name, size = 16, stroke = 1.5, style }) => {
  const paths = {
    play:    <polygon points="5,3 13,8 5,13" fill="currentColor" stroke="none"/>,
    pause:   <g><rect x="4" y="3" width="3" height="10" fill="currentColor"/><rect x="9" y="3" width="3" height="10" fill="currentColor"/></g>,
    download:<g><path d="M8 2v9M4 7l4 4 4-4M3 14h10"/></g>,
    loop:    <g><path d="M3 8a5 5 0 0 1 9-3M13 8a5 5 0 0 1-9 3"/><polyline points="10,2 12,5 9,5"/><polyline points="6,14 4,11 7,11"/></g>,
    speed:   <g><path d="M3 11h10M3 8h7M3 5h4"/><path d="M11 4l3 4-3 4"/></g>,
    comment: <g><path d="M3 4h10v6H8l-3 3v-3H3z"/></g>,
    reaction:<g><circle cx="8" cy="8" r="5.5"/><circle cx="6" cy="7" r=".5" fill="currentColor"/><circle cx="10" cy="7" r=".5" fill="currentColor"/><path d="M6 10c.5 .8 1.2 1.2 2 1.2s1.5-.4 2-1.2"/></g>,
    upload:  <g><path d="M8 14V5M4 9l4-4 4 4M3 2h10"/></g>,
    plus:    <g><path d="M8 3v10M3 8h10"/></g>,
    chevronL:<g><polyline points="10,3 5,8 10,13"/></g>,
    chevronR:<g><polyline points="6,3 11,8 6,13"/></g>,
    expand:  <g><polyline points="3,7 3,3 7,3"/><polyline points="13,9 13,13 9,13"/></g>,
    pin:     <g><path d="M8 2v6M8 10v3M5 6h6l-1 4H6z" fill="currentColor"/></g>,
    hash:    <g><path d="M5 3l-1 10M11 3l-1 10M3 6h11M3 11h11"/></g>,
    flame:   <path d="M8 2c1 2-1 3 0 5s3 1 3 4a3 3 0 1 1-6 0c0-2 1-2 1-4 0-1-1-2 2-5z" fill="currentColor" stroke="none"/>,
    star:    <polygon points="8,2 10,6 14,6.5 11,9.5 12,13.5 8,11.5 4,13.5 5,9.5 2,6.5 6,6" fill="currentColor" stroke="none"/>,
    mute:    <g><polygon points="3,6 7,6 11,3 11,13 7,10 3,10" fill="currentColor" stroke="none"/><path d="M13 6l3 4M16 6l-3 4"/></g>,
    sound:   <g><polygon points="3,6 7,6 11,3 11,13 7,10 3,10" fill="currentColor" stroke="none"/><path d="M13 5a4 4 0 0 1 0 6"/></g>,
    more:    <g><circle cx="4" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="12" cy="8" r="1" fill="currentColor"/></g>,
    check:   <polyline points="3,9 6,12 13,4"/>,
    archive: <g><rect x="2" y="3" width="12" height="3"/><rect x="3" y="6" width="10" height="8"/><line x1="6" y1="9" x2="10" y2="9"/></g>,
    home:    <g><path d="M3 7l5-4 5 4v6H3z"/></g>,
    calendar:<g><rect x="2.5" y="3.5" width="11" height="10"/><line x1="2.5" y1="6" x2="13.5" y2="6"/><line x1="6" y1="2" x2="6" y2="5"/><line x1="10" y1="2" x2="10" y2="5"/></g>,
    grid:    <g><rect x="3" y="3" width="4" height="4"/><rect x="9" y="3" width="4" height="4"/><rect x="3" y="9" width="4" height="4"/><rect x="9" y="9" width="4" height="4"/></g>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
         stroke="currentColor" strokeWidth={stroke}
         strokeLinecap="round" strokeLinejoin="round" style={style}>
      {paths[name]}
    </svg>
  );
};

// ────────────── Avatar ──────────────
const Avatar = ({ member, size = 28 }) => (
  <span className={`avatar ${member.cls}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}>
    {member.initial}
  </span>
);

// ────────────── VideoFrame — stylized representation of a clip ──────────────
// Rather than embed real video (we have no assets), render an animated
// placeholder that looks like motion work — moving shapes, flicker, etc.
const VideoFrame = ({ kind = 'shape', tone = 'light', isPlaying = true, progress = 0.4, style }) => {
  return (
    <div className="video-frame" style={style}>
      <MockVideoCanvas kind={kind} tone={tone} isPlaying={isPlaying} />
    </div>
  );
};

// Minimal animated mocks. Each "kind" is a small motion piece.
const MockVideoCanvas = ({ kind, tone, isPlaying }) => {
  const bg = {
    light: '#f5f3ec',
    dark:  '#15140f',
    cream: '#f1ead8',
    blue:  '#0d2747',
    orange:'#fff2ec',
    violet:'#1a1330',
  }[tone] || '#f5f3ec';
  const fg = (tone === 'dark' || tone === 'blue' || tone === 'violet') ? '#fff' : '#15140f';

  const a = isPlaying ? 'running' : 'paused';

  if (kind === 'bouncing-ball') {
    return (
      <div style={{position:'absolute', inset:0, background: bg}}>
        <div style={{
          position:'absolute', bottom:'15%', left:'50%',
          width: '40%', height: 1.5, background: fg, opacity:.3, transform:'translateX(-50%)'
        }}/>
        <div style={{
          position:'absolute', left: '50%', bottom: '15%',
          width: 28, height: 28, marginLeft:-14, marginBottom:-14,
          borderRadius: '50%', background: fg,
          animation: `mvBall 1.6s ease-in-out infinite`, animationPlayState: a
        }}/>
      </div>
    );
  }
  if (kind === 'morph') {
    return (
      <div style={{position:'absolute', inset:0, background: bg, display:'grid', placeItems:'center'}}>
        <div style={{
          width:'45%', aspectRatio:'1', background: fg,
          animation:`mvMorph 4s ease-in-out infinite`, animationPlayState: a
        }}/>
      </div>
    );
  }
  if (kind === 'orbit') {
    return (
      <div style={{position:'absolute', inset:0, background: bg, display:'grid', placeItems:'center'}}>
        <div style={{position:'relative', width:'60%', aspectRatio:'1',
          animation:`mvSpin 6s linear infinite`, animationPlayState: a}}>
          <div style={{position:'absolute', top:'50%', left:0, width:14, height:14, marginTop:-7, borderRadius:'50%', background: fg}}/>
          <div style={{position:'absolute', top:'50%', right:0, width:8, height:8, marginTop:-4, borderRadius:'50%', background: fg, opacity:.5}}/>
        </div>
      </div>
    );
  }
  if (kind === 'type') {
    return (
      <div style={{position:'absolute', inset:0, background: bg, display:'grid', placeItems:'center'}}>
        <div style={{
          fontFamily:'var(--font-display)', fontSize:'min(10vw, 64px)',
          color: fg, letterSpacing:'-0.02em',
          animation:`mvType 3s ease-in-out infinite`, animationPlayState: a
        }}>motion.</div>
      </div>
    );
  }
  if (kind === 'wave') {
    return (
      <div style={{position:'absolute', inset:0, background: bg, overflow:'hidden'}}>
        <svg width="100%" height="100%" viewBox="0 0 400 250" preserveAspectRatio="none">
          <path d="M0,140 Q100,90 200,140 T400,140 V250 H0 Z" fill={fg} opacity=".15">
            <animate attributeName="d" dur="3s" repeatCount="indefinite"
              values="M0,140 Q100,90 200,140 T400,140 V250 H0 Z;
                      M0,140 Q100,180 200,140 T400,140 V250 H0 Z;
                      M0,140 Q100,90 200,140 T400,140 V250 H0 Z"/>
          </path>
          <path d="M0,160 Q100,120 200,160 T400,160 V250 H0 Z" fill={fg} opacity=".4">
            <animate attributeName="d" dur="4s" repeatCount="indefinite"
              values="M0,160 Q100,120 200,160 T400,160 V250 H0 Z;
                      M0,160 Q100,200 200,160 T400,160 V250 H0 Z;
                      M0,160 Q100,120 200,160 T400,160 V250 H0 Z"/>
          </path>
        </svg>
      </div>
    );
  }
  if (kind === 'character') {
    // Stick figure walk
    return (
      <div style={{position:'absolute', inset:0, background: bg, display:'grid', placeItems:'center'}}>
        <svg width="40%" viewBox="0 0 100 140">
          <g stroke={fg} strokeWidth="3" strokeLinecap="round" fill="none">
            <circle cx="50" cy="22" r="12" fill={fg}/>
            <line x1="50" y1="34" x2="50" y2="80"/>
            <g style={{ transformOrigin:'50px 80px', animation:'mvLegL 0.8s ease-in-out infinite', animationPlayState:a}}>
              <line x1="50" y1="80" x2="40" y2="115"/>
              <line x1="40" y1="115" x2="36" y2="125"/>
            </g>
            <g style={{ transformOrigin:'50px 80px', animation:'mvLegR 0.8s ease-in-out infinite', animationPlayState:a}}>
              <line x1="50" y1="80" x2="60" y2="115"/>
              <line x1="60" y1="115" x2="64" y2="125"/>
            </g>
            <g style={{ transformOrigin:'50px 50px', animation:'mvArmL 0.8s ease-in-out infinite', animationPlayState:a}}>
              <line x1="50" y1="50" x2="38" y2="72"/>
            </g>
            <g style={{ transformOrigin:'50px 50px', animation:'mvArmR 0.8s ease-in-out infinite', animationPlayState:a}}>
              <line x1="50" y1="50" x2="62" y2="72"/>
            </g>
          </g>
        </svg>
      </div>
    );
  }
  if (kind === 'logo') {
    return (
      <div style={{position:'absolute', inset:0, background: bg, display:'grid', placeItems:'center'}}>
        <svg width="40%" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="40" fill="none" stroke={fg} strokeWidth="3"
            strokeDasharray="251" strokeDashoffset="0"
            style={{animation:'mvDash 3s ease-in-out infinite', animationPlayState:a}}/>
          <rect x="48" y="48" width="24" height="24" fill={fg}
            style={{transformOrigin:'60px 60px', animation:'mvSpin 4s ease-in-out infinite', animationPlayState:a}}/>
        </svg>
      </div>
    );
  }
  if (kind === 'particles') {
    return (
      <div style={{position:'absolute', inset:0, background: bg, overflow:'hidden'}}>
        {Array.from({length:24}).map((_,i)=>(
          <div key={i} style={{
            position:'absolute',
            left: `${(i*37)%100}%`,
            top: `${(i*53)%100}%`,
            width: 4 + (i%4)*2, height: 4 + (i%4)*2,
            borderRadius:'50%', background: fg, opacity:.3 + (i%5)*.1,
            animation:`mvFloat ${3 + (i%4)}s ease-in-out infinite`,
            animationDelay: `${(i*0.2)}s`,
            animationPlayState: a
          }}/>
        ))}
      </div>
    );
  }
  if (kind === 'liquid') {
    return (
      <div style={{position:'absolute', inset:0, background: bg, display:'grid', placeItems:'center'}}>
        <div style={{
          width:'55%', aspectRatio:'1', background: fg,
          borderRadius:'42% 58% 47% 53% / 50% 45% 55% 50%',
          animation:'mvLiquid 5s ease-in-out infinite', animationPlayState: a
        }}/>
      </div>
    );
  }
  // default: shape
  return (
    <div style={{position:'absolute', inset:0, background: bg, display:'grid', placeItems:'center'}}>
      <div style={{
        width:'40%', aspectRatio:'1', background: fg,
        animation:'mvSpin 4s linear infinite', animationPlayState: a
      }}/>
    </div>
  );
};

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('mv-keyframes')) {
  const s = document.createElement('style');
  s.id = 'mv-keyframes';
  s.textContent = `
    @keyframes mvSpin { to { transform: rotate(360deg); } }
    @keyframes mvBall { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-90px) scaleY(1.1); } }
    @keyframes mvMorph {
      0%,100% { border-radius: 0; transform: rotate(0); }
      33%     { border-radius: 50%; transform: rotate(120deg); }
      66%     { border-radius: 20% 60% 30% 70%; transform: rotate(240deg); }
    }
    @keyframes mvType {
      0%,30% { clip-path: inset(0 100% 0 0); }
      50%,80% { clip-path: inset(0 0 0 0); }
      100% { clip-path: inset(0 0 0 100%); }
    }
    @keyframes mvDash { 0%,100% { stroke-dashoffset: 251; } 50% { stroke-dashoffset: 0; } }
    @keyframes mvFloat { 0%,100% { transform: translate(0,0); } 50% { transform: translate(8px,-12px); } }
    @keyframes mvLiquid {
      0%,100% { border-radius: 42% 58% 47% 53% / 50% 45% 55% 50%; transform: rotate(0); }
      50%     { border-radius: 60% 40% 55% 45% / 38% 60% 40% 62%; transform: rotate(180deg); }
    }
    @keyframes mvLegL { 0%,100% { transform: rotate(20deg); } 50% { transform: rotate(-20deg); } }
    @keyframes mvLegR { 0%,100% { transform: rotate(-20deg); } 50% { transform: rotate(20deg); } }
    @keyframes mvArmL { 0%,100% { transform: rotate(-15deg); } 50% { transform: rotate(15deg); } }
    @keyframes mvArmR { 0%,100% { transform: rotate(15deg); } 50% { transform: rotate(-15deg); } }
  `;
  document.head.appendChild(s);
}

// ────────────── Comment Pin ──────────────
const CommentPin = ({ x, y, member, count = 1, open = false, onClick, comments = [] }) => (
  <>
    <button className={`pin ${member.cls}`} style={{ left: `${x}%`, top: `${y}%` }} onClick={onClick}>
      {count}
    </button>
    {open && (
      <div className="pin-popover" style={{ left: `calc(${x}% + 24px)`, top: `${y}%` }}>
        {comments.map((c, i) => (
          <div key={i} style={{ display:'flex', gap: 8, padding:'6px 0', borderTop: i ? '1px solid var(--line)' : 0 }}>
            <Avatar member={c.author} size={22} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap: 8 }}>
                <span style={{ fontWeight:600, fontSize:12 }}>{c.author.name}</span>
                <span className="t-meta" style={{ fontSize:10 }}>{c.time}</span>
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.45, color:'var(--ink-2)', marginTop:2 }}>{c.text}</div>
            </div>
          </div>
        ))}
        <div style={{ display:'flex', gap:6, marginTop: 8, paddingTop: 8, borderTop:'1px solid var(--line)' }}>
          <input placeholder="답글…" style={{
            flex:1, border:'1px solid var(--line)', borderRadius: 6, padding:'5px 8px',
            fontSize: 12, fontFamily:'inherit', outline:'none'
          }}/>
          <button className="btn sm">↵</button>
        </div>
      </div>
    )}
  </>
);

// ────────────── Reaction bar ──────────────
const REACTION_SET = ['👏', '🔥', '🤯', '💯', '🥲'];

const ReactionBar = ({ reactions = {}, onReact }) => (
  <div style={{ display:'flex', gap: 4, flexWrap:'wrap' }}>
    {REACTION_SET.map(e => {
      const count = reactions[e] || 0;
      if (!count && !onReact) return null;
      return (
        <button key={e}
          className={`reaction ${count ? 'active' : ''}`}
          onClick={() => onReact?.(e)}>
          <span className="emoji">{e}</span>
          {count > 0 && <span>{count}</span>}
        </button>
      );
    })}
  </div>
);

// ────────────── Tag chip ──────────────
const Tag = ({ children }) => (
  <span className="chip tag"><Icon name="hash" size={10} stroke={2}/>{children}</span>
);

// Export to window
Object.assign(window, {
  MEMBERS, MEMBER_BY_ID,
  Icon, Avatar, VideoFrame, MockVideoCanvas,
  CommentPin, ReactionBar, REACTION_SET, Tag,
});
