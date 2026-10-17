/* =====================================================================
   ShadowBox AI — أكاديمية الكومبو (الواجهة + ربطها بالتدريب بالكاميرا)
   المراحل: SELECT → LEARN → DEMONSTRATE → READY → PRACTISE → RESULTS
   - المعلّم: هيكل 2D متحرك مؤقت (لا يوجد نموذج ثلاثي الأبعاد في هذه النسخة)
   - التقييم: يستقبل اللكمات المكتشفة من script.js عبر window.ShadowBoxCombo
   ===================================================================== */

import { LEVELS, COMBOS, isScorable, stepTitle, handName } from "./combos.js";
import { createScorer } from "./comboScorer.js";

const $ = (id) => document.getElementById(id);
const STORE_KEY = "shadowbox_combo_v1";   // مفتاح منفصل لا يمسّ سجل الجلسات الحالي
const PHASE_LABEL = { select: "اختيار", learn: "تعلّم", demo: "عرض", ready: "جاهز", practice: "تدريب" };

// ---------- وضعيات الهيكل (الزاوية بالدرجات؛ 0 = يمين أفقي، -90 = أعلى) ----------
const GUARD = { lead: { a: 20, e: 60 }, rear: { a: 25, e: 55 }, shift: 0, lean: 0 };
const PEAK = {
  jab: { lead: { a: -2, e: 178 } },
  cross: { rear: { a: -2, e: 178 }, shift: 10 },
  hook: { lead: { a: 0, e: 80 }, shift: 4 },
  slip: { shift: -18, lean: -12 },
};

// ---------- الحالة ----------
let phase = "select";
let combo = null;
let animMode = "idle";            // idle | step | seq
let animT = 0;
let stepIdx = 0;
let paused = false;
let slow = false;
let pose = GUARD;
let raf = 0;
let lastFrame = 0;
let onAnimDone = null;
let stageCtx = null;
let practice = null;              // {combo, scorer, live, saved, resultShown, lastMsg, poll}

// ---------- أدوات ----------
const smooth = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));
const dur = () => (slow ? 2000 : 1000);
const gap = () => (slow ? 500 : 300);
const stance = () => $("stanceSel").value;

function lerpArm(a, b, p) {
  return { a: a.a + (b.a - a.a) * p, e: a.e + (b.e - a.e) * p };
}

/** وضعية الهيكل لحركة معيّنة عند التقدّم u ∈ [0,1]: تذهب للذروة ثم تعود. */
function poseFor(kind, u) {
  const p = smooth(u < 0.5 ? u * 2 : (1 - u) * 2);
  const P = PEAK[kind];
  const out = { lead: GUARD.lead, rear: GUARD.rear, shift: (P.shift || 0) * p, lean: (P.lean || 0) * p };
  if (kind === "jab" || kind === "hook") out.lead = lerpArm(GUARD.lead, P.lead, p);
  if (kind === "cross") out.rear = lerpArm(GUARD.rear, P.rear, p);
  return out;
}

// ---------- الرسم: هيكل 2D مؤقت ----------
function drawFigure(p) {
  const c = stageCtx;
  if (!c) return;
  const W = 640, H = 480;
  c.clearRect(0, 0, W, H);
  c.fillStyle = "#141414";
  c.fillRect(0, 0, W, H);
  c.strokeStyle = "#2a2a2a";
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(60, 420);
  c.lineTo(580, 420);
  c.stroke();

  const hipX = 300 + p.shift, hipY = 330;
  const shX = hipX + p.lean * 0.6, shY = 210;
  const bone = "#e5e5e5";

  // الساقان (الأمامية للأمام)
  c.lineCap = "round";
  c.strokeStyle = bone;
  c.lineWidth = 14;
  c.beginPath();
  c.moveTo(hipX, hipY); c.lineTo(hipX + 70, 418);
  c.moveTo(hipX, hipY); c.lineTo(hipX - 60, 418);
  c.stroke();

  // الجذع
  c.lineWidth = 18;
  c.beginPath();
  c.moveTo(shX, shY); c.lineTo(hipX, hipY);
  c.stroke();

  // الرأس
  c.fillStyle = "#d9d9d9";
  c.beginPath();
  c.arc(shX + 10, shY - 50, 34, 0, Math.PI * 2);
  c.fill();

  // الذراعان: الخلفية أولًا ثم الأمامية فوقها
  drawArm(shX, shY, p.rear, "#b30f1d", "#9a9a9a");
  drawArm(shX, shY, p.lead, "#ff4d5a", "#c8c8c8");
}

