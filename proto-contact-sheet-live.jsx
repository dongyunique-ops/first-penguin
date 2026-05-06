// proto-contact-sheet-live.jsx — Supabase-backed contact sheet.
// Same UX as proto-contact-sheet but writes to Supabase, listens for realtime updates,
// and uploads videos to Storage instead of object URLs.

const ContactSheetLive = ({ tweaks, viewKey, setViewKey, navigate, me, members, days, openPlayer }) => {
  const day = days[viewKey] || { dateKey: viewKey, dayNum: 0, subs: members.map(m => ({ memberId: m.id, missing: true })) };
  const date = fromKey(viewKey);
  const isToday = viewKey === todayKey();
  const submitted = day.subs.filter(s => !s.missing).length;
  const total = members.length;

  const [uploading, setUploading] = React.useState(null); // memberId being uploaded for

  const handleUpload = async (memberId, file) => {
    if (memberId !== me.id) {
      alert('본인 슬롯에만 업로드할 수 있어요.');
      return;
    }
    setUploading(memberId);
    try {
      await uploadSubmission({
        memberId, dayKey: viewKey, file,
        title: file.name.replace(/\.[^.]+$/, ''),
        tags: [],
      });
    } catch (e) {
      alert('업로드 실패: ' + e.message);
    } finally {
      setUploading(null);
    }
  };

  const handleReaction = async (sub, emoji) => {
    const mineKey = sub.reactions?.__mine?.[emoji];
    await toggleReaction({
      submissionId: sub.id, memberId: me.id, emoji, on: !mineKey,
    });
  };

  // Step viewKey by N days
  const stepDay = (delta) => {
    const d = fromKey(viewKey);
    d.setDate(d.getDate() + delta);
    setViewKey(toKey(d));
  };

  return (
    <div style={{
      padding: '24px 36px 60px',
      fontFamily: 'var(--font-sans)',
      display: 'flex', flexDirection: 'column', gap: 22,
    }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
        <div>
          <div className="t-eyebrow">{isToday ? '오늘' : '지난 날'} · 컨택트 시트</div>
          <h1 className="t-display" style={{ margin: '4px 0 0', fontSize: 56, lineHeight: 1 }}>
            {fmtDate(date)}
          </h1>
        </div>
        <div style={{ flex: 1 }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="btn sm" onClick={() => stepDay(-1)}>
            <Icon name="chevronL" size={11}/>이전
          </button>
          <button className="btn sm" onClick={() => setViewKey(todayKey())}
            disabled={isToday}>오늘</button>
          <button className="btn sm" onClick={() => stepDay(1)} disabled={isToday}>
            다음<Icon name="chevronR" size={11}/>
          </button>
        </div>
      </header>

      {/* Status bar */}
      <div className="panel" style={{
        padding: '12px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--ink)', color: 'white',
          display: 'grid', placeItems: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
        }}>{submitted}/{total}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {submitted === total ? '오늘 모두 제출 완료' :
             submitted === 0 ? '아직 아무도 안 올렸어요' :
             `${submitted}명 제출, ${total - submitted}명 대기 중`}
          </div>
          <div className="t-meta">실시간 동기화 · 변경사항 자동 반영</div>
        </div>
        <div style={{ flex: 1 }}/>
        {/* Live status dots */}
        <div style={{ display: 'flex', gap: 4 }}>
          {members.map(m => {
            const sub = day.subs.find(s => s.memberId === m.id);
            const submitted = sub && !sub.missing;
            return (
              <div key={m.id} title={`${m.name} · ${submitted ? '제출' : '대기'}`}
                style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: submitted ? m.color : 'transparent',
                  border: `2px solid ${submitted ? m.color : 'var(--line)'}`,
                }}/>
            );
          })}
        </div>
      </div>

      {/* The 4-up grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 16,
      }}>
        {members.map(m => {
          const sub = day.subs.find(s => s.memberId === m.id) || { memberId: m.id, missing: true };
          return (
            <SlotLive
              key={m.id}
              member={m}
              sub={sub}
              isMe={m.id === me.id}
              uploading={uploading === m.id}
              onUpload={(f) => handleUpload(m.id, f)}
              onReact={(emoji) => handleReaction(sub, emoji)}
              onOpen={() => sub.id && openPlayer(sub, viewKey)}
              filmGrain={tweaks.filmGrain}
            />
          );
        })}
      </div>
    </div>
  );
};

const SlotLive = ({ member, sub, isMe, uploading, onUpload, onReact, onOpen, filmGrain }) => {
  const [hover, setHover] = React.useState(false);
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onUpload(f);
  };

  const submitted = !sub.missing;
  const reactions = sub.reactions || {};
  const myReactions = reactions.__mine || {};
  const reactionEntries = Object.entries(reactions).filter(([k]) => !k.startsWith('__'));

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDragOver={(e) => { if (isMe) { e.preventDefault(); setDrag(true); } }}
      onDragLeave={() => setDrag(false)}
      onDrop={isMe ? handleDrop : undefined}
      style={{
        background: 'white',
        borderRadius: 12,
        border: drag ? '2px dashed var(--accent)' : '1px solid var(--line)',
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        overflow: 'hidden',
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: '.15s',
        position: 'relative',
      }}>
      {/* Slot header */}
      <div style={{
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid var(--line)',
      }}>
        <Avatar member={member} size={26}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {member.name} {isMe && <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>· 나</span>}
          </div>
          <div className="t-meta" style={{ fontSize: 11 }}>
            {submitted ? sub.title : (isMe ? '드래그해서 업로드' : '대기 중')}
          </div>
        </div>
        {submitted && sub.duration && (
          <span className="t-mono" style={{
            fontSize: 10, padding: '2px 6px',
            background: 'var(--bg-2)', borderRadius: 3,
          }}>{sub.duration}</span>
        )}
      </div>

      {/* Body */}
      {submitted ? (
        <button onClick={onOpen} style={{
          all: 'unset', cursor: 'pointer', display: 'block', width: '100%',
        }}>
          <ProtoVideo
            submission={sub}
            isPlaying={hover}
            muted
            style={{ aspectRatio: '16/10', borderRadius: 0 }}
          />
        </button>
      ) : (
        <div
          onClick={() => isMe && inputRef.current?.click()}
          style={{
            aspectRatio: '16/10',
            background: drag ? 'rgba(255,90,31,0.08)' : 'var(--bg-2)',
            display: 'grid', placeItems: 'center',
            cursor: isMe ? 'pointer' : 'default',
            color: 'var(--ink-3)',
          }}>
          {uploading ? (
            <div style={{ textAlign: 'center' }}>
              <div className="t-mono" style={{ fontSize: 12 }}>업로드 중...</div>
            </div>
          ) : isMe ? (
            <div style={{ textAlign: 'center' }}>
              <Icon name="upload" size={28}/>
              <div className="t-mono" style={{ fontSize: 12, marginTop: 8 }}>
                클릭 또는 드래그
              </div>
            </div>
          ) : (
            <div className="t-mono" style={{ fontSize: 12, opacity: 0.5 }}>대기 중</div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files[0] && onUpload(e.target.files[0])}
          />
        </div>
      )}

      {/* Footer: reactions + tags */}
      {submitted && (
        <div style={{
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 8,
          flexWrap: 'wrap',
          borderTop: '1px solid var(--line)',
        }}>
          {(sub.tags || []).slice(0, 3).map(t => <Tag key={t}>{t}</Tag>)}
          <div style={{ flex: 1 }}/>
          <div style={{ display: 'flex', gap: 4 }}>
            {['🔥', '💡', '👏', '😂'].map(emoji => (
              <button key={emoji}
                onClick={(e) => { e.stopPropagation(); onReact(emoji); }}
                style={{
                  all: 'unset', cursor: 'pointer',
                  padding: '3px 8px', borderRadius: 999,
                  fontSize: 12,
                  border: myReactions[emoji] ? '1px solid var(--accent)' : '1px solid var(--line)',
                  background: myReactions[emoji] ? 'rgba(255,90,31,0.08)' : 'white',
                }}>
                {emoji}{reactions[emoji] ? <span style={{
                  marginLeft: 3, fontFamily: 'var(--font-mono)', fontSize: 10,
                }}>{reactions[emoji]}</span> : null}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { ContactSheetLive });
