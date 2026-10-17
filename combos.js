/* =====================================================================
   ShadowBox AI — بيانات أكاديمية الكومبو (بدون DOM، قابلة للاختبار)
   - الترقيم بالمصطلح الملاكمة الدولي: 1 = جاب (اليد الأمامية)،
     2 = كروس (اليد الخلفية)، 3 = هوك أمامي، 4 = هوك خلفي
   - "lead" = اليد الأمامية، "rear" = اليد الخلفية؛ اليسار/اليمين يتبع الوضعية
   - scorable = هل يستطيع النظام الحالي تقييمها؟ (يكتشف الجاب والكروس فقط)
   ===================================================================== */

export const LEVELS = [
  { id: "beginner", label: "مبتدئ" },
  { id: "intermediate", label: "متوسط" },
  { id: "advanced", label: "متقدم" },
];

// أنواع الخطوات: jab | cross | hook | slip (حركة دفاعية)
// القابلة للتقييم حاليًا: jab و cross فقط
export const SCORABLE_KINDS = ["jab", "cross"];

const JAB = (tip) => ({ kind: "jab", hand: "lead", tip });
const CROSS = (tip) => ({ kind: "cross", hand: "rear", tip });
const HOOK = (tip) => ({ kind: "hook", hand: "lead", tip });
const SLIP = (tip) => ({ kind: "slip", hand: null, tip });

export const COMBOS = [
  {
    id: "b1", level: "beginner", code: "1-2", name: "جاب → كروس",
    steps: [
      JAB("لكمة مستقيمة سريعة باليد الأمامية. أعد اليد إلى الحماية فورًا."),
      CROSS("لكمة مستقيمة بقوة باليد الخلفية، مع دوران الوركين نحو الهدف."),
    ],
  },
  {
    id: "b2", level: "beginner", code: "1-1-2", name: "جاب → جاب → كروس",
    steps: [
      JAB("جاب أول يفتح المسافة ويقيس البعد."),
      JAB("جاب ثانٍ بنفس السرعة، ثم تهيّأ للكروس."),
      CROSS("كروس ينهي التسلسل. لا تسحب الرأس إلى الخلف."),
    ],
  },
  {
    id: "i1", level: "intermediate", code: "1-2-3", name: "جاب → كروس → هوك أمامي",
    steps: [
      JAB("جاب سريع باليد الأمامية."),
      CROSS("كروس باليد الخلفية."),
      HOOK("هوك أمامي: الذراع مثنية بزاوية قريبة من 90° وتدور من الجانب."),
    ],
  },
  {
    id: "i2", level: "intermediate", code: "1-2-1", name: "جاب → كروس → جاب",
    steps: [
      JAB("جاب أول."),
      CROSS("كروس ثانٍ."),
      JAB("جاب ثالث يعود للمسافة الأمامية."),
    ],
  },
  {
    id: "a1", level: "advanced", code: "1-2-3-تفادٍ", name: "جاب → كروس → هوك → تفادٍ",
    steps: [
      JAB("جاب سريع."),
      CROSS("كروس قوي."),
      HOOK("هوك أمامي قصير."),
      SLIP("تفادٍ: انزل الجذع قليلًا إلى جهة واحدة ثم عد إلى الوضعية."),
    ],
  },
  {
    id: "a2", level: "advanced", code: "1-2-1-2", name: "جاب → كروس → جاب → كروس",
    steps: [
      JAB("جاب أول."),
      CROSS("كروس أول."),
      JAB("جاب ثانٍ."),
      CROSS("كروس ختامي بقوة كاملة."),
    ],
  },
];

/** هل يمكن تقييم الكومبو كاملًا بالكاميرا الحالية؟ */
export function isScorable(combo) {
  return combo.steps.every((s) => SCORABLE_KINDS.includes(s.kind));
}

/** اسم اليد حسب الوضعية: الأمامية تكون اليسرى في الوضعية العادية. */
export function handName(hand, stance) {
  if (hand === null) return "";
  const leadSide = stance === "southpaw" ? "اليمنى" : "اليسرى";
  const rearSide = stance === "southpaw" ? "اليسرى" : "اليمنى";
  return hand === "lead" ? `${leadSide} (أمامية)` : `${rearSide} (خلفية)`;
}

/** نص خطوة مختصر للعرض: الاسم + اليد. */
export function stepTitle(step, stance) {
  const names = { jab: "جاب", cross: "كروس", hook: "هوك أمامي", slip: "تفادٍ" };
  const hand = step.hand ? ` — ${handName(step.hand, stance)}` : "";
  return `${names[step.kind]}${hand}`;
}

export function findCombo(id) {
  return COMBOS.find((c) => c.id === id) || null;
}
