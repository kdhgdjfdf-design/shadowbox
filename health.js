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
    review:"حساب مؤشر كتلة الجسم", demo:"أدخل العمر والطول والوزن ثم اضغط لحساب مؤشر كتلة الجسم.",
    invalid:"أدخل بيانات صحيحة: العمر 10–19 سنة، والطول 80–230 سم، والوزن 10–250 كغ.",
    summary:(bmi,a)=>`مؤشر كتلة الجسم: ${bmi} كغ/م². في سن المراهقة لا يُفسَّر الرقم باستخدام حدود البالغين؛ يحتاج التقييم إلى العمر والجنس ومخططات النمو، وهذا الحساب ليس تشخيصًا.`,
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
    review:"Calculate BMI", demo:"Enter age, height, and weight, then calculate your BMI.",
    invalid:"Enter valid values: age 10–19 years, height 80–230 cm, weight 10–250 kg.",
    summary:(bmi,a)=>`Body mass index: ${bmi} kg/m². For teens, the number should not be interpreted using adult cutoffs; assessment uses age, sex, and growth charts. This calculation is not a diagnosis.`,
    disclaimer:"During adolescence, height and weight alone cannot determine health. A qualified professional interprets growth using age, sex, growth charts, and health context. This section is not a diagnostic tool.",
    label:"Habits that support training", nutrition:"Balanced nutrition", nutritionText:"Vary meals with protein sources, grains or other carbohydrates, vegetables and fruit, and beneficial fats. Eat regular, satisfying meals; avoid restrictive diets or supplements without qualified guidance.",
    water:"Hydration", waterText:"Drink water throughout the day and take sips during and after training. Needs rise with heat and sweating; do not force large amounts at once.",
    sleep:"Sleep and recovery", sleepText:"Teenagers generally need 8–10 hours of sleep per night. Leave time to recover between sessions and ease off when unusually tired or ill.",
    training:"Safer training", trainingText:"Build up gradually, warm up, and keep your space clear. Stop if you feel pain, dizziness, or unusual shortness of breath, and tell a trusted adult if concerned.",
    footer:"General educational information, not a substitute for a clinician or dietitian. Measurements are processed locally in your browser and are not sent to a service.",
    back:"Back", navTitle:"Health & Nutrition", navSub:"Healthy habits and body information"
  }
};


