/* ShadowBox Nox — local, non-diagnostic health section */
const modal = document.getElementById("healthModal");
const openButton = document.getElementById("btnHealth");
const closeButton = document.getElementById("btnCloseHealth");
const ageInput = document.getElementById("healthAge");
const heightInput = document.getElementById("healthHeight");
const weightInput = document.getElementById("healthWeight");
const result = document.getElementById("healthBodyResult");
const reviewButton = document.getElementById("btnReviewBody");
const languageSelect = document.getElementById("langSel");

const copy = {
  ar: {
    title:"الصحة والتغذية", subtitle:"دعم التعافي والعادات اليومية", heroTitle:"قوّتك تبدأ من عاداتك",
    heroText:"معلومات مبسطة تساعدك على الاهتمام بالنوم، والطعام، والماء، والتعافي إلى جانب التدريب.",
    bodyTitle:"معلومات الجسم", bodySub:"أدخل القياسات إن أردت عرضها فقط.", age:"العمر (سنة)", height:"الطول (سم)", weight:"الوزن (كغ)",
    review:"عرض ملخص القياسات", demo:"القيم المعروضة تجريبية ويمكنك تغييرها. لم يتم إجراء أي تشخيص.",
    invalid:"تحقق من المدخلات: العمر 10–19 سنة، والطول 80–230 سم، والوزن 10–250 كغ.",
    summary:(a,h,w)=>`المدخلات الحالية: العمر ${a} سنة، والطول ${h} سم، والوزن ${w} كغ. هذه أرقام وصفية فقط وليست تقييمًا صحيًا.`,
    disclaimer:"في سن النمو لا تكفي قياسات الطول والوزن وحدها للحكم على الصحة؛ يفسّر المختص نمو المراهق باستخدام العمر والجنس ومخططات النمو والسياق الصحي. هذا القسم ليس أداة تشخيص.",
    label:"عادات تدعم التدريب", nutrition:"التغذية المتوازنة", nutritionText:"نوّع وجباتك بين مصادر البروتين، والحبوب أو النشويات، والخضار والفواكه، والدهون المفيدة. تناول وجبات منتظمة ومشبعة، ولا تعتمد على المكملات أو الحميات القاسية دون مختص.",
    water:"الماء والترطيب", waterText:"اشرب الماء خلال اليوم، وخذ رشفات أثناء التدريب وبعده. تزداد الحاجة مع الحرارة والتعرّق؛ لا تجبر نفسك على شرب كميات كبيرة دفعة واحدة.",
    sleep:"النوم والتعافي", sleepText:"حاول الحصول على 8–10 ساعات من النوم ليلًا في سن المراهقة. اترك وقتًا للراحة بين الجلسات، وخفف التدريب إذا كنت مرهقًا أو مريضًا.",
    training:"تدريب آمن", trainingText:"ابدأ تدريجيًا، واهتم بالإحماء والمساحة الآمنة. توقّف إذا شعرت بألم أو دوخة أو ضيق نفس غير معتاد، وأخبر شخصًا بالغًا تثق به عند القلق.",
    footer:"محتوى تثقيفي عام، وليس بديلًا عن الطبيب أو اختصاصي التغذية. لا تُرسل القياسات إلى أي خدمة؛ الحساب محلي داخل المتصفح.",
    back:"رجوع", navTitle:"الصحة والتغذية", navSub:"عادات صحية ومعلومات الجسم"
  },
  en: {
    title:"Health & Nutrition", subtitle:"Recovery and everyday habits", heroTitle:"Strength starts with habits",
    heroText:"Simple guidance on sleep, food, hydration, and recovery alongside training.",
    bodyTitle:"Body information", bodySub:"Enter measurements for display only.", age:"Age (years)", height:"Height (cm)", weight:"Weight (kg)",
    review:"Review measurements", demo:"These are sample values you can change. No diagnosis is performed.",
    invalid:"Check your entries: age 10–19 years, height 80–230 cm, weight 10–250 kg.",
    summary:(a,h,w)=>`Current entries: age ${a} years, height ${h} cm, weight ${w} kg. These are descriptive values only, not a health assessment.`,
    disclaimer:"During adolescence, height and weight alone cannot determine health. A qualified professional interprets growth using age, sex, growth charts, and health context. This section is not a diagnostic tool.",
    label:"Habits that support training", nutrition:"Balanced nutrition", nutritionText:"Vary meals with protein sources, grains or other carbohydrates, vegetables and fruit, and beneficial fats. Eat regular, satisfying meals; avoid restrictive diets or supplements without qualified guidance.",
    water:"Hydration", waterText:"Drink water throughout the day and take sips during and after training. Needs rise with heat and sweating; do not force large amounts at once.",
    sleep:"Sleep and recovery", sleepText:"Teenagers generally need 8–10 hours of sleep per night. Leave time to recover between sessions and ease off when unusually tired or ill.",
    training:"Safer training", trainingText:"Build up gradually, warm up, and keep your space clear. Stop if you feel pain, dizziness, or unusual shortness of breath, and tell a trusted adult if concerned.",
    footer:"General educational information, not a substitute for a clinician or dietitian. Measurements are processed locally in your browser and are not sent to a service.",
    back:"Back", navTitle:"Health & Nutrition", navSub:"Healthy habits and body information"
  }
};

