/* 米家桌面版 前端 */
const $ = (s, el = document) => el.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
};

/* ---------------- 后端调用 ---------------- */
let backend = null;
async function call(name, ...args) {
  const r = await backend[name](...args);
  if (!r.ok) throw new Error(r.error);
  return r.data;
}

/* ---------------- 图标 ---------------- */
const P = {
  light: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  switch: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M12 7v4"/>',
  outlet: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M9 9v2M15 9v2M9 15a3 3 0 0 0 6 0"/>',
  thermo: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/>',
  motion: '<circle cx="13" cy="4" r="2"/><path d="M8 21l3-6 3 2v4M7 12l3-4 4 1 3 3M11 15l-1-4"/>',
  door: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M3 21h18M14 12h.01"/>',
  air: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
  fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7s2 5-4 7zM14 12c4 0 7 1 7 4s-5 2-7-4zM12 14c0 4-1 7-4 7s-2-5 4-7zM10 12c-4 0-7-1-7-4s5-2 7 4z"/>',
  curtain: '<path d="M3 3h18M5 3v18M19 3v18M5 3c0 6 3 10 5 18M19 3c0 6-3 10-5 18"/>',
  ac: '<rect x="2" y="5" width="20" height="9" rx="2"/><path d="M6 11h12M8 18l-1 2M12 18v2M16 18l1 2"/>',
  camera: '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3"/>',
  speaker: '<rect x="5" y="2" width="14" height="20" rx="3"/><circle cx="12" cy="14" r="3"/><path d="M12 6h.01"/>',
  hub: '<circle cx="12" cy="12" r="3"/><path d="M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14M8 8a5 5 0 0 0 0 8M16 8a5 5 0 0 1 0 8"/>',
  water: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  heat: '<path d="M8 3c0 3 3 3 3 6s-3 3-3 6M13 3c0 3 3 3 3 6s-3 3-3 6M4 21h16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  device: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="2"/>',
  power: '<path d="M12 3v9"/><path d="M6.3 7a8 8 0 1 0 11.4 0"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  leaf: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19l7-7"/>',
  co2: '<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-1 9z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/>',
  router: '<rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 13V9M17 13V9M7 17h.01M11 17h.01"/>',
  washer: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8 6h.01M11 6h.01"/>',
  pet: '<circle cx="7" cy="9" r="1.6"/><circle cx="17" cy="9" r="1.6"/><circle cx="10" cy="5.5" r="1.6"/><circle cx="14" cy="5.5" r="1.6"/><path d="M12 12c-3 0-5 3.5-5 5.5S9 20 12 19s5 1 5-1.5S15 12 12 12z"/>',
  laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
};
const icon = (name, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24">${P[name] || P.device}</svg>`;
function kindIcon(kind = '', model = '') {
  const k = kind + ' ' + model;
  const rules = [
    [/light|lamp|bulb|ceiling|strip/, 'light'], [/temperature|humidity|weather|sensor_ht|thermo|miaomiaoce/, 'thermo'],
    [/motion|occupancy|presence/, 'motion'], [/magnet|contact|door|window/, 'door'],
    [/purifier|air-fresh|airfresh|air-monitor|airmonitor/, 'air'], [/fan/, 'fan'],
    [/curtain|blind|airer/, 'curtain'], [/air-condition|acpartner|aircondition/, 'ac'],
    [/lock/, 'lock'], [/television|.tv./, 'tv'], [/router/, 'router'], [/washer|dishwasher/, 'washer'],
    [/pet|feeder/, 'pet'], [/laptop/, 'laptop'], [/doorbell|cateye/, 'camera'],
    [/camera/, 'camera'], [/speaker|wifispeaker/, 'speaker'], [/gateway|hub/, 'hub'],
    [/outlet|plug/, 'outlet'], [/switch/, 'switch'], [/heater|bath-heater/, 'heat'],
    [/humidifier|water|leak|submersion|kettle/, 'water'], [/illumination|light-sensor/, 'sun'],
  ];
  for (const [re, n] of rules) if (re.test(k)) return n;
  return 'device';
}

/* ---------------- 数值格式化 ---------------- */
const BOOL_TEXT = {
  'motion-state': ['无人', '有人'], 'contact-state': ['打开', '关闭'], 'submersion-state': ['正常', '浸水'],
  'on': ['关', '开'], 'physical-controls-locked': ['未锁', '已锁'], 'water-shortage-status': ['正常', '缺水'],
};
const sv = (p, v) => (typeof v === 'number' && p && p.scale && p.scale !== 1 ? v * p.scale : v);
function fmtNum(p, v) {
  const step = p.range && p.range[2];
  let dec = p.type === 'float' ? (step && step < 1 ? Math.min(2, String(step).split('.')[1]?.length || 1) : 1) : 0;
  if (p.scale && p.scale < 1) dec = Math.abs(v) >= 100 ? 0 : 1;
  if (['temperature', 'relative-humidity'].includes(p.key) && !Number.isInteger(v)) dec = 1;
  if (p.key === 'relative-humidity' || p.key === 'co2-density' || p.key === 'pm2.5-density') dec = Math.abs(v) >= 100 || p.key !== 'relative-humidity' ? 0 : dec;
  return (+v.toFixed(dec)).toString();
}
// 原始值 → 显示文字（不含单位）
function fmtVal(p, v, scaled = false) {
  if (v == null) return '—';
  if (p.values) {
    const it = p.values.find(x => x.value === v);
    if (it) return it.label;
  }
  if (p.type === 'bool' || typeof v === 'boolean') return (BOOL_TEXT[p.key] || ['否', '是'])[v ? 1 : 0];
  if (typeof v === 'number') {
    if (!scaled) v = sv(p, v);
    if (p.key === 'no-motion-duration') return v >= 60 ? `${Math.round(v / 60)}分钟` : `${v}秒`;
    if (p.unit === '分钟' && v >= 60) return `${Math.floor(v / 60)}小时${v % 60 ? (v % 60) + '分' : ''}`;
    return fmtNum(p, v);
  }
  return String(v);
}
const unitOf = (p, v) => (typeof v === 'number' && !p.values && !(p.unit === '分钟' && v >= 60) ? p.unit || '' : '');
const fmtFull = (p, v) => fmtVal(p, v) + unitOf(p, sv(p, v));

function level(key, v) {
  if (typeof v !== 'number') return key === 'submersion-state' && v ? 'bad' : '';
  const t = {
    'pm2.5-density': [35, 75], 'pm10-density': [50, 150], 'co2-density': [1000, 1500],
    'hcho-density': [0.08, 0.1], 'tvoc-density': [600, 1000],
  }[key];
  if (key === 'battery-level') return v <= 10 ? 'bad' : v <= 20 ? 'warn' : '';
  if (!t) return '';
  return v <= t[0] ? 'good' : v <= t[1] ? 'warn' : 'bad';
}
const LEVEL_TEXT = { 'pm2.5-density': ['优', '良', '差'], 'co2-density': ['清新', '偏闷', '很闷'], 'tvoc-density': ['优', '一般', '差'], 'pm10-density': ['优', '良', '差'] };
function comfort(t, hm) {
  if (t == null) return null;
  if (t >= 28) return ['偏热', 'hot'];
  if (t <= 15) return ['偏冷', 'cold'];
  if (hm != null && hm < 35) return ['偏干', 'dry'];
  if (hm != null && hm > 65) return ['潮湿', 'wet'];
  return ['舒适', 'ok'];
}
function ago(t) {
  if (!t) return '';
  const s = Date.now() / 1000 - t;
  if (s < 1200) return '';
  if (s < 3600) return `${Math.round(s / 60)}分钟前`;
  if (s < 86400) return `${Math.round(s / 3600)}小时前`;
  return `${Math.round(s / 86400)}天前`;
}
const pk = p => `${p.siid}.${p.piid}`;
// 变化阈值：小于它就算「持平」
const FLAT = { temperature: 0.15, 'relative-humidity': 1.5, 'co2-density': 30, 'pm2.5-density': 3, 'tvoc-density': 30, illumination: 20, 'electric-power': 2 };
const BAD_UP = new Set(['co2-density', 'pm2.5-density', 'pm10-density', 'tvoc-density', 'hcho-density']);

/* ---------------- 状态 ---------------- */
const S = {
  homes: [], devices: [], scenes: [], settings: {},
  values: {}, trends: {}, home: null, view: 'env', filter: 'all', search: '',
  widget: false, detail: null, pollTimer: null, trendTimer: null,
};
const roomName = id => {
  for (const hm of S.homes) for (const r of hm.rooms) if (r.id === id) return r.name;
  return '未分配房间';
};
const valOf = (did, p) => S.values[did]?.[pk(p)];
// 当前值：优先实时读数，读不到就用历史里最后一个点
function cur(d, p) {
  const v = valOf(d.did, p);
  if (v && v.code === 0 && v.v != null) return { v: v.v, t: v.t };
  const tr = S.trends[d.did]?.[pk(p)];
  if (tr) return { v: tr.last, t: tr.last_t };
  return null;
}

/* ---------------- 启动 / 登录 ---------------- */
async function boot() {
  applyTheme('auto');
  try {
    const st = await call('status');
    if (st.logged_in) return enterApp();
  } catch (e) { console.error(e); }
  showLogin();
}

let loginTimer = null;
async function showLogin() {
  $('#app').classList.add('hidden');
  $('#login').classList.remove('hidden');
  $('#qr').innerHTML = '<span style="color:#999">正在获取二维码…</span>';
  $('#login-msg').textContent = '请用米家 App 扫码';
  clearInterval(loginTimer);
  try {
    const r = await call('start_login');
    if (r.refreshed) return enterApp();
    $('#qr').innerHTML = `<img src="${r.qr}" alt="二维码">`;
    S.loginQr = r.qr;
    loginTimer = setInterval(async () => {
      const s = await call('login_state');
      if (s.state === 'ok') { clearInterval(loginTimer); enterApp(); }
      else if (s.state === 'error') { clearInterval(loginTimer); $('#login-msg').textContent = '登录失败：' + s.msg + '，请刷新二维码'; }
    }, 1500);
  } catch (e) {
    $('#qr').innerHTML = '<span style="color:#e5484d">获取失败</span>';
    $('#login-msg').textContent = e.message;
  }
}
$('#login-retry').onclick = showLogin;
// 手机上没法扫自己屏幕：把二维码转成 PNG 存到相册，再在米家 App 里从相册识别
$('#login-save').onclick = () => {
  if (!S.loginQr) return;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 720;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 720, 720);
    g.drawImage(img, 40, 40, 640, 640);
    const ok = window.AndroidBridge?.saveImage(c.toDataURL('image/png'), 'mijia-login.png');
    toast(ok ? '已保存到相册，打开米家 App 扫一扫 → 相册选这张图' : '保存失败，请截屏后在米家 App 里从相册识别', !ok);
  };
  img.src = S.loginQr;
};
$('#login-mihome').onclick = () => { if (!window.AndroidBridge?.openMiHome()) toast('没有找到米家 App', true); };