function drawArm(sx, sy, arm, gloveColor, boneColor) {
  const c = stageCtx;
  const L1 = 95, L2 = 90;
  const rad = (d) => (d * Math.PI) / 180;
  const ex = sx + L1 * Math.cos(rad(arm.a)), ey = sy + L1 * Math.sin(rad(arm.a));
  const f = arm.a - (180 - arm.e);   // زاوية الساعد
  const wx = ex + L2 * Math.cos(rad(f)), wy = ey + L2 * Math.sin(rad(f));

  c.strokeStyle = boneColor;
  c.lineWidth = 14;
  c.beginPath();
  c.moveTo(sx, sy); c.lineTo(ex, ey); c.lineTo(wx, wy);
  c.stroke();

  c.fillStyle = gloveColor;
  c.beginPath();
  c.arc(wx, wy, 24, 0, Math.PI * 2);
  c.fill();
}

function requestFrame() {
  if (raf) return;
  lastFrame = 0;
  raf = requestAnimationFrame(tick);
}

function tick(now) {
  raf = 0;
  const dt = lastFrame ? Math.min(100, now - lastFrame) : 0;
  lastFrame = now;
  if (animMode !== "idle" && !paused) animT += dt;

  if (animMode === "step") {
    const D = dur();
    if (animT >= D) {
      animMode = "idle";
      pose = GUARD;
      finishAnim();
    } else {
      pose = poseFor(combo.steps[stepIdx].kind, animT / D);
    }
  } else if (animMode === "seq") {
    const D = dur(), G = gap();
    const total = combo.steps.length * (D + G);
    if (animT >= total) {
      animMode = "idle";
      pose = GUARD;
      finishAnim();
    } else {
      const i = Math.floor(animT / (D + G));
      const local = animT - i * (D + G);
      stepIdx = i;
      pose = local < D ? poseFor(combo.steps[i].kind, local / D) : GUARD;
      renderSteps();
    }
  }
  drawFigure(pose);
  // جدولة الإطار التالي مباشرة؛ requestFrame تصفّر lastFrame وتُستخدم عند البدء والاستئناف فقط
  if (animMode !== "idle" && !paused) raf = requestAnimationFrame(tick);
}

function finishAnim() {
  const cb = onAnimDone;
  onAnimDone = null;
  if (cb) cb();
}

function startStep(i) {
  stepIdx = i;
  animMode = "step";
  animT = 0;
  paused = false;
  onAnimDone = null;
  renderLearn();
  requestFrame();
}

function startSeq(onDone) {
  animMode = "seq";
  animT = 0;
  paused = false;
  onAnimDone = onDone;
  renderSteps();
  requestFrame();
}

function stopAnim() {
  animMode = "idle";
  onAnimDone = null;
  pose = GUARD;
  drawFigure(pose);
}

// ---------- الشاشات ----------
function showAcademy(on) {
  $("academyScreen").classList.toggle("active", on);
  $("homeScreen").classList.toggle("active", !on);
}

function setPhase(p) {
  phase = p;
  $("acPhase").textContent = PHASE_LABEL[p] || "";
  $("acSelect").hidden = p !== "select";
  $("acLearn").hidden = p === "select";
  $("acBack").textContent = p === "select" ? "الرئيسية" : "رجوع";

  const isLast = combo && stepIdx === combo.steps.length - 1;
  $("acNext").hidden = p === "ready" || p === "demo";
  $("acNext").textContent = p === "learn" && isLast ? "عرض الكومبو كاملًا" : "التالي";
  $("acPrev").hidden = p !== "learn";
  $("acReplay").hidden = p === "select";
  $("acSlow").hidden = p === "select";
  $("acPause").hidden = p !== "demo";
  if (p !== "demo") {
    paused = false;
    $("acPause").textContent = "⏸ إيقاف مؤقت";
  }
  $("acContinue").hidden = p !== "ready";

  if (p === "ready") {
    const ok = isScorable(combo);
    $("acContinue").disabled = !ok;
    $("acGate").textContent = ok
      ? ""
      : "هذا الكومبو للتعلّم فقط، لأن النظام الحالي يكتشف الجاب والكروس فقط. جرّب الكومبوهات الأخرى للتدريب بالكاميرا.";
  } else {
    $("acGate").textContent = "";
  }
}

