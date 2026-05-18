// proto-contact-sheet-live.jsx — Supabase-backed contact sheet.
// Same UX as proto-contact-sheet but writes to Supabase, listens for realtime updates,
// and uploads videos to Storage instead of object URLs.

const ContactSheetLive = ({ tweaks, viewKey, setViewKey, navigate, me, members, days, openPlayer }) => {
  const day = days[viewKey] || { dateKey: viewKey, dayNum: 0, subs: members.map(m => ({ memberId: m.id, missing: true })) };
  const date = fromKey(viewKey);
  const isToday = viewKey === todayKey();
  const submitted = day.subs.filter(s => !s.missing && !s.isVacation).length;
  const onVacation = day.subs.filter(s => s.isVacation).length;
  const total = members.length;

  const [uploading, setUploading] = React.useState(null); // memberId being uploaded for
  const [confirmDelete, setConfirmDelete] = React.useState(null);

  const handleUpload = async (memberId, file) => {
    if (!me) { alert('업로드하려면 로그인이 필요해요'); return; }
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

  const handleReplace = async (sub, file) => {
    if (!me) { alert('교체하려면 로그인이 필요해요'); return; }
    setUploading(sub.memberId);
    try {
      await replaceSubmissionVideo({
        submissionId: sub.id,
        oldPath: sub.videoPath,
        file,
        memberId: me?.id,
      });
    } catch (e) {
      alert('교체 실패: ' + e.message);
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (sub) => {
    if (!me) { alert('삭제하려면 로그인이 필요해요'); return; }
    try {
      await deleteSubmission({ submissionId: sub.id, videoPath: sub.videoPath });
      setConfirmDelete(null);
    } catch (e) {
      alert('삭제 실패: ' + e.message);
    }
  };

  const handleVacation = async (memberId) => {
    if (!me) { alert('휴가 표시는 로그인이 필요해요'); return; }
    try {
      await markVacation({ memberId, dayKey: viewKey });
    } catch (e) {
      alert('휴가 표시 실패: ' + e.message);
    }
  };

  const handleCancelVacation = async (sub) => {
    if (!me) return;
    try {
      await unmarkVacation({ submissionId: sub.id });
    } catch (e) {
      alert('취소 실패: ' + e.message);
    }
  };

  const handleUpdateDescription = async (sub, description) => {
    if (!me) return;
    try {
      await updateSubmissionMeta({ submissionId: sub.id, description });
    } catch (e) {
      alert('설명 저장 실패: ' + e.message);
    }
  };

  const handleAddCommentForSub = async (sub, text) => {
    if (!me) { alert('로그인 후 댓글 가능'); return; }
    if (!text.trim()) return;
    try {
      await addComment({
        submissionId: sub.id, authorId: me.id,
        text: text.trim(), mentions: [], tSec: null,
      });
    } catch (e) {
      alert('댓글 작성 실패: ' + e.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment({ commentId });
    } catch (e) {
      alert('삭제 실패: ' + e.message);
    }
  };

  const handleReaction = async (sub, emoji) => {
    if (!me) { alert('로그인이 필요해요'); return; }
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
          <h1 className="t-display" style={{ margin: '4px 0 0', fontSize: 56, lineHeight: 1, fontFamily: "'배민워크체', 'BM WORK', 'BMHANNAPro', sans-serif" }}>
            {fmtDate(date)} <span style={{ fontSize: 32, color: 'var(--ink-3)', fontWeight: 500 }}>({wkday(date)})</span>
          </h1>
        </div>
        <div style={{ flex: 1 }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <DatePicker
            value={viewKey}
            onChange={(k) => setViewKey(k)}
            days={days}
          />
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
        }}>{submitted}/{total - onVacation}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {submitted === total ? '오늘 모두 제출 완료' :
             submitted === 0 && onVacation === 0 ? '아직 아무도 안 올렸어요' :
             onVacation > 0 ? `${submitted}명 제출, ${onVacation}명 휴가${total - submitted - onVacation > 0 ? `, ${total - submitted - onVacation}명 대기` : ''}` :
             `${submitted}명 제출, ${total - submitted}명 대기 중`}
          </div>
          <div className="t-meta">실시간 동기화 · 변경사항 자동 반영</div>
        </div>
        <div style={{ flex: 1 }}/>
        {/* Live status dots */}
        <div style={{ display: 'flex', gap: 4 }}>
          {members.map(m => {
            const sub = day.subs.find(s => s.memberId === m.id);
            const isUp = sub && !sub.missing && !sub.isVacation;
            const isVac = sub && sub.isVacation;
            return (
              <div key={m.id} title={`${m.name} · ${isUp ? '제출' : isVac ? '휴가' : '대기'}`}
                style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: isUp ? m.color : isVac ? '#ffd4b8' : 'transparent',
                  border: `2px solid ${isUp ? m.color : isVac ? '#ff8d3a' : 'var(--line)'}`,
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
              members={members}
              me={me}
              isMe={me && m.id === me.id}
              viewerMode={!me}
              uploading={uploading === m.id}
              onUpload={(f) => handleUpload(m.id, f)}
              onReplace={(f) => handleReplace(sub, f)}
              onDelete={() => setConfirmDelete(sub)}
              onVacation={() => handleVacation(m.id)}
              onCancelVacation={() => handleCancelVacation(sub)}
              onUpdateDescription={(d) => handleUpdateDescription(sub, d)}
              onAddComment={(t) => handleAddCommentForSub(sub, t)}
              onDeleteComment={(id) => handleDeleteComment(id)}
              onReact={(emoji) => handleReaction(sub, emoji)}
              onOpen={() => sub.id && !sub.isVacation && openPlayer(sub, viewKey)}
              filmGrain={tweaks.filmGrain}
            />
          );
        })}
      </div>

      {confirmDelete && (
        <ConfirmDeleteModal
          sub={confirmDelete}
          member={members.find(m => m.id === confirmDelete.memberId)}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};

const ConfirmDeleteModal = ({ sub, member, onConfirm, onCancel }) => (
  <div
    onClick={onCancel}
    style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(15,14,12,0.5)',
      backdropFilter: 'blur(4px)',
      display: 'grid', placeItems: 'center',
      animation: 'fpFade .15s',
    }}>
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: 'white', borderRadius: 12, padding: 24,
        width: 380, boxShadow: 'var(--shadow-md)',
      }}>
      <div className="t-eyebrow" style={{ marginBottom: 8, color: 'var(--accent)' }}>警告 · WARNING
      </div>
      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>이 영상을 삭제할까요?</h3>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, margin: '12px 0 20px' }}>
        <strong>{member?.name}</strong>님의 "<strong>{sub.title}</strong>"이(가) 영구적으로 삭제되며<br/>
        달린 댓글과 리액션도 함께 사라집니다.
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onCancel}>취소</button>
        <button className="btn primary"
          style={{ background: '#cc2c2c', borderColor: '#cc2c2c' }}
          onClick={onConfirm}>삭제</button>
      </div>
    </div>
  </div>
);