async function enterApp() {
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#devices').innerHTML = '<div class="empty">正在加载设备…</div>';
  await reload();
}

async function reload() {
  const btn = $('#btn-refresh');
  btn.classList.add('spin');
  try {
    const d = await call('load');
    Object.assign(S, { homes: d.homes, devices: d.devices, scenes: d.scenes, settings: d.settings, qingping: d.qingping || {} });
    if (S.qingping.error) toast('青萍物联：' + S.qingping.error, true);
    else if (S.qingping.warning) toast('青萍物联：' + S.qingping.warning);
    applyTheme(S.settings.theme);
    $('#btn-top').classList.toggle('active', !!S.settings.on_top);
    if (!S.homes.find(x => x.id === S.home)) S.home = S.settings.home_id && S.homes.find(x => x.id === S.settings.home_id) ? S.settings.home_id : S.homes[0]?.id;
    renderHomes();
    render();
    await poll();
    loadTrends().then(logPanels);
    schedulePoll();
  } catch (e) {
    toast('加载失败：' + e.message, true);
    if (/登录|token|401|LoginError/i.test(e.message)) showLogin();
  } finally { btn.classList.remove('spin'); }
}

function schedulePoll() {
  clearInterval(S.pollTimer); clearInterval(S.trendTimer);
  S.pollTimer = setInterval(poll, (S.settings.poll_seconds || 60) * 1000);
  S.trendTimer = setInterval(loadTrends, 5 * 60 * 1000);
}
async function poll() {
  try {
    const r = await call('poll');
    S.values = r.values;
    $('#last-update').textContent = '更新于 ' + new Date(r.ts * 1000).toLocaleTimeString();
    render();
  } catch (e) { console.warn(e); }
}
async function loadTrends() {
  try { S.trends = await call('trends'); render(); } catch (e) { console.warn(e); }
}

/* ---------------- 渲染：导航 ---------------- */
function homeDevices() {
  const hidden = new Set(S.settings.hidden || []);
  return S.devices.filter(d => d.home_id === S.home && !hidden.has(d.did));
}
const isSensor = d => d.summary.is_sensor;

function renderHomes() {
  const sel = $('#home-select');
  sel.innerHTML = '';
  for (const hm of S.homes) sel.append(h('option', { value: hm.id, selected: hm.id === S.home }, hm.name));
  sel.classList.toggle('hidden', S.homes.length < 2);
  sel.onchange = () => { S.home = sel.value; S.view = 'env'; call('save_settings', { home_id: S.home }); render(); };
}

function render() {
  const devs = homeDevices();
  const home = S.homes.find(x => x.id === S.home);
  const roomIds = [...(home?.rooms || []).map(r => r.id)];
  if (devs.some(d => !roomIds.includes(d.room_id))) roomIds.push('');

  const nav = $('#rooms');
  nav.innerHTML = '';
  const navItem = (id, name, n, ic) => h('button', {
    class: 'nav-item' + (S.view === id ? ' active' : ''), onclick: () => { S.view = id; S.filter = 'all'; render(); $('#content').scrollTop = 0; },
  }, h('span', { class: 'nav-l', html: (ic ? icon(ic) : '') + `<span>${name}</span>` }), n != null ? h('span', { class: 'cnt' }, n) : null);
  nav.append(navItem('env', '环境总览', null, 'thermo'));
  nav.append(navItem('all', '全部设备', devs.length, 'device'));
  const favN = devs.filter(d => (S.settings.favorites || []).includes(d.did)).length;
  if (favN) nav.append(navItem('fav', '收藏', favN, 'star'));
  nav.append(h('div', { class: 'nav-title' }, '房间'));
  for (const id of roomIds) {
    const n = devs.filter(d => d.room_id === id).length;
    if (n) nav.append(navItem('room:' + id, id ? roomName(id) : '未分配房间', n));
  }

  const title = S.widget ? (home?.name || '米家') : S.view === 'env' ? '环境总览' : S.view === 'all' ? '全部设备'
    : S.view === 'fav' ? '收藏' : roomName(S.view.slice(5));
  $('#title').textContent = title;
  renderScenes();

  const box = $('#devices');
  box.innerHTML = '';
  $('#filters').innerHTML = '';
  if (S.widget) return renderWidget(devs, box);
  if (S.view === 'env') return renderEnv(devs, roomIds, box);
  let list = devs;
  if (S.view === 'fav') list = devs.filter(d => (S.settings.favorites || []).includes(d.did));
  else if (S.view.startsWith('room:')) {
    const rid = S.view.slice(5);
    list = devs.filter(d => d.room_id === rid);
    const panels = roomPanels(list, rid);
    if (panels.length) box.append(h('div', { class: 'env-grid' }, panels));
  }
  renderDeviceList(list, roomIds, box);
}

