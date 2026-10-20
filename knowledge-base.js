/* ShadowBox Nox — قاعدة معرفة محلية مختارة. لا اتصال شبكي ولا API. */
const SOURCES = {
  usaBoxing: { title: "USA Boxing — الموقع الرسمي", url: "https://www.usaboxing.org/" },
  cdc: { title: "CDC — النشاط البدني للمراهقين", url: "https://www.cdc.gov/physical-activity-basics/guidelines/children.html" },
  nhs: { title: "NHS — التمارين والنشاط البدني", url: "https://www.nhs.uk/live-well/exercise/" },
  medline: { title: "MedlinePlus — الإصابات الرياضية", url: "https://medlineplus.gov/sportsinjuries.html" },
  kidsHealth: { title: "KidsHealth — الرياضة والسلامة", url: "https://kidshealth.org/" },
  heart: { title: "American Heart Association — الإحماء والتهدئة", url: "https://www.heart.org/en/healthy-living/fitness/fitness-basics/warm-up-cool-down" }
};

const BOXING_KNOWLEDGE = [
 {id:"boxing-basics",title:"أساسيات الملاكمة",keywords:"ملاكمة boxing مبتدئ أساسيات وقفة stance",body:"ابدأ بتعلّم الوقفة المتوازنة والحراسة وحركة القدمين قبل السرعة أو القوة. اجعل الركبتين مرتاحتين قليلًا، والقدمين متباعدتين بشكل طبيعي، وحافظ على توازنك كي تستطيع التحرك في الاتجاهين. تدرب ببطء أولًا، ويفضل أن يراجع مدرب مؤهل وضعيتك.",sources:["usaBoxing","kidsHealth"]},
 {id:"stance",title:"وقفة الملاكمة",keywords:"وقفة وقوف stance توازن قدمين مبتدئ",body:"قف بزاوية مريحة بدل مواجهة الهدف بجسمك بالكامل، واجعل القدمين متباعدتين بما يسمح بالتوازن والحركة. لا تقفل الركبتين ولا تجمع القدمين أو تتقاطعهما أثناء التحرك. تختلف الوقفة حسب اليد الأمامية وراحة المتدرب؛ اطلب من مدرب تصحيحها.",sources:["usaBoxing"]},
 {id:"guard",title:"الحراسة",keywords:"حراسة دفاع guard حماية اليدين الذقن",body:"حافظ على اليدين قرب الوجه والمرفقين قريبين من الجسم دون شد زائد، مع النظر إلى الأمام والذقن بوضع طبيعي منخفض قليلًا. لا تثبت في وضع جامد؛ حافظ على التنفس والتوازن. تدرب أمام مدرب أو مرآة دون توجيه ضربات لشخص آخر.",sources:["usaBoxing"]},
 {id:"jab",title:"الجاب",keywords:"جاب jab اللكمة الأمامية مستقيمة",body:"الجاب لكمة مستقيمة باليد الأمامية، وتُستخدم في التدريب لتعلّم الدقة والتوقيت والعودة إلى الحراسة. ابدأ ببطء وبمدى مريح، وحافظ على المعصم بمحاذاة الساعد ولا تقفل المرفق بعنف. لا تضرب جدارًا أو سطحًا صلبًا، واستعمل كيسًا مناسبًا وقفازات عند التدريب عليه.",sources:["usaBoxing"]},
 {id:"cross",title:"الكروس",keywords:"كروس cross اللكمة الخلفية مستقيمة",body:"الكروس لكمة مستقيمة باليد الخلفية. تعلّم تنسيق حركة القدمين والورك والجذع مع الذراع تحت إشراف مدرب، ثم أعد اليد إلى الحراسة وحافظ على التوازن. لا تعتمد على الذراع وحدها ولا تحاول زيادة القوة قبل إتقان الحركة.",sources:["usaBoxing"]},
 {id:"hook",title:"الخطاف",keywords:"خطاف hook هوك لكمة جانبية",body:"الخطاف حركة جانبية تحتاج تنسيقًا وتوازنًا، وقد يجهد الرسغ أو الكتف إذا أُديت بشكل خاطئ. تعلمها تدريجيًا مع مدرب مؤهل، وحافظ على المعصم مستقيمًا وتوقف إذا ظهر ألم. لا تبدأ بمحاولات قوية أو سريعة.",sources:["usaBoxing","medline"]},
 {id:"uppercut",title:"الأبركت",keywords:"أبركت uppercut لكمة صاعدة",body:"الأبركت لكمة صاعدة تتطلب ضبط المسار والتوازن، لذلك تعلمها ببطء وبإشراف مدرب. تجنب المبالغة في ثني الركبتين أو لف الجذع، ولا ترفع السرعة أو القوة قبل إتقان الأساسيات.",sources:["usaBoxing"]},
 {id:"combo",title:"تركيبات اللكمات",keywords:"كومبو combo تركيبة جاب كروس تسلسل",body:"في التدريب التقني، ابدأ بتركيبة بسيطة مثل جاب ثم كروس، مع عودة كل يد إلى الحراسة بين الحركات. كررها ببطء وركز على التوازن والتنفس والتحكم، ثم زد الإيقاع تدريجيًا فقط إذا بقيت الحركة مريحة ودقيقة. لا تستخدم التركيبات لإيذاء الآخرين.",sources:["usaBoxing"]},
 {id:"footwork",title:"حركة القدمين",keywords:"قدمين footwork حركة انتقال توازن تحرك",body:"تحرك بخطوات صغيرة ومتحكم بها، وابدأ بالقدم الأقرب لاتجاه الحركة ثم اتبعها بالأخرى مع الحفاظ على المسافة بين القدمين. تجنب تقاطعهما أو القفز المفرط؛ الهدف بقاء التوازن والقدرة على التوقف بسهولة.",sources:["usaBoxing"]},
 {id:"defense",title:"الدفاع والمراوغة",keywords:"دفاع defense مراوغة dodge تفادي حركة الرأس",body:"ابدأ بحراسة متوازنة وخطوات جانبية صغيرة بدل حركات كبيرة أو مفاجئة. تدرب على الحركة ببطء في مساحة خالية، ولا تتدرب على تفادي ضربات حقيقية دون مدرب وحماية مناسبة. أوقف التدريب إذا شعرت بدوار أو ألم.",sources:["usaBoxing","kidsHealth"]},
 {id:"wraps",title:"لفافات اليد والقفازات",keywords:"قفازات gloves لفافات wraps معصم معدات حماية",body:"استخدم قفازات ولفافات مناسبة للمقاس والنشاط، وتأكد أن اللفافات لا تضغط على الأصابع أو تعيق الدورة الدموية. اطلب من مدرب أن يريك طريقة اللف الصحيحة. لا تضرب كيسًا ثقيلًا بقبضة عارية أو بمعصم غير مدعوم.",sources:["usaBoxing","medline"]},
 {id:"bag",title:"التدريب على الكيس",keywords:"كيس ملاكمة bag punching bag ضرب الكيس",body:"تأكد أن الكيس مثبت ومناسب لمستواك، وأن المساحة حوله خالية. ارتدِ القفازات ولفافات اليد، وابدأ بلمسات خفيفة تركز على التقنية. لا تضرب بأقصى قوة، ولا تواصل إذا ظهر ألم في الرسغ أو اليد أو الكتف.",sources:["usaBoxing","medline"]},
 {id:"warmup",title:"الإحماء",keywords:"إحماء warmup warm-up قبل التمرين تسخين",body:"خصص بضع دقائق لحركة سهلة ومتدرجة مثل المشي في المكان وتحريك الكتفين والذراعين وحركة القدمين بلطف. ابدأ ببطء وارفع النشاط تدريجيًا؛ الإحماء ليس اختبارًا ولا ينبغي أن يسبب إنهاكًا.",sources:["heart","nhs"]},
 {id:"cooldown",title:"التهدئة بعد التمرين",keywords:"تهدئة cool down تبريد بعد التمرين",body:"اخفض سرعة الحركة تدريجيًا بدل التوقف المفاجئ بعد نشاط نشط. امشِ بهدوء وتنفس بشكل طبيعي، ويمكنك القيام بحركات تمدد لطيفة دون دفع الجسم إلى الألم.",sources:["heart","nhs"]},
 {id:"conditioning",title:"اللياقة العامة",keywords:"لياقة fitness تحمل stamina كارديو cardio قوة",body:"اللياقة تشمل التحمل القلبي التنفسي والقوة والتوازن والمرونة والتناسق. اختر أنشطة ممتعة مناسبة لعمرك ومستواك، وبدّل بين النشاط والراحة. للمراهقين توصي الإرشادات العامة بتنوع الحركة على مدار الأسبوع؛ ليس مطلوبًا أن تكون كل حصة شديدة.",sources:["cdc","nhs"]},
 {id:"rest",title:"الراحة والتعافي",keywords:"راحة recovery استشفاء تعب إرهاق نوم",body:"الراحة جزء من التدريب وليست فشلًا. احرص على النوم الكافي والوجبات المتوازنة وشرب الماء، وخفف النشاط عند التعب غير المعتاد. إذا استمر التعب أو تكرر الألم، أخبر ولي أمرك واستشر مختصًا صحيًا.",sources:["nhs","medline"]},
 {id:"hydration",title:"الماء والترطيب",keywords:"ماء hydration ترطيب عطش شرب الماء",body:"اشرب الماء بانتظام قبل النشاط وأثناءه وبعده، خاصة في الجو الحار. لا تنتظر حتى يصبح العطش شديدًا، ولا تجبر نفسك على شرب كميات كبيرة دفعة واحدة. إذا شعرت بدوار أو ضعف، توقف واطلب المساعدة.",sources:["nhs","cdc"]},
 {id:"injury",title:"الألم والإصابات",keywords:"ألم إصابة injury wrist معصم كتف ركبة دوخة",body:"الألم الحاد أو المتزايد ليس شيئًا ينبغي تجاوزه بالتمرين. توقف عن النشاط وأخبر شخصًا بالغًا تثق به. اطلب تقييمًا صحيًا عند الألم المستمر أو التورم أو صعوبة الحركة؛ واطلب مساعدة عاجلة عند أعراض شديدة أو صعوبة تنفس غير معتادة.",sources:["medline","kidsHealth"]},
 {id:"safety",title:"السلامة أثناء التدريب",keywords:"سلامة safety خطر إصابة مساحة تدريب",body:"اختر مساحة خالية وجيدة التهوية، وثبّت الهاتف بعيدًا عن مسار الحركة، واستخدم معدات مناسبة. لا تتدرب على ضرب أشخاص أو على السطح الصلب، ولا تتمرن رغم الألم أو الدوخة. للمبتدئ، الإشراف من مدرب مؤهل يساعد على تعلم التقنية بأمان.",sources:["usaBoxing","kidsHealth"]},
 {id:"camera",title:"إعداد كاميرا ShadowBox",keywords:"كاميرا camera تتبع tracking لا تحسب الكاميرا الإضاءة الهاتف",body:"ضع الهاتف على حامل ثابت وعلى مسافة تظهر فيها الكتفين والذراعان بوضوح، واجعل الضوء أمامك وتجنب الخلفية شديدة السطوع. امنح المتصفح إذن الكاميرا، وجرّب الحركة ببطء. الكشف من كاميرا واحدة تقديري وقد يفوّت بعض الحركات أو يحسبها خطأ؛ لا تعتبره قياسًا طبيًا أو حكمًا نهائيًا على التقنية.",sources:["kidsHealth"]},
 {id:"tracking",title:"أخطاء عدّ اللكمات",keywords:"عداد لكمة يحسب مرتين لا يحتسب miss count punch detection",body:"قد يخطئ التتبع بسبب ضعف الإضاءة أو خروج اليد من الإطار أو سرعة الحركة أو زاوية الكاميرا. ثبّت الهاتف، وأظهر الكتفين واليدين، وابدأ بحركات منفصلة وبطيئة. الأرقام تقديرية؛ إذا تكرر الخطأ، أعد تشغيل الصفحة أو جرّب إضاءة ومسافة أفضل.",sources:["kidsHealth"]},
 {id:"growth",title:"النمو والطول في المراهقة",keywords:"طول نمو growth height بلوغ مراهق",body:"يختلف توقيت النمو بين المراهقين ويتأثر بالوراثة ومرحلة البلوغ والصحة العامة. لا يمكن توقع الطول النهائي من رقم واحد أو مقارنة نفسك بأصدقائك. إذا كان لديك قلق عن النمو، تحدث مع ولي أمرك وطبيب يمكنه مراجعة منحنى النمو بمرور الوقت.",sources:["kidsHealth","cdc"]},
 {id:"weight",title:"الوزن والصحة للمراهقين",keywords:"وزن weight نحافة سمنة bmi الوزن الصحي",body:"لا تستخدم جداول البالغين أو هدف وزن ثابت للحكم على صحة المراهق. التقييم يعتمد على العمر والطول ومسار النمو والسياق الصحي، والأفضل مناقشته مع طبيب أو مختص صحي مع ولي أمرك. تجنب الحميات القاسية أو محاولة تغيير الوزن بسرعة.",sources:["cdc","kidsHealth"]},
 {id:"progress",title:"متابعة التقدم",keywords:"تقدم progress نتيجة إحصائيات سجل جلسات",body:"سجّل الانتظام، والشعور أثناء التدريب، وجودة التعافي، وما تعلمته تقنيًا. لا تحكم على تقدمك من عدد اللكمات وحده لأن الكاميرا قد تخطئ. قارن تقدمك بنفسك عبر الوقت، وخذ أيام راحة كافية.",sources:["cdc","nhs"]},
 {id:"beginner-plan",title:"روتين مبتدئ آمن",keywords:"خطة جدول روتين beginner plan routine تدريب يومي",body:"ابدأ بجلسة قصيرة: إحماء لطيف، ثم ممارسة بطيئة للوقفة والحراسة وحركة القدمين دون احتكاك، ثم تهدئة. اجعل الجلسة سهلة في البداية وأضف الوقت تدريجيًا حسب الراحة، وخذ فترات راحة. لا تحتاج إلى التدريب الشديد يوميًا كي تتعلم.",sources:["usaBoxing","heart","nhs"]},
 {id:"breathing",title:"التنفس أثناء التمرين",keywords:"تنفس breathing نفس ضيق النفس",body:"حافظ على تنفس طبيعي ومنتظم ولا تحبس النفس لفترات طويلة. اختر وتيرة تسمح لك بالتحدث بجمل قصيرة أثناء نشاط اللياقة المعتدل. توقف إذا ظهر ضيق نفس غير معتاد أو دوار أو ألم في الصدر، وأخبر شخصًا بالغًا واطلب المساعدة المناسبة.",sources:["cdc","nhs"]},
 {id:"rest-days",title:"كم مرة أتدرب؟",keywords:"كم مرة تدريب أسبوع أيام الراحة frequency",body:"لا توجد خطة واحدة مناسبة للجميع. يعتمد التكرار على خبرتك ونوع النشاط والنوم والتعافي وجدولك. ابدأ بأوقات قصيرة ومريحة، وبدّل بين الأنشطة، واترك وقتًا للتعافي؛ إذا كنت غير متأكد فاستشر ولي أمرك ومدربًا مؤهلًا.",sources:["cdc","nhs"]},
 {id:"equipment",title:"مساحة ومعدات التدريب",keywords:"معدات معدات رياضية حذاء أرضية helmet gear",body:"افحص الأرضية لتكون ثابتة وغير زلقة، وأبعد الأثاث والأشياء القابلة للكسر، وتأكد من ثبات الحامل والكيس. استخدم معدات مناسبة ومقاسًا ملائمًا، ولا تستعمل معدات متضررة. في الملاكمة التنافسية تُتبع تعليمات الاتحاد والمنظم والمدرب بشأن معدات الحماية.",sources:["usaBoxing","kidsHealth"]}
];

