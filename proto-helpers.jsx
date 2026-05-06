// proto-helpers.jsx — Date helpers extracted from proto-data.jsx so the
// production index.html can use them without pulling in seed data.

const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const fromKey = (k) => { const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); };
const toKey   = (d) => dateKey(d);
const todayKey = () => dateKey(new Date());
const fmtDate  = (d) => `${d.getMonth()+1}/${String(d.getDate()).padStart(2,'0')}`;
const fmtKor   = (d) => `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;
const wkday    = (d) => ['일','월','화','수','목','금','토'][d.getDay()];

Object.assign(window, { dateKey, fromKey, toKey, todayKey, fmtDate, fmtKor, wkday });
