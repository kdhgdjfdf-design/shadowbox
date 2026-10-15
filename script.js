/* =====================================================================
   ShadowBox AI — منطق التطبيق
   - كشف الجسم عبر MediaPipe Pose Landmarker (يعمل داخل المتصفح)
   - عدّ اللكمات عبر: سرعة المعصم + امتداد الذراع + تقدّم المعصم نحو الكاميرا
   - الكيس الافتراضي يُرسم على Canvas مع فيزياء بسيطة للاهتزاز
   ===================================================================== */

// ---------- روابط الموارد ----------
const MP_URL   = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const STORAGE_KEY = "shadowbox_sessions_v1";

// ---------- ثوابت الكشف (قابلة للضبط) ----------
const CFG = {
  EXT_ON: 1.3,       // المسافة (بوحدة عرض الكتف) بين الكتف والمعصم لاعتبار الذراع ممدودة
  EXT_OFF: 1.05,     // أقل من هذا تُعتبر الذراع مسترخية، فتُعاد تهيئة اللكمة التالية
  Z_ON: 0.45,        // تقدّم المعصم نحو الكاميرا (عمق) لاعتبار اللكمة أمامية
  Z_OFF: 0.25,       // أقل من هذا يُعتبر المعصم عائدًا
  SPEED_MIN: 3.5,    // أقل سرعة للمعصم (عرض كتف لكل ثانية) لتُحسب لكمة
  COOLDOWN_MS: 380,  // فترة صمت بين لكمتين لمنع العدّ المزدوج
  WINDOW_MS: 160,    // نافذة قياس السرعة
  VIS_MIN: 0.5,      // أقل درجة ظهور للمفصل
  SW_MIN: 0.10,      // أقل عرض كتف (نسبة لعرض الفيديو) للمعايرة
  SW_MAX: 0.45,      // أكبر عرض كتف مسموح (أي أن الشخص قريب جدًا)
  READY_HOLD_MS: 1000,
};

// ---------- مساعدات DOM ----------
const $ = (id) => document.getElementById(id);
const IDS = [
  "homeScreen", "trainScreen", "cam", "stage",
  "roundSec", "roundCount", "restSec", "stanceSel", "facingSel", "soundToggle",
  "btnStart", "btnHistory", "btnHelp", "homeMsg", "banner",
  "roundLabel", "timer", "statusPill", "total", "leftCount", "rightCount",
  "jabCount", "crossCount", "hits", "ppm",
  "btnPause", "btnStance", "btnCam", "btnStop", "toast",
  "calibOverlay", "calibStatus", "calibBtn", "calibCancel",
  "restOverlay", "restCount", "restNext", "restSkip",
  "pauseOverlay", "btnResume",
  "resultOverlay", "resultBody", "btnAgain", "btnHome",
  "historyModal", "historyBody", "btnClearHistory", "btnCloseHistory",
  "helpModal", "btnCloseHelp",
];
const el = {};
for (const id of IDS) el[id] = $(id);

const ctx = el.stage.getContext("2d");

// ---------- الحالة العامة ----------
const STATUS_LABEL = { calib: "معايرة", round: "تسجيل نشط", rest: "راحة", paused: "متوقف", done: "انتهى" };

let landmarker = null;
let stream = null;
let mirror = true;               // الكاميرا الأمامية تُعكس كالمرآة
let facingMode = "user";
let state = "home";              // home | calib | round | rest | paused | done
let stance = "orthodox";         // orthodox = اليسرى أمامية
let soundOn = true;

let totalRounds = 3, currentRound = 1;
let roundDurMs = 180000, roundMs = 0;
let restDurMs = 0, restMs = 0;
let activeMs = 0;                // زمن الجولات الفعلي فقط

let stats = freshStats();
let hands = { left: freshHand(), right: freshHand() };

let lastPose = null;             // آخر مجموعة نقاط للجسم
let poseSW = 0;                  // عرض الكتفين بالبكسل (في فضاء الفيديو)
let stableSince = 0, calibReady = false;