function renderScenes() {
  const box = $('#scenes');
  box.innerHTML = '';
  if (S.view !== 'env' && S.view !== 'all') return;
  for (const s of S.scenes.filter(s => s.home_id === S.home)) {
    box.append(h('button', {
      class: 'scene', html: icon('play') + s.name,
      onclick: async () => {
        try { await call('run_scene', s.id, s.home_id); toast(`已执行「${s.name}」`); setTimeout(poll, 2000); }
        catch (e) { toast('执行失败：' + e.message, true); }
      },
    }));
  }
}

/* ---------------- 环境总览 ---------------- */
// 每个房间一个面板：优先用专门的温湿度计/空气检测仪，家电自带的传感器作为补充
function roomPanels(devs, rid) {
  // 离线又没有任何历史数据的传感器不占位置
  const envDevs = devs.filter(d => d.room_id === rid && d.summary.env?.some(p => p.key !== 'electric-power' && (d.online || S.trends[d.did]?.[pk(p)])));
  if (!envDevs.length) return [];
  const sensors = envDevs.filter(isSensor);
  const appliances = envDevs.filter(d => !isSensor(d));
  const primaries = (sensors.length ? sensors : appliances.slice(0, 1));
  const panels = [];
  for (const [i, d] of primaries.entries()) {
    const extras = i === 0 ? [...sensors.filter(x => x !== d), ...appliances.filter(x => x !== d)] : [];
    panels.push(envPanel(d, rid, extras, primaries.length > 1));
  }
  return panels;
}

function renderEnv(devs, roomIds, box) {
  const panels = roomIds.flatMap(rid => roomPanels(devs, rid));
  if (!panels.length) { box.append(h('div', { class: 'empty' }, '这个家里没有温湿度 / 空气类传感器')); return; }
  box.append(h('div', { class: 'env-grid' }, panels));
  // 其它值得一眼看到的状态：门锁、正在工作的家电、低电量
  const notes = [];
  for (const d of devs) {
    if (!d.online) continue;
    for (const p of d.summary.sensors) {
      const c = cur(d, p);
      if (p.key === 'battery-level' && c && typeof c.v === 'number' && c.v <= 20) notes.push([d, `电量低 ${c.v}%`, 'warn']);
    }
    const st = statusText(d);
    if (/camera|doorbell|cateye/.test(d.kind + d.model)) continue; // 摄像头一直是开着的，不算动态
    if (d.summary.power) {
      const pw = cur(d, d.summary.power);
      if (pw && pw.v === true) notes.push([d, '运行中' + (st ? ' · ' + st : ''), 'on']);
    } else if (/门|锁/.test(d.name + d.kind) && st) notes.push([d, st, '']);
  }
  if (notes.length) {
    box.append(h('div', { class: 'group-title' }, '设备动态'));
    box.append(h('div', { class: 'notes' }, notes.map(([d, text, cls]) => h('button', { class: 'note ' + cls, onclick: () => openDetail(d.did) },
      h('span', { class: 'dev-ico sm', html: icon(kindIcon(d.kind, d.model)) }), h('span', { class: 'nn' }, d.name), h('span', { class: 'nt' }, text)))));
  }
}

function deltaChip(key, p, now, v1h) {
  if (now == null || v1h == null) return null;
  const d = sv(p, now) - sv(p, v1h);
  const flat = FLAT[key] ?? 0;
  if (Math.abs(d) < flat) return h('span', { class: 'delta flat', title: '与 1 小时前相比' }, '→ 持平');
  const up = d > 0;
  const cls = BAD_UP.has(key) ? (up ? 'bad' : 'good') : key === 'temperature' ? (up ? 'warm' : 'cool') : 'neutral';
  return h('span', { class: 'delta ' + cls, title: '与 1 小时前相比' }, `${up ? '↑' : '↓'} ${fmtNum(p, Math.abs(d))}${p.unit} /1时`);
}

function rangeBar(p, now, tr) {
  if (!tr || now == null || tr.max - tr.min <= 0) return null;
  const pos = Math.max(0, Math.min(1, (now - tr.min) / (tr.max - tr.min)));
  return h('div', { class: 'range', title: '今天（24 小时内）的最低 / 最高' },
    h('span', {}, fmtVal(p, tr.min, true)),
    h('div', { class: 'track' }, h('i', { style: `left:${pos * 100}%` })),
    h('span', {}, fmtVal(p, tr.max, true)));
}

function envPanel(d, rid, extras, multi) {
  const env = d.summary.env.filter(p => p.key !== 'electric-power');
  const byKey = k => env.find(p => p.key === k);
  const tP = byKey('temperature'), hP = byKey('relative-humidity');
  const tC = tP && cur(d, tP), hC = hP && cur(d, hP);
  const cf = comfort(tC && sv(tP, tC.v), hC && sv(hP, hC.v));
  const stale = ago(tC?.t || hC?.t);
  const coP = byKey('co2-density');
  const coC = coP && cur(d, coP);
  const wide = !!(coP && (coC || S.trends[d.did]?.[pk(coP)]));
  const panel = h('div', { class: 'envp' + (wide ? ' wide' : '') + (d.online ? '' : ' offline'), onclick: () => openDetail(d.did) });
  panel.append(h('div', { class: 'envp-head' },
    // 设备名和房间名不同就一直显示设备名，免得只剩一个面板时看不出是哪个传感器
    h('div', { class: 'envp-title' }, rid ? roomName(rid) : d.name, rid && (multi || d.name !== roomName(rid)) ? h('span', {}, d.name) : null),
    cf ? h('span', { class: 'tag ' + cf[1] }, cf[0]) : null,
    !d.online ? h('span', { class: 'tag off' }, '离线') : stale ? h('span', { class: 'tag stale' }, stale + '更新') : null));

  // 主读数：温度 / 湿度
  const big = h('div', { class: 'envp-big' });
  for (const [p, c, cls] of [[tP, tC, 't'], [hP, hC, 'hm']]) {
    if (!p || !c) continue;
    const tr = S.trends[d.did]?.[pk(p)];
    big.append(h('div', { class: 'bigv ' + cls },
      h('div', { class: 'bignum', html: `${fmtVal(p, c.v)}<small>${p.unit}</small>` }),
      h('div', { class: 'sub' }, h('span', {}, p.key === 'temperature' ? '温度' : '湿度'), deltaChip(p.key, p, c.v, tr?.v1h)),
      rangeBar(p, sv(p, c.v), tr && { min: sv(p, tr.min), max: sv(p, tr.max) })));
  }
  const left = wide ? h('div', { class: 'envp-col' }) : panel;
  if (big.children.length) left.append(big);

  // 其它指标：本设备的 + 同房间其它设备补充的
  const chips = [];
  const seen = new Set(['temperature', 'relative-humidity', ...(wide ? ['co2-density'] : [])]);
  for (const [dev, p] of [...env.map(p => [d, p]), ...extras.flatMap(x => x.summary.env.map(p => [x, p]))]) {
    if (seen.has(p.key) || p.key === 'electric-power') continue;
    const c = cur(dev, p);
    if (!c || typeof c.v !== 'number') continue;
    seen.add(p.key);
    const val = sv(p, c.v), lv = level(p.key, val);
    const tr = S.trends[dev.did]?.[pk(p)];
    chips.push(h('div', { class: 'chipv ' + lv, title: dev === d ? '' : '来自 ' + dev.name, onclick: e => { e.stopPropagation(); openDetail(dev.did); } },
      h('div', { class: 'k' }, p.name, lv && LEVEL_TEXT[p.key] ? h('b', {}, LEVEL_TEXT[p.key][['good', 'warn', 'bad'].indexOf(lv)]) : null),
      h('div', { class: 'v', html: `${fmtVal(p, c.v)}<small>${p.unit}</small>` }),
      deltaChip(p.key, p, c.v, tr?.v1h)));
  }
  if (chips.length) left.append(h('div', { class: 'chips' }, chips));

  // 24 小时曲线：温度 + 湿度（没有就画第一个有数据的指标）
  const series = [];
  if (tP && S.trends[d.did]?.[pk(tP)]) series.push({ p: tP, pts: S.trends[d.did][pk(tP)].pts, color: 'var(--c-temp)' });
  if (hP && S.trends[d.did]?.[pk(hP)]) series.push({ p: hP, pts: S.trends[d.did][pk(hP)].pts, color: 'var(--c-hum)' });
  if (!series.length) {
    const p = env.find(p => S.trends[d.did]?.[pk(p)]);
    if (p) series.push({ p, pts: S.trends[d.did][pk(p)].pts, color: 'var(--accent)' });
  }
  if (series.length && series[0].pts.length > 2) left.append(lineChart(series, { h: 110, compact: true }));
  else if (d.online) left.append(h('div', { class: 'nochart' }, '曲线数据加载中…'));
  if (wide) panel.append(h('div', { class: 'envp-cols' }, left, co2Block(d, coP, coC)));
  return panel;
}

