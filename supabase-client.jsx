// supabase-client.jsx — All Supabase calls live here.
// Replaces localStorage-based useStore with realtime DB-backed store.

// Supabase JS UMD is loaded from CDN in index.html.
// Configure URL and anon key via globals SUPABASE_URL / SUPABASE_ANON_KEY.

const SB_URL = window.SUPABASE_URL || '';
const SB_KEY = window.SUPABASE_ANON_KEY || '';
const supabase = (SB_URL && SB_KEY && SB_URL !== '__SUPABASE_URL__')
  ? window.supabase.createClient(SB_URL, SB_KEY)
  : null;

window.__supabase = supabase;
window.__supabaseConfigured = !!supabase;

// ────────────────────────────────────────────
// Auth
// ────────────────────────────────────────────
async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) throw error;
}

async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

function useAuth() {
  const [session, setSession] = React.useState(null);
  const [member, setMember] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Whenever session changes, ensure a row in `members` exists for this user
  React.useEffect(() => {
    if (!session?.user || !supabase) { setMember(null); return; }
    (async () => {
      const u = session.user;
      const { data: existing } = await supabase
        .from('members').select('*').eq('id', u.id).single();
      if (existing) { setMember(existing); return; }
      // Create from Google profile
      const name = u.user_metadata?.full_name || u.user_metadata?.name || u.email.split('@')[0];
      const initial = name[0].toUpperCase();
      const palette = ['#ff5a1f', '#2966ff', '#6b3fa0', '#2f8f4f', '#d4a017'];
      const color = palette[Math.floor(Math.random() * palette.length)];
      const { data: created, error } = await supabase.from('members')
        .insert({ id: u.id, email: u.email, name, initial, color, cls: 'member' })
        .select().single();
      if (error) console.error('create member', error);
      setMember(created);
    })();
  }, [session]);

  return { session, member, loading, signInWithGoogle, signOut };
}

