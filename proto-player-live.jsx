// proto-player-live.jsx — Supabase-wired video player overlay.
// Wraps PlayerOverlay so add-pin and reaction-toggle hit Supabase.

const PlayerLive = ({ open, sub, member, me, onClose }) => {
  if (!open || !sub) return null;

  const handleAddPin = async (pin) => {
    try {
      await addPin({
        submissionId: sub.id,
        authorId: me.id,
        x: pin.x, y: pin.y, t: pin.t,
        text: pin.comments[0].text,
      });
    } catch (e) { alert('댓글 저장 실패: ' + e.message); }
  };

  const handleToggleReaction = async (emoji) => {
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
      currentUserId={me.id}
      onClose={onClose}
      onAddPin={handleAddPin}
      onToggleReaction={handleToggleReaction}
    />
  );
};

Object.assign(window, { PlayerLive });
