// proto-contact-sheet.jsx — The "Today" view, fully interactive.

const useStore = () => {
  const [state, setState] = React.useState(initialState);
  React.useEffect(() => { saveState(state); }, [state]);

  const patch = (k, memberId, fn) => setState(s => {
    const day = s.days[k] || { dayNum: 0, dateKey: k, subs: MEMBERS.map(m => ({ memberId: m.id, missing: true })) };
    const subs = day.subs.map(sub => sub.memberId === memberId ? fn(sub) : sub);
    return { ...s, days: { ...s.days, [k]: { ...day, subs } } };
  });

  return [state, setState, patch];
};

const ContactSheetPage = ({ tweaks, viewKey, setViewKey, navigate }) => {
  const [state, setState, patch] = useStore();
  // Auto-create an empty day if missing — so today (or any date) always has 4 slots.
  React.useEffect(() => {
    if (!state.days[viewKey]) {
      setState(s => ({
        ...s,
        days: {
          ...s.days,
          [viewKey]: {
            dayNum: 0, dateKey: viewKey,
            subs: MEMBERS.map(m => ({ memberId: m.id, missing: true })),
          },
        },
      }));
    }
  }, [viewKey, state.days, setState]);
  const day = state.days[viewKey] || { dayNum: 0, dateKey: viewKey, subs: MEMBERS.map(m => ({ memberId: m.id, missing: true })) };
  const date = fromKey(viewKey);
  const isToday = viewKey === todayKey();

  // Apply submission-state tweak (override how many submitted today)
  const displaySubs = React.useMemo(() => {
    if (!isToday || tweaks.submissionState === 'real') return day.subs;
    const targets = { 'all': 4, '3': 3, '2': 2, 'none': 0 }[tweaks.submissionState] ?? day.subs.filter(s=>!s.missing).length;
    let count = 0;
    return day.subs.map((s, i) => {
      if (count < targets && (s.missing || true)) {
        // synthesize a sub if missing
        if (s.missing) {
          count++;
          return { ...seedSubmission(MEMBERS[i], i, 0, date), memberId: s.memberId };
        }
        count++;
        return s;
      }
      return { memberId: s.memberId, missing: true };
    });
  }, [day, tweaks.submissionState, isToday, viewKey]);

  const submittedCount = displaySubs.filter(s => !s.missing).length;

  // Pin-add mode: click on frame to add a comment
  const [addPinFor, setAddPinFor] = React.useState(null); // memberId
  const [openPin, setOpenPin] = React.useState(null);     // `${memberId}-${pinId}`
  const [draftPin, setDraftPin] = React.useState(null);   // { memberId, x, y }
  const [draftText, setDraftText] = React.useState('');
  const [activePlayer, setActivePlayer] = React.useState(null); // memberId | null

  // Navigate days
  const goDay = (delta) => {
    const d = fromKey(viewKey);
    d.setDate(d.getDate() + delta);
    setViewKey(dateKey(d));
    setOpenPin(null); setAddPinFor(null); setDraftPin(null); setActivePlayer(null);
  };

  // Add comment pin
  const onFrameClick = (memberId, e) => {
    if (addPinFor !== memberId) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setDraftPin({ memberId, x, y });
    setDraftText('');
  };
  const submitDraftPin = () => {
    if (!draftPin || !draftText.trim()) { setDraftPin(null); setAddPinFor(null); return; }
    patch(viewKey, draftPin.memberId, sub => ({
      ...sub,
      pins: [...(sub.pins || []), {
        id: `p-${Date.now()}`,
        x: draftPin.x, y: draftPin.y, t: '0:00',
        comments: [{ author: state.currentUserId, time: '방금', text: draftText.trim() }],
      }],
    }));
    setDraftPin(null); setDraftText(''); setAddPinFor(null);
  };

  // Toggle reaction
  const toggleReaction = (memberId, emoji) => {
    patch(viewKey, memberId, sub => {
      const r = { ...(sub.reactions || {}) };
      const byKey = `__${emoji}__by`;
      const by = r[byKey] || [];
      const me = state.currentUserId;
      if (by.includes(me)) {
        r[byKey] = by.filter(x => x !== me);
        r[emoji] = Math.max(0, (r[emoji] || 1) - 1);
        if (r[emoji] === 0) { delete r[emoji]; delete r[byKey]; }
      } else {
        r[byKey] = [...by, me];
        r[emoji] = (r[emoji] || 0) + 1;
      }
      return { ...sub, reactions: r };
    });
  };

  // File drop / pick
  const handleFile = async (memberId, file) => {
    const subPatch = await fileToSubmission(file);
    patch(viewKey, memberId, sub => {
      if (sub.missing) {
        // Promote a missing slot into a real submission
        return {
          memberId,
          ...subPatch,
          title: file.name.replace(/\.[^.]+$/, ''),
          tags: ['업로드'],
          duration: '—',
          submittedAt: new Date().toTimeString().slice(0,5),
          onTime: true,
          pins: [],
          reactions: {},
        };
      }
      return { ...sub, ...subPatch };
    });
  };

  return (
    <div style={{
      width: 1280, minHeight: 820,
      background: 'var(--bg)',
      padding: '24px 36px 36px',
      fontFamily: 'var(--font-sans)',
      display: 'flex', flexDirection: 'column', gap: 18,
    }}>
      <ProtoHeader
        viewKey={viewKey} day={day} isToday={isToday}
        submittedCount={submittedCount}
        goDay={goDay} navigate={navigate}/>

      {/* Filmstrip */}
      <Filmstrip
        subs={displaySubs}
        tweaks={tweaks}
        addPinFor={addPinFor}
        setAddPinFor={setAddPinFor}
        openPin={openPin}
        setOpenPin={setOpenPin}
        draftPin={draftPin}
        setDraftPin={setDraftPin}
        draftText={draftText}
        setDraftText={setDraftText}
        submitDraftPin={submitDraftPin}
        onFrameClick={onFrameClick}
        activePlayer={activePlayer}
        setActivePlayer={setActivePlayer}
        handleFile={handleFile}
        currentUserId={state.currentUserId}
        viewKey={viewKey}
        setState={setState}/>

      {/* Captions */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 16 }}>
        {displaySubs.map((sub, i) => (
          <ContactCaption2
            key={MEMBERS[i].id}
            sub={sub}
            member={MEMBERS[i]}
            currentUserId={state.currentUserId}
            onToggleReaction={(e) => toggleReaction(MEMBERS[i].id, e)}
            onAddPin={() => setAddPinFor(MEMBERS[i].id)}
            isAddingPin={addPinFor === MEMBERS[i].id}/>
        ))}
      </div>
    </div>
  );
};

