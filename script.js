/* =====================================================================
   ShadowBox AI — منطق التطبيق (الإصدار 2)
   - كشف الجسم عبر MediaPipe Pose Landmarker (داخل المتصفح، بدون رفع صور)
   - عدّ اللكمات من حركة المعصم والذراع، لا من زر
   - أهداف على شكل قفاز تقترب منك، وتظهر واحدة جديدة بعد كل ضربة
   - أعمدة تقترب منك، عليك التحرك يمينًا أو يسارًا لتفاديها
   ===================================================================== */

// ---------- روابط الموارد ----------
const MP_URL   = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const STORAGE_KEY = "shadowbox_sessions_v1";

// ---------- ثوابت الكشف عن اللكمات (قابلة للضبط) ----------
const CFG = {
  EXT_ON: 1.3,       // امتداد الذراع (بوحدة عرض الكتف) لاعتبارها ممدودة
  EXT_OFF: 1.05,     // أقل من هذا تُعتبر الذراع مسترخية
  Z_ON: 0.45,        // تقدّم المعصم نحو الكاميرا لاعتبار اللكمة أمامية
  Z_OFF: 0.25,       // أقل من هذا يُعتبر المعصم عائدًا
  SPEED_MIN: 3.5,    // أقل سرعة للمعصم (عرض كتف لكل ثانية)
  COOLDOWN_MS: 380,  // فترة صمت بين لكمتين لمنع العدّ المزدوج
  WINDOW_MS: 160,    // نافذة قياس السرعة
  VIS_MIN: 0.5,      // أقل درجة ظهور للمفصل
  SW_MIN: 0.10,      // أقل عرض كتف (نسبة لعرض الفيديو) للمعايرة
  SW_MAX: 0.45,      // أكبر عرض كتف مسموح
  READY_HOLD_MS: 1000,
};

// ---------- إعدادات الأهداف والأعمدة ----------
const TARGET_MS = 2200;        // زمن اقتراب القفاز من البعيد إلى القريب
const TARGET_GAP_MS = 700;     // انتظار قصير قبل ظهور القفاز التالي
const PILLAR_MS = 3000;        // زمن اقتراب العمود
const PILLAR_JUDGE_K = 0.92;   // لحظة الحكم على العمود (قرب الكاميرا)
const PILLAR_GAP_MIN = 4000;   // أقل فاصل بين عمودين (مللي ثانية)
const PILLAR_GAP_RAND = 3000;  // زيادة عشوائية على الفاصل

// ---------- مساعدات DOM ----------
const $ = (id) => document.getElementById(id);
const IDS = [
  "homeScreen", "trainScreen", "cam", "stage",
  "roundSec", "roundCount", "restSec", "stanceSel", "facingSel", "soundToggle",
  "btnStart", "btnHistory", "btnHelp", "homeMsg", "banner",
  "roundLabel", "timer", "statusPill", "total", "leftCount", "rightCount",
  "jabCount", "crossCount", "hits", "ppm", "targetHits", "dodges", "pillarHits",
  "btnPause", "btnStance", "btnCam", "btnRotate", "btnStop", "toast",
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

let lastTs = 0, rafId = 0;
let lastDetectTs = -1;           // آخر طابع وقت أُرسل للكشف (يجب أن يكون متزايدًا)
let vw = 0, vh = 0;              // أبعاد الفيديو
let cw = 0, ch = 0, dpr = 1;     // أبعاد الـ canvas (CSS px)
let scale = 1, offX = 0, offY = 0;
let dw = 0, dh = 0;              // أبعاد الصورة بعد التدوير (كما تُعرض على الشاشة)
let rot = 0;                     // التدوير: 0 | 1 (90°) | 2 (180°) | 3 (270°)
let rotAuto = true;              // التدوير التلقائي حتى يضغط المستخدم زر التدوير
let videoKey = "";               // لتجنب تحديث عنصر الفيديو دون داع

let floaters = [];
let bag = createBag();
let targets = [];                // أهداف القفاز: {state: live|hit|miss, lane, k, age}
let pillars = [];                // الأعمدة: {lane, k, judged}
let nextTargetAt = 0, nextPillarAt = 0;
let flashRed = 0;                // وميض أحمر عند ضربة من عمود
let audioCtx = null;
let toastTimer = 0;

function freshStats() {
  return { total: 0, left: 0, right: 0, jab: 0, cross: 0, hits: 0,
           targetHits: 0, targetMiss: 0, dodges: 0, pillarHits: 0 };
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
function pickLane() {
  return [-1, 0, 1][Math.floor(Math.random() * 3)];
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
function addFloater(text, x, y, color = "#ffffff") {
  floaters.push({ text, x, y, color, born: performance.now() });
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

// ---------- تحميل نموذج الرؤية ----------
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
      // الهاتف عمودي، لذلك نطلب صورة عمودية حتى تظهر الذراعان كاملتين
      width: { ideal: 720 },
      height: { ideal: 1280 },
    },
  });
  const track = stream.getVideoTracks()[0];
  const reported = track?.getSettings?.().facingMode;
  mirror = (reported ?? facingMode) === "user";

  // الفيديو يظهر فعلًا (وليس مخفيًا)، والـ canvas فوقه يرسم الكيس والهيكل
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
  rotAuto = true;
  videoKey = "";
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
  targets = [];
  pillars = [];
  flashRed = 0;
  lastPose = null;
  calibReady = false;
  stableSince = 0;
}