let lastVideoTime = -1, lastTs = 0, rafId = 0;
let lastDetectTs = -1;           // آخر طابع وقت أُرسل للكشف (يجب أن يكون متزايدًا)
let vw = 0, vh = 0;              // أبعاد الفيديو
let cw = 0, ch = 0, dpr = 1;     // أبعاد الـ canvas (CSS px)
let scale = 1, offX = 0, offY = 0;

let floaters = [];
let bag = createBag();
let audioCtx = null;
let toastTimer = 0;

function freshStats() {
  return { total: 0, left: 0, right: 0, jab: 0, cross: 0, hits: 0 };
}
function freshHand() {
  return { armed: true, hist: [], lastPunch: -1e9 };
}
function resetHands() {
  hands.left = freshHand();
  hands.right = freshHand();
}
function dropHandTracking() {
  for (const s of ["left", "right"]) {
    hands[s].hist = [];
    hands[s].armed = true;
  }
}
function createBag() {
  return { angle: 0, vel: 0, flash: 0, dir: 1 };
}

// ---------- أدوات عامة ----------
function setText(node, value) {
  const s = String(value);
  if (node.textContent !== s) node.textContent = s;
}
function fmtTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}
function setHomeMsg(text, isError = false) {
  el.homeMsg.textContent = text;
  el.homeMsg.classList.toggle("error", isError);
}
function showToast(text) {
  el.toast.textContent = text;
  el.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.toast.hidden = true), 2200);
}
function showScreen(name) {
  el.homeScreen.classList.toggle("active", name === "home");
  el.trainScreen.classList.toggle("active", name === "train");
}

// ---------- الصوت (WebAudio، بدون ملفات خارجية) ----------
function getAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      audioCtx = null;
    }
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function tone(freq, dur, vol = 0.15, type = "sine") {
  if (!soundOn) return;
  const ac = getAudio();
  if (!ac) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = vol;
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  o.connect(g).connect(ac.destination);
  o.start();
  o.stop(ac.currentTime + dur);
}

// ---------- تحميل نموذج الرؤية (ديناميكيًا حتى لا يتعطل التطبيق إن تعذّر CDN) ----------
async function ensureLandmarker() {
  if (landmarker) return;
  const { PoseLandmarker, FilesetResolver } = await import(MP_URL);
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  const opts = (delegate) => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  try {
    landmarker = await PoseLandmarker.createFromOptions(vision, opts("GPU"));
  } catch (err) {
    console.warn("GPU غير متاح، نعود إلى CPU:", err);
    landmarker = await PoseLandmarker.createFromOptions(vision, opts("CPU"));
  }
}

// ---------- الكاميرا ----------
async function openCamera() {
  stopCamera();
  if (!window.isSecureContext) {
    throw new Error("يجب فتح التطبيق عبر HTTPS (أو localhost) لتعمل الكاميرا.");
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("هذا المتصفح لا يدعم الوصول إلى الكاميرا.");
  }
  stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  });
  const track = stream.getVideoTracks()[0];
  const reported = track?.getSettings?.().facingMode;
  mirror = (reported ?? facingMode) === "user";

  el.cam.muted = true;
  el.cam.srcObject = stream;
  if (el.cam.readyState < 1) {
    await new Promise((resolve) => el.cam.addEventListener("loadedmetadata", resolve, { once: true }));
  }
  try {
    await el.cam.play();
  } catch (e) {
    console.warn(e);
  }
  lastVideoTime = -1;
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  el.cam.srcObject = null;
}

async function switchCamera() {
  facingMode = facingMode === "user" ? "environment" : "user";
  try {
    await openCamera();
    resetHands();
    lastPose = null;
    resizeCanvas();
    showToast(mirror ? "الكاميرا الأمامية" : "الكاميرا الخلفية");
  } catch (err) {
    console.error(err);
    showToast("تعذر تبديل الكاميرا");
  }
}