const ProtoHeader = ({ viewKey, day, isToday, submittedCount, goDay, navigate }) => {
  const date = fromKey(viewKey);
  return (
    <header style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap: 24 }}>
      <div>
        <div className="t-eyebrow">CONTACT SHEET · ROLL {String(day.dayNum || 0).padStart(3, '0')}</div>
        <h1 className="t-display" style={{ margin:'4px 0 0', fontSize: 44 }}>
          {date.getFullYear()} · {String(date.getMonth()+1).padStart(2,'0')} · {String(date.getDate()).padStart(2,'0')}
          <span style={{
            fontFamily:'var(--font-sans)', fontSize: 14, fontWeight: 500,
            color: isToday ? 'var(--accent)' : 'var(--ink-3)',
            marginLeft: 14, letterSpacing: 0,
          }}>
            {isToday ? '오늘' : `${wkday(date)}요일`}
          </span>
        </h1>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
        <span className="t-mono" style={{ color:'var(--ink-2)', marginRight: 6 }}>
          {submittedCount} / 4 submitted
        </span>
        <button className="btn icon" onClick={() => goDay(-1)} title="어제"><Icon name="chevronL"/></button>
        <button className="btn icon" onClick={() => goDay(+1)} disabled={isToday}
          style={{ opacity: isToday ? .4 : 1 }} title="내일"><Icon name="chevronR"/></button>
        {!isToday && <button className="btn sm" onClick={() => navigate('today')}><Icon name="home" size={11}/>오늘로</button>}
        <div style={{ width: 8 }}/>
        <button className="btn" onClick={() => navigate('archive')}><Icon name="archive" size={14}/>The Roll</button>
      </div>
    </header>
  );
};

