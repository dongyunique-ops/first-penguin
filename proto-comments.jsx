// proto-comments.jsx — Comments panel for the player overlay.
// Real text comments (separate from positional pins). Supports:
//   • author name + relative time
//   • optional video timestamp (jump-to-time)
//   • emoji insert
//   • @mention picker
//   • own-comment edit / delete
//
// Wraps Supabase mutations (addComment / updateComment / deleteComment).

const EMOJI_QUICK = ['🔥', '💡', '👏', '😂', '🥲', '🚀', '🎬', '✨', '👀', '❤️'];

const CommentsPanel = ({ submissionId, comments, members, me, viewerMode, currentTime, seekTo, onChange }) => {
  const [draft, setDraft] = React.useState('');
  const [withTimestamp, setWithTimestamp] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [editText, setEditText] = React.useState('');
  const [showEmoji, setShowEmoji] = React.useState(false);
  const [mentionOpen, setMentionOpen] = React.useState(false);
  const [mentionQuery, setMentionQuery] = React.useState('');
  const [mentionAnchor, setMentionAnchor] = React.useState(null); // {start} for current input
  const inputRef = React.useRef(null);
  const editRef = React.useRef(null);

  const sorted = React.useMemo(
    () => [...(comments || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [comments]
  );

  // Detect @ to open mention picker
  const handleInputChange = (e, setter) => {
    const val = e.target.value;
    setter(val);
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const m = before.match(/@(\S*)$/);
    if (m) {
      setMentionOpen(true);
      setMentionQuery(m[1]);
      setMentionAnchor({ start: cursor - m[0].length, len: m[0].length });
    } else {
      setMentionOpen(false);
    }
  };

  const insertMention = (member, target, setter, value) => {
    if (!mentionAnchor) return;
    const before = value.slice(0, mentionAnchor.start);
    const after = value.slice(mentionAnchor.start + mentionAnchor.len);
    const next = `${before}@${member.name} ${after}`;
    setter(next);
    setMentionOpen(false);
    setTimeout(() => {
      target.current?.focus();
      const pos = before.length + member.name.length + 2;
      target.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const insertEmoji = (e) => {
    const next = draft + e;
    setDraft(next);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const submit = async () => {
    const text = draft.trim();
    if (!text) return;
    // Extract mentioned member ids from @Name patterns
    const mentions = [];
    members.forEach(m => {
      const re = new RegExp(`@${m.name}\\b`);
      if (re.test(text)) mentions.push(m.id);
    });
    try {
      await addComment({
        submissionId, authorId: me.id,
        text, mentions,
        tSec: withTimestamp ? currentTime : null,
      });
      setDraft('');
      setWithTimestamp(false);
      onChange?.();
    } catch (err) { alert('댓글 작성 실패: ' + err.message); }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditText(c.text);
    setTimeout(() => editRef.current?.focus(), 0);
  };
  const saveEdit = async () => {
    const text = editText.trim();
    if (!text) return;
    const mentions = [];
    members.forEach(m => {
      if (new RegExp(`@${m.name}\\b`).test(text)) mentions.push(m.id);
    });
    try {
      await updateComment({ commentId: editingId, text, mentions });
      setEditingId(null); setEditText('');
      onChange?.();
    } catch (err) { alert('수정 실패: ' + err.message); }
  };
  const removeC = async (c) => {
    if (!confirm('이 댓글을 삭제할까요?')) return;
    try {
      await deleteComment({ commentId: c.id });
      onChange?.();
    } catch (err) { alert('삭제 실패: ' + err.message); }
  };

  const handleKey = (e, action) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault(); action();
    } else if (e.key === 'Escape') {
      setEditingId(null); setEditText(''); setMentionOpen(false);
    }
  };

  // Filter members for mention picker
  const mentionCandidates = React.useMemo(() => {
    const q = mentionQuery.toLowerCase();
    return members
      .filter(m => m.id !== me.id)
      .filter(m => !q || m.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [members, mentionQuery, me]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      {/* List */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 18px',
        display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0,
      }} className="scroll">
        {sorted.length === 0 && (
          <div style={{ fontSize: 12, color: 'rgba(255,247,230,.4)', lineHeight: 1.5 }}>
            아직 댓글이 없습니다.<br/>
            아래 입력창에 첫 댓글을 남겨보세요.
          </div>
        )}
        {sorted.map(c => {
          const author = members.find(m => m.id === c.authorId)
            || { id: c.authorId, name: '?', initial: '?', color: '#888' };
          const isMine = me && c.authorId === me.id;
          const editing = editingId === c.id;
          return (
            <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Avatar member={author} size={26}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 12, color: '#fff7e6' }}>{author.name}</span>
                  {c.tSec != null && (
                    <button onClick={() => seekTo?.(c.tSec)}
                      title="이 시점으로 이동"
                      style={{
                        all:'unset', cursor:'pointer',
                        fontSize: 10, fontFamily:'var(--font-mono)',
                        padding:'1px 6px', borderRadius: 3,
                        background:'rgba(255,90,31,.18)', color:'var(--accent)',
                      }}>
                      @{formatTime(c.tSec)}
                    </button>
                  )}
                  <span style={{ fontSize: 10, color: 'rgba(255,247,230,.4)' }}>
                    {c.time}
                    {c.updatedAt && c.updatedAt !== c.createdAt && ' · 수정됨'}
                  </span>
                  {isMine && !editing && (
                    <span style={{ marginLeft: 'auto', display:'flex', gap: 2 }}>
                      <button onClick={() => startEdit(c)}
                        style={miniBtn} title="수정">
                        <Icon name="edit" size={10}/>
                      </button>
                      <button onClick={() => removeC(c)}
                        style={{...miniBtn, color: '#ff8d8d'}} title="삭제">
                        <Icon name="trash" size={10}/>
                      </button>
                    </span>
                  )}
                </div>
                {editing ? (
                  <div style={{ position: 'relative' }}>
                    <textarea
                      ref={editRef}
                      value={editText}
                      onChange={(e) => handleInputChange(e, setEditText)}
                      onKeyDown={(e) => handleKey(e, saveEdit)}
                      rows={2}
                      style={{
                        width:'100%', boxSizing:'border-box',
                        padding: 8, borderRadius: 6, resize: 'vertical',
                        background: 'rgba(255,255,255,.06)',
                        color: '#fff7e6',
                        border: '1px solid rgba(255,90,31,.4)',
                        fontFamily: 'inherit', fontSize: 13, lineHeight: 1.5,
                      }}/>
                    <div style={{ display:'flex', gap: 6, marginTop: 4, justifyContent:'flex-end' }}>
                      <button onClick={() => { setEditingId(null); setEditText(''); }}
                        style={smallGhostBtn}>취소</button>
                      <button onClick={saveEdit}
                        style={smallPrimaryBtn}>저장</button>
                    </div>
                    {mentionOpen && (
                      <MentionList
                        candidates={mentionCandidates}
                        onPick={(m) => insertMention(m, editRef, setEditText, editText)}/>
                    )}
                  </div>
                ) : (
                  <div style={{
                    fontSize: 13, lineHeight: 1.55,
                    color: 'rgba(255,247,230,.92)',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>{renderWithMentions(c.text, members, me || { id: null })}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      {viewerMode ? (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,.08)',
          padding: '14px 20px',
          fontSize: 12, color: 'rgba(255,247,230,.4)',
          textAlign: 'center',
        }}>
          댓글을 남기려면 Google 로그인이 필요해요.
        </div>
      ) : (
      <div style={{
        borderTop: '1px solid rgba(255,255,255,.08)',
        padding: '10px 16px 14px',
      }}>
        <div style={{ position: 'relative' }}>
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => handleInputChange(e, setDraft)}
            onKeyDown={(e) => handleKey(e, submit)}
            placeholder="댓글 추가… (@로 멘션, ⌘+Enter로 전송)"
            rows={2}
            style={{
              width:'100%', boxSizing:'border-box',
              padding: 10, borderRadius: 8, resize: 'vertical',
              background: 'rgba(255,255,255,.06)',
              color: '#fff7e6',
              border: '1px solid rgba(255,255,255,.1)',
              fontFamily: 'inherit', fontSize: 13, lineHeight: 1.5,
            }}/>
          {mentionOpen && (
            <MentionList
              candidates={mentionCandidates}
              onPick={(m) => insertMention(m, inputRef, setDraft, draft)}/>
          )}
          {showEmoji && (
            <div style={{
              position:'absolute', bottom:'calc(100% + 4px)', left: 0,
              padding: 6, borderRadius: 8,
              background:'#23201a', border:'1px solid rgba(255,255,255,.1)',
              display:'flex', gap: 2, flexWrap:'wrap', maxWidth: 240,
              zIndex: 5,
            }} onMouseLeave={() => setShowEmoji(false)}>
              {EMOJI_QUICK.map(e => (
                <button key={e} onClick={() => insertEmoji(e)}
                  style={{
                    all:'unset', cursor:'pointer',
                    padding: 4, borderRadius: 4,
                    fontSize: 18,
                  }}>{e}</button>
              ))}
            </div>
          )}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginTop: 8, fontSize: 11,
        }}>
          <button onClick={() => setShowEmoji(s => !s)}
            style={composerIconBtn} title="이모지">😀</button>
          <button onClick={() => setWithTimestamp(t => !t)}
            style={{
              ...composerIconBtn,
              background: withTimestamp ? 'rgba(255,90,31,.2)' : 'rgba(255,255,255,.06)',
              color: withTimestamp ? 'var(--accent)' : '#fff7e6',
              padding: '0 8px', width: 'auto', gap: 4,
            }}
            title="현재 재생 시점에 댓글 달기">
            <Icon name="clock" size={11}/>
            <span style={{ fontSize: 10, fontFamily:'var(--font-mono)' }}>
              {withTimestamp ? formatTime(currentTime) : '시점'}
            </span>
          </button>
          <div style={{ flex: 1 }}/>
          <button onClick={submit}
            disabled={!draft.trim()}
            style={{
              ...smallPrimaryBtn,
              opacity: draft.trim() ? 1 : 0.4,
              cursor: draft.trim() ? 'pointer' : 'default',
            }}>
            전송
          </button>
        </div>
      </div>
      )}
    </div>
  );
};

const MentionList = ({ candidates, onPick }) => {
  if (!candidates.length) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 'calc(100% + 4px)', left: 0,
      background: '#23201a', borderRadius: 8, padding: 4,
      border: '1px solid rgba(255,255,255,.1)',
      minWidth: 180, zIndex: 10,
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      {candidates.map(m => (
        <button key={m.id}
          onClick={() => onPick(m)}
          style={{
            all:'unset', cursor:'pointer',
            display:'flex', alignItems:'center', gap: 8,
            padding:'5px 8px', borderRadius: 4,
            color: '#fff7e6',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,.08)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <Avatar member={m} size={20}/>
          <span style={{ fontSize: 12 }}>{m.name}</span>
        </button>
      ))}
    </div>
  );
};

// Render @Name highlighted; if mentions me, accent the chip
function renderWithMentions(text, members, me) {
  const parts = [];
  let i = 0;
  // Sort members by name length (longer first) to avoid prefix conflicts
  const sortedM = [...members].sort((a, b) => b.name.length - a.name.length);
  while (i < text.length) {
    if (text[i] === '@') {
      const m = sortedM.find(mem => text.slice(i + 1, i + 1 + mem.name.length) === mem.name);
      if (m) {
        const isMe = m.id === me.id;
        parts.push(
          <span key={i} style={{
            display: 'inline-block',
            padding: '0 4px', borderRadius: 3,
            background: isMe ? 'rgba(255,90,31,.25)' : 'rgba(255,255,255,.1)',
            color: isMe ? 'var(--accent)' : '#fff7e6',
            fontWeight: 600,
          }}>@{m.name}</span>
        );
        i += 1 + m.name.length;
        continue;
      }
    }
    // accumulate plain text until next @
    let next = text.indexOf('@', i + 1);
    if (next === -1) next = text.length;
    parts.push(text.slice(i, next));
    i = next;
  }
  return parts;
}

const miniBtn = {
  all:'unset', cursor:'pointer',
  width: 22, height: 22, borderRadius: 4,
  display:'inline-grid', placeItems:'center',
  color:'rgba(255,247,230,.55)',
};
const smallGhostBtn = {
  all:'unset', cursor:'pointer',
  padding:'4px 10px', borderRadius: 5,
  fontSize: 11, color:'rgba(255,247,230,.7)',
  background:'rgba(255,255,255,.06)',
};
const smallPrimaryBtn = {
  all:'unset', cursor:'pointer',
  padding:'5px 12px', borderRadius: 5,
  fontSize: 11, fontWeight: 600,
  background:'var(--accent)', color:'white',
};
const composerIconBtn = {
  all:'unset', cursor:'pointer',
  width: 26, height: 26, borderRadius: 5,
  display:'inline-flex', alignItems:'center', justifyContent:'center',
  background: 'rgba(255,255,255,.06)', color:'#fff7e6',
};

Object.assign(window, { CommentsPanel });