function describeError(err) {
  const name = err?.name;
  if (name === "NotAllowedError") return "تم رفض إذن الكاميرا. فعّله من إعدادات المتصفح ثم أعد المحاولة.";
  if (name === "NotFoundError") return "لم يتم العثور على كاميرا في هذا الجهاز.";
  if (name === "NotReadableError") return "الكاميرا مستخدمة من تطبيق آخر. أغلقه ثم أعد المحاولة.";
  if (err?.message?.includes("HTTPS")) return err.message;
  return "تعذر تشغيل التطبيق: " + (err?.message || "خطأ غير معروف") +
    ". تأكد من اتصال الإنترنت (لتحميل نموذج الرؤية) ومن فتح الصفحة عبر HTTPS.";
}

// ---------- الإعدادات ----------
function readSettings() {
  stance = el.stanceSel.value;
  facingMode = el.facingSel.value;
  soundOn = el.soundToggle.checked;
  roundDurMs = Number(el.roundSec.value) * 1000;
  totalRounds = Number(el.roundCount.value);
  restDurMs = Number(el.restSec.value) * 1000;
}

// ---------- دورة الجلسة ----------
async function startSession() {
  if (state !== "home") return;
  setHomeMsg("");
  const oldLabel = el.btnStart.textContent;
  el.btnStart.disabled = true;
  el.btnStart.textContent = "جارٍ تجهيز الكاميرا...";
  try {
    readSettings();
    getAudio();                 // تفعيل الصوت ضمن نقرة المستخدم
    await ensureLandmarker();
    await openCamera();
    resetSession();
    showScreen("train");
    setState("calib");
    resizeCanvas();
    startLoop();
  } catch (err) {
    console.error(err);
    stopCamera();
    setHomeMsg(describeError(err), true);
  } finally {
    el.btnStart.disabled = false;
    el.btnStart.textContent = oldLabel;
  }
}

function resetSession() {
  stats = freshStats();
  activeMs = 0;
  roundMs = 0;
  restMs = 0;
  currentRound = 1;
  floaters = [];
  bag = createBag();
  resetHands();
  lastPose = null;
  calibReady = false;
  stableSince = 0;
  lastVideoTime = -1;
}

function setState(s) {
  state = s;
  el.calibOverlay.hidden = s !== "calib";
  el.restOverlay.hidden = s !== "rest";
  el.pauseOverlay.hidden = s !== "paused";
  if (s === "rest") {
    el.restNext.textContent = `الجولة ${currentRound + 0} ستبدأ بعد الراحة`;
  }
  updateHud();
}

function startRound() {
  roundMs = 0;
  resetHands();
  tone(660, 0.2, 0.2);
  setState("round");
}

function endRound() {
  tone(880, 0.35, 0.25);
  if (currentRound >= totalRounds) {
    finishSession();
    return;
  }
  currentRound++;
  if (restDurMs > 0) {
    restMs = restDurMs;
    setState("rest");
  } else {
    startRound();
  }
}

function togglePause() {
  if (state === "round") setState("paused");
  else if (state === "paused") setState("round");
}

function finishSession() {
  if (state === "done") return;
  const minutes = activeMs / 60000;
  const sess = {
    date: new Date().toISOString(),
    durationSec: Math.round(activeMs / 1000),
    roundsDone: currentRound,
    stance,
    total: stats.total,
    left: stats.left,
    right: stats.right,
    jab: stats.jab,
    cross: stats.cross,
    hits: stats.hits,
    ppm: activeMs >= 5000 ? Math.round(stats.total / minutes) : 0,
  };
  if (stats.total > 0 || activeMs > 5000) saveSession(sess);

  cancelAnimationFrame(rafId);
  stopCamera();
  setState("done");
  showResult(sess);
}

function exitTraining() {
  cancelAnimationFrame(rafId);
  stopCamera();
  state = "home";
  floaters = [];
  el.calibOverlay.hidden = true;
  el.restOverlay.hidden = true;
  el.pauseOverlay.hidden = true;
  el.resultOverlay.hidden = true;
  showScreen("home");
}