const SlotLive = ({ member, sub, members, me, isMe, viewerMode, uploading,
  onUpload, onReplace, onDelete, onVacation, onCancelVacation,
  onUpdateDescription, onAddComment, onDeleteComment,
  onReact, onOpen, filmGrain }) => {
  const [hover, setHover] = React.useState(false);
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef(null);
  const replaceRef = React.useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    if (sub.missing) onUpload(f);
    else onReplace(f);
  };

  const submitted = !sub.missing && !sub.isVacation;
  const onVacationToday = sub.isVacation;
  const reactions = sub.reactions || {};
  const myReactions = reactions.__mine || {};
  const reactionEntries = Object.entries(reactions).filter(([k]) => !k.startsWith('__'));
  const commentCount = (sub.comments?.length || 0) + (sub.pins?.length || 0);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDragOver={(e) => { if (!viewerMode) { e.preventDefault(); setDrag(true); } }}
      onDragLeave={() => setDrag(false)}
      onDrop={viewerMode ? undefined : handleDrop}
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
            {submitted ? sub.title : (onVacationToday ? '🌴 휴가' : (isMe ? '드래그해서 업로드' : '대기 중'))}
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
        <div style={{ position: 'relative' }}>
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

          {/* Comment count badge (top-left) */}
          {commentCount > 0 && (
            <button onClick={(e) => { e.stopPropagation(); onOpen(); }}
              style={{
                position: 'absolute', top: 8, left: 8,
                all: 'unset', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 999,
                background: 'rgba(15,14,12,0.7)', color: '#fff7e6',
                fontSize: 11, fontWeight: 600,
                backdropFilter: 'blur(4px)',
              }}>
              <Icon name="comment" size={11} stroke={2}/>{commentCount}
            </button>
          )}
          {uploading && (
            <div style={{
              position:'absolute', inset:0,
              background:'rgba(15,14,12,0.7)', backdropFilter:'blur(4px)',
              display:'grid', placeItems:'center', color:'#fff7e6',
              fontFamily:'var(--font-mono)', fontSize: 13,
            }}>교체 중...</div>
          )}

          {/* Hover actions: replace + delete */}
          {hover && !uploading && !viewerMode && (
            <div style={{
              position: 'absolute', top: 8, right: 8,
              display: 'flex', gap: 6,
              animation: 'fpFade .15s ease-out',
            }}>
              <button
                onClick={(e) => { e.stopPropagation(); replaceRef.current?.click(); }}
                title="영상 교체"
                style={hoverActionBtn}>
                <Icon name="upload" size={11} stroke={2}/>
                <span>교체</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="영상 삭제"
                style={{...hoverActionBtn, background:'rgba(204,44,44,0.85)'}}>
                <Icon name="x" size={11} stroke={2}/>
              </button>
              <input
                ref={replaceRef}
                type="file"
                accept="video/*"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files[0] && onReplace(e.target.files[0])}
              />
            </div>
          )}
        </div>
      ) : onVacationToday ? (
        <div style={{
          aspectRatio: '16/10',
          background: '#15140f',
          display: 'grid', placeItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            fontFamily: "'배민워크체', 'BM WORK', 'BMHANNAPro', sans-serif",
            color: '#fff7e6',
            fontSize: 'clamp(80px, 14vw, 180px)',
            lineHeight: 1,
            letterSpacing: '0.05em',
            fontWeight: 700,
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}>휴가</div>
          {/* Subtle palm pattern */}
          <div style={{
            position: 'absolute', top: 18, right: 18,
            fontSize: 28, opacity: 0.6,
          }}>🌴</div>
          <div style={{
            position: 'absolute', bottom: 18, left: 18,
            fontSize: 28, opacity: 0.6,
          }}>🌴</div>
          {/* Bottom caption strip */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '8px 14px',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            color: '#fff7e6',
            fontFamily: "'배민워크체', 'BM WORK', 'BMHANNAPro', sans-serif",
            fontSize: 13, letterSpacing: '0.04em',
            textAlign: 'center',
          }}>
            {member.name}님은 오늘 쉽니다
          </div>
          {!viewerMode && (
            <button
              onClick={onCancelVacation}
              title="휴가 취소"
              style={{
                position: 'absolute', top: 8, right: 8,
                all: 'unset', cursor: 'pointer',
                padding: '4px 10px', borderRadius: 6,
                fontSize: 11, fontWeight: 600,
                background: 'rgba(255,255,255,0.85)', color: 'var(--ink)',
                backdropFilter: 'blur(4px)',
              }}>휴가 취소</button>
          )}
        </div>
      ) : (
        <div
          onClick={() => !viewerMode && inputRef.current?.click()}
          style={{
            aspectRatio: '16/10',
            background: drag ? 'rgba(255,90,31,0.08)' : 'var(--bg-2)',
            display: 'grid', placeItems: 'center',
            cursor: viewerMode ? 'default' : 'pointer',
            color: 'var(--ink-3)',
            position: 'relative',
          }}>
          {uploading ? (
            <div style={{ textAlign: 'center' }}>
              <div className="t-mono" style={{ fontSize: 12 }}>업로드 중...</div>
            </div>
          ) : viewerMode ? (
            <div style={{ textAlign: 'center', opacity: 0.5 }}>
              <div className="t-mono" style={{ fontSize: 12 }}>대기 중</div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Icon name="upload" size={28}/>
              <div className="t-mono" style={{ fontSize: 12 }}>
                {isMe ? '클릭 또는 드래그' : `${member.name}님 영상 올리기`}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onVacation(); }}
                style={{
                  all: 'unset', cursor: 'pointer',
                  padding: '5px 12px', borderRadius: 6,
                  fontSize: 11, fontWeight: 600,
                  background: 'white', color: 'var(--ink)',
                  border: '1px solid var(--line)',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>🌴 휴가</button>
            </div>
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

      {/* Description */}
      {submitted && (
        <DescriptionBlock
          description={sub.description}
          editable={!!me}
          onSave={onUpdateDescription}
        />
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
                title={viewerMode ? '로그인 후 반응 남기기' : undefined}
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
      {/* Comments block */}
      {submitted && (
        <CommentsBlock
          sub={sub}
          members={members}
          me={me}
          viewerMode={viewerMode}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
          onOpen={onOpen}
        />
      )}
    </div>
  );
};

const DescriptionBlock = ({ description, editable, onSave }) => {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(description || '');
  const inputRef = React.useRef(null);

  React.useEffect(() => { setDraft(description || ''); }, [description]);
  React.useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = async () => {
    setEditing(false);
    if (draft !== (description || '')) {
      await onSave?.(draft);
    }
  };

  if (!editable && !description) return null;

  if (editing) {
    return (
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--line)' }}>
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); }
            if (e.key === 'Escape') { setDraft(description || ''); setEditing(false); }
          }}
          placeholder="이 영상에 대한 설명을 적어보세요…"
          rows={2}
          style={{
            width: '100%', boxSizing: 'border-box',
            border: '1px solid var(--accent)', borderRadius: 6,
            padding: '6px 8px', fontSize: 13, lineHeight: 1.5,
            fontFamily: 'inherit', resize: 'vertical', outline: 'none',
          }}
        />
        <div className="t-meta" style={{ fontSize: 10, marginTop: 4 }}>
          ⌘+Enter 저장 · Esc 취소
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => editable && setEditing(true)}
      style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--line)',
        cursor: editable ? 'text' : 'default',
        color: description ? 'var(--ink)' : 'var(--ink-3)',
        fontSize: 13, lineHeight: 1.55,
        fontStyle: description ? 'normal' : 'italic',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}
      title={editable ? '클릭해서 수정' : undefined}>
      {description || (editable ? '+ 설명 추가' : '')}
    </div>
  );
};

