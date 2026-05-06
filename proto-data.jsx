// proto-data.jsx — Mock data for the Contact Sheet + Archive prototype.
// Persists user-added comments + reactions to localStorage so the design
// feels alive across reloads.

const STORAGE_KEY = 'fp-proto-state-v3';

// ── Helpers ──────────────────────────────────
const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const fromKey = (k) => { const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); };
const todayKey = () => dateKey(new Date()); // real today
const SEED_TODAY = new Date(2026, 3, 30); // pinned for seed-data generation
const fmtDate  = (d) => `${d.getMonth()+1}/${String(d.getDate()).padStart(2,'0')}`;
const fmtKor   = (d) => `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;
const wkday    = (d) => ['일','월','화','수','목','금','토'][d.getDay()];

// ── Build seed archive ───────────────────────
const KINDS = ['bouncing-ball', 'morph', 'orbit', 'type', 'wave', 'character', 'logo', 'particles', 'liquid'];
const TONES = ['light', 'cream', 'dark', 'blue', 'orange', 'violet'];
const TITLES = ['움직임 연구', '루프 실험', '타이밍 테스트', '컬러 베리에이션', '캐릭터 비트', '리듬 스터디', '로고 모션', 'Squash & Stretch', '추상 셰이프'];
const TAG_POOLS = [['모션','기초'], ['로고'], ['캐릭터','루프'], ['실험'], ['타이포'], ['파티클'], ['모션','실험'], ['루프']];
const REACTION_SET = ['👏', '🔥', '🤯', '💯', '🥲'];

function buildSeed() {
  // No fictional history. Just create empty slots for the last 30 days
  // so The Roll renders an empty timeline that fills as the team uploads.
  const days = {};
  const realToday = new Date();
  for (let d = 0; d < 30; d++) {
    const date = new Date(realToday.getFullYear(), realToday.getMonth(), realToday.getDate() - d);
    const k = dateKey(date);
    days[k] = {
      dayNum: 30 - d,
      dateKey: k,
      subs: MEMBERS.map(m => ({ memberId: m.id, missing: true })),
    };
  }
  return days;
  // legacy seed below — disabled
  // eslint-disable-next-line no-unreachable
  const today = new Date(2026, 3, 30);
  for (let d = 0; d < 30; d++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - d);
    const k = dateKey(date);
    const subs = MEMBERS.map((m, mi) => {
      // Today: 도경/성은/동윤 submitted, 지운 not yet
      if (d === 0) {
        if (m.id === 'jw') return { memberId: m.id, missing: true };
        return seedSubmission(m, mi, d, date);
      }
      // Sprinkle missing days for realism
      const skip =
        (d === 3 && m.id === 'dk') ||
        (d === 7 && m.id === 'se') ||
        (d === 11 && m.id === 'dy') ||
        (d === 14 && m.id === 'jw') ||
        (d === 18 && m.id === 'dk');
      if (skip) return { memberId: m.id, missing: true };
      return seedSubmission(m, mi, d, date);
    });
    days[k] = { dayNum: 42 - d, dateKey: k, subs };
  }
  return days;
}

function seedSubmission(m, mi, dayBack, date) {
  const seed = (dayBack * 7 + mi * 3) % KINDS.length;
  const toneSeed = (dayBack * 11 + mi * 5) % TONES.length;
  // Submission time: between 21:00 and 02:00
  const submitHour = 21 + ((dayBack + mi) % 5); // 21~25 (1am)
  const submitMin = ((dayBack * 13 + mi * 7) % 60);
  const onTime = submitHour < 24; // before midnight = early
  return {
    memberId: m.id,
    kind: KINDS[seed],
    tone: TONES[toneSeed],
    title: TITLES[(dayBack + mi * 2) % TITLES.length],
    tags: TAG_POOLS[(dayBack + mi) % TAG_POOLS.length],
    format: ((dayBack + mi) % 3) === 0 ? 'gif' : 'mp4',
    duration: ['0:04','0:06','0:08','0:10','0:12','0:15'][(dayBack + mi) % 6],
    submittedAt: `${String(submitHour % 24).padStart(2,'0')}:${String(submitMin).padStart(2,'0')}`,
    onTime,
    pins: dayBack <= 5 ? seedPins(m, mi, dayBack) : [],
    reactions: seedReactions(dayBack, mi),
    videoUrl: null, // user can drop their own
  };
}

function seedPins(m, mi, dayBack) {
  // 0–2 pins per submission for recent days
  const count = (dayBack + mi) % 3;
  const pins = [];
  for (let i = 0; i < count; i++) {
    const author = MEMBERS[(mi + i + 1) % MEMBERS.length];
    pins.push({
      id: `p-${dayBack}-${mi}-${i}`,
      x: 25 + ((dayBack * 17 + i * 31) % 50),
      y: 25 + ((mi * 13 + i * 19) % 50),
      t: ['0:01','0:03','0:05','0:07'][i % 4],
      comments: [{
        author: author.id, time: ['방금','5m','30m','2h','1d'][i % 5],
        text: SEED_COMMENTS[(dayBack + mi + i) % SEED_COMMENTS.length],
      }],
    });
  }
  return pins;
}

const SEED_COMMENTS = [
  '바닥 닿기 직전에 squash 더 줘도 좋을 듯!',
  '정점에서 살짝 hang time 주면 무게감 살아요',
  '이 색 조합 진짜 좋다',
  '타이밍이 살짝 어긋나는 느낌. 앞 4프레임 빠르게?',
  '루프 연결이 자연스러워서 놀람',
  '여기서 한 박자 더 쉬면 어떨까',
  '톤 한 단계 어둡게 가도 좋겠어',
  '이 모션 진짜 시그니처 같다',
  '👀 시도해볼게',
  '레퍼런스 어디서?',
];

function seedReactions(dayBack, mi) {
  const r = {};
  const count = (dayBack + mi) % 9 + 1;
  // Distribute reactions across emojis
  for (let i = 0; i < count; i++) {
    const e = REACTION_SET[(dayBack + mi + i) % REACTION_SET.length];
    r[e] = (r[e] || 0) + 1;
    // Track WHO reacted (current user is 동윤 by default, others are mock)
    if (!r[`__${e}__by`]) r[`__${e}__by`] = [];
    r[`__${e}__by`].push(MEMBERS[(mi + i) % MEMBERS.length].id);
  }
  return r;
}

// ── State store with localStorage persistence ─
const initialState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Clean up dead blob: URLs from older sessions — they're invalid after reload.
      Object.values(parsed.days || {}).forEach(day => {
        day.subs?.forEach(sub => {
          if (sub.videoUrl?.startsWith('blob:')) {
            // Demote to missing so the slot returns to NO EXPOSURE
            delete sub.videoUrl;
            delete sub.videoMime;
            delete sub.videoName;
            sub.missing = true;
          }
        });
      });
      return parsed;
    }
  } catch {}
  return { days: buildSeed(), currentUserId: 'dy' };
};

function saveState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
  catch (e) {
    // Probably QuotaExceededError from a big base64 video.
    console.warn('[퍼스트펭귄] 저장공간이 부족합니다. 큰 영상은 새로고침 후 사라질 수 있어요.', e);
  }
}

function clearState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

Object.assign(window, {
  STORAGE_KEY, dateKey, fromKey, todayKey, fmtDate, fmtKor, wkday,
  buildSeed, initialState, saveState, clearState,
  REACTION_SET,
});
