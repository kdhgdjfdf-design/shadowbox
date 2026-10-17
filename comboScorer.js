/* =====================================================================
   ShadowBox AI — آلة حالة تقييم الكومبو (منطق خالص بدون كاميرا أو DOM)
   المدخلات: لكمات مكتشفة {type: "jab"|"cross", t: مللي ثانية}
   المخرجات: حالة كل لكمة + نتيجة تفصل بين "مُقاس" و"تقدير".
   ===================================================================== */

import { SCORABLE_KINDS } from "./combos.js";

/**
 * @param {object} combo  كومبو من combos.js (يجب أن يكون قابلًا للتقييم)
 * @param {object} [opts]
 * @param {number} [opts.dedupeMs=250]  لكمتان أقرب من هذا الزمن = حركة واحدة مكررة
 */
export function createScorer(combo, opts = {}) {
  const dedupeMs = opts.dedupeMs ?? 250;
  const steps = combo.steps;
  if (!steps.every((s) => SCORABLE_KINDS.includes(s.kind))) {
    throw new Error("هذا الكومبو يحتوي خطوات لا يستطيع النظام الحالي تقييمها");
  }

  let index = 0;              // الخطوة المتوقعة الآن
  let correct = 0;            // لكمات صحيحة بالترتيب
  let wrong = 0;              // لكمات لا تطابق الخطوة المتوقعة
  let duplicates = 0;         // لكمات مكررة من الحركة نفسها
  let counted = 0;            // كل اللكمات المقبولة كحركة مستقلة
  let lastT = null;           // زمن آخر لكمة مقبولة (صحيحة أو خاطئة)
  const intervals = [];       // الفواصل بين اللكمات الصحيحة المتتالية
  let lastCorrectT = null;
  let done = false;

  function onPunch(punch) {
    if (done) return { status: "ignored", index, message: "اكتمل التسلسل" };
    if (!punch || (punch.type !== "jab" && punch.type !== "cross") || typeof punch.t !== "number") {
      return { status: "ignored", index, message: "لكمة غير صالحة" };
    }
    if (lastT !== null && punch.t - lastT < dedupeMs) {
      duplicates++;
      return { status: "duplicate", index, message: "حركة مكررة" };
    }

    lastT = punch.t;
    counted++;
    const expected = steps[index];

    if (punch.type === expected.kind) {
      correct++;
      if (lastCorrectT !== null) intervals.push(punch.t - lastCorrectT);
      lastCorrectT = punch.t;
      index++;
      if (index === steps.length) done = true;
      return {
        status: "correct",
        index,
        message: done ? "أحسنت، اكتمل التسلسل" : "صحيح، التالي",
      };
    }

    wrong++;
    return {
      status: "wrong",
      index,
      message: `توقعنا ${expected.kind === "jab" ? "جاب" : "كروس"} وسُجّلت ${punch.type === "jab" ? "جاب" : "كروس"}`,
    };
  }

  function result() {
    const mean = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : null;
    let consistency = null;
    if (intervals.length >= 2 && mean > 0) {
      const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
      const cv = Math.sqrt(variance) / mean;          // معامل الاختلاف
      consistency = Math.max(0, Math.min(1, 1 - cv));
    }
    const judged = correct + wrong;
    return {
      // قياسات مباشرة من عدّ اللكمات
      measured: {
        done,
        completedSteps: index,
        totalSteps: steps.length,
        correct,
        wrong,
        duplicates,
        countedPunches: counted,
      },
      // تقديرات تعتمد على الزمن والكشف التقديري بالكاميرا
      estimated: {
        sequenceAccuracy: judged ? correct / judged : null,
        avgIntervalMs: mean === null ? null : Math.round(mean),
        consistency: consistency === null ? null : Math.round(consistency * 100) / 100,
      },
    };
  }

  function reset() {
    index = 0; correct = 0; wrong = 0; duplicates = 0; counted = 0;
    lastT = null; lastCorrectT = null; intervals.length = 0; done = false;
  }

  return {
    onPunch,
    result,
    reset,
    get index() { return index; },
    get done() { return done; },
  };
}
