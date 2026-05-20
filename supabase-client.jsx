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
        thumbnailUrl: sub.thumbnail_url,
        thumbnailPath: sub.thumbnail_path,
        isVacation: sub.is_vacation || false,
        description: sub.description || '',
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
// Generate a small JPEG thumbnail from a video file (or return null for images/errors)
async function makeVideoThumbnail(file) {
  if (!file.type.startsWith('video/')) return null;
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'auto';
    v.muted = true;
    v.crossOrigin = 'anonymous';
    let done = false;
    const finish = (blob) => {
      if (done) return; done = true;
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    v.addEventListener('loadeddata', () => {
      const target = Math.min(1, (v.duration || 1) * 0.1);
      v.currentTime = target;
    }, { once: true });
    v.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas');
        // Cap dimensions for small thumbnails
        const maxW = 640;
        const scale = Math.min(1, maxW / v.videoWidth);
        canvas.width = Math.round(v.videoWidth * scale) || 320;
        canvas.height = Math.round(v.videoHeight * scale) || 180;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(b => finish(b), 'image/jpeg', 0.78);
      } catch (e) {
        finish(null);
      }
    }, { once: true });
    v.addEventListener('error', () => finish(null), { once: true });
    setTimeout(() => finish(null), 8000); // safety timeout
    v.src = url;
  });
}