const CO2_MARKS = [{ v: 1000, color: 'var(--warn)', label: '1000' }, { v: 1500, color: 'var(--bad)', label: '1500' }];
function co2Block(d, p, c) {
  const tr = S.trends[d.did]?.[pk(p)];
  const v = c ? sv(p, c.v) : null;
  const lv = v != null ? level(p.key, v) : '';
  const col = h('div', { class: 'envp-col co2' });
  col.append(h('div', { class: 'bigv co' },
    h('div', { class: 'bignum ' + lv, html: v != null ? `${fmtVal(p, c.v)}<small>ppm</small>` : '—' }),
    h('div', { class: 'sub' }, h('span', {}, '二氧化碳'),
      lv ? h('span', { class: 'tag lv-' + lv }, LEVEL_TEXT['co2-density'][['good', 'warn', 'bad'].indexOf(lv)]) : null,
      c ? deltaChip(p.key, p, c.v, tr?.v1h) : null),
    v != null ? rangeBar(p, v, tr && { min: sv(p, tr.min), max: sv(p, tr.max) }) : null));
  if (tr && tr.pts.length > 2) {
    col.append(lineChart([{ p, pts: tr.pts, color: 'var(--c-co2)' }], { h: 150, compact: true, marks: CO2_MARKS }));
    // 24 小时里超过 1000ppm 的大致时长
    const over = tr.pts.filter(q => sv(p, q[1]) > 1000).length / tr.pts.length * 24;
    col.append(h('div', { class: 'co2-note' }, over >= 0.5 ? `近 24 小时约 ${over.toFixed(over < 10 ? 1 : 0)} 小时超过 1000ppm，记得开窗通风` : '近 24 小时空气一直比较清新'));
  }
  return col;
}

/* ---------------- 曲线 ---------------- */
// 时间刻度：两天内按整点，再长按天 / 周 / 月，最多 7 个标签
function timeTicks(t0, t1, x, H) {
  const span = t1 - t0, out = [];
  const label = (t, txt) => out.push(`<text x="${x(t)}" y="${H - 4}" text-anchor="middle">${txt}</text>`);
  if (span <= 2 * 86400) {
    const stepH = [1, 2, 3, 6, 12].find(s => span / 3600 / s <= 7) || 24;
    const d = new Date(t0 * 1000); d.setMinutes(0, 0, 0);
    for (let t = d.getTime() / 1000; t <= t1; t += 3600) {
      const dt = new Date(t * 1000);
      if (t >= t0 && dt.getHours() % stepH === 0) label(t, dt.getHours() === 0 ? `${dt.getMonth() + 1}/${dt.getDate()}` : `${dt.getHours()}:00`);
    }
  } else if (span <= 75 * 86400) {
    const step = [1, 2, 3, 7, 14].find(s => span / 86400 / s <= 7) || 14;
    const d = new Date(t0 * 1000); d.setHours(0, 0, 0, 0);
    for (; d.getTime() / 1000 <= t1; d.setDate(d.getDate() + 1)) {
      const t = d.getTime() / 1000;
      if (t >= t0 && Math.round((t - t0) / 86400) % step === 0) label(t, `${d.getMonth() + 1}/${d.getDate()}`);
    }
  } else {
    const step = span / 86400 / 30 <= 7 ? 1 : 2;
    const d = new Date(t0 * 1000); d.setDate(1); d.setHours(0, 0, 0, 0);
    for (; d.getTime() / 1000 <= t1; d.setMonth(d.getMonth() + 1)) {
      const t = d.getTime() / 1000;
      if (t >= t0 && d.getMonth() % step === 0) label(t, `${d.getMonth() + 1}月`);
    }
  }
  return out.join('');
}