const CommentsBlock = ({ sub, members, me, viewerMode, onAddComment, onDeleteComment, onOpen }) => {
  const [draft, setDraft] = React.useState('');
  const [showAll, setShowAll] = React.useState(false);
  const all = (sub.comments || []).slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const shown = showAll ? all : all.slice(-2);

  const submit = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    await onAddComment(text);
  };

  return (
    <div style={{
      padding: '10px 14px 12px',
      borderTop: '1px solid var(--line)',
      background: 'var(--bg)',
    }}>
      {all.length === 0 && (
        <div className="t-meta" style={{ fontSize: 11, marginBottom: 8 }}>
          댓글이 아직 없어요
        </div>
      )}
      {all.length > 2 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="t-meta"
          style={{
            all: 'unset', cursor: 'pointer',
            fontSize: 11, marginBottom: 6, color: 'var(--accent)',
          }}>
          이전 댓글 {all.length - 2}개 더 보기
        </button>
      )}
      {shown.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {shown.map(c => {
            const author = (members || []).find(m => m.id === c.authorId)
              || { id: c.authorId, name: '?', initial: '?', color: '#888' };
            const isMine = me && c.authorId === me.id;
            return (
              <div key={c.id} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <Avatar member={author} size={18}/>
                <div style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.45 }}>
                  <span style={{ fontWeight: 600 }}>{author.name}</span>
                  <span className="t-meta" style={{ fontSize: 10, marginLeft: 5 }}>{c.time}</span>
                  <div style={{ color: 'var(--ink)', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                    {c.text}
                  </div>
                </div>
                {isMine && (
                  <button
                    onClick={() => onDeleteComment(c.id)}
                    title="삭제"
                    style={{
                      all: 'unset', cursor: 'pointer',
                      color: 'var(--ink-3)', fontSize: 11, padding: '0 4px',
                    }}>×</button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {!viewerMode ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="댓글 남기기…"
            style={{
              flex: 1, border: '1px solid var(--line)', borderRadius: 6,
              padding: '6px 9px', fontSize: 12, fontFamily: 'inherit',
              outline: 'none', minWidth: 0,
            }}
          />
          <button
            onClick={submit}
            disabled={!draft.trim()}
            style={{
              all: 'unset', cursor: draft.trim() ? 'pointer' : 'default',
              padding: '6px 12px', borderRadius: 6,
              fontSize: 11, fontWeight: 600,
              background: draft.trim() ? 'var(--ink)' : 'var(--bg-2)',
              color: draft.trim() ? '#fff7e6' : 'var(--ink-3)',
            }}>전송</button>
        </div>
      ) : (
        <div className="t-meta" style={{ fontSize: 11, textAlign: 'center', padding: '4px 0' }}>
          댓글을 남기려면 Google 로그인이 필요해요
        </div>
      )}
    </div>
  );
};

const hoverActionBtn = {
  all: 'unset', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '5px 10px', borderRadius: 6,
  background: 'rgba(15,14,12,0.85)', color: '#fff7e6',
  fontSize: 11, fontWeight: 600,
  backdropFilter: 'blur(6px)',
};

Object.assign(window, { ContactSheetLive });

// ─────────────────────────────────────────────
// DatePicker — calendar popover, jumps to selected day.
// ─────────────────────────────────────────────
const DatePicker = ({ value, onChange, days }) => {
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState(fromKey(value));
  const ref = React.useRef(null);

  React.useEffect(() => { setView(fromKey(value)); }, [value]);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayKey();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const stepMonth = (delta) => setView(new Date(year, month + delta, 1));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn sm" onClick={() => setOpen(o => !o)} title="달력으로 이동">
        <Icon name="calendar" size={12}/>달력
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          width: 264, background: 'white',
          border: '1px solid var(--line)', borderRadius: 10,
          boxShadow: 'var(--shadow-md)', padding: 12, zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <button className="btn sm" onClick={() => stepMonth(-1)} style={{ width: 24, padding: 0 }}>
              <Icon name="chevronL" size={11}/>
            </button>
            <div style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: 13 }}>
              {year}년 {month + 1}월
            </div>
            <button className="btn sm" onClick={() => stepMonth(1)} style={{ width: 24, padding: 0 }}>
              <Icon name="chevronR" size={11}/>
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {['일','월','화','수','목','금','토'].map((d, i) => (
              <div key={d} className="t-meta" style={{
                textAlign: 'center', fontSize: 10, padding: '2px 0',
                color: i === 0 ? '#cc2c2c' : i === 6 ? '#2966ff' : 'var(--ink-3)',
              }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i}/>;
              const k = dateKey(d);
              const isSel = k === value;
              const isTodayCell = k === today;
              const day = days[k];
              const submitted = day && day.subs.filter(s => !s.missing && !s.isVacation).length;
              const hasContent = submitted > 0;
              const isFuture = k > today;
              const dow = d.getDay();
              return (
                <button key={i}
                  onClick={() => { onChange(k); setOpen(false); }}
                  disabled={isFuture}
                  style={{
                    all: 'unset', cursor: isFuture ? 'default' : 'pointer',
                    height: 30, borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: isSel ? 700 : 500,
                    background: isSel ? 'var(--ink)' : isTodayCell ? 'var(--bg-2)' : 'transparent',
                    color: isSel ? '#fff7e6'
                      : isFuture ? 'var(--ink-4)'
                      : isTodayCell ? 'var(--accent)'
                      : dow === 0 ? '#cc2c2c'
                      : dow === 6 ? '#2966ff'
                      : 'var(--ink)',
                    position: 'relative',
                  }}>
                  {d.getDate()}
                  {hasContent && (
                    <span style={{
                      position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
                      width: 4, height: 4, borderRadius: '50%',
                      background: isSel ? '#fff7e6' : 'var(--accent)',
                    }}/>
                  )}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => { onChange(today); setOpen(false); }}
            style={{
              all: 'unset', cursor: 'pointer',
              display: 'block', width: '100%', textAlign: 'center',
              marginTop: 10, padding: '6px',
              borderRadius: 6, background: 'var(--bg-2)',
              fontSize: 12, fontWeight: 600,
            }}>오늘로 이동</button>
        </div>
      )}
    </div>
  );
};