// Navigation: a section menu plus separate detail pages with one-step back.
let currentHealthView = "menu";
let healthMenuView = null;
const healthDetailViews = new Map();

function setupHealthNavigation() {
  const contentArea = modal.querySelector(".health-content");
  if (!contentArea || contentArea.dataset.navigationReady === "true") return;
  contentArea.dataset.navigationReady = "true";

  const hero = contentArea.querySelector(".health-hero");
  const bodyCard = contentArea.querySelector("#bodyInfoTitle")?.closest(".health-card");
  const topics = [...contentArea.querySelectorAll("details.health-topic")];
  const footer = contentArea.querySelector(".health-footer-note");
  const items = [];

  if (bodyCard) items.push({
    id: "body", node: bodyCard, icon: "🧍",
    title: bodyCard.querySelector("h3")?.textContent || "معلومات الجسم",
    description: bodyCard.querySelector(".health-card-title p")?.textContent || "عرض معلومات الجسم"
  });
  topics.forEach((node, index) => {
    const summary = node.querySelector("summary");
    items.push({
      id: "topic-" + index, node,
      icon: summary?.querySelector(".health-icon")?.textContent || "🌿",
      title: summary?.querySelector("h3")?.textContent || "معلومات صحية",
      description: summary?.querySelector("p")?.textContent || "افتح لعرض المعلومات"
    });
    node.open = true;
  });

  healthMenuView = document.createElement("div");
  healthMenuView.className = "health-view health-menu-view";
  if (hero) healthMenuView.appendChild(hero);
  const intro = document.createElement("p");
  intro.className = "health-menu-hint";
  intro.textContent = languageSelect?.value === "en"
    ? "Choose a topic to open its information."
    : "اختر موضوعًا لفتح صفحة المعلومات الخاصة به.";
  healthMenuView.appendChild(intro);

  const list = document.createElement("div");
  list.className = "health-menu-list";
  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "health-menu-item";
    button.innerHTML = '<span class="health-menu-icon"></span><span class="health-menu-copy"><b></b><small></small></span><span class="health-menu-arrow" aria-hidden="true">‹</span>';
    button.querySelector(".health-menu-icon").textContent = item.icon;
    button.querySelector("b").textContent = item.title;
    button.querySelector("small").textContent = item.description;
    button.addEventListener("click", () => showHealthDetail(item.id));
    list.appendChild(button);

    const page = document.createElement("section");
    page.className = "health-view health-detail-view";
    page.hidden = true;
    page.dataset.healthPage = item.id;
    const pageHead = document.createElement("div");
    pageHead.className = "health-detail-heading";
    const back = document.createElement("button");
    back.type = "button";
    back.className = "health-detail-back";
    back.textContent = languageSelect?.value === "en" ? "‹ Back to topics" : "‹ رجوع إلى المواضيع";
    back.addEventListener("click", showHealthMenu);
    const title = document.createElement("h3");
    title.textContent = item.title;
    pageHead.append(back, title);
    page.appendChild(pageHead);
    page.appendChild(item.node);
    contentArea.appendChild(page);
    healthDetailViews.set(item.id, page);
  });
  healthMenuView.appendChild(list);
  if (footer) healthMenuView.appendChild(footer);
  contentArea.prepend(healthMenuView);
  currentHealthView = "menu";
}