// 多条线各用自己的纵向刻度；第一条刻度在左，第二条在右
function lineChart(series, { h: H = 150, hours = 24, compact = false, marks = [] } = {}) {
  const W = 400, L = compact ? 26 : 34, R = series.length > 1 ? (compact ? 26 : 34) : 8, T = 8, B = 18;
  const all = series.flatMap(s => s.pts.map(p => p[0]));
  const t1 = Math.max(...all, Date.now() / 1000 - 60);
  // 24 小时以内固定时间轴；更长的范围按实际有数据的时间缩放（云端可能只存了几十天）
  const t0 = hours <= 24 ? Math.min(Math.min(...all), t1 - hours * 3600) : Math.min(...all);
  const x = t => L + (t - t0) / Math.max(1, t1 - t0) * (W - L - R);
  const scales = series.map(s => {
    const vs = s.pts.map(p => sv(s.p, p[1]));
    let mn = Math.min(...vs), mx = Math.max(...vs);
    // 阈值线在数据附近时把它也包含进来，方便对照
    if (s === series[0]) for (const m of marks) if (m.v > mn - (mx - mn) && m.v < mx + (mx - mn) * 1.5) { mn = Math.min(mn, m.v); mx = Math.max(mx, m.v); }
    const pad = (mx - mn) * 0.15 || Math.max(Math.abs(mx) * 0.02, 0.5);
    mn -= pad; mx += pad;
    return { mn, mx, y: v => T + (1 - (v - mn) / (mx - mn)) * (H - T - B) };
  });
  let svg = '';
  for (let i = 0; i <= 2; i++) svg += `<line x1="${L}" x2="${W - R}" y1="${T + i * (H - T - B) / 2}" y2="${T + i * (H - T - B) / 2}" stroke="var(--line)" stroke-width="1"/>`;
  for (const m of marks) {
    const yy = scales[0].y(m.v);
    if (yy < T || yy > H - B) continue;
    svg += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" stroke="${m.color}" stroke-dasharray="4 3" opacity=".7"/>`;
    svg += `<text x="${W - R - 2}" y="${yy - 3}" text-anchor="end" fill="${m.color}">${m.label}</text>`;
  }
  svg += timeTicks(t0, t1, x, H);
  series.forEach((s, i) => {
    const sc = scales[i];
    const pts = s.pts.map(p => `${x(p[0]).toFixed(1)},${sc.y(sv(s.p, p[1])).toFixed(1)}`).join(' ');
    if (i === 0) svg += `<polygon points="${x(s.pts[0][0])},${H - B} ${pts} ${x(s.pts[s.pts.length - 1][0])},${H - B}" fill="${s.color}" opacity=".10"/>`;
    svg += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
    const xa = i === 0 ? L - 4 : W - R + 4, anchor = i === 0 ? 'end' : 'start';
    svg += `<text x="${xa}" y="${T + 4}" text-anchor="${anchor}" fill="${s.color}">${fmtNum(s.p, sc.mx)}</text>`;
    svg += `<text x="${xa}" y="${H - B}" text-anchor="${anchor}" fill="${s.color}">${fmtNum(s.p, sc.mn)}</text>`;
  });
  svg += `<line class="cur" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="var(--text-3)" stroke-dasharray="3 3" opacity="0"/>`;
  series.forEach((s, i) => (svg += `<circle class="dot d${i}" r="3.5" fill="${s.color}" opacity="0"/>`));
  const wrap = h('div', { class: 'chart-box' });
  wrap.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px">${svg}</svg><div class="chart-tip"></div>`;
  const el = wrap.firstChild, tip = wrap.lastChild;
  const summary = series.map(s => {
    const vs = s.pts.map(p => sv(s.p, p[1]));
    const avg = vs.reduce((a, b) => a + b, 0) / vs.length;
    return `<span style="color:${s.color}">●</span> ${s.p.name} ${fmtNum(s.p, Math.min(...vs))}~${fmtNum(s.p, Math.max(...vs))}${s.p.unit}` +
      (compact ? '' : `，平均 ${fmtNum(s.p, avg)}${s.p.unit}`);
  }).join('　') + (hours > 24 && (t1 - t0) < hours * 3600 * 0.9 ? `　<span class="muted">（云端只有最近 ${Math.max(1, Math.round((t1 - t0) / 86400))} 天的数据）</span>` : '');
  tip.innerHTML = summary;
  el.onpointermove = e => {
    const rc = el.getBoundingClientRect();
    const t = t0 + ((e.clientX - rc.left) / rc.width * W - L) / (W - L - R) * (t1 - t0);
    const parts = [];
    let cx = 0;
    series.forEach((s, i) => {
      let best = s.pts[0];
      for (const p of s.pts) if (Math.abs(p[0] - t) < Math.abs(best[0] - t)) best = p;
      cx = x(best[0]);
      const dot = el.querySelector('.d' + i);
      dot.setAttribute('cx', cx); dot.setAttribute('cy', scales[i].y(sv(s.p, best[1]))); dot.setAttribute('opacity', 1);
      parts.push(`<span style="color:${s.color}">●</span> ${fmtFull(s.p, best[1])}`);
    });
    const c = el.querySelector('.cur'); c.setAttribute('x1', cx); c.setAttribute('x2', cx); c.setAttribute('opacity', 1);
    const dt = new Date(t * 1000);
    tip.innerHTML = `${dt.getMonth() + 1}/${dt.getDate()} ${dt.toTimeString().slice(0, 5)}　` + parts.join('　');
  };
  el.onpointerleave = el.onpointerup = () => {
    tip.innerHTML = summary;
    el.querySelectorAll('.dot,.cur').forEach(n => n.setAttribute('opacity', 0));
  };
  return wrap;
}

function sparkSvg(p, pts) {
  if (!pts || pts.length < 3) return null;
  const vs = pts.map(q => q[1]);
  let mn = Math.min(...vs), mx = Math.max(...vs);
  if (mx - mn < 1e-6) { mx += 1; mn -= 1; }
  const W = 100, H = 28;
  const line = pts.map((q, i) => `${(i / (pts.length - 1)) * W},${H - 2 - ((q[1] - mn) / (mx - mn)) * (H - 4)}`).join(' ');
  const color = p.key === 'temperature' ? 'var(--c-temp)' : p.key === 'relative-humidity' ? 'var(--c-hum)' : 'var(--accent)';
  return h('div', { class: 'spark', title: `近 24 小时${p.name}`, html: `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <polygon points="0,${H} ${line} ${W},${H}" fill="${color}" opacity=".12"/>
    <polyline points="${line}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>` });
}

/* ---------------- 设备列表 ---------------- */
function renderDeviceList(list, roomIds, box) {
  const counts = {
    all: list.length, sensor: list.filter(isSensor).length,
    ctrl: list.filter(d => d.summary.controllable && !isSensor(d)).length,
    offline: list.filter(d => !d.online).length,
  };
  const fl = $('#filters');
  for (const [k, name] of [['all', '全部'], ['sensor', '传感器'], ['ctrl', '可控制'], ['offline', '离线']]) {
    if (k === 'offline' && !counts.offline) continue;
    fl.append(h('button', { class: 'chip' + (S.filter === k ? ' active' : ''), onclick: () => { S.filter = k; render(); } }, `${name} ${counts[k]}`));
  }
  if (S.filter === 'sensor') list = list.filter(isSensor);
  else if (S.filter === 'ctrl') list = list.filter(d => d.summary.controllable && !isSensor(d));
  else if (S.filter === 'offline') list = list.filter(d => !d.online);
  const q = S.search.trim().toLowerCase();
  if (q) list = list.filter(d => (d.name + d.model + roomName(d.room_id)).toLowerCase().includes(q));
  list = [...list].sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name, 'zh'));
  if (!list.length) { box.append(h('div', { class: 'empty' }, '没有设备')); return; }
  if (S.view === 'all' && !q) {
    for (const id of roomIds) {
      const g = list.filter(d => d.room_id === id);
      if (!g.length) continue;
      box.append(h('div', { class: 'group-title' }, id ? roomName(id) : '未分配房间', h('span', {}, `${g.length} 个设备`)));
      box.append(h('div', { class: 'grid' }, g.map(card)));
    }
  } else box.append(h('div', { class: 'grid' }, list.map(card)));
}

