// proto-player-live.jsx — Supabase-wired video player overlay.
// Wraps PlayerOverlay so add-pin and reaction-toggle hit Supabase.
// `me` can be null in viewer mode — write actions are blocked with a friendly alert.

const PlayerLive = ({ open, sub, member, members, me, onClose }) => {
  if (!open || !sub) return null;

  const requireLogin = () => {
    alert('이 작업은 Google 로그인이 필요해요.');
  };

  const handleAddPin = async (pin) => {
    if (!me) { requireLogin(); return; }
    try {
      await addPin({
        submissionId: sub.id,
        authorId: me.id,
        x: pin.x, y: pin.y, t: pin.t,
        text: pin.comments[0].text,
      });
    } catch (e) { alert('핀 댓글 저장 실패: ' + e.message); }
  };

  const handleToggleReaction = async (emoji) => {
    if (!me) { requireLogin(); return; }
    const isOn = sub.reactions?.__mine?.[emoji];
    try {
      await toggleReaction({
        submissionId: sub.id, memberId: me.id, emoji, on: !isOn,
      });
    } catch (e) { alert('리액션 실패: ' + e.message); }
  };

  return (
    <PlayerOverlay
      open={open}
      sub={sub}
      member={member}
      members={members}
      currentUserId={me?.id || null}
      viewerMode={!me}
      onClose={onClose}
      onAddPin={handleAddPin}
      onToggleReaction={handleToggleReaction}
    />
  );
};

Object.assign(window, { PlayerLive });