// ---------- اختيار الكومبو ----------
function renderSelect() {
  const host = $("acSelect");
  host.innerHTML = "";
  for (const level of LEVELS) {
    const h = document.createElement("h2");
    h.className = "ac-level";
    h.textContent = level.label;
    host.appendChild(h);
    for (const c of COMBOS.filter((x) => x.level === level.id)) {
      const b = document.createElement("button");
      b.className = "ac-card";
      const scorable = isScorable(c);
      b.innerHTML =
        `<b>${c.name}</b>` +
        `<small>${c.code}</small>` +
        `<span class="ac-badge ${scorable ? "ok" : "learn"}">${scorable ? "قابلة للتدريب بالكاميرا" : "للتعلّم فقط"}</span>`;
      b.addEventListener("click", () => openCombo(c));
      host.appendChild(b);
    }
  }
}

// ---------- التعلّم ----------
function openCombo(c) {
  combo = c;
  stepIdx = 0;
  $("acTitle").textContent = c.name;
  setPhase("learn");
  startStep(0);
}

function renderLearn() {
  const step = combo.steps[stepIdx];
  const s = stance();
  $("acStepTitle").textContent = `${stepIdx + 1}/${combo.steps.length} · ${stepTitle(step, s)}`;
  $("acStepTip").textContent = step.tip;
  $("acNote").textContent = "هيكل 2D مؤقت للتوضيح، وليس نموذجًا ثلاثي الأبعاد.";
  renderSteps();
  setPhase(phase);
}

function renderSteps() {
  const list = $("acSteps");
  list.innerHTML = "";
  const s = stance();
  combo.steps.forEach((step, i) => {
    const li = document.createElement("li");
    li.textContent = `${stepTitle(step, s)}`;
    if (phase === "learn" && i === stepIdx) li.className = "current";
    if ((phase === "demo" || phase === "ready") && i === stepIdx) li.className = "current";
    list.appendChild(li);
  });
}

function startDemo() {
  setPhase("demo");
  startSeq(() => setPhase("ready"));
}

// ---------- التدريب بالكاميرا ----------
function startPractice() {
  if (!isScorable(combo)) return;
  stopAnim();
  practice = { combo, scorer: createScorer(combo), live: false, saved: false, resultShown: false, lastMsg: "" };
  window.ShadowBoxCombo = { onPunch };

  // إعداد جولة واحدة قصيرة بدون راحة، مع الإبقاء على وضعية المستخدم
  $("roundSec").value = "120";
  $("roundCount").value = "1";
  $("restSec").value = "0";

  $("acContinue").disabled = true;
  $("acGate").textContent = "جارٍ تجهيز الكاميرا...";
  $("homeMsg").textContent = "";
  practice.poll = setInterval(poll, 400);
  $("btnStart").click();     // يستخدم دورة البدء الحالية نفسها (المعايرة ثم الجولة)
}

function onPunch(side, type, t) {
  if (!practice || !practice.live) return;
  try {
    const res = practice.scorer.onPunch({ type, t });
    practice.lastMsg = res.message;
    renderComboHud();
  } catch (err) {
    // لا نسمح لخطأ في التقييم بإيقاف عدّ اللكمات الأساسي
    console.warn("خطأ في تقييم الكومبو", err);
  }
}

function poll() {
  if (!practice) return;
  const trainOn = $("trainScreen").classList.contains("active");

  if (!practice.live) {
    if (trainOn) {
      practice.live = true;
      // نخفي الأكاديمية والرئيسية فقط، لأن شاشة التدريب نشطة الآن
      $("academyScreen").classList.remove("active");
      $("homeScreen").classList.remove("active");
      $("comboHud").hidden = false;
      renderComboHud();
    } else if ($("homeMsg").textContent.trim()) {
      // فشل تجهيز الكاميرا: نعود للتعلّم ونعرض سبب الخطأ
      const reason = $("homeMsg").textContent;
      endPractice();
      showAcademy(true);
      setPhase("ready");
      $("acGate").textContent = reason;
    }
    return;
  }

  const finished = !$("resultOverlay").hidden;
  const left = !trainOn;
  if (finished || left) {
    if (!practice.saved) saveAttempt();
    endPractice();
    return;
  }
  if (practice.scorer.done && !practice.resultShown) showComboResult();
}

function renderComboHud() {
  if (!practice) return;
  const s = stance();
  $("comboName").textContent = `${practice.combo.name} (${practice.combo.code})`;
  const host = $("comboSteps");
  host.innerHTML = "";
  practice.combo.steps.forEach((step, i) => {
    const span = document.createElement("span");
    span.className = "combo-step " + (i < practice.scorer.index ? "done" : i === practice.scorer.index ? "current" : "todo");
    span.textContent = stepTitle(step, s);
    host.appendChild(span);
  });
  $("comboMsg").textContent = practice.lastMsg || "قف في المعايرة ثم ابدأ الجولة";
}