// ---------- حلقة الرسم والكشف ----------
function startLoop() {
  cancelAnimationFrame(rafId);
  lastTs = performance.now();
  rafId = requestAnimationFrame(loop);
}

function loop(now) {
  rafId = requestAnimationFrame(loop);
  const dt = Math.min(100, now - lastTs);
  lastTs = now;

  const v = el.cam;
  if (v.readyState >= 2 && v.videoWidth) {
    vw = v.videoWidth;
    vh = v.videoHeight;
    updateLayout();
    // ملاحظة: currentTime لا يتغير دائمًا في بث الكاميرا المباشر على بعض المتصفحات،
    // لذلك نعتمد على طابع الوقت لكل إطار بدل مقارنة currentTime.
    if (landmarker && now > lastDetectTs) {
      lastDetectTs = now;
      detect(now);
    }
  }

  updateState(dt);
  updateBag(dt / 1000);
  render(now);
}

function updateState(dt) {
  if (state === "round") {
    roundMs += dt;
    activeMs += dt;
    if (roundMs >= roundDurMs) endRound();
  } else if (state === "rest") {
    restMs -= dt;
    if (restMs <= 0) startRound();
  }
  updateHud();
}

// ---------- الكشف عن الجسم وتحليل اللكمات ----------
function detect(now) {
  let res;
  try {
    res = landmarker.detectForVideo(el.cam, now);
  } catch (e) {
    console.warn(e);
    return;
  }
  const lm = res?.landmarks?.[0];
  if (!lm || lm.length < 17) {
    lastPose = null;
    poseSW = 0;
    dropHandTracking();
    updateCalibration(null, 0, now);
    return;
  }
  lastPose = lm;
  const L = lm[11], R = lm[12];
  poseSW = Math.hypot((L.x - R.x) * vw, (L.y - R.y) * vh);
  updateCalibration(lm, poseSW, now);

  const canCount = state === "round";
  processHand("left", lm, now, canCount);
  processHand("right", lm, now, canCount);
}

/*
  منطق اللكمة لكل ذراع:
  1) ext  : امتداد الذراع = المسافة (كتف→معصم) / عرض الكتف
  2) zF   : تقدّم المعصم نحو الكاميرا = (عمق الكتف - عمق المعصم) / عرض الكتف
  3) speed: سرعة المعصم خلال آخر WINDOW_MS (بوحدة عرض كتف/ثانية)
  - الذراع "مسلّحة" بعد أن تعود للاسترخاء. اللكمة تُحسب عندما تتجاوز الذراع
    عتبة الامتداد وتكون السرعة كافية، ثم تُقفل حتى تعود الذراع للاسترخاء
    (يمنع احتساب اللكمة الواحدة عدة مرات) مع فترة تبريد إضافية.
*/
function processHand(side, lm, now, canCount) {
  const H = hands[side];
  const iS = side === "left" ? 11 : 12;
  const iW = side === "left" ? 15 : 16;
  const S = lm[iS], W = lm[iW];

  if (!S || !W ||
      (S.visibility ?? 1) < CFG.VIS_MIN ||
      (W.visibility ?? 1) < CFG.VIS_MIN ||
      poseSW < 2) {
    H.armed = true;
    H.hist = [];
    return;
  }

  const sw = poseSW;
  const wx = W.x * vw, wy = W.y * vh;
  const ext = Math.hypot(wx - S.x * vw, wy - S.y * vh) / sw;
  const zF = ((S.z - W.z) * vw) / sw;

  H.hist.push({ t: now, x: wx, y: wy, zF });
  while (H.hist.length > 1 && now - H.hist[0].t > CFG.WINDOW_MS) H.hist.shift();

  const o = H.hist[0];
  const dt = (now - o.t) / 1000;
  let speed = 0;
  if (dt > 0.03) {
    speed = Math.hypot(wx - o.x, wy - o.y, (zF - o.zF) * sw) / sw / dt;
  }

  const extended = ext > CFG.EXT_ON || zF > CFG.Z_ON;
  const retracted = ext < CFG.EXT_OFF && zF < CFG.Z_OFF;
  if (retracted) H.armed = true;

  if (canCount && H.armed && extended &&
      speed >= CFG.SPEED_MIN && now - H.lastPunch >= CFG.COOLDOWN_MS) {
    H.armed = false;
    H.lastPunch = now;
    registerPunch(side, W.x, W.y);
  }
}