function showHealthMenu() {
  currentHealthView = "menu";
  if (healthMenuView) healthMenuView.hidden = false;
  healthDetailViews.forEach((page) => { page.hidden = true; });
  const scroller = modal.querySelector(".health-content");
  if (scroller) scroller.scrollTop = 0;
  closeButton.setAttribute("aria-label", languageSelect?.value === "en" ? "Back to home" : "رجوع إلى الرئيسية");
}

function showHealthDetail(id) {
  if (!healthDetailViews.has(id)) return;
  currentHealthView = id;
  if (healthMenuView) healthMenuView.hidden = true;
  healthDetailViews.forEach((page, key) => { page.hidden = key !== id; });
  const scroller = modal.querySelector(".health-content");
  if (scroller) scroller.scrollTop = 0;
  closeButton.setAttribute("aria-label", languageSelect?.value === "en" ? "Back to topics" : "رجوع إلى المواضيع");
}

function goBackHealth() {
  if (currentHealthView !== "menu") {
    showHealthMenu();
    return;
  }
  modal.hidden = true;
  openButton.focus();
}

function applyLanguage() {
  const lang = languageSelect?.value === "en" ? "en" : "ar";
  const t = copy[lang];
  modal.dir = lang === "ar" ? "rtl" : "ltr";
  modal.querySelectorAll(".health-detail-back").forEach((button) => { button.textContent = lang === "en" ? "‹ Back to topics" : "‹ رجوع إلى المواضيع"; });
  const menuHint = modal.querySelector(".health-menu-hint");
  if (menuHint) menuHint.textContent = lang === "en" ? "Choose a topic to open its information." : "اختر موضوعًا لفتح صفحة المعلومات الخاصة به.";
  document.getElementById("healthTitle").textContent = t.title;
  modal.querySelector(".health-header p").textContent = t.subtitle;
  modal.querySelector(".health-hero h3").textContent = t.heroTitle;
  modal.querySelector(".health-hero p").textContent = t.heroText;
  document.getElementById("bodyInfoTitle").textContent = t.bodyTitle;
  modal.querySelector(".health-card-title p").textContent = t.bodySub;
  ageInput.parentElement.firstChild.textContent = t.age;
  heightInput.parentElement.firstChild.textContent = t.height;
  weightInput.parentElement.firstChild.textContent = t.weight;
  reviewButton.textContent = t.review;
  modal.querySelector(".health-disclaimer").textContent = t.disclaimer;
  modal.querySelector(".health-section-label").textContent = t.label;
  const tips = modal.querySelectorAll(".health-tip");
  [[t.nutrition,t.nutritionText],[t.water,t.waterText],[t.sleep,t.sleepText],[t.training,t.trainingText]].forEach((item,i)=>{
    tips[i].querySelector("h3").textContent=item[0];
    tips[i].querySelector("p").textContent=item[1];
  });
  modal.querySelector(".health-footer-note").textContent = t.footer;
  closeButton.setAttribute("aria-label",t.back);
  openButton.querySelector("b").textContent=t.navTitle;
  openButton.querySelector("small").textContent=t.navSub;
  if (!result.dataset.reviewed) result.textContent=t.demo;
}
function reviewMeasurements() {
  const lang = languageSelect?.value === "en" ? "en" : "ar";
  const t = copy[lang];
  const age = Number(ageInput.value), height = Number(heightInput.value), weight = Number(weightInput.value);
  const valid = Number.isFinite(age) && Number.isFinite(height) && Number.isFinite(weight)
    && age >= 10 && age <= 19 && height >= 80 && height <= 230 && weight >= 10 && weight <= 250;
  result.dataset.reviewed = "true";
  if (!valid) { result.textContent = t.invalid; return; }
  result.textContent = t.summary(age, height, weight);
}
openButton.addEventListener("click", () => { setupHealthNavigation(); applyLanguage(); showHealthMenu(); modal.hidden = false; closeButton.focus(); });
closeButton.addEventListener("click", goBackHealth);
reviewButton.addEventListener("click", reviewMeasurements);
languageSelect?.addEventListener("change", applyLanguage);
modal.addEventListener("click", event => { if (event.target === modal) goBackHealth(); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && !modal.hidden) goBackHealth(); });
setupHealthNavigation();
applyLanguage();