function card(d) {
  const s = d.summary;
  const pw = s.power && cur(d, s.power);
  const isOn = pw && pw.v === true;
  const fav = (S.settings.favorites || []).includes(d.did);
  const el = h('div', { class: 'card' + (isOn ? ' on' : '') + (d.online ? '' : ' offline'), onclick: () => openDetail(d.did) });
  const sub = !d.online ? '离线' : statusText(d) || (s.power ? (isOn ? '已开启' : '已关闭') : S.view === 'all' ? '在线' : roomName(d.room_id));
  const top = h('div', { class: 'card-top' },
    h('div', { class: 'dev-ico', html: icon(kindIcon(d.kind, d.model)) }),
    h('div', { class: 'meta' }, h('div', { class: 'dev-name', title: d.name }, d.name), h('div', { class: 'dev-sub' }, sub)));
  if (s.power && d.online) {
    const b = h('button', {
      class: 'power', html: icon('power'), title: isOn ? '关闭' : '打开',
      onclick: async ev => {
        ev.stopPropagation();
        b.classList.add('busy');
        try {
          const r = await call('set_prop', d.did, s.power.siid, s.power.piid, !isOn);
          if (r.code !== 0 && r.code !== 1) throw new Error(r.message || r.code);
          S.values[d.did] = { ...(S.values[d.did] || {}), [pk(s.power)]: { v: !isOn, code: 0 } };
          render();
          setTimeout(poll, 1500);
        } catch (e) { toast(`${d.name}：操作失败 ${e.message}`, true); b.classList.remove('busy'); }
      },
    });
    top.append(b);
  } else {
    top.append(h('button', {
      class: 'fav' + (fav ? ' is' : ''), html: icon('star'), title: fav ? '取消收藏' : '收藏',
      onclick: ev => { ev.stopPropagation(); toggleFav(d.did); },
    }));
  }
  el.append(top);

  const rds = [];
  let stale = '', sparkP = null;
  for (const p of s.sensors) {
    const c = cur(d, p);
    if (!c || c.v == null) continue;
    if (p.key === 'battery-level' && s.sensors.length > 1 && c.v > 20) continue; // 电量正常时不占位置
    const lv = level(p.key, sv(p, c.v));
    const tr = S.trends[d.did]?.[pk(p)];
    if (tr && !sparkP) sparkP = p;
    rds.push(h('div', { class: 'rd' + (rds.length >= 2 ? ' mini' : '') },
      h('div', { class: 'v' + (lv ? ' ' + lv : ''), html: `${fmtVal(p, c.v)}<small>${unitOf(p, sv(p, c.v))}</small>` }),
      h('div', { class: 'k' }, p.name, rds.length < 2 ? deltaChip(p.key, p, c.v, tr?.v1h) : null)));
    stale = stale || ago(c.t);
  }
  if (rds.length) el.append(h('div', { class: 'readings' }, rds));
  if (stale && d.online) el.append(h('div', { class: 'stale' }, '数据更新于 ' + stale));
  if (sparkP) { const sp = sparkSvg(sparkP, S.trends[d.did][pk(sparkP)].pts); if (sp) el.append(sp); }
  return el;
}

function statusText(d) {
  const parts = [];
  for (const p of d.summary.status) {
    const c = cur(d, p);
    if (c && c.v != null) parts.push(p.key === 'status' || p.key === 'mode' || p.key === 'playing-state' || p.key === 'door-state' ? fmtVal(p, c.v) : `${p.name} ${fmtFull(p, c.v)}`);
  }
  return parts.join(' · ');
}

async function toggleFav(did) {
  const fav = new Set(S.settings.favorites || []);
  fav.has(did) ? fav.delete(did) : fav.add(did);
  S.settings = await call('save_settings', { favorites: [...fav] });
  render();
  if (S.detail?.did === did) $('#d-fav').classList.toggle('active', fav.has(did));
}

/* ---------------- 小组件模式 ---------------- */
function renderWidget(devs, box) {
  const home = S.homes.find(x => x.id === S.home);
  const roomIds = [...(home?.rooms || []).map(r => r.id), ''];
  const panels = roomIds.flatMap(rid => roomPanels(devs, rid));
  if (panels.length) box.append(h('div', { class: 'env-grid' }, panels));
  const fav = devs.filter(d => (S.settings.favorites || []).includes(d.did) && !isSensor(d));
  if (fav.length) box.append(h('div', { class: 'grid' }, fav.map(card)));
}

/* ---------------- 详情 ---------------- */
async function openDetail(did) {
  const d = S.devices.find(x => x.did === did);
  S.detail = { did };
  $('#d-ico').innerHTML = icon(kindIcon(d.kind, d.model));
  $('#d-name').textContent = d.name;
  $('#d-sub').textContent = `${roomName(d.room_id)}${d.online ? '' : ' · 离线'}`;
  $('#d-fav').classList.toggle('active', (S.settings.favorites || []).includes(did));
  $('#d-body').innerHTML = '<div class="empty">读取中…</div>';
  $('#mask').classList.remove('hidden');
  $('#drawer').classList.add('open');
  await refreshDetail();
}
window.__onBack = () => {
  if (S.detail) { closeDetail(); return true; }
  if (!$('#settings').classList.contains('hidden')) { $('#settings').classList.add('hidden'); return true; }
  if (S.view !== 'env') { S.view = 'env'; render(); return true; }
  return false;
};
function closeDetail() {
  S.detail = null;
  $('#drawer').classList.remove('open');
  $('#mask').classList.add('hidden');
}
$('#d-close').onclick = closeDetail;
$('#mask').onclick = closeDetail;
$('#d-fav').onclick = () => S.detail && toggleFav(S.detail.did);
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDetail(); $('#settings').classList.add('hidden'); } });

async function refreshDetail() {
  if (!S.detail) return;
  const did = S.detail.did;
  let r;
  try { r = await call('detail', did); } catch (e) { $('#d-body').innerHTML = `<div class="empty">读取失败：${e.message}</div>`; return; }
  if (S.detail?.did !== did) return;
  S.detail.data = r;
  renderDetail();
}

const TREND_KEYS = ['temperature', 'relative-humidity', 'pm2.5-density', 'co2-density', 'illumination', 'hcho-density', 'tvoc-density', 'pm10-density', 'electric-power', 'atmospheric-pressure'];
// 故障 / 异常类属性只在真的有问题时才显示
const isOkFault = (p, v) => /fault|abnormal/.test(p.key) && (v === 0 || v === false || /无|正常/.test(fmtVal(p, v)));

function renderDetail() {
  const { device: d, spec, values } = S.detail.data;
  const showAll = !!S.settings.show_all;
  const body = $('#d-body');
  const scroll = body.scrollTop;
  body.innerHTML = '';
  if (!spec) { body.append(h('div', { class: 'empty' }, '该设备没有公开的控制接口，桌面端暂不支持')); return; }
  if (!d.online) body.append(h('div', { class: 'empty', style: 'padding:16px 0' }, '设备离线'));

  const envKeys = new Set((d.summary.env || []).map(pk));
  const trendProps = spec.services.flatMap(s => s.props).filter(p => p.read && TREND_KEYS.includes(p.key) && (envKeys.has(pk(p)) || showAll))
    .sort((a, b) => TREND_KEYS.indexOf(a.key) - TREND_KEYS.indexOf(b.key));
  if (trendProps.length) body.append(chartBlock(d.did, trendProps));

  let shown = 0;
  if (d.source === 'qingping') { body.append(qingpingBlock(d)); shown++; }
  for (const svc of spec.services) {
    const rows = [];
    for (const p of svc.props) {
      if (!showAll && (!p.simple || (trendProps.includes(p) && !p.write))) continue;
      const v = values[pk(p)];
      if (!showAll && v && v.code === 0 && isOkFault(p, v.v)) continue;
      const row = propRow(d, p, v);
      if (row) rows.push(row);
    }
    const acts = svc.actions.filter(a => showAll || a.simple);
    if (acts.length) rows.push(h('div', { class: 'row acts' }, acts.map(a => actionBtn(d, a))));
    if (!rows.length) continue;
    shown += rows.length;
    body.append(h('div', { class: 'svc' }, h('div', { class: 'svc-title' }, svc.name), rows));
  }
  if (!shown && !trendProps.length) body.append(h('div', { class: 'empty' }, '这个设备没有适合在桌面端设置的功能'));
  body.append(h('div', { style: 'display:flex;gap:8px;justify-content:flex-end;margin-top:8px' },
    h('button', { class: 'btn danger', onclick: async () => {
      S.settings = await call('save_settings', { hidden: [...(S.settings.hidden || []), d.did] });
      closeDetail(); render(); toast('已隐藏，可在设置中恢复');
    } }, '在桌面端隐藏此设备')));
  body.scrollTop = scroll;
}

