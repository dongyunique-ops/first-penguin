// proto-player.jsx — Fullscreen-ish review player overlay.
// Opens when a frame is clicked. Big video, real controls, timeline with
// pin markers placed at each comment's timestamp; hover/click marker to
// jump there and read the comment. Add new pins by clicking the video.

const PlayerOverlay = ({ open, sub, member, members, onClose, currentUserId, viewerMode, onAddPin, onToggleReaction, onJumpDay }) => {
  const [playing, setPlaying] = React.useState(true);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(parseDuration(sub?.duration));
  const [muted, setMuted] = React.useState(true);
  const [loop, setLoop] = React.useState(true);
  const [speed, setSpeed] = React.useState(1);
  const [addingPin, setAddingPin] = React.useState(false);
  const [draftPin, setDraftPin] = React.useState(null);
  const [draftText, setDraftText] = React.useState('');
  const [openPin, setOpenPin] = React.useState(null);
  const [tab, setTab] = React.useState('comments'); // 'comments' | 'pins'
  const videoElRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) {
      setPlaying(true); setCurrentTime(0);
      setAddingPin(false); setDraftPin(null); setDraftText(''); setOpenPin(null);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (draftPin) { setDraftPin(null); setDraftText(''); setAddingPin(false); }
        else if (openPin) setOpenPin(null);
        else onClose();
      }
      if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p); }
      if (e.key === 'm') setMuted(m => !m);
      if (e.key === 'l') setLoop(l => !l);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, draftPin, openPin, onClose]);

  if (!open || !sub) return null;

  const dur = duration || parseDuration(sub.duration) || 8;
  const pct = Math.min(100, (currentTime / dur) * 100);

  const handleVideoClick = (e) => {
    if (!addingPin) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setDraftPin({ x, y, t: currentTime });
    setDraftText('');
    setPlaying(false);
  };

  const submitDraft = () => {
    if (!draftPin || !draftText.trim()) { setDraftPin(null); setAddingPin(false); return; }
    onAddPin({
      id: `p-${Date.now()}`,
      x: draftPin.x, y: draftPin.y,
      t: formatTime(draftPin.t),
      tSec: draftPin.t,
      comments: [{ author: currentUserId, time: '방금', text: draftText.trim() }],
    });
    setDraftPin(null); setDraftText(''); setAddingPin(false);
  };

  const seekTo = (sec) => {
    setCurrentTime(sec);
    if (videoElRef.current) videoElRef.current.currentTime = sec;
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex: 1000,
      background:'rgba(15,14,12,0.92)',
      backdropFilter:'blur(8px)',
      display:'grid', gridTemplateColumns: '1fr 360px',
      fontFamily:'var(--font-sans)',
      animation:'fpFade .18s ease-out',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Left: stage */}
      <div style={{ display:'flex', flexDirection:'column', minHeight: 0 }}>
        {/* Top bar */}
        <div style={{
          display:'flex', alignItems:'center', gap: 12,
          padding:'14px 24px', color:'#fff7e6',
        }}>
          <Avatar member={member} size={32}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{member.name}</div>
            <div style={{ fontSize: 11, color:'rgba(255,247,230,.55)', fontFamily:'var(--font-mono)' }}>
              {sub.title} · {sub.format?.toUpperCase()} · {sub.duration} · 제출 {sub.submittedAt}
            </div>
          </div>
          <div style={{ display:'flex', gap: 4 }}>
            {sub.tags?.map(t => (
              <span key={t} className="chip tag" style={{ borderColor:'rgba(255,255,255,.2)', color:'rgba(255,247,230,.8)' }}>
                <Icon name="hash" size={10} stroke={2}/>{t}
              </span>
            ))}
          </div>
          <button onClick={onClose}
            style={{
              all:'unset', cursor:'pointer',
              width: 36, height: 36, borderRadius: 8,
              display:'grid', placeItems:'center',
              color:'rgba(255,247,230,.8)',
              background:'rgba(255,255,255,.06)',
            }}>✕</button>
        </div>

        {/* Video */}
        <div style={{ flex: 1, padding:'0 24px 12px', display:'grid', placeItems:'center', minHeight: 0 }}>
          <div style={{
            position:'relative', maxWidth:'100%', maxHeight:'100%',
            aspectRatio:'16/9', width:'100%', borderRadius: 8, overflow:'hidden',
            cursor: addingPin ? 'crosshair' : 'default',
            boxShadow:'0 30px 80px rgba(0,0,0,.5)',
          }}
            onClick={handleVideoClick}>
            <PlayerVideo
              ref={videoElRef}
              submission={sub}
              isPlaying={playing && !draftPin}
              muted={muted} loop={loop} speed={speed}
              onLoaded={(d) => setDuration(d)}
              onTime={(t) => setCurrentTime(t)}/>

            {/* Existing pins */}
            {sub.pins?.map(p => (
              <CommentPin key={p.id}
                x={p.x} y={p.y}
                member={MEMBER_BY_ID[p.comments[0].author]}
                count={p.comments.length}
                open={openPin === p.id}
                onClick={(e) => { e.stopPropagation(); setOpenPin(o => o === p.id ? null : p.id); seekTo(p.tSec ?? parseTime(p.t)); }}
                comments={p.comments.map(c => ({ ...c, author: MEMBER_BY_ID[c.author] }))}/>
            ))}

            {/* Draft */}
            {draftPin && (
              <DraftPin
                x={draftPin.x} y={draftPin.y}
                text={draftText} setText={setDraftText}
                currentUser={MEMBER_BY_ID[currentUserId]}
                onSubmit={submitDraft}
                onCancel={() => { setDraftPin(null); setDraftText(''); setAddingPin(false); }}/>
            )}

            {/* Crosshair guide */}
            {addingPin && !draftPin && (
              <div style={{
                position:'absolute', inset:0, pointerEvents:'none',
                boxShadow:'inset 0 0 0 2px var(--accent)',
                background:'rgba(255,90,31,.08)',
              }}>
                <div style={{
                  position:'absolute', top: 12, left: 12,
                  padding:'4px 10px', borderRadius: 4,
                  background:'var(--accent)', color:'white',
                  fontSize: 11, fontWeight: 600, letterSpacing:'0.04em',
                  fontFamily:'var(--font-mono)',
                }}>이 시점({formatTime(currentTime)})에서 클릭하여 핀 찍기</div>
              </div>
            )}
          </div>
        </div>

        {/* Control bar */}
        <div style={{
          padding:'8px 24px 24px',
          display:'flex', flexDirection:'column', gap: 10,
        }}>
          {/* Timeline w/ pin markers */}
          <div style={{ position:'relative', height: 28, padding:'10px 0' }}>
            <div
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                const t = ((e.clientX - r.left) / r.width) * dur;
                seekTo(t);
              }}
              style={{
                height: 6, background:'rgba(255,255,255,.16)', borderRadius: 3,
                cursor:'pointer', position:'relative',
              }}>
              <div style={{
                position:'absolute', inset: '0 auto 0 0', width: `${pct}%`,
                background:'#fff7e6', borderRadius: 3,
              }}/>
              {/* Pin markers */}
              {sub.pins?.map(p => {
                const ts = p.tSec ?? parseTime(p.t);
                const author = MEMBER_BY_ID[p.comments[0].author];
                const left = (ts / dur) * 100;
                return (
                  <button key={p.id}
                    onClick={(e) => { e.stopPropagation(); seekTo(ts); setOpenPin(p.id); }}
                    title={`${p.t} · ${author.name}: ${p.comments[0].text}`}
                    style={{
                      all:'unset', cursor:'pointer',
                      position:'absolute', top: -5, left: `${left}%`,
                      width: 16, height: 16, marginLeft: -8,
                      borderRadius:'50%',
                      background: author.color,
                      border:'2px solid #fff7e6',
                      boxShadow:'0 2px 6px rgba(0,0,0,.4)',
                    }}/>
                );
              })}
              {/* Playhead */}
              <div style={{
                position:'absolute', top: -6, left: `${pct}%`,
                width: 18, height: 18, marginLeft: -9, borderRadius:'50%',
                background:'#fff7e6', boxShadow:'0 2px 8px rgba(0,0,0,.5)',
                pointerEvents:'none',
              }}/>
            </div>
          </div>

          <div style={{
            display:'flex', alignItems:'center', gap: 10,
            color:'#fff7e6',
          }}>
            <button style={ctrlLg} onClick={() => setPlaying(p => !p)}>
              <Icon name={playing && !draftPin ? 'pause' : 'play'} size={14}/>
            </button>
            <span className="t-mono" style={{ fontSize: 12, color:'rgba(255,247,230,.85)', minWidth: 80 }}>
              {formatTime(currentTime)} / {formatTime(dur)}
            </span>

            <div style={{ flex: 1 }}/>

            <button style={ctrlSm(loop)} onClick={() => setLoop(l => !l)} title="루프">
              <Icon name="loop" size={13}/>
            </button>
            <SpeedButton speed={speed} setSpeed={setSpeed}/>
            <button style={ctrlSm(false)} onClick={() => setMuted(m => !m)} title="음소거">
              <Icon name={muted ? 'mute' : 'sound'} size={13}/>
            </button>
            <button style={ctrlSm(false)} onClick={() => {
              if (sub.videoUrl) {
                const a = document.createElement('a');
                a.href = sub.videoUrl; a.download = sub.videoName || `${member.name}-${sub.title}.mp4`;
                a.click();
              } else {
                alert('이 작업물은 다운로드할 파일이 없어요 (목업 데이터).');
              }
            }} title="다운로드">
              <Icon name="download" size={13}/>
            </button>

            <div style={{ width: 1, height: 18, background:'rgba(255,255,255,.15)', margin:'0 4px' }}/>

            <button
              onClick={() => { setAddingPin(a => !a); setPlaying(false); }}
              style={{
                ...ctrlSm(addingPin),
                paddingLeft: 10, paddingRight: 12,
                width: 'auto', gap: 6,
                background: addingPin ? 'var(--accent)' : 'rgba(255,255,255,.1)',
                color: addingPin ? 'white' : '#fff7e6',
              }}>
              <Icon name="pin" size={12} stroke={2}/>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{addingPin ? '취소' : '핀 추가'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right: comments + reactions */}
      <aside style={{
        background:'#1a1812', color:'#fff7e6',
        display:'flex', flexDirection:'column', minHeight: 0,
        borderLeft:'1px solid rgba(255,255,255,.08)',
      }}>
        <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
          <div className="t-eyebrow" style={{ color:'rgba(255,247,230,.5)', marginBottom: 6 }}>
            반응 · {Object.entries(sub.reactions || {}).filter(([k])=>!k.startsWith('__')).reduce((a,[,v])=>a+v,0)}
          </div>
          <ReactionRowDark reactions={sub.reactions} currentUserId={currentUserId} onToggle={onToggleReaction}/>
        </div>

        {/* Tabs */}
        <div style={{
          display:'flex', gap: 4, padding:'10px 16px 0',
          borderBottom:'1px solid rgba(255,255,255,.06)',
        }}>
          <TabBtn active={tab === 'comments'} onClick={() => setTab('comments')}
            label="댓글" count={(sub.comments?.length || 0)}/>
          <TabBtn active={tab === 'pins'} onClick={() => setTab('pins')}
            label="핀" count={(sub.pins?.length || 0)}/>
        </div>

        {tab === 'comments' && (
          <CommentsPanel
            submissionId={sub.id}
            comments={sub.comments || []}
            members={members || []}
            me={currentUserId ? { id: currentUserId } : null}
            viewerMode={viewerMode}
            currentTime={currentTime}
            seekTo={seekTo}
          />
        )}

        {tab === 'pins' && (
          <div style={{
            flex: 1, overflowY:'auto', padding:'14px 20px',
            display:'flex', flexDirection:'column', gap: 12, minHeight: 0,
          }} className="scroll">
            {(!sub.pins || sub.pins.length === 0) && (
              <div style={{ fontSize: 12, color:'rgba(255,247,230,.4)', lineHeight: 1.5 }}>
                아직 핀이 없습니다.<br/>
                영상의 특정 지점에 <span style={{ color:'var(--accent)' }}>[핀 추가]</span>를 눌러 피드백을 남겨보세요.
              </div>
            )}
            {(sub.pins || []).slice().sort((a,b) => (a.tSec ?? parseTime(a.t)) - (b.tSec ?? parseTime(b.t))).map(p => {
              const author = (members || []).find(m => m.id === p.comments[0].author) || MEMBER_BY_ID[p.comments[0].author];
              const ts = p.tSec ?? parseTime(p.t);
              return (
                <button key={p.id}
                  onClick={() => { seekTo(ts); setOpenPin(p.id); }}
                  style={{
                    all:'unset', cursor:'pointer',
                    padding: 10, borderRadius: 8,
                    background: openPin === p.id ? 'rgba(255,90,31,.12)' : 'rgba(255,255,255,.04)',
                    border: `1px solid ${openPin === p.id ? 'var(--accent)' : 'rgba(255,255,255,.06)'}`,
                    display:'flex', flexDirection:'column', gap: 6,
                  }}>
                  <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                    <Avatar member={author} size={20}/>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{author?.name}</span>
                    <span className="t-mono" style={{
                      fontSize: 10, padding:'1px 6px', borderRadius: 3,
                      background:'rgba(255,255,255,.08)', color:'rgba(255,247,230,.7)',
                    }}>@{p.t}</span>
                    <span className="t-meta" style={{ fontSize: 10, color:'rgba(255,247,230,.4)', marginLeft:'auto' }}>
                      {p.comments[0].time}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color:'rgba(255,247,230,.85)' }}>
                    {p.comments[0].text}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </aside>
    </div>
  );
};

const PlayerVideo = React.forwardRef(({ submission, isPlaying, muted, loop, speed, onLoaded, onTime }, ref) => {
  const localRef = React.useRef(null);
  const v = ref || localRef;
  React.useEffect(() => {
    if (!v.current) return;
    if (isPlaying) v.current.play?.().catch(()=>{}); else v.current.pause?.();
  }, [isPlaying]);
  React.useEffect(() => { if (v.current) v.current.playbackRate = speed; }, [speed]);

  if (submission.videoUrl && submission.videoMime?.startsWith('image/')) {
    return <img src={submission.videoUrl} alt=""
      style={{ width:'100%', height:'100%', objectFit:'contain', background:'#0e0e0c', display:'block' }}/>;
  }
  if (submission.videoUrl) {
    return (
      <video
        ref={v}
        src={submission.videoUrl}
        autoPlay muted={muted} loop={loop} playsInline
        onLoadedMetadata={(e) => onLoaded?.(e.target.duration)}
        onTimeUpdate={(e) => onTime?.(e.target.currentTime)}
        style={{ width:'100%', height:'100%', objectFit:'contain', background:'#0e0e0c', display:'block' }}/>
    );
  }
  // Mock fallback — drive currentTime ourselves
  React.useEffect(() => {
    if (!isPlaying) return;
    const dur = parseDuration(submission?.duration) || 8;
    let raf, last = performance.now(), t = 0;
    onLoaded?.(dur);
    const tick = (now) => {
      const dt = (now - last) / 1000; last = now;
      t = (t + dt * (speed || 1)) % dur;
      onTime?.(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, submission, speed]);
  return (
    <div style={{ width:'100%', height:'100%' }}>
      <MockVideoCanvas kind={submission.kind} tone={submission.tone} isPlaying={isPlaying}/>
    </div>
  );
});

const TabBtn = ({ active, onClick, label, count }) => (
  <button onClick={onClick}
    style={{
      all:'unset', cursor:'pointer',
      padding:'8px 14px',
      fontSize: 12, fontWeight: 600,
      color: active ? 'var(--accent)' : 'rgba(255,247,230,.55)',
      borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
      marginBottom: -1,
      display:'inline-flex', alignItems:'center', gap: 5,
    }}>
    {label}
    <span style={{
      fontFamily:'var(--font-mono)', fontSize: 10,
      color: active ? 'var(--accent)' : 'rgba(255,247,230,.4)',
    }}>{count}</span>
  </button>
);

const ctrlLg = {
  all:'unset', cursor:'pointer', width: 38, height: 38, borderRadius:'50%',
  background:'#fff7e6', color:'var(--ink)',
  display:'grid', placeItems:'center',
};
const ctrlSm = (active) => ({
  all:'unset', cursor:'pointer', width: 30, height: 30, borderRadius: 8,
  background: active ? 'rgba(255,90,31,.2)' : 'rgba(255,255,255,.06)',
  color: active ? 'var(--accent)' : '#fff7e6',
  display:'inline-flex', alignItems:'center', justifyContent:'center',
});

const SpeedButton = ({ speed, setSpeed }) => {
  const [open, setOpen] = React.useState(false);
  const opts = [0.5, 0.75, 1, 1.25, 1.5, 2];
  return (
    <div style={{ position:'relative' }}>
      <button style={{...ctrlSm(speed !== 1), width:'auto', padding:'0 10px', gap: 4 }}
        onClick={() => setOpen(o => !o)}>
        <Icon name="speed" size={12}/>
        <span style={{ fontSize: 11, fontFamily:'var(--font-mono)', fontWeight: 600 }}>{speed}×</span>
      </button>
      {open && (
        <div style={{
          position:'absolute', bottom:'calc(100% + 6px)', right: 0,
          background:'#23201a', borderRadius: 8, padding: 4,
          border:'1px solid rgba(255,255,255,.1)', zIndex: 5,
        }} onMouseLeave={() => setOpen(false)}>
          {opts.map(o => (
            <button key={o} onClick={() => { setSpeed(o); setOpen(false); }}
              style={{
                all:'unset', cursor:'pointer', display:'block',
                padding:'5px 14px', fontSize: 12, fontFamily:'var(--font-mono)',
                color: speed === o ? 'var(--accent)' : '#fff7e6',
                fontWeight: speed === o ? 600 : 400,
                borderRadius: 4,
              }}>{o}×</button>
          ))}
        </div>
      )}
    </div>
  );
};

const ReactionRowDark = ({ reactions = {}, currentUserId, onToggle }) => (
  <div style={{ display:'flex', gap: 6, flexWrap:'wrap' }}>
    {REACTION_SET.map(e => {
      const count = reactions[e] || 0;
      const me = (reactions[`__${e}__by`] || []).includes(currentUserId);
      return (
        <button key={e}
          onClick={() => onToggle(e)}
          style={{
            all:'unset', cursor:'pointer',
            display:'inline-flex', alignItems:'center', gap: 5,
            height: 28, padding:'0 12px',
            borderRadius: 999,
            background: me ? 'rgba(255,90,31,.18)' : 'rgba(255,255,255,.06)',
            border: `1px solid ${me ? 'var(--accent)' : 'rgba(255,255,255,.08)'}`,
            color: me ? 'var(--accent)' : '#fff7e6',
            fontSize: 12, fontWeight: 500,
          }}>
          <span style={{ fontSize: 14 }}>{e}</span>
          {count > 0 && <span>{count}</span>}
        </button>
      );
    })}
  </div>
);

function parseDuration(s) {
  if (!s || s === '—') return 0;
  const [m, sec] = s.split(':').map(Number);
  return m * 60 + (sec || 0);
}
function parseTime(s) { return parseDuration(s); }
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2,'0')}`;
}

// Inject overlay animation
if (typeof document !== 'undefined' && !document.getElementById('fp-player-keyframes')) {
  const s = document.createElement('style');
  s.id = 'fp-player-keyframes';
  s.textContent = `@keyframes fpFade { from { opacity: 0; } to { opacity: 1; } }`;
  document.head.appendChild(s);
}

Object.assign(window, { PlayerOverlay, parseDuration, parseTime, formatTime });