function setState(s) {
  state = s;
  el.calibOverlay.hidden = s !== "calib";
  el.restOverlay.hidden = s !== "rest";
  el.pauseOverlay.hidden = s !== "paused";
  if (s === "rest") {
    el.restNext.textContent = `الجولة ${currentRound} ستبدأ بعد الراحة`;
  }
  updateHud();
}

function startRound() {
  roundMs = 0;
  resetHands();
  targets = [];
  pillars = [];
  nextTargetAt = activeMs + 500;
  nextPillarAt = activeMs + 4000;
  tone(660, 0.2, 0.2);
  setState("round");
}

function endRound() {
  tone(880, 0.35, 0.25);
  targets = [];
  pillars = [];
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
    targetHits: stats.targetHits,
    dodges: stats.dodges,
    pillarHits: stats.pillarHits,
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
  targets = [];
  pillars = [];
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
    // نعتمد على طابع الوقت لكل إطار، لأن currentTime لا يتغير دائمًا في بث الكاميرا
    if (landmarker && now > lastDetectTs) {
      lastDetectTs = now;
      detect(now);
    }
  }

  updateState(dt);
  render(now);
}

function updateState(dt) {
  flashRed = Math.max(0, flashRed - dt / 400);
  if (state === "round") {
    roundMs += dt;
    activeMs += dt;
    updateGame(dt);
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
  - الذراع "مسلّحة" بعد أن تعود للاسترخاء، وتُقفل بعد كل لكمة (يمنع العدّ المزدوج)
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

  stats.total++;
  stats[side]++;
  stats[type]++;
  addFloater(`${side === "left" ? "يسرى" : "يمنى"} · ${type === "jab" ? "جاب" : "كروس"}`,
             p.x, p.y, "#ffffff");

  // هل وقعت اللكمة على القفاز المقترب؟
  const tgt = findTargetAt(p.x, p.y);
  if (tgt) {
    tgt.state = "hit";
    tgt.age = 0;
    stats.targetHits++;
    nextTargetAt = activeMs + TARGET_GAP_MS;
    addFloater("+1 🥊", p.x, p.y - 36, "#ffd166");
    tone(520, 0.12, 0.2, "triangle");
  } else {
    tone(220, 0.07, 0.12, "square");
  }
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
    const ratio = sw / (isRotated() ? vh : vw);
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

// ---------- تخطيط الفيديو (contain: تظهر الصورة كاملة دون قص) ----------
function resizeCanvas() {
  const r = el.stage.getBoundingClientRect();
  cw = r.width;
  ch = r.height;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  el.stage.width = Math.round(cw * dpr);
  el.stage.height = Math.round(ch * dpr);
  updateLayout();
}

function isRotated() {
  return rot % 2 === 1;
}

function updateLayout() {
  if (!vw || !vh || !cw || !ch) return;
  // إن كانت الكاميرا أفقية والشاشة عمودية (أو العكس) ندوّر الصورة 90° لتملأ الشاشة
  if (rotAuto) rot = (vw > vh) !== (cw > ch) ? 1 : 0;
  dw = isRotated() ? vh : vw;
  dh = isRotated() ? vw : vh;
  scale = Math.min(cw / dw, ch / dh);
  offX = 0;
  offY = 0;
}

// يرسم بث الكاميرا على الـ canvas بنفس التحويل الذي تُحسب به النقاط (تدوير + مرآة)
function drawCamera() {
  if (!vw || !vh || el.cam.readyState < 2) return;
  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  if (mirror) ctx.scale(-1, 1);
  ctx.rotate((rot * Math.PI) / 2);
  ctx.scale(scale, scale);
  ctx.drawImage(el.cam, -vw / 2, -vh / 2, vw, vh);
  ctx.restore();
}

// يضع عنصر الفيديو في مكانه الصحيح مع التدوير والمرآة
function placeVideo() {
  const w = vw * scale, h = vh * scale;
  const cx = cw / 2, cy = ch / 2;
  const transform = `scaleX(${mirror ? -1 : 1}) rotate(${rot * 90}deg)`;
  const key = [w, h, cx, cy, transform].join("|");
  if (key === videoKey) return;
  videoKey = key;
  const s = el.cam.style;
  s.left = `${cx - w / 2}px`;
  s.top = `${cy - h / 2}px`;
  s.width = `${w}px`;
  s.height = `${h}px`;
  s.right = "auto";
  s.bottom = "auto";
  s.transform = transform;
}

// يحوّل إحداثيات الفيديو الأصلية (0..1) إلى إحداثيات الشاشة، مع التدوير والمرآة
function toScreen(nx, ny) {
  const u = (nx - 0.5) * vw * scale;
  const v = (ny - 0.5) * vh * scale;
  const a = (rot * Math.PI) / 2;
  const c = Math.cos(a), s = Math.sin(a);
  let x = u * c - v * s;
  const y = u * s + v * c;
  if (mirror) x = -x;
  return { x: cw / 2 + x, y: ch / 2 + y };
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

  ctx.fillStyle = "#2b2b2b";
  ctx.fillRect(g.cx - g.w * 0.8, g.ceilingY - 5, g.w * 1.6, 6);

  ctx.save();
  ctx.translate(g.cx, g.ceilingY);
  ctx.rotate(bag.angle);

  ctx.strokeStyle = "#8d9296";
  ctx.lineWidth = 2;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * g.w * 0.08, 0);
    ctx.lineTo(s * g.w * 0.26, g.len);
    ctx.stroke();
  }

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

  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 2;
  for (let k = 1; k < 6; k++) {
    const yy = y + (g.h * k) / 6;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.quadraticCurveTo(0, yy + 6, x + g.w, yy);
    ctx.stroke();
  }

  const hl = ctx.createRadialGradient(-g.w * 0.2, y + g.h * 0.25, 4, -g.w * 0.2, y + g.h * 0.25, g.w * 0.6);
  hl.addColorStop(0, "rgba(255,255,255,0.22)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hl;
  ctx.fillRect(x, y, g.w, g.h);

  if (bag.flash > 0) {
    ctx.fillStyle = `rgba(255,70,80,${bag.flash * 0.35})`;
    ctx.fillRect(x, y, g.w, g.h);
  }
  ctx.restore();

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

// ---------- القفاز المقترب (الهدف) ----------
// t.k من 0 (بعيد، في المنتصف عند الأفق) إلى 1 (قريب منك)
function targetPos(t) {
  return { x: cw / 2 + t.lane * cw * 0.3 * t.k, y: ch * (0.3 + 0.3 * t.k) };
}
function targetRadius(t) {
  return Math.min(cw, ch) * (0.035 + 0.13 * Math.pow(t.k, 1.3));
}
function findTargetAt(x, y) {
  for (const t of targets) {
    if (t.state !== "live" || t.k < 0.25) continue;
    const p = targetPos(t);
    if (Math.hypot(x - p.x, y - p.y) <= targetRadius(t) * 1.15) return t;
  }
  return null;
}

function updateGame(dt) {
  // تحديث الأهداف
  for (const t of targets) {
    if (t.state === "live") {
      t.k += dt / TARGET_MS;
      if (t.k >= 1) {
        t.state = "miss";
        t.age = 0;
        stats.targetMiss++;
        nextTargetAt = activeMs + TARGET_GAP_MS;
      }
    } else {
      t.age += dt;
    }
  }
  targets = targets.filter((t) => t.state === "live" || t.age < 400);
  if (!targets.some((t) => t.state === "live") && activeMs >= nextTargetAt) {
    targets.push({ state: "live", lane: pickLane(), k: 0, age: 0 });
  }

  // تحديث الأعمدة
  for (const p of pillars) {
    p.k += dt / PILLAR_MS;
    if (!p.judged && p.k >= PILLAR_JUDGE_K) judgePillar(p);
  }
  const hadPillars = pillars.length > 0;
  pillars = pillars.filter((p) => p.k < 1.1);
  if (hadPillars && pillars.length === 0) {
    nextPillarAt = activeMs + PILLAR_GAP_MIN + Math.random() * PILLAR_GAP_RAND;
  }
  if (pillars.length === 0 && activeMs >= nextPillarAt) {
    pillars.push({ lane: pickLane(), k: 0, judged: false });
  }
}

// ---------- الأعمدة ----------
function pillarX(p) {
  return cw / 2 + p.lane * cw * 0.3 * p.k;
}
function pillarW(p) {
  return cw * (0.04 + 0.12 * p.k);
}
function bodyCenterX() {
  const L = lastPose[11], R = lastPose[12];
  return toScreen((L.x + R.x) / 2, (L.y + R.y) / 2).x;
}
function bodyHalfWidth() {
  return Math.max(poseSW * scale * 0.6, 30);
}

// الحكم على العمود: هل كان جسمك داخل مساره لحظة وصوله؟
function judgePillar(p) {
  p.judged = true;
  if (!lastPose || !poseSW) return;          // لا حكم بدون رؤية الجسم
  const bx = bodyCenterX();
  const px = pillarX(p);
  const reach = pillarW(p) / 2 + bodyHalfWidth();
  const y = ch * 0.45;
  if (Math.abs(bx - px) < reach) {
    stats.pillarHits++;
    flashRed = 1;
    addFloater("ضربة ✖", bx, y, "#ff5a64");
    tone(120, 0.25, 0.25, "sawtooth");
  } else {
    stats.dodges++;
    addFloater("تفادٍ ✓", bx, y, "#7CFC9A");
    tone(880, 0.12, 0.15, "triangle");
  }
  updateHud();
}

function drawPillars() {
  for (const p of pillars) {
    if (p.k < 0.02) continue;
    const x = pillarX(p), w = pillarW(p);
    const top = ch * 0.18, bottom = ch * 0.85;
    const a = Math.min(1, 0.3 + p.k);
    const grad = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    grad.addColorStop(0, `rgba(40,40,48,${a})`);
    grad.addColorStop(0.5, `rgba(125,130,142,${a})`);
    grad.addColorStop(1, `rgba(40,40,48,${a})`);
    ctx.fillStyle = grad;
    ctx.fillRect(x - w / 2, top, w, bottom - top);
    ctx.strokeStyle = `rgba(225,29,46,${a})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - w / 2, top, w, bottom - top);
  }
}

// رسم قفاز: كفّ مع إبهام ومعصم أبيض
function drawGlove(x, y, r, alpha, color) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.fillStyle = "#e9e9e9";
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x - r * 0.55, y + r * 0.55, r * 1.1, r * 0.5, r * 0.15)
                : ctx.rect(x - r * 0.55, y + r * 0.55, r * 1.1, r * 0.5);
  ctx.fill();

  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, "#ff5a64");
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.75, r * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(x - r * 0.65, y + r * 0.1, r * 0.28, r * 0.42, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = Math.max(1, r * 0.04);
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x - r * 0.45, y + i * r * 0.25 - r * 0.1);
    ctx.lineTo(x + r * 0.4, y + i * r * 0.25 - r * 0.1);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.ellipse(x + r * 0.2, y - r * 0.35, r * 0.22, r * 0.12, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTargets() {
  for (const t of targets) {
    const p = targetPos(t);
    const r = targetRadius(t);
    if (t.state === "live") {
      drawGlove(p.x, p.y, r, 1, "#8e0f1a");
    } else {
      const a = Math.max(0, 1 - t.age / 400);
      if (t.state === "hit") {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.strokeStyle = "#ffd166";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * (2 - a), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        drawGlove(p.x, p.y, r, a, "#ff2d3d");
      } else {
        drawGlove(p.x, p.y, r, a * 0.6, "#555");
      }
    }
  }
}

// ---------- الرسم ----------
const PAIRS = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]];

function render(now) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);

  drawCamera();

  if (state === "round" || state === "paused" || state === "rest") {
    drawPillars();
    drawTargets();
  }

  if (lastPose) drawSkeleton(now);
  drawFloaters(now);

  if (flashRed > 0) {
    ctx.fillStyle = `rgba(255,0,0,${flashRed * 0.3})`;
    ctx.fillRect(0, 0, cw, ch);
  }
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

  // المعصمان = القفازان، ويتوهجان عند اللكمة
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
    ctx.fillStyle = f.color;
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
  setText(el.ppm, ppm);
  setText(el.targetHits, stats.targetHits);
  setText(el.dodges, stats.dodges);
  setText(el.pillarHits, stats.pillarHits);

  let remain;
  if (state === "rest") remain = restMs;
  else if (state === "calib" || state === "home") remain = roundDurMs;
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
      <div><b>${s.targetHits}</b><small>أهداف القفاز</small></div>
      <div><b>${s.dodges}</b><small>تفادٍ ناجح</small></div>
      <div><b>${s.pillarHits}</b><small>ضربات مستلمة</small></div>
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
          <small>${s.ppm}/د · ${s.targetHits || 0} قفاز · ${s.dodges || 0} تفادٍ</small>
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
el.btnRotate.addEventListener("click", () => {
  rotAuto = false;
  rot = (rot + 1) % 4;
  videoKey = "";
  updateLayout();
  showToast(`التدوير: ${rot * 90}°`);
});
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