// 青萍设备不在米家的房间体系里，由用户自己选放在哪个房间
function qingpingBlock(d) {
  const home = S.homes.find(x => x.id === d.home_id) || S.homes.find(x => x.id === S.home);
  const sel = h('select', { class: 'sel', onchange: async () => {
    const rooms = { ...(S.settings.qingping_rooms || {}), [d.did]: [home.id, sel.value] };
    S.settings = await call('save_settings', { qingping_rooms: rooms });
    Object.assign(d, { room_id: sel.value, home_id: home.id });
    $('#d-sub').textContent = roomName(d.room_id);
    render();
    toast(`已放到「${roomName(d.room_id)}」`);
  } }, h('option', { value: '', selected: !d.room_id }, '未分配房间'),
    (home?.rooms || []).map(r => h('option', { value: r.id, selected: r.id === d.room_id }, r.name)));
  const rows = [h('div', { class: 'row' }, h('div', { class: 'lbl' }, h('div', {}, '所在房间'), h('div', { class: 'hint' }, '青萍设备不在米家里，需要手动指定')), sel)];
  if (d.report_interval) rows.push(h('div', { class: 'row' }, h('div', { class: 'lbl' }, h('div', {}, '上报间隔')),
    h('div', { class: 'ro' }, d.report_interval >= 60 ? `${Math.round(d.report_interval / 60)} 分钟` : `${d.report_interval} 秒`)));
  return h('div', { class: 'svc' }, h('div', { class: 'svc-title' }, '青萍物联'), rows);
}

async function doSet(d, p, value) {
  try {
    const r = await call('set_prop', d.did, p.siid, p.piid, value);
    if (r.code !== 0 && r.code !== 1) throw new Error(r.message || r.code);
    S.detail.data.values[pk(p)] = { v: value, code: 0 };
    if (S.values[d.did]?.[pk(p)]) S.values[d.did][pk(p)].v = value;
    renderDetail(); render();
    setTimeout(refreshDetail, 1500);
  } catch (e) { toast(`设置失败：${e.message}`, true); refreshDetail(); }
}

function propRow(d, p, v) {
  if (!p.read && !p.write) return null;
  const cv = v && v.code === 0 ? v.v : undefined;
  if (p.read && !p.write && cv === undefined) return null; // 读不到的只读属性不显示
  const unit = p.unit || '';
  const canWrite = p.write && d.online;
  const lbl = h('div', { class: 'lbl' }, h('div', {}, p.name));

  if (!canWrite) {
    const lv = level(p.key, sv(p, cv));
    return h('div', { class: 'row' }, lbl, h('div', { class: 'ro' + (lv ? ' v ' + lv : '') }, cv === undefined ? '—' : fmtFull(p, cv)));
  }
  if (p.type === 'bool') {
    return h('div', { class: 'row' }, lbl, h('button', { class: 'toggle' + (cv ? ' on' : ''), onclick: () => doSet(d, p, !cv) }));
  }
  if (p.values) {
    if (p.values.length <= 8) {
      return h('div', { class: 'row col' }, h('div', { class: 'top' }, lbl),
        h('div', { class: 'seg' }, p.values.map(it => h('button', { class: it.value === cv ? 'active' : '', onclick: () => doSet(d, p, it.value) }, it.label))));
    }
    const sel = h('select', { class: 'sel', onchange: () => doSet(d, p, +sel.value) },
      cv === undefined ? h('option', { value: '' }, '选择…') : null,
      p.values.map(it => h('option', { value: it.value, selected: it.value === cv }, it.label)));
    return h('div', { class: 'row' }, lbl, sel);
  }
  if ((p.type === 'int' || p.type === 'float') && p.range) {
    const [min, max, step = 1] = p.range;
    const num = h('input', { class: 'num', type: 'number', min, max, step, value: cv ?? '' });
    const rng = h('input', { type: 'range', min, max, step, value: cv ?? min });
    if (p.key === 'color-temperature') rng.style.setProperty('--track', 'linear-gradient(90deg,#ffb35c,#fff3e0,#cfe3ff)');
    else if (p.key === 'brightness') rng.style.setProperty('--track', 'linear-gradient(90deg,#3a3f48,#ffd27a)');
    const send = val => {
      val = p.type === 'int' ? Math.round(+val) : +val;
      if (isNaN(val)) return;
      doSet(d, p, Math.min(max, Math.max(min, val)));
    };
    rng.oninput = () => (num.value = rng.value);
    rng.onchange = () => send(rng.value);
    num.onchange = () => send(num.value);
    if ((max - min) / step <= 12) {
      // 档位少的直接做成按钮
      const opts = []; for (let x = min; x <= max + 1e-9; x += step) opts.push(+x.toFixed(4));
      return h('div', { class: 'row col' }, h('div', { class: 'top' }, lbl),
        h('div', { class: 'seg' }, opts.map(o => h('button', { class: o === cv ? 'active' : '', onclick: () => doSet(d, p, o) }, `${o}${unit}`))));
    }
    if ((max - min) / step > 20000) return h('div', { class: 'row' }, lbl, num, h('span', { class: 'ro' }, unit));
    return h('div', { class: 'row col' }, h('div', { class: 'top' }, lbl, num, h('span', { class: 'ro' }, unit)), rng);
  }
  const inp = h('input', { class: 'txt', value: cv ?? '' });
  return h('div', { class: 'row' }, lbl, inp, h('button', { class: 'btn', onclick: () => {
    let val = inp.value;
    if (p.type === 'int' || p.type === 'float') val = +val;
    doSet(d, p, val);
  } }, '设置'));
}

function actionBtn(d, a) {
  return h('button', { class: 'btn', disabled: !d.online || null, onclick: async () => {
    let ins = [];
    if (a.nargs) {
      const s = prompt(`「${a.name}」需要参数（JSON 数组）`, '[]');
      if (s == null) return;
      try { ins = JSON.parse(s); } catch { return toast('参数格式不对，需要 JSON 数组', true); }
    }
    try {
      const r = await call('action', d.did, a.siid, a.aiid, ins);
      if (r.code !== 0 && r.code !== 1) throw new Error(r.message || r.code);
      toast(`已执行：${a.name}`);
      setTimeout(refreshDetail, 1500);
    } catch (e) { toast('执行失败：' + e.message, true); }
  } }, a.name);
}