function registerPunch(side, nx, ny) {
  // اليد الأمامية = الجاب، والخلفية = الكروس
  const lead = stance === "orthodox" ? "left" : "right";
  const type = side === lead ? "jab" : "cross";
  const p = toScreen(nx, ny);
  const onBag = bagHit(p.x, p.y);

  stats.total++;
  stats[side]++;
  stats[type]++;
  if (onBag) stats.hits++;

  bagImpact(onBag ? 1 : 0.5, onBag);
  floaters.push({
    text: `${side === "left" ? "يسرى" : "يمنى"} · ${type === "jab" ? "جاب" : "كروس"}`,
    x: p.x,
    y: p.y,
    born: performance.now(),
    hit: onBag,
  });
  tone(onBag ? 330 : 220, 0.07, 0.12, "square");
  updateHud();
}

// ---------- المعايرة ----------
function updateCalibration(lm, sw, now) {
  if (state !== "calib") return;
  let msg = "لم يتم اكتشاف جسمك بعد. تأكد من الإضاءة وأن الكاميرا تظهر جسمك.";
  let ok = false;

  if (lm) {
    const ids = [11, 12, 13, 14, 15, 16];
    const visOk = ids.every((i) => (lm[i].visibility ?? 1) >= CFG.VIS_MIN);
    const inFrame = [11, 12, 15, 16].every(
      (i) => lm[i].x > 0.02 && lm[i].x < 0.98 && lm[i].y > 0.02 && lm[i].y < 0.98
    );
    const ratio = sw / vw;
    if (!visOk || !inFrame) msg = "أظهر كتفيك ويديك كاملتين داخل الإطار";
    else if (ratio < CFG.SW_MIN) msg = "اقترب قليلًا من الكاميرا";
    else if (ratio > CFG.SW_MAX) msg = "ابتعد قليلًا عن الكاميرا";
    else { ok = true; msg = "ممتاز! جسمك واضح داخل الإطار"; }
  }

  if (ok) {
    if (!stableSince) stableSince = now;
    calibReady = now - stableSince >= CFG.READY_HOLD_MS;
  } else {
    stableSince = 0;
    calibReady = false;
  }
  if (calibReady) msg = "✅ جاهز. اضغط «ابدأ الجولة»";
  setText(el.calibStatus, msg);
  el.calibBtn.disabled = !calibReady;
}

// ---------- تخطيط الفيديو على الـ canvas (cover + مرآة للكاميرا الأمامية) ----------
function resizeCanvas() {
  const r = el.stage.getBoundingClientRect();
  cw = r.width;
  ch = r.height;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  el.stage.width = Math.round(cw * dpr);
  el.stage.height = Math.round(ch * dpr);
  updateLayout();
}

function updateLayout() {
  if (!vw || !vh || !cw || !ch) return;
  scale = Math.max(cw / vw, ch / vh);
  offX = (cw - vw * scale) / 2;
  offY = (ch - vh * scale) / 2;
}

// يحوّل إحداثيات الفيديو المعيارية (0..1) إلى إحداثيات الشاشة (CSS px) بعد المرآة
function toScreen(nx, ny) {
  const x = mirror ? 1 - nx : nx;
  return { x: offX + x * vw * scale, y: offY + ny * vh * scale };
}

// ---------- الكيس الافتراضي ----------
function bagGeom() {
  const w = Math.min(cw * 0.34, 170);
  const h = Math.min(ch * 0.46, w * 2.6);
  const ceilingY = ch * 0.03;
  const top = ch * 0.16;
  return { w, h, ceilingY, top, len: top - ceilingY, cx: cw / 2 };
}