async function backfillThumbnails(onProgress) {
  if (!supabase) throw new Error('Not configured');
  // Find all submissions that have a video but no thumbnail
  const { data: rows, error } = await supabase.from('submissions')
    .select('id, member_id, day_key, video_url, video_path, video_mime, thumbnail_url, is_vacation, format')
    .not('video_url', 'is', null)
    .is('thumbnail_url', null);
  if (error) throw error;

  // Skip images (no need for thumbnails)
  const targets = (rows || []).filter(r =>
    !r.is_vacation &&
    r.video_mime &&
    !r.video_mime.startsWith('image/')
  );

  const { data: { user } } = await supabase.auth.getUser();
  const uploaderId = user?.id;
  if (!uploaderId) throw new Error('로그인이 필요해요');

  onProgress?.({ done: 0, total: targets.length, current: null });

  let processed = 0;
  const errors = [];
  for (const sub of targets) {
    onProgress?.({ done: processed, total: targets.length, current: sub.id });
    try {
      // Fetch the video as a Blob (CORS — works because Storage bucket is public)
      const resp = await fetch(sub.video_url);
      if (!resp.ok) throw new Error('fetch failed ' + resp.status);
      const blob = await resp.blob();
      const file = new File([blob], 'video.mp4', { type: blob.type || 'video/mp4' });

      const thumbBlob = await makeVideoThumbnail(file);
      if (!thumbBlob) throw new Error('thumbnail generation failed');

      const path = `${uploaderId}/${sub.id}-${Date.now()}-thumb.jpg`;
      const { error: upErr } = await supabase.storage
        .from('submissions').upload(path, thumbBlob, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(path);

      const { error: updErr } = await supabase.from('submissions')
        .update({ thumbnail_url: urlData.publicUrl, thumbnail_path: path })
        .eq('id', sub.id);
      if (updErr) throw updErr;
    } catch (e) {
      errors.push({ id: sub.id, error: e.message });
      console.warn('thumbnail backfill failed for', sub.id, e);
    }
    processed++;
    onProgress?.({ done: processed, total: targets.length, current: null });
  }
  return { total: targets.length, processed, errors };
}

async function uploadSubmission({ memberId, dayKey, file, title, tags }) {
  if (!supabase) throw new Error('Not configured');
  // Path: <uploader-id>/<slot-owner>-<dayKey>-<ts>.<ext>
  // Using uploader's auth id makes storage RLS work even with strict folder-scoped policies.
  const { data: { user } } = await supabase.auth.getUser();
  const uploaderId = user?.id || memberId;
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
  const path = `${uploaderId}/${memberId}-${dayKey}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('submissions').upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) throw upErr;
  const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(path);

  const isImage = file.type.startsWith('image/');
  const duration = isImage ? '—' : await new Promise(res => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      const s = Math.round(v.duration);
      res(`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`);
    };
    v.onerror = () => res('—');
    v.src = URL.createObjectURL(file);
  });

  // Generate and upload thumbnail (video only)
  let thumbnailUrl = null, thumbnailPath = null;
  if (!isImage) {
    try {
      const thumbBlob = await makeVideoThumbnail(file);
      if (thumbBlob) {
        thumbnailPath = `${uploaderId}/${memberId}-${dayKey}-${Date.now()}-thumb.jpg`;
        const { error: tErr } = await supabase.storage
          .from('submissions').upload(thumbnailPath, thumbBlob, { contentType: 'image/jpeg', upsert: true });
        if (!tErr) {
          const { data: tUrl } = supabase.storage.from('submissions').getPublicUrl(thumbnailPath);
          thumbnailUrl = tUrl.publicUrl;
        }
      }
    } catch (e) { console.warn('thumbnail failed', e); }
  }

  // Upsert submission row (one per member per day)
  const { data, error } = await supabase.from('submissions').upsert({
    member_id: memberId,
    day_key: dayKey,
    title: title || '제목 없음',
    tags: tags || [],
    format: isImage ? 'image' : ext,
    duration,
    video_url: urlData.publicUrl,
    video_mime: file.type,
    video_path: path,
    thumbnail_url: thumbnailUrl,
    thumbnail_path: thumbnailPath,
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

async function updateSubmissionMeta({ submissionId, title, description }) {
  if (!supabase) throw new Error('Not configured');
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  const { data, error } = await supabase.from('submissions')
    .update(updates).eq('id', submissionId).select().single();
  if (error) throw error;
  return data;
}

async function markVacation({ memberId, dayKey }) {
  if (!supabase) throw new Error('Not configured');
  const { data, error } = await supabase.from('submissions').upsert({
    member_id: memberId,
    day_key: dayKey,
    is_vacation: true,
    title: '휴가',
    format: 'vacation',
    duration: '—',
    video_url: null,
    video_mime: null,
    video_path: null,
    submitted_at: new Date().toISOString(),
  }, { onConflict: 'member_id,day_key' }).select().single();
  if (error) throw error;
  return data;
}

async function unmarkVacation({ submissionId }) {
  if (!supabase) throw new Error('Not configured');
  const { error } = await supabase.from('submissions').delete().eq('id', submissionId);
  if (error) throw error;
}

async function replaceSubmissionVideo({ submissionId, oldPath, file, memberId }) {
  if (!supabase) throw new Error('Not configured');
  const { data: { user } } = await supabase.auth.getUser();
  const uploaderId = user?.id || memberId;
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
  // Always upload under uploader's auth folder so storage RLS works
  const path = `${uploaderId}/${submissionId}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('submissions').upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) throw upErr;
  const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(path);

  const isImage = file.type.startsWith('image/');
  const duration = isImage ? '—' : await new Promise(res => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      const s = Math.round(v.duration);
      res(`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`);
    };
    v.onerror = () => res('—');
    v.src = URL.createObjectURL(file);
  });

  // Generate thumbnail for the replacement
  let thumbnailUrl = null, thumbnailPath = null;
  if (!isImage) {
    try {
      const thumbBlob = await makeVideoThumbnail(file);
      if (thumbBlob) {
        thumbnailPath = `${uploaderId}/${submissionId}-${Date.now()}-thumb.jpg`;
        const { error: tErr } = await supabase.storage
          .from('submissions').upload(thumbnailPath, thumbBlob, { contentType: 'image/jpeg', upsert: true });
        if (!tErr) {
          const { data: tUrl } = supabase.storage.from('submissions').getPublicUrl(thumbnailPath);
          thumbnailUrl = tUrl.publicUrl;
        }
      }
    } catch (e) { console.warn('thumbnail failed', e); }
  }

  const { data, error } = await supabase.from('submissions')
    .update({
      format: isImage ? 'image' : ext, duration,
      video_url: urlData.publicUrl,
      video_mime: file.type,
      video_path: path,
      thumbnail_url: thumbnailUrl,
      thumbnail_path: thumbnailPath,
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
  replaceSubmissionVideo, deleteSubmission, updateSubmissionMeta,
  markVacation, unmarkVacation,
  addPin, toggleReaction,
  addComment, updateComment, deleteComment,
  makeVideoThumbnail, backfillThumbnails,
});