function showComboResult() {
  practice.resultShown = true;
  const r = practice.scorer.result();
  const m = r.measured, e = r.estimated;
  const pct = (v) => (v === null ? "—" : `${Math.round(v * 100)}%`);
  const ms = (v) => (v === null ? "—" : `${v} ms`);
  $("comboResultBody").innerHTML =
    `<p><b>قياس مباشر (من عدّ اللكمات):</b></p>` +
    `<ul class="tips">` +
    `<li>الخطوات المكتملة: ${m.completedSteps} من ${m.totalSteps}</li>` +
    `<li>لكمات صحيحة بالترتيب: ${m.correct}</li>` +
    `<li>لكمات خاطئة: ${m.wrong}</li>` +
    `<li>لكمات مكررة استُبعدت: ${m.duplicates}</li>` +
    `</ul>` +
    `<p><b>تقدير (ليس قياسًا دقيقًا):</b></p>` +
    `<ul class="tips">` +
    `<li>دقة التسلسل: ${pct(e.sequenceAccuracy)}</li>` +
    `<li>متوسط الفاصل بين اللكمات: ${ms(e.avgIntervalMs)}</li>` +
    `<li>الاتساق في التوقيت: ${e.consistency === null ? "—" : Math.round(e.consistency * 100) + "%"}</li>` +
    `</ul>` +
    `<p class="notice small">الكاميرا الواحدة لا تقيس قوة اللكمة أو تأثيرها الفعلي أو جودة التقنية، لذلك هذه النتائج تقديرية.</p>`;
  $("comboResult").hidden = false;
}

function retryCombo() {
  practice.scorer.reset();
  practice.resultShown = false;
  practice.lastMsg = "أعد المحاولة";
  $("comboResult").hidden = true;
  renderComboHud();
}

function endPractice() {
  if (practice && practice.poll) clearInterval(practice.poll);
  practice = null;
  window.ShadowBoxCombo = null;
  $("comboHud").hidden = true;
  $("comboResult").hidden = true;
}

function saveAttempt() {
  practice.saved = true;
  const r = practice.scorer.result();
  if (r.measured.countedPunches === 0 && !r.measured.done) return;
  const rec = {
    date: new Date().toISOString(),
    comboId: practice.combo.id,
    comboName: practice.combo.name,
    level: practice.combo.level,
    stance: stance(),
    ...r.measured,
    ...r.estimated,
  };
  const list = loadAttempts();
  list.push(rec);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(-200)));
  } catch (err) {
    console.warn("تعذّر حفظ محاولة الكومبو", err);
  }
}

function loadAttempts() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// ---------- الأحداث ----------
$("btnAcademy").addEventListener("click", () => {
  renderSelect();
  setPhase("select");
  combo = null;
  showAcademy(true);
});

$("acBack").addEventListener("click", () => {
  if (phase === "select") {
    stopAnim();
    showAcademy(false);
  } else {
    stopAnim();
    combo = null;
    setPhase("select");
  }
});

$("acPrev").addEventListener("click", () => {
  if (stepIdx > 0) startStep(stepIdx - 1);
});

$("acNext").addEventListener("click", () => {
  if (stepIdx < combo.steps.length - 1) startStep(stepIdx + 1);
  else startDemo();
});

$("acReplay").addEventListener("click", () => {
  if (phase === "learn") startStep(stepIdx);
  else if (phase === "demo" || phase === "ready") {
    setPhase("demo");
    startSeq(() => setPhase("ready"));
  }
});

$("acSlow").addEventListener("click", () => {
  slow = !slow;
  $("acSlow").textContent = slow ? "سرعة عادية" : "بطيء";
});

$("acPause").addEventListener("click", () => {
  paused = !paused;
  $("acPause").textContent = paused ? "متابعة العرض" : "⏸ إيقاف مؤقت";
  if (!paused) requestFrame();
});

$("acContinue").addEventListener("click", startPractice);

$("comboRetry").addEventListener("click", retryCombo);
$("comboEnd").addEventListener("click", () => {
  $("comboResult").hidden = true;
  $("btnStop").click();      // إنهاء الجلسة بالمسار الحالي نفسه (يحفظ السجل ويعرض النتيجة)
});

// ---------- التهيئة ----------
stageCtx = $("acStage").getContext("2d");
drawFigure(GUARD);