function chartBlock(did, props) {
  const st = S.detail.chart || (S.detail.chart = { idx: 0, hours: 24 });
  if (st.idx >= props.length) st.idx = 0;
  const d = S.devices.find(x => x.did === did);
  const wrap = h('div', { class: 'chart-wrap' });
  // 顶部大数字：每个指标的当前值 + 1 小时变化，点一下切换曲线
  const tabs = h('div', { class: 'metric-tabs' }, props.map((p, i) => {
    const c = cur(d, p) || (S.detail.data.values[pk(p)]?.code === 0 ? { v: S.detail.data.values[pk(p)].v } : null);
    const tr = S.trends[did]?.[pk(p)];
    const lv = c ? level(p.key, sv(p, c.v)) : '';
    return h('button', { class: 'mt' + (i === st.idx ? ' active' : ''), onclick: () => { st.idx = i; renderDetail(); } },
      h('div', { class: 'k' }, p.name),
      h('div', { class: 'v ' + lv, html: c ? `${fmtVal(p, c.v)}<small>${p.unit}</small>` : '—' }),
      c ? deltaChip(p.key, p, c.v, tr?.v1h) : null);
  }));
  wrap.append(tabs);
  wrap.append(h('div', { class: 'chart-head' }, h('div', { class: 't' }, '历史曲线'),
    h('div', { class: 'seg' }, [[24, '24小时'], [168, '7天'], [720, '30天'], [2160, '90天'], [8760, '1年']].map(([hr, t]) =>
      h('button', { class: st.hours === hr ? 'active' : '', onclick: () => { st.hours = hr; renderDetail(); } }, t)))));
  const box = h('div', {}, h('div', { class: 'empty', style: 'padding:50px 0' }, st.hours > 720 ? '正在从云端读取，较长时间范围需要几秒…' : '加载中…'));
  wrap.append(box);
  const p = props[st.idx];
  const color = p.key === 'temperature' ? 'var(--c-temp)' : p.key === 'relative-humidity' ? 'var(--c-hum)' : 'var(--accent)';
  call('history', did, p.siid, p.piid, st.hours).then(rows => {
    box.innerHTML = '';
    if (rows.length < 2) box.append(h('div', { class: 'empty', style: 'padding:36px 0' }, '暂无历史数据。程序开着时会持续记录，之后这里就能看到曲线。'));
    else box.append(lineChart([{ p, pts: rows, color: p.key === 'co2-density' ? 'var(--c-co2)' : color }], { h: 170, hours: st.hours, marks: p.key === 'co2-density' ? CO2_MARKS : [] }));
  });
  return wrap;
}

/* ---------------- 顶栏 / 设置 ---------------- */
$('#search').oninput = e => { S.search = e.target.value; if (S.search && S.view === 'env') S.view = 'all'; render(); };
$('#btn-refresh').onclick = reload;
$('#btn-top').onclick = async () => {
  S.settings = await call('save_settings', { on_top: !S.settings.on_top });
  $('#btn-top').classList.toggle('active', S.settings.on_top);
  toast(S.settings.on_top ? '窗口已置顶' : '已取消置顶');
};
$('#btn-widget').onclick = async () => {
  S.widget = !S.widget;
  document.body.classList.toggle('widget', S.widget);
  $('#btn-widget').classList.toggle('active', S.widget);
  closeDetail();
  await call('widget_mode', S.widget);
  render();
};
$('#btn-settings').onclick = () => {
  $('#set-poll').value = String(S.settings.poll_seconds || 60);
  $('#set-theme').value = S.settings.theme || 'auto';
  $('#set-all').classList.toggle('on', !!S.settings.show_all);
  $('#qp-key').value = S.settings.qingping_key || '';
  $('#qp-secret').value = '';
  $('#qp-secret').placeholder = S.settings.qingping_secret ? 'App Secret（已保存，不改就留空）' : 'App Secret';
  const qp = S.qingping || {};
  $('#qp-hint').textContent = qp.error ? '连接失败：' + qp.error
    : qp.enabled ? `已连接，显示 ${qp.count ?? 0} 台设备` + (qp.skipped?.length ? `（${qp.skipped.map(x => `「${x.name}」`).join('、')}和米家里的是同一台，已只保留米家那份）` : '')
    : '在青萍开发者平台「个人中心 → 权限管理」申请 App Key 和 App Secret 后填在这里';
  const n = (S.settings.hidden || []).length;
  $('#hidden-hint').textContent = n ? `${n} 个设备被隐藏` : '没有隐藏的设备';
  $('#settings').classList.remove('hidden');
};
$('#set-close').onclick = () => $('#settings').classList.add('hidden');
$('#qp-save').onclick = async () => {
  const key = $('#qp-key').value.trim();
  const secret = $('#qp-secret').value.trim() || (key ? S.settings.qingping_secret : '');
  const btn = $('#qp-save');
  btn.disabled = true; btn.textContent = '连接中…';
  try {
    const r = await call('set_qingping', key, secret || '');
    toast(key ? `青萍物联已连接，账号下有 ${r.count} 台设备` : '已断开青萍物联');
    $('#settings').classList.add('hidden');
    await reload();
  } catch (e) { toast('连接失败：' + e.message, true); }
  finally { btn.disabled = false; btn.textContent = '连接'; }
};
$('#set-poll').onchange = async e => { S.settings = await call('save_settings', { poll_seconds: +e.target.value }); schedulePoll(); };
$('#set-theme').onchange = async e => { S.settings = await call('save_settings', { theme: e.target.value }); applyTheme(S.settings.theme); };
$('#set-all').onclick = async () => {
  S.settings = await call('save_settings', { show_all: !S.settings.show_all });
  $('#set-all').classList.toggle('on', S.settings.show_all);
};
$('#set-unhide').onclick = async () => { S.settings = await call('save_settings', { hidden: [] }); $('#hidden-hint').textContent = '没有隐藏的设备'; render(); poll(); };
$('#set-logout').onclick = async () => {
  if (!confirm('确定退出登录？')) return;
  await call('logout');
  clearInterval(S.pollTimer); clearInterval(S.trendTimer);
  $('#settings').classList.add('hidden');
  showLogin();
};

const mq = matchMedia('(prefers-color-scheme: dark)');
function applyTheme(t) {
  const dark = t === 'dark' || (t !== 'light' && mq.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
mq.addEventListener('change', () => applyTheme(S.settings.theme || 'auto'));

let toastTimer;
function toast(msg, err) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'show' + (err ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ''), 2600);
}

// 详情面板打开时定期刷新
setInterval(() => { if (S.detail && !document.hidden) refreshDetail(); }, 30000);

/* ---------------- 诊断日志 ---------------- */
const logRemote = msg => { try { backend && backend.log && backend.log(msg); } catch (e) {} };
window.addEventListener('error', e => logRemote(`JS 错误：${e.message} @${e.filename?.split('/').pop()}:${e.lineno}`));
window.addEventListener('unhandledrejection', e => logRemote(`未处理的异常：${e.reason?.message || e.reason}`));
// 加载完成后记一笔环境总览上显示了哪些面板
const logPanels = () => logRemote('环境总览面板：' + [...document.querySelectorAll('.envp .envp-title')].map(e => e.innerText.replace(/\s+/g, ' ')).join(' / '));

/* ---------------- 入口 ---------------- */
if (window.AndroidBridge) {
  document.body.classList.add('android');
  const pending = {};
  let seq = 0;
  window.__bridgeResolve = (id, res) => { const cb = pending[id]; delete pending[id]; cb && cb(JSON.parse(res)); };
  backend = new Proxy({}, {
    get: (_, name) => (...args) => new Promise(resolve => {
      const id = String(++seq);
      pending[id] = resolve;
      window.AndroidBridge.call(id, String(name), JSON.stringify(args));
    }),
  });
  boot();
} else if (window.pywebview?.api) { backend = window.pywebview.api; boot(); }
else window.addEventListener('pywebviewready', () => { backend = window.pywebview.api; boot(); });
// 浏览器里直接打开时使用演示数据（便于调界面）
setTimeout(() => { if (!backend && window.MOCK) { backend = window.MOCK; boot(); } }, 600);