const normalize = (value) => String(value || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[أإآ]/g, "ا")
  .replace(/[ى]/g, "ي")
  .replace(/[ة]/g, "ه")
  .replace(/[^\p{L}\p{N}\s-]/gu, " ")
  .replace(/\s+/g, " ")
  .trim();

function searchBoxingKnowledge(question, language = "ar") {
  const q = normalize(question);
  if (!q) return null;

  // Route clear question intents before fuzzy matching. This prevents words such as
  // "عدد" or "الملاكمة" from accidentally selecting an unrelated health topic.
  const competitionIntent = /بطوله|بطولات|بطوله العالم|بطوله عالميه|بطولات العالم|القاب|لقب|احزمه|حزام|championship|championships|titles|belts|boxing tournament/.test(q);
  if (competitionIntent) {
    return {
      answer: "لا يوجد عدد واحد ثابت لكل بطولات الملاكمة. توجد بطولات للهواة والمنتخبات، مثل المنافسات الأولمبية وبطولات الاتحاد الدولي، وتوجد في الملاكمة الاحترافية منظمات مختلفة تمنح ألقابًا وأحزمة عالمية، لذلك يتغير العدد بحسب ما تقصده وبحسب الفئة والاتحاد والفترة الزمنية. هل تقصد البطولات الأولمبية، أم بطولات العالم للهواة، أم ألقاب الملاكمة الاحترافية؟",
      sources: [
        { title: "Olympics — Boxing", url: "https://olympics.com/en/sports/boxing/" },
        { title: "International Boxing Association (IBA)", url: "https://www.iba.sport/" },
        { title: "World Boxing Council (WBC)", url: "https://wbcboxing.com/" }
      ],
      topics: ["بطولات الملاكمة وألقابها"]
    };
  }

  const stopWords = new Set([
    "ما","ماذا","كيف","هل","كم","عدد","في","من","عن","على","الى","إلى","و","او","أو",
    "هو","هي","هذا","هذه","ماهو","ماهي","اريد","أريد","اشرح","لي","لل","ال","the","what",
    "how","many","is","are","of","for","in","on","a","an","and","boxing"
  ]);
  const tokens = q.split(/\s+/).filter(token => token.length > 1 && !stopWords.has(token));
  if (!tokens.length) return null;

  const ranked = BOXING_KNOWLEDGE.map(item => {
    const titleTokens = normalize(item.title).split(/\s+/);
    const keywordTokens = normalize(item.keywords).split(/\s+/);
    const bodyTokens = normalize(item.body).split(/\s+/);
    let score = 0;
    for (const token of tokens) {
      if (titleTokens.includes(token)) score += 7;
      if (keywordTokens.includes(token)) score += 4;
      if (bodyTokens.includes(token)) score += 1;
    }
    return { item, score, matched: tokens.filter(token => titleTokens.includes(token) || keywordTokens.includes(token)).length };
  }).filter(entry => entry.score > 0).sort((a,b) => b.score - a.score);

  // Require a meaningful match in the title/keywords, not a weak incidental body match.
  if (!ranked.length || ranked[0].matched === 0 || ranked[0].score < 4) return null;
  const best = ranked[0].score;
  const chosen = ranked
    .filter(entry => entry.matched > 0 && entry.score >= Math.max(4, best * 0.58))
    .slice(0, 2)
    .map(entry => entry.item);
  if (!chosen.length) return null;

  const answer = chosen.map(item => item.title + ": " + item.body).join("\n\n");
  const sources = [];
  const seen = new Set();
  for (const item of chosen) {
    for (const key of item.sources) {
      const source = SOURCES[key];
      if (source && !seen.has(source.url)) {
        seen.add(source.url);
        sources.push(source);
      }
    }
  }
  return { answer, sources, topics: chosen.map(item => item.title) };
}

// Expose the local search API for classic scripts and file:// preview use.
if (typeof window !== "undefined") {
  window.ShadowBoxKnowledge = { searchBoxingKnowledge, BOXING_KNOWLEDGE };
}