// ────────────────────────────────────────────
// Realtime store — fetches all submissions / pins / reactions
// for the visible date range and subscribes to changes.
// Mirrors the shape consumed by existing components.
// ────────────────────────────────────────────
function useRealtimeStore() {
  const [members, setMembers] = React.useState([]);
  const [days, setDays] = React.useState({}); // dayKey -> { dateKey, dayNum, subs[] }
  const [loaded, setLoaded] = React.useState(false);

  // Load everything once
  const refresh = React.useCallback(async () => {
    if (!supabase) return;
    const [mRes, sRes, pRes, rRes, cRes] = await Promise.all([
      supabase.from('members').select('*'),
      supabase.from('submissions').select('*').order('day_key', { ascending: false }),
      supabase.from('pins').select('*').order('created_at', { ascending: true }),
      supabase.from('reactions').select('*'),
      supabase.from('comments').select('*').order('created_at', { ascending: true }),
    ]);
    const memberList = mRes.data || [];
    setMembers(memberList);

    // Group submissions by day_key
    const byDay = {};
    (sRes.data || []).forEach(sub => {
      const k = sub.day_key;
      if (!byDay[k]) byDay[k] = { dateKey: k, dayNum: 0, subs: [] };
      sub.comments = [];
      byDay[k].subs.push({
        id: sub.id,
        memberId: sub.member_id,
        title: sub.title,
        tags: sub.tags || [],
        format: sub.format,
        duration: sub.duration,
        videoUrl: sub.video_url,
        videoMime: sub.video_mime,
        videoPath: sub.video_path,
        time: '',
        pins: [],
        comments: [],
        reactions: { __mine: {} },
        missing: false,
      });
    });

    // Ensure every day has all members (missing if no submission)
    Object.values(byDay).forEach(d => {
      memberList.forEach(m => {
        if (!d.subs.find(s => s.memberId === m.id)) {
          d.subs.push({ memberId: m.id, missing: true });
        }
      });
      // Sort by member order
      d.subs.sort((a, b) =>
        memberList.findIndex(m => m.id === a.memberId) -
        memberList.findIndex(m => m.id === b.memberId));
    });

    // Pins → attach to subs
    const subById = {};
    Object.values(byDay).forEach(d => d.subs.forEach(s => { if (s.id) subById[s.id] = s; }));
    (pRes.data || []).forEach(pin => {
      const s = subById[pin.submission_id];
      if (!s) return;
      // Group by t_sec into pin clusters
      const tBucket = Math.round(pin.t_sec * 2) / 2;
      let cluster = s.pins.find(p => Math.abs(p.t - tBucket) < 0.3);
      if (!cluster) {
        cluster = { id: pin.id, t: tBucket, x: pin.x, y: pin.y, comments: [] };
        s.pins.push(cluster);
      }
      cluster.comments.push({
        id: pin.id,
        author: pin.author_id,
        text: pin.text,
        time: relTime(pin.created_at),
      });
    });

    // Reactions
    const myId = (await supabase.auth.getUser()).data.user?.id;
    (rRes.data || []).forEach(r => {
      const s = subById[r.submission_id];
      if (!s) return;
      s.reactions[r.emoji] = (s.reactions[r.emoji] || 0) + 1;
      if (r.member_id === myId) s.reactions.__mine[r.emoji] = true;
    });

    // Comments
    (cRes.data || []).forEach(c => {
      const s = subById[c.submission_id];
      if (!s) return;
      s.comments.push({
        id: c.id,
        authorId: c.author_id,
        text: c.text,
        tSec: c.t_sec,
        mentions: c.mentions || [],
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        time: relTime(c.created_at),
      });
    });

    setDays(byDay);
    setLoaded(true);
  }, []);

  React.useEffect(() => {
    refresh();
    if (!supabase) return;
    // Subscribe to all relevant tables
    const ch = supabase.channel('first-penguin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pins' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, refresh)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [refresh]);

  return { members, days, loaded, refresh };
}

// ────────────────────────────────────────────
// Mutations
// ────────────────────────────────────────────
async function uploadSubmission({ memberId, dayKey, file, title, tags }) {
  if (!supabase) throw new Error('Not configured');
  // Path: <user-id>/<dayKey>-<filename>
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
  const path = `${memberId}/${dayKey}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('submissions').upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) throw upErr;
  const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(path);

  // Get duration
  const duration = await new Promise(res => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      const s = Math.round(v.duration);
      res(`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`);
    };
    v.onerror = () => res('—');
    v.src = URL.createObjectURL(file);
  });

  // Upsert submission row (one per member per day)
  const { data, error } = await supabase.from('submissions').upsert({
    member_id: memberId,
    day_key: dayKey,
    title: title || '제목 없음',
    tags: tags || [],
    format: ext,
    duration,
    video_url: urlData.publicUrl,
    video_mime: file.type,
    video_path: path,
    submitted_at: new Date().toISOString(),
  }, { onConflict: 'member_id,day_key' }).select().single();
  if (error) throw error;
  return data;
}

async function addPin({ submissionId, authorId, x, y, t, text }) {
  if (!supabase) throw new Error('Not configured');
  const { data, error } = await supabase.from('pins').insert({
    submission_id: submissionId, author_id: authorId,
    x, y, t_sec: t, text,
  }).select().single();
  if (error) throw error;
  return data;
}

async function replaceSubmissionVideo({ submissionId, oldPath, file, memberId }) {
  if (!supabase) throw new Error('Not configured');
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
  // Path keyed by uploader (memberId) so storage RLS works
  const path = `${memberId}/${submissionId}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('submissions').upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) throw upErr;
  const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(path);

  const duration = await new Promise(res => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      const s = Math.round(v.duration);
      res(`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`);
    };
    v.onerror = () => res('—');
    v.src = URL.createObjectURL(file);
  });

  const { data, error } = await supabase.from('submissions')
    .update({
      format: ext, duration,
      video_url: urlData.publicUrl,
      video_mime: file.type,
      video_path: path,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', submissionId)
    .select().single();
  if (error) throw error;

  // Best-effort cleanup of old file
  if (oldPath && oldPath !== path) {
    supabase.storage.from('submissions').remove([oldPath]).catch(()=>{});
  }
  return data;
}

async function deleteSubmission({ submissionId, videoPath }) {
  if (!supabase) throw new Error('Not configured');
  const { error } = await supabase.from('submissions').delete().eq('id', submissionId);
  if (error) throw error;
  if (videoPath) {
    supabase.storage.from('submissions').remove([videoPath]).catch(()=>{});
  }
}

async function addComment({ submissionId, authorId, text, tSec, mentions }) {
  if (!supabase) throw new Error('Not configured');
  const { data, error } = await supabase.from('comments').insert({
    submission_id: submissionId,
    author_id: authorId,
    text,
    t_sec: tSec ?? null,
    mentions: mentions || [],
  }).select().single();
  if (error) throw error;
  return data;
}

async function updateComment({ commentId, text, mentions }) {
  if (!supabase) throw new Error('Not configured');
  const { data, error } = await supabase.from('comments')
    .update({ text, mentions: mentions || [], updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .select().single();
  if (error) throw error;
  return data;
}

async function deleteComment({ commentId }) {
  if (!supabase) throw new Error('Not configured');
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) throw error;
}

async function toggleReaction({ submissionId, memberId, emoji, on }) {
  if (!supabase) throw new Error('Not configured');
  if (on) {
    await supabase.from('reactions').insert({
      submission_id: submissionId, member_id: memberId, emoji,
    });
  } else {
    await supabase.from('reactions').delete()
      .eq('submission_id', submissionId)
      .eq('member_id', memberId)
      .eq('emoji', emoji);
  }
}

function relTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff/60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff/3600)}시간 전`;
  return `${Math.floor(diff/86400)}일 전`;
}

Object.assign(window, {
  supabase, signInWithGoogle, signOut, useAuth,
  useRealtimeStore, uploadSubmission,
  replaceSubmissionVideo, deleteSubmission,
  addPin, toggleReaction,
  addComment, updateComment, deleteComment,
});
