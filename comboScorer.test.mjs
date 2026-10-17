// اختبارات آلة تقييم الكومبو — تعمل بمدخلات مُحاكاة (بدون كاميرا)
// التشغيل: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { COMBOS, isScorable, handName, findCombo } from "../js/combos.js";
import { createScorer } from "../js/comboScorer.js";

const b1 = findCombo("b1");
const b2 = findCombo("b2");
const i1 = findCombo("i1");

test("تصنيف الكومبوهات: القابلة للتقييم فقط هي التي تحتوي جاب وكروس", () => {
  const scorable = COMBOS.filter(isScorable).map((c) => c.id).sort();
  assert.deepEqual(scorable, ["a2", "b1", "b2", "i2"]);
  assert.equal(isScorable(i1), false);
});

test("تسلسل صحيح كامل (جاب ثم كروس) يكتمل ويُحسب بدقة 100%", () => {
  const s = createScorer(b1);
  assert.equal(s.onPunch({ type: "jab", t: 1000 }).status, "correct");
  const last = s.onPunch({ type: "cross", t: 1800 });
  assert.equal(last.status, "correct");
  assert.equal(s.done, true);
  const r = s.result();
  assert.equal(r.measured.done, true);
  assert.equal(r.measured.correct, 2);
  assert.equal(r.measured.wrong, 0);
  assert.equal(r.estimated.sequenceAccuracy, 1);
});

test("ترتيب خاطئ يُسجَّل كخطأ ولا يتقدم التسلسل", () => {
  const s = createScorer(b1);
  const w = s.onPunch({ type: "cross", t: 1000 });
  assert.equal(w.status, "wrong");
  assert.equal(s.index, 0);
  assert.equal(s.onPunch({ type: "jab", t: 1700 }).status, "correct");
  assert.equal(s.index, 1);
});

test("لكمتان متقاربتان جدًا تُعدّان حركة واحدة مكررة", () => {
  const s = createScorer(b1);
  s.onPunch({ type: "jab", t: 1000 });
  const dup = s.onPunch({ type: "jab", t: 1100 }); // أقل من 250ms
  assert.equal(dup.status, "duplicate");
  assert.equal(s.onPunch({ type: "cross", t: 1700 }).status, "correct");
  const r = s.result();
  assert.equal(r.measured.duplicates, 1);
  assert.equal(r.measured.done, true);
});

test("الزمن بين اللكمات يُحسب والاتساق يقترب من 1 للفواصل المتساوية", () => {
  const s = createScorer(b2);
  s.onPunch({ type: "jab", t: 1000 });
  s.onPunch({ type: "jab", t: 1600 });
  s.onPunch({ type: "cross", t: 2200 });
  const e = s.result().estimated;
  assert.equal(e.avgIntervalMs, 600);
  assert.equal(e.consistency, 1);
});

test("فواصل غير متساوية تخفض الاتساق", () => {
  const s = createScorer(b2);
  s.onPunch({ type: "jab", t: 1000 });
  s.onPunch({ type: "jab", t: 1500 });
  s.onPunch({ type: "cross", t: 2600 });
  assert.ok(s.result().estimated.consistency < 1);
});

test("مدخلات غير صالحة (فارغة أو نوع غير معروف أو بلا زمن) تُتجاهل", () => {
  const s = createScorer(b1);
  assert.equal(s.onPunch(null).status, "ignored");
  assert.equal(s.onPunch({ type: "hook", t: 1000 }).status, "ignored");
  assert.equal(s.onPunch({ type: "jab" }).status, "ignored");
  assert.equal(s.result().measured.countedPunches, 0);
});

test("بعد اكتمال التسلسل تُتجاهل اللكمات الإضافية", () => {
  const s = createScorer(b1);
  s.onPunch({ type: "jab", t: 1000 });
  s.onPunch({ type: "cross", t: 1800 });
  assert.equal(s.onPunch({ type: "jab", t: 3000 }).status, "ignored");
});

test("إعادة الضبط تمسح كل الحالة وتسمح بمحاولة جديدة", () => {
  const s = createScorer(b1);
  s.onPunch({ type: "jab", t: 1000 });
  s.onPunch({ type: "cross", t: 1800 });
  s.reset();
  const r = s.result();
  assert.equal(r.measured.done, false);
  assert.equal(r.measured.correct, 0);
  assert.equal(s.onPunch({ type: "jab", t: 5000 }).status, "correct");
});

test("رفض تقييم كومبو يحتوي هوكًا لأن النظام لا يكتشفه", () => {
  assert.throws(() => createScorer(i1), /لا يستطيع النظام الحالي تقييمها/);
});

test("أسماء اليدين تتبع الوضعية: الأمامية اليسرى في الوضعية العادية", () => {
  assert.match(handName("lead", "orthodox"), /اليسرى/);
  assert.match(handName("rear", "orthodox"), /اليمنى/);
  assert.match(handName("lead", "southpaw"), /اليمنى/);
  assert.match(handName("rear", "southpaw"), /اليسرى/);
});