const originalTopicMarkup = [...modal.querySelectorAll("details.health-topic")].map(node => node.innerHTML);
const englishTopicMarkup = [
  `<summary><span class="health-icon">🍽️</span><div><h3>Balanced nutrition</h3><p>Food groups, examples, and how they support your body.</p></div><span class="health-chevron">⌄</span></summary>
   <div class="health-topic-body">
    <article><h4>🥚 Protein</h4><p><b>Examples:</b> Eggs, fish, chicken, milk and yogurt, lentils, chickpeas, and beans.</p><p><b>Benefits:</b> Supports muscle building, tissue repair, growth, and recovery after training.</p></article>
    <article><h4>🍚 Carbohydrates</h4><p><b>Examples:</b> Oats, bread, rice, potatoes, pasta, corn, and fruit.</p><p><b>Benefits:</b> An important source of energy for your brain and muscles during school and exercise.</p></article>
    <article><h4>🥑 Healthy fats</h4><p><b>Examples:</b> Olive oil, nuts, seeds, avocado, and oily fish.</p><p><b>Benefits:</b> Help your body absorb some vitamins and support cells and normal growth.</p></article>
    <article><h4>🥦 Vegetables and fruit</h4><p><b>Examples:</b> Oranges, apples, carrots, tomatoes, spinach, and seasonal vegetables.</p><p><b>Benefits:</b> Provide vitamins, minerals, and fibre that support digestion and general health.</p></article>
    <p class="health-note">Every meal does not need to be perfect. Choose a variety of foods and eat enough regularly; avoid restrictive diets while growing.</p>
   </div>`,
  `<summary><span class="health-icon">💧</span><div><h3>Hydration</h3><p>Your water needs vary with weather, activity, and sweating.</p></div><span class="health-chevron">⌄</span></summary>
   <div class="health-topic-body">
    <article><h4>🚰 How much should I drink?</h4><p>Drink regularly throughout the day and with meals. Take sips before, during, and after exercise. There is no single amount that suits everyone; needs rise in hot weather, with sweating, and during longer activity.</p></article>
    <article><h4>🥤 What should I choose?</h4><p>Make water your main drink. Limit sugary soft drinks and energy drinks, which often contain lots of sugar; caffeine in energy drinks can also harm teenagers’ sleep.</p></article>
    <article><h4>⚠️ Be careful</h4><p>Do not force yourself to drink many litres quickly. Drink according to thirst and conditions. During long exercise or extreme heat, rest somewhere cool and tell a trusted adult if you feel dizzy.</p></article>
   </div>`,
  `<summary><span class="health-icon">🌙</span><div><h3>Sleep and recovery</h3><p>Rest is part of training, not wasted time.</p></div><span class="health-chevron">⌄</span></summary>
   <div class="health-topic-body">
    <article><h4>😴 Sleep</h4><p>Most teenagers need 8–10 hours of sleep each night. Try to keep a regular bedtime, and put your phone away before bed if it distracts you.</p><p><b>Benefits:</b> Sleep supports focus, learning, mood, and physical recovery.</p></article>
    <article><h4>🧘 Rest between sessions</h4><p>Alternate training days with rest or light activity, and reduce effort if you are exhausted or ill.</p><p><b>Benefits:</b> Gives your body time to recover and helps you continue safely.</p></article>
   </div>`,
  `<summary><span class="health-icon">🥊</span><div><h3>Safer training</h3><p>Build up gradually and focus on technique before speed.</p></div><span class="health-chevron">⌄</span></summary>
   <div class="health-topic-body">
    <article><h4>🔥 Before training</h4><p>Warm up gently, check that the space around you is clear, and place your phone away from your movement path.</p><p><b>Benefit:</b> A gradual warm-up helps prepare your body for movement.</p></article>
    <article><h4>🛡️ During training</h4><p>Keep your wrist straight when shadowboxing, and never punch a wall or hard surface. Increase duration and speed gradually.</p></article>
    <article><h4>🛑 When should I stop?</h4><p>Stop if you feel pain, dizziness, or unusual shortness of breath. Tell a trusted adult if symptoms continue or worry you.</p></article>
   </div>`
];
let lastReview = null;

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
  if (bodyCard) healthMenuView.appendChild(bodyCard);
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
    button.dataset.healthTarget = item.id;
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
  [...modal.querySelectorAll("details.health-topic")].forEach((node, i) => {
    node.innerHTML = lang === "en" ? englishTopicMarkup[i] : originalTopicMarkup[i];
  });
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
  healthDetailViews.forEach((page) => {
    const heading = page.querySelector(".health-detail-heading h3");
    const sourceTitle = page.querySelector(".health-card-title h3, .health-topic summary h3");
    if (heading && sourceTitle) heading.textContent = sourceTitle.textContent;
  });
  modal.querySelectorAll(".health-menu-item").forEach((button) => {
    const page = healthDetailViews.get(button.dataset.healthTarget);
    const title = page?.querySelector(".health-card-title h3, .health-topic summary h3");
    const description = page?.querySelector(".health-card-title p, .health-topic summary p");
    if (title) button.querySelector("b").textContent = title.textContent;
    if (description) button.querySelector("small").textContent = description.textContent;
  });
  modal.querySelector(".health-footer-note").textContent = t.footer;
  closeButton.setAttribute("aria-label",t.back);
  openButton.querySelector("b").textContent=t.navTitle;
  openButton.querySelector("small").textContent=t.navSub;
  if (!lastReview) {
    result.textContent = t.demo;
  } else {
    result.textContent = lastReview.valid ? t.summary(lastReview.bmi, lastReview.age) : t.invalid;
  }
}
function reviewMeasurements() {
  const lang = languageSelect?.value === "en" ? "en" : "ar";
  const t = copy[lang];
  const age = Number(ageInput.value), height = Number(heightInput.value), weight = Number(weightInput.value);
  const valid = ageInput.value.trim() !== "" && heightInput.value.trim() !== "" && weightInput.value.trim() !== ""
    && Number.isFinite(age) && Number.isFinite(height) && Number.isFinite(weight)
    && age >= 10 && age <= 19 && height >= 80 && height <= 230 && weight >= 10 && weight <= 250;
  result.dataset.reviewed = "true";
  if (!valid) {
    lastReview = { valid: false };
    result.textContent = t.invalid;
    return;
  }
  const bmi = weight / ((height / 100) ** 2);
  lastReview = { valid: true, bmi: bmi.toFixed(1), age };
  result.textContent = t.summary(lastReview.bmi, age);
}
openButton.addEventListener("click", () => { setupHealthNavigation(); applyLanguage(); showHealthMenu(); modal.hidden = false; closeButton.focus(); });
closeButton.addEventListener("click", goBackHealth);
reviewButton.addEventListener("click", reviewMeasurements);
languageSelect?.addEventListener("change", applyLanguage);
modal.addEventListener("click", event => { if (event.target === modal) goBackHealth(); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && !modal.hidden) goBackHealth(); });
setupHealthNavigation();
applyLanguage();