const Filmstrip = ({
  subs, tweaks, addPinFor, setAddPinFor, openPin, setOpenPin,
  draftPin, setDraftPin, draftText, setDraftText, submitDraftPin,
  onFrameClick, activePlayer, setActivePlayer, handleFile, currentUserId, viewKey, setState,
}) => {
  return (
    <div style={{
      background: '#15140f',
      borderRadius: 6,
      padding: '14px 16px',
      position: 'relative',
      boxShadow: 'var(--shadow-md)',
    }}>
      {/* Top sprockets */}
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 10 }}>
        {Array.from({length: 28}).map((_,i)=>(
          <div key={i} style={{ width: 12, height: 8, background: 'var(--bg)', borderRadius: 1 }}/>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 10 }}>
        {subs.map((sub, i) => {
          const member = MEMBERS[i];
          const isPlayingOnly = activePlayer === member.id;
          const empty = sub.missing;
          return (
            <div key={member.id} style={{ position:'relative' }}>
              {/* Frame label / stamp */}
              <FrameStamp index={i} member={member} sub={sub}/>

              {empty ? (
                <DropZone onDrop={(f) => handleFile(member.id, f)}>
                  <div style={{
                    aspectRatio: '16/9',
                    background: '#1f1d18',
                    border: '1px dashed rgba(255,255,255,.2)',
                    display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap: 8,
                    color: 'rgba(255,247,230,.55)',
                    fontSize: 11, fontFamily:'var(--font-mono)',
                  }}>
                    <Icon name="upload" size={20}/>
                    <div style={{ letterSpacing: '0.1em' }}>NO EXPOSURE</div>
                    <div style={{ display:'flex', gap: 6 }}>
                      <FilePicker
                        accept="video/*,image/*"
                        onFile={(f) => handleFile(member.id, f)}
                        className="btn sm"
                        style={{ background:'rgba(255,255,255,.08)', borderColor:'rgba(255,255,255,.15)', color:'rgba(255,247,230,.9)' }}>
                        <Icon name="upload" size={11}/>파일
                      </FilePicker>
                      <button className="btn sm"
                        style={{ background:'rgba(255,255,255,.08)', borderColor:'rgba(255,255,255,.15)', color:'rgba(255,247,230,.9)' }}
                        onClick={() => {
                          const url = prompt('mp4 또는 gif URL');
                          if (!url) return;
                          // promote
                          setState(s => {
                            const day = s.days[viewKey];
                            const isPng = /\.png(\?|$)/i.test(url);
                            const isGif = /\.gif(\?|$)/i.test(url);
                            const isJpg = /\.(jpe?g|webp)(\?|$)/i.test(url);
                            const isImg = isPng || isGif || isJpg;
                            const subs = day.subs.map(x => x.memberId === member.id ? {
                              memberId: member.id, videoUrl: url,
                              videoMime: isImg ? `image/${isPng?'png':isGif?'gif':'jpeg'}` : 'video/mp4',
                              format: isPng ? 'png' : isGif ? 'gif' : isImg ? 'jpg' : 'mp4',
                              title: '링크 업로드', tags: ['업로드'], duration: '—',
                              submittedAt: new Date().toTimeString().slice(0,5), onTime: true,
                              pins: [], reactions: {},
                            } : x);
                            return { ...s, days: { ...s.days, [viewKey]: { ...day, subs } } };
                          });
                        }}>URL</button>
                    </div>
                  </div>
                </DropZone>
              ) : (
                <DropZone onDrop={(f) => handleFile(member.id, f)}>
                  <div
                    style={{
                      position:'relative',
                      cursor: addPinFor === member.id ? 'crosshair' : (isPlayingOnly ? 'default' : 'pointer'),
                    }}
                    onClick={(e) => {
                      if (addPinFor === member.id) {
                        onFrameClick(member.id, e);
                      } else {
                        setActivePlayer(p => p === member.id ? null : member.id);
                      }
                    }}>
                    <ProtoVideo
                      submission={sub}
                      isPlaying={isPlayingOnly || tweaks.alwaysPlay}
                      autoPlay={tweaks.alwaysPlay}
                      muted style={{ aspectRatio:'16/9', borderRadius: 0 }}/>

                    {/* Frame management — replace / delete */}
                    {addPinFor !== member.id && (
                      <div style={{
                        position:'absolute', top: 6, right: 6,
                        display:'flex', gap: 4, zIndex: 5,
                      }} onClick={(e) => e.stopPropagation()}>
                        <FilePicker
                          accept="video/*,image/*"
                          onFile={(f) => handleFile(member.id, f)}
                          className="btn sm"
                          style={{
                            background:'rgba(0,0,0,.55)', backdropFilter:'blur(4px)',
                            color:'white', borderColor:'rgba(255,255,255,.2)',
                            padding:'0 8px', height: 24, fontSize: 10,
                          }}>
                          <Icon name="upload" size={10}/>교체
                        </FilePicker>
                        <button
                          className="btn sm"
                          title="삭제"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!confirm(`${member.name}의 ${sub.title || '작업물'}을 삭제할까요?`)) return;
                            setState(s => {
                              const day = s.days[viewKey];
                              const subs = day.subs.map(x =>
                                x.memberId === member.id ? { memberId: member.id, missing: true } : x);
                              return { ...s, days: { ...s.days, [viewKey]: { ...day, subs } } };
                            });
                          }}
                          style={{
                            background:'rgba(0,0,0,.55)', backdropFilter:'blur(4px)',
                            color:'white', borderColor:'rgba(255,255,255,.2)',
                            width: 24, height: 24, padding: 0, fontSize: 12,
                          }}>✕</button>
                      </div>
                    )}

                    {/* Film grain overlay */}
                    {tweaks.filmGrain && <FilmGrain/>}

                    {/* Crosshair guide while adding */}
                    {addPinFor === member.id && !draftPin && (
                      <div style={{
                        position:'absolute', inset:0, pointerEvents:'none',
                        boxShadow:'inset 0 0 0 2px var(--accent)',
                        background:'rgba(255,90,31,.06)',
                      }}>
                        <div style={{
                          position:'absolute', top: 8, left: 8,
                          padding:'3px 7px', borderRadius: 4,
                          background:'var(--accent)', color:'white',
                          fontSize: 10, fontWeight: 600, letterSpacing:'0.04em',
                          fontFamily:'var(--font-mono)',
                        }}>CLICK TO PIN</div>
                      </div>
                    )}

                    {/* Pins */}
                    {sub.pins?.map(p => (
                      <CommentPin
                        key={p.id} x={p.x} y={p.y}
                        member={MEMBER_BY_ID[p.comments[0].author]}
                        count={p.comments.length}
                        open={openPin === `${member.id}-${p.id}`}
                        onClick={(e) => { e.stopPropagation(); setOpenPin(o => o === `${member.id}-${p.id}` ? null : `${member.id}-${p.id}`); }}
                        comments={p.comments.map(c => ({ ...c, author: MEMBER_BY_ID[c.author] }))}/>
                    ))}

                    {/* Draft pin */}
                    {draftPin?.memberId === member.id && (
                      <DraftPin
                        x={draftPin.x} y={draftPin.y}
                        text={draftText}
                        setText={setDraftText}
                        currentUser={MEMBER_BY_ID[currentUserId]}
                        onSubmit={submitDraftPin}
                        onCancel={() => { setDraftPin(null); setDraftText(''); setAddPinFor(null); }}/>
                    )}

                    {/* Play indicator overlay */}
                    {!isPlayingOnly && !tweaks.alwaysPlay && addPinFor !== member.id && (
                      <div style={{
                        position:'absolute', right: 6, bottom: 6,
                        width: 24, height: 24, borderRadius:'50%',
                        background:'rgba(0,0,0,.5)', backdropFilter:'blur(4px)',
                        display:'grid', placeItems:'center', color:'white',
                      }}>
                        <Icon name="play" size={10}/>
                      </div>
                    )}
                  </div>
                </DropZone>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom sprockets */}
      <div style={{ display:'flex', justifyContent:'space-between', marginTop: 10 }}>
        {Array.from({length: 28}).map((_,i)=>(
          <div key={i} style={{ width: 12, height: 8, background: 'var(--bg)', borderRadius: 1 }}/>
        ))}
      </div>
    </div>
  );
};

const FrameStamp = ({ index, member, sub }) => {
  const empty = sub.missing;
  // Stamp: when submitted, the name is "stamped" with a slight rotation + ink feel
  return (
    <div style={{
      display:'flex', justifyContent:'space-between', alignItems:'center',
      color:'#fff7e6', fontFamily:'var(--font-mono)', fontSize: 9, marginBottom: 4,
      letterSpacing:'0.1em', minHeight: 20,
    }}>
      <span style={{ opacity: .55 }}>FR {String(index + 1).padStart(2, '0')}</span>
      {empty ? (
        <span style={{ opacity:.4 }}>· · · · · ·</span>
      ) : (
        <span style={{
          display:'inline-flex', alignItems:'center', gap: 4,
          padding:'2px 7px',
          background: member.color,
          color: 'white',
          borderRadius: 2,
          transform: `rotate(${[-1.4, 0.8, -0.6, 1.2][index % 4]}deg)`,
          boxShadow: '0 1px 0 rgba(0,0,0,.25)',
          fontWeight: 600, letterSpacing:'0.08em',
          fontSize: 9,
          opacity: 0.94,
        }}>
          ✓ {member.name.toUpperCase?.() || member.name}
        </span>
      )}
      <span style={{ opacity:.55 }}>
        {empty ? '——:——' : sub.submittedAt}
      </span>
    </div>
  );
};

const FilmGrain = () => (
  <div style={{
    position:'absolute', inset: 0, pointerEvents:'none',
    mixBlendMode:'overlay', opacity: .35,
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
  }}/>
);

const DraftPin = ({ x, y, text, setText, currentUser, onSubmit, onCancel }) => {
  const ref = React.useRef(null);
  React.useEffect(() => { ref.current?.focus(); }, []);
  return (
    <>
      <div className={`pin ${currentUser.cls}`} style={{ left: `${x}%`, top: `${y}%` }}>
        <Icon name="pin" size={10} stroke={2}/>
      </div>
      <div className="pin-popover" style={{ left: `calc(${x}% + 24px)`, top: `${y}%` }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display:'flex', gap: 8, marginBottom: 8 }}>
          <Avatar member={currentUser} size={22}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 12 }}>{currentUser.name}</div>
            <div className="t-meta" style={{ fontSize: 10 }}>새 댓글</div>
          </div>
        </div>
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="피드백을 남겨보세요…"
          style={{
            width:'100%', minHeight: 60, resize:'vertical',
            border:'1px solid var(--line)', borderRadius: 6,
            padding:'6px 8px', fontFamily:'inherit', fontSize: 12,
            outline:'none',
          }}/>
        <div style={{ display:'flex', justifyContent:'flex-end', gap: 6, marginTop: 8 }}>
          <button className="btn sm" onClick={onCancel}>취소</button>
          <button className="btn primary sm" onClick={onSubmit}>댓글 ↵</button>
        </div>
      </div>
    </>
  );
};