function bagHit(x, y) {
  const g = bagGeom();
  const cy = g.top + g.h * 0.5;
  const dx = (x - g.cx) / (g.w * 0.75);
  const dy = (y - cy) / (g.h * 0.55);
  return dx * dx + dy * dy <= 1;
}

function bagImpact(strength, hit) {
  bag.dir *= -1;
  bag.vel += bag.dir * 0.9 * strength;
  if (hit) bag.flash = 1;
}

function updateBag(dt) {
  if (dt <= 0) return;
  const steps = 4;
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    const acc = -22 * bag.angle - 2.5 * bag.vel;   // زنبرك مخمّد
    bag.vel += acc * h;
    bag.angle += bag.vel * h;
  }
  bag.angle = Math.max(-0.4, Math.min(0.4, bag.angle));
  bag.flash = Math.max(0, bag.flash - dt * 3);
}

function capsulePath(x, y, w, h) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, w / 2);
  else ctx.rect(x, y, w, h);
}

function drawBag() {
  const g = bagGeom();

  // سقف التعليق
  ctx.fillStyle = "#2b2b2b";
  ctx.fillRect(g.cx - g.w * 0.8, g.ceilingY - 5, g.w * 1.6, 6);

  ctx.save();
  ctx.translate(g.cx, g.ceilingY);
  ctx.rotate(bag.angle);

  // السلاسل
  ctx.strokeStyle = "#8d9296";
  ctx.lineWidth = 2;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * g.w * 0.08, 0);
    ctx.lineTo(s * g.w * 0.26, g.len);
    ctx.stroke();
  }

  // جسم الكيس
  const x = -g.w / 2, y = g.len;
  capsulePath(x, y, g.w, g.h);
  const grad = ctx.createLinearGradient(x, 0, x + g.w, 0);
  grad.addColorStop(0, "#0b0b0b");
  grad.addColorStop(0.3, "#2c0609");
  grad.addColorStop(0.5, "#8e0f1a");
  grad.addColorStop(0.7, "#2c0609");
  grad.addColorStop(1, "#0b0b0b");
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.save();
  capsulePath(x, y, g.w, g.h);
  ctx.clip();

  // الخطوط الفاصلة للجلد
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 2;
  for (let k = 1; k < 6; k++) {
    const yy = y + (g.h * k) / 6;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.quadraticCurveTo(0, yy + 6, x + g.w, yy);
    ctx.stroke();
  }

  // لمعة خفيفة
  const hl = ctx.createRadialGradient(-g.w * 0.2, y + g.h * 0.25, 4, -g.w * 0.2, y + g.h * 0.25, g.w * 0.6);
  hl.addColorStop(0, "rgba(255,255,255,0.22)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hl;
  ctx.fillRect(x, y, g.w, g.h);

  // وميض عند الإصابة
  if (bag.flash > 0) {
    ctx.fillStyle = `rgba(255,70,80,${bag.flash * 0.35})`;
    ctx.fillRect(x, y, g.w, g.h);
  }
  ctx.restore();

  // النص على الكيس
  ctx.save();
  ctx.translate(0, y + g.h * 0.5);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = `800 ${Math.round(g.w * 0.13)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("SHADOWBOX", 0, 0);
  ctx.restore();

  ctx.restore();
}

// ---------- الرسم ----------
const PAIRS = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]];

function render(now) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);

  // 1) بث الكاميرا (مع المرآة عند الأمامية)
  if (vw && el.cam.readyState >= 2) {
    ctx.save();
    if (mirror) {
      ctx.translate(cw, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(el.cam, offX, offY, vw * scale, vh * scale);
    ctx.restore();
  } else {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cw, ch);
  }
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(0, 0, cw, ch);

  // 2) الكيس الافتراضي
  drawBag();

  // 3) الهيكل العظمي والقفازات فوق الكيس
  if (lastPose) drawSkeleton(now);

  // 4) النصوص العائمة
  drawFloaters(now);
}

function drawSkeleton(now) {
  const lm = lastPose;
  const good = (i) => lm[i] && (lm[i].visibility ?? 1) > 0.3;

  ctx.lineCap = "round";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  for (const [a, b] of PAIRS) {
    if (!good(a) || !good(b)) continue;
    const p = toScreen(lm[a].x, lm[a].y);
    const q = toScreen(lm[b].x, lm[b].y);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
  for (const i of [11, 12, 13, 14]) {
    if (!good(i)) continue;
    const p = toScreen(lm[i].x, lm[i].y);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }

  // القفازات = المعصمان، وتتوهج عند اللكمة
  const r = Math.max(14, poseSW * scale * 0.13);
  for (const side of ["left", "right"]) {
    const idx = side === "left" ? 15 : 16;
    if (!good(idx)) continue;
    const p = toScreen(lm[idx].x, lm[idx].y);
    const recent = now - hands[side].lastPunch < 260;
    ctx.beginPath();
    ctx.arc(p.x, p.y, recent ? r * 1.25 : r, 0, Math.PI * 2);
    ctx.fillStyle = recent ? "#ff2d3d" : "rgba(225,29,46,0.85)";
    ctx.shadowColor = "#ff2d3d";
    ctx.shadowBlur = recent ? 25 : 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawFloaters(now) {
  const LIFE = 900;
  floaters = floaters.filter((f) => now - f.born < LIFE);
  ctx.font = "700 16px system-ui, sans-serif";
  ctx.textAlign = "center";
  for (const f of floaters) {
    const age = (now - f.born) / LIFE;
    ctx.globalAlpha = 1 - age;
    ctx.fillStyle = f.hit ? "#ff5a64" : "#ffffff";
    ctx.fillText(f.text, f.x, f.y - age * 40);
  }
  ctx.globalAlpha = 1;
}

// ---------- لوحة المعلومات (HUD) ----------
function updateHud() {
  const ppm = activeMs >= 5000 ? Math.round(stats.total / (activeMs / 60000)) : 0;
  setText(el.total, stats.total);
  setText(el.leftCount, stats.left);
  setText(el.rightCount, stats.right);
  setText(el.jabCount, stats.jab);
  setText(el.crossCount, stats.cross);
  setText(el.hits, stats.hits);
  setText(el.ppm, ppm);

  let remain;
  if (state === "rest") remain = restMs;
  else if (state === "calib" || state === "home") remain = roundDurMs;
  else if (state === "done") remain = roundDurMs - roundMs;
  else remain = roundDurMs - roundMs;
  setText(el.timer, fmtTime(remain));

  setText(el.roundLabel, `الجولة ${currentRound}/${totalRounds}`);
  setText(el.statusPill, STATUS_LABEL[state] || "");
  setText(el.restCount, Math.ceil(Math.max(0, restMs) / 1000));
  el.btnPause.textContent = state === "paused" ? "▶" : "⏸";
  el.btnStance.textContent = stance === "orthodox" ? "يسار أمامي" : "يمين أمامي";
}

// ---------- النتيجة ----------
function showResult(s) {
  const note = s.total === 0
    ? "لم تُسجَّل أي لكمة. تأكد من ظهور كتفيك ويديك، ثم حاول مرة أخرى."
    : "";
  el.resultBody.innerHTML = `
    <div class="res-grid">
      <div><b>${s.total}</b><small>إجمالي اللكمات</small></div>
      <div><b>${s.ppm}</b><small>لكمة/دقيقة</small></div>
      <div><b>${fmtTime(s.durationSec * 1000)}</b><small>وقت التدريب</small></div>
      <div><b>${s.hits}</b><small>على الكيس</small></div>
      <div><b>${s.left}</b><small>يسرى</small></div>
      <div><b>${s.right}</b><small>يمنى</small></div>
      <div><b>${s.jab}</b><small>جاب</small></div>
      <div><b>${s.cross}</b><small>كروس</small></div>
    </div>
    ${note ? `<p class="notice">${note}</p>` : ""}
    <p class="notice small">العدّاد تقديري ويعتمد على كاميرا واحدة. تم حفظ الجلسة محليًا.</p>`;
  el.resultOverlay.hidden = false;
}

// ---------- السجل المحلي ----------
function loadSessions() {
  try {
    const arr = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveSession(s) {
  try {
    const arr = loadSessions();
    arr.unshift(s);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(0, 100)));
  } catch (e) {
    console.warn("تعذر حفظ الجلسة:", e);
  }
}

function renderHistory() {
  const arr = loadSessions();
  const totalPunches = arr.reduce((sum, x) => sum + (x.total || 0), 0);
  const totalSec = arr.reduce((sum, x) => sum + (x.durationSec || 0), 0);
  const bestPpm = arr.reduce((m, x) => Math.max(m, x.ppm || 0), 0);

  let html = `
    <div class="res-grid">
      <div><b>${arr.length}</b><small>جلسة</small></div>
      <div><b>${totalPunches}</b><small>لكمة إجمالًا</small></div>
      <div><b>${Math.round(totalSec / 60)}</b><small>دقيقة تدريب</small></div>
      <div><b>${bestPpm}</b><small>أفضل معدل/دقيقة</small></div>
    </div>`;

  if (!arr.length) {
    html += `<p class="notice">لا توجد جلسات محفوظة بعد.</p>`;
  } else {
    html += arr.slice(0, 30).map((s) => `
      <div class="hist-item">
        <div>
          <b>${fmtDate(s.date)}</b>
          <small>${s.roundsDone} جولة · ${fmtTime((s.durationSec || 0) * 1000)} · ${s.stance === "orthodox" ? "يسار أمامي" : "يمين أمامي"}</small>
        </div>
        <div class="hist-num">
          <b>${s.total}</b> لكمة<br>
          <small>${s.ppm}/د · ${s.hits || 0} على الكيس</small>
        </div>
      </div>`).join("");
  }
  el.historyBody.innerHTML = html;
}

function clearHistory() {
  if (!confirm("هل تريد حذف كل السجل المحفوظ على هذا الجهاز؟")) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  renderHistory();
}

// ---------- الأحداث ----------
el.btnStart.addEventListener("click", startSession);
el.btnHistory.addEventListener("click", () => {
  renderHistory();
  el.historyModal.hidden = false;
});
el.btnCloseHistory.addEventListener("click", () => (el.historyModal.hidden = true));
el.btnClearHistory.addEventListener("click", clearHistory);
el.btnHelp.addEventListener("click", () => (el.helpModal.hidden = false));
el.btnCloseHelp.addEventListener("click", () => (el.helpModal.hidden = true));

el.calibBtn.addEventListener("click", () => {
  if (calibReady) startRound();
});
el.calibCancel.addEventListener("click", exitTraining);
el.restSkip.addEventListener("click", () => startRound());
el.btnPause.addEventListener("click", togglePause);
el.btnResume.addEventListener("click", togglePause);
el.btnStance.addEventListener("click", () => {
  stance = stance === "orthodox" ? "southpaw" : "orthodox";
  showToast(stance === "orthodox" ? "اليد اليسرى أمامية" : "اليد اليمنى أمامية");
  updateHud();
});
el.btnCam.addEventListener("click", switchCamera);
el.btnStop.addEventListener("click", () => {
  if (state === "calib" || state === "home") exitTraining();
  else finishSession();
});
el.btnAgain.addEventListener("click", async () => {
  exitTraining();
  await startSession();
});
el.btnHome.addEventListener("click", exitTraining);

window.addEventListener("resize", () => {
  if (state !== "home") resizeCanvas();
});

// إيقاف الجولة تلقائيًا إذا خرج المستخدم من التبويب
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state === "round") setState("paused");
});

// ---------- التهيئة ----------
if (!window.isSecureContext) el.banner.hidden = false;
updateHud();