const ContactCaption2 = ({ sub, member, currentUserId, onToggleReaction, onAddPin, isAddingPin }) => {
  const empty = sub.missing;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
      <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
        <Avatar member={member} size={22}/>
        <span style={{ fontWeight: 600, fontSize: 12 }}>{member.name}</span>
        {!empty && (
          <>
            <span className="t-mono" style={{ color:'var(--ink-3)' }}>·</span>
            <span className="t-mono" style={{ color:'var(--ink-3)' }}>{sub.duration}</span>
            <span className="t-mono" style={{
              fontSize: 9, padding:'1px 4px',
              background: sub.format === 'gif' ? 'var(--u-se)' : 'var(--ink)',
              color:'#fff7e6', borderRadius: 2,
            }}>{sub.format.toUpperCase()}</span>
            <span className="t-mono" style={{
              fontSize: 9, color: sub.onTime ? 'var(--good)' : 'var(--warn)',
              marginLeft:'auto',
            }}>
              {sub.onTime ? `↑ ${sub.submittedAt}` : `↓ ${sub.submittedAt}`}
            </span>
          </>
        )}
      </div>
      {empty ? (
        <div style={{
          fontSize: 12, color:'var(--miss)',
          display:'flex', alignItems:'center', gap: 6,
        }}>
          <span style={{ width: 6, height: 6, borderRadius:'50%', background:'var(--miss)' }}/>
          오늘 미제출
        </div>
      ) : (
        <>
          <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3, color:'var(--ink)' }}>{sub.title}</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap: 4 }}>
            {sub.tags?.map(t => <Tag key={t}>{t}</Tag>)}
          </div>

          {/* Comments preview */}
          {sub.pins?.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap: 6, marginTop: 2 }}>
              {sub.pins.slice(0, 2).map(p => {
                const author = MEMBER_BY_ID[p.comments[0].author];
                return (
                  <div key={p.id} style={{
                    fontSize: 12, lineHeight: 1.4, color:'var(--ink-2)',
                    borderLeft: `2px solid ${author.color}`,
                    paddingLeft: 8,
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 1 }}>
                      <span style={{ fontWeight: 600, fontSize: 11 }}>{author.name}</span>
                      <span className="t-mono" style={{ fontSize: 10, color:'var(--ink-3)' }}>@{p.t}</span>
                    </div>
                    {p.comments[0].text}
                  </div>
                );
              })}
              {sub.pins.length > 2 && (
                <div className="t-meta" style={{ paddingLeft: 8, fontSize: 11 }}>
                  +{sub.pins.length - 2}개 더 보기
                </div>
              )}
            </div>
          )}

          {/* Reactions */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 8, marginTop: 4 }}>
            <ReactionRow reactions={sub.reactions} currentUserId={currentUserId} onToggle={onToggleReaction}/>
            <button
              onClick={onAddPin}
              className="btn sm"
              style={{
                background: isAddingPin ? 'var(--accent)' : 'transparent',
                color: isAddingPin ? 'white' : 'var(--ink-2)',
                borderColor: isAddingPin ? 'var(--accent)' : 'var(--line)',
                fontSize: 11,
              }}>
              <Icon name="pin" size={10} stroke={2}/>
              {isAddingPin ? '취소' : '핀'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const ReactionRow = ({ reactions = {}, currentUserId, onToggle }) => (
  <div style={{ display:'flex', gap: 4, flexWrap:'wrap' }}>
    {REACTION_SET.map(e => {
      const count = reactions[e] || 0;
      const me = (reactions[`__${e}__by`] || []).includes(currentUserId);
      // Always show all 5 to allow first reaction; dim if 0
      return (
        <button key={e}
          onClick={() => onToggle(e)}
          className={`reaction ${me ? 'active' : ''}`}
          style={{
            opacity: count === 0 && !me ? .55 : 1,
            padding: count === 0 ? '0 6px' : '0 8px 0 6px',
          }}>
          <span className="emoji">{e}</span>
          {count > 0 && <span>{count}</span>}
        </button>
      );
    })}
  </div>
);

Object.assign(window, { ContactSheetPage });
