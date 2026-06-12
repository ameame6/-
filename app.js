const defaultTags = [
  "休闲",
  "优雅",
  "性感",
  "可爱",
  "通勤",
  "法式",
  "简约",
  "显瘦",
  "复古",
  "甜酷",
  "正式",
  "舒适",
  "高级",
  "少女感",
  "清爽",
  "精致",
  "浪漫",
  "松弛"
];
const categorySlots = ["外套", "上衣", "下装", "连衣裙", "鞋履", "袜子", "配饰", "包袋"];
const storageKey = "today-outfit-state-v1";

const state = JSON.parse(localStorage.getItem(storageKey) || "null") || {
  clothes: [],
  customTags: [],
  selectedImportTags: ["休闲", "舒适"],
  selectedMoodTags: ["显瘦", "优雅"],
  selectedInspirationTags: ["简约", "法式"],
  inspirations: [],
  palette: []
};

let pendingFiles = [];
let unwornOnly = false;
let currentLookDataUrl = "";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  statTotal: $("#statTotal"),
  statUnworn: $("#statUnworn"),
  statLooks: $("#statLooks"),
  moodTags: $("#moodTags"),
  importTags: $("#importTags"),
  inspirationTags: $("#inspirationTags"),
  clothesUpload: $("#clothesUpload"),
  categoryInput: $("#categoryInput"),
  itemNameInput: $("#itemNameInput"),
  customTagInput: $("#customTagInput"),
  warmthInput: $("#warmthInput"),
  formalInput: $("#formalInput"),
  addItemsBtn: $("#addItemsBtn"),
  closetGrid: $("#closetGrid"),
  searchInput: $("#searchInput"),
  filterCategory: $("#filterCategory"),
  unwornToggle: $("#unwornToggle"),
  generateBtn: $("#generateBtn"),
  seedBtn: $("#seedBtn"),
  recommendation: $("#recommendation"),
  occasionInput: $("#occasionInput"),
  tempInput: $("#tempInput"),
  weatherInput: $("#weatherInput"),
  needInput: $("#needInput"),
  lookUpload: $("#lookUpload"),
  lookPreview: $("#lookPreview"),
  lookPlaceholder: $("#lookPlaceholder"),
  palette: $("#palette"),
  lookNote: $("#lookNote"),
  saveLookBtn: $("#saveLookBtn")
};

function save() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function allTags() {
  return [...new Set([...defaultTags, ...state.customTags])];
}

function makeTagCloud(container, selectedKey) {
  container.innerHTML = "";
  allTags().forEach((tag) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tag-chip ${state[selectedKey].includes(tag) ? "active" : ""}`;
    button.textContent = tag;
    button.addEventListener("click", () => {
      const selected = state[selectedKey];
      if (selected.includes(tag)) {
        state[selectedKey] = selected.filter((item) => item !== tag);
      } else {
        state[selectedKey] = [...selected, tag];
      }
      save();
      render();
    });
    container.appendChild(button);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function addCustomTag(raw) {
  const tag = raw.trim();
  if (!tag) return;
  if (!state.customTags.includes(tag) && !defaultTags.includes(tag)) {
    state.customTags.push(tag);
  }
  if (!state.selectedImportTags.includes(tag)) {
    state.selectedImportTags.push(tag);
  }
  els.customTagInput.value = "";
  save();
  render();
}

async function addPendingItems() {
  if (!pendingFiles.length) return;
  const category = els.categoryInput.value;
  const baseName = els.itemNameInput.value.trim();
  const created = await Promise.all(
    pendingFiles.map(async (file, index) => ({
      id: crypto.randomUUID(),
      name: baseName || file.name.replace(/\.[^.]+$/, "") || `${category} ${state.clothes.length + index + 1}`,
      category,
      image: await fileToDataUrl(file),
      tags: [...state.selectedImportTags],
      warmth: Number(els.warmthInput.value),
      formal: Number(els.formalInput.value),
      wearCount: 0,
      lastWorn: "",
      createdAt: new Date().toISOString()
    }))
  );
  state.clothes = [...created, ...state.clothes];
  pendingFiles = [];
  els.clothesUpload.value = "";
  els.itemNameInput.value = "";
  save();
  render();
}

function markWorn(id) {
  const item = state.clothes.find((piece) => piece.id === id);
  if (!item) return;
  item.wearCount += 1;
  item.lastWorn = new Date().toISOString().slice(0, 10);
  save();
  render();
}

function renderCloset() {
  const query = els.searchInput.value.trim().toLowerCase();
  const category = els.filterCategory.value;
  const filtered = state.clothes.filter((item) => {
    const matchesCategory = category === "全部" || item.category === category;
    const haystack = [item.name, item.category, ...item.tags].join(" ").toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesWear = !unwornOnly || item.wearCount === 0;
    return matchesCategory && matchesQuery && matchesWear;
  });

  els.closetGrid.innerHTML = "";
  if (!filtered.length) {
    els.closetGrid.innerHTML = `<div class="empty-state"><p>这里还没有符合条件的衣服。</p></div>`;
    return;
  }

  const template = $("#itemTemplate");
  filtered.forEach((item) => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".clothing-card");
    card.querySelector("img").src = item.image;
    card.querySelector("img").alt = item.name;
    card.querySelector("h3").textContent = item.name;
    card.querySelector(".category-pill").textContent = item.category;
    card.querySelector(".wear-dot").textContent = item.wearCount;
    card.querySelector(".wear-dot").addEventListener("click", () => markWorn(item.id));
    card.querySelector(".wear-text").textContent = item.wearCount
      ? `穿过 ${item.wearCount} 次，最近 ${item.lastWorn}`
      : "还没穿过，值得安排";
    const tags = card.querySelector(".mini-tags");
    item.tags.slice(0, 4).forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "mini-tag";
      chip.textContent = tag;
      tags.appendChild(chip);
    });
    els.closetGrid.appendChild(node);
  });
}

function weatherWarmthTarget(temp, weather) {
  if (weather === "降温" || temp < 8) return 5;
  if (weather === "大风" || temp < 16) return 4;
  if (temp > 29 || weather === "闷热") return 1;
  if (temp > 23) return 2;
  return 3;
}

function formalTarget(occasion) {
  if (["正式会议", "上班通勤"].includes(occasion)) return 4;
  if (occasion === "约会晚餐") return 3;
  return 2;
}

function scoreItem(item, context) {
  const tagScore = item.tags.filter((tag) => context.tags.includes(tag)).length * 7;
  const inspirationScore = item.tags.filter((tag) => context.memoryTags.includes(tag)).length * 4;
  const warmthScore = 8 - Math.abs(item.warmth - context.warmth) * 2;
  const formalScore = 6 - Math.abs(item.formal - context.formal) * 2;
  const freshness = item.wearCount === 0 ? 8 : Math.max(0, 5 - item.wearCount);
  return tagScore + inspirationScore + warmthScore + formalScore + freshness;
}

function bestFor(category, context, exclude = []) {
  return state.clothes
    .filter((item) => item.category === category && !exclude.includes(item.id))
    .map((item) => ({ item, score: scoreItem(item, context) }))
    .sort((a, b) => b.score - a.score)[0]?.item;
}

function generateOutfit() {
  if (!state.clothes.length) {
    renderEmptyRecommendation();
    return;
  }
  const context = {
    occasion: els.occasionInput.value,
    temp: Number(els.tempInput.value),
    weather: els.weatherInput.value,
    need: els.needInput.value,
    tags: [...state.selectedMoodTags],
    memoryTags: [...new Set(state.inspirations.flatMap((look) => look.tags))],
    warmth: weatherWarmthTarget(Number(els.tempInput.value), els.weatherInput.value),
    formal: formalTarget(els.occasionInput.value)
  };

  const selected = [];
  const dress = bestFor("连衣裙", context);
  const top = bestFor("上衣", context, selected.map((item) => item.id));
  const bottom = bestFor("下装", context, selected.map((item) => item.id));

  if (dress && (!top || !bottom || scoreItem(dress, context) > (scoreItem(top, context) + scoreItem(bottom, context)) / 2)) {
    selected.push(dress);
  } else {
    if (top) selected.push(top);
    if (bottom) selected.push(bottom);
  }

  if (context.warmth >= 3 || ["大风", "小雨", "降温"].includes(context.weather)) {
    const outer = bestFor("外套", context, selected.map((item) => item.id));
    if (outer) selected.push(outer);
  }
  ["鞋履", "包袋", "配饰", "袜子"].forEach((category) => {
    const item = bestFor(category, context, selected.map((piece) => piece.id));
    if (item && selected.length < 6) selected.push(item);
  });

  const unworn = selected.filter((item) => item.wearCount === 0).length;
  const memoryText = context.memoryTags.length
    ? `参考你保存过的 ${context.memoryTags.slice(0, 3).join("、")} 风格记忆。`
    : "还没有风格记忆，本次主要按标签和天气做判断。";
  const rituals = getRituals(context, selected);

  els.recommendation.innerHTML = `
    <div class="outfit-result">
      <div class="outfit-slots">
        ${selected
          .map(
            (item) => `
              <div class="outfit-slot">
                <img src="${item.image}" alt="${item.name}">
                <div class="slot-copy">
                  <span>${item.category}</span>
                  <strong>${item.name}</strong>
                </div>
              </div>
            `
          )
          .join("")}
      </div>
      <div class="outfit-note">
        <p class="note-kicker">Today's Ritual</p>
        <h3>${context.occasion}搭配建议</h3>
        <p>今天 ${context.temp}°C，${context.weather}。这套优先满足“${context.need}”，并照顾 ${context.tags.join("、") || "日常"} 的气质表达。</p>
        <p>${memoryText}${unworn ? ` 其中 ${unworn} 件还没穿过，适合把被遗忘的衣服重新带出来。` : " 这套都已有穿着记录，稳定不容易出错。"}</p>
        <div class="ritual-list">
          ${rituals.map((item, index) => `<div><span>${String(index + 1).padStart(2, "0")}</span><p>${item}</p></div>`).join("")}
        </div>
        <div class="outfit-actions">
          <button class="secondary-action full" id="markOutfitBtn" type="button">标记这套今天穿了</button>
        </div>
      </div>
    </div>
  `;
  $("#markOutfitBtn").addEventListener("click", () => {
    selected.forEach((item) => markWorn(item.id));
    generateOutfit();
  });
}

function getRituals(context, selected) {
  const hasAccessory = selected.some((item) => ["配饰", "包袋"].includes(item.category));
  const hasDress = selected.some((item) => item.category === "连衣裙");
  const tone = context.tags.includes("可爱") || context.tags.includes("少女感") ? "用腮红或发饰呼应衣服里最轻盈的颜色" : "把口红、包袋或鞋履保持在同一明度里";
  const weather = ["小雨", "大风", "降温"].includes(context.weather)
    ? "出门前确认外套、伞和包容量，精致也要稳妥"
    : "出门前在自然光下看一次整体比例";
  return [
    hasDress ? "连衣裙已经是主角，配饰只留一处闪光点" : "上装塞一点衣角，先把腰线整理出来",
    hasAccessory ? "最后戴上配饰再照镜子，决定今天的视觉焦点" : "补一个小配饰，哪怕是一枚耳钉也会更完整",
    tone,
    weather
  ];
}

function renderEmptyRecommendation() {
  els.recommendation.innerHTML = `
    <div class="empty-state">
      <span class="empty-icon">+</span>
      <p>先添加几件衣服，或者直接使用示例衣柜，开启今天的穿搭仪式。</p>
      <button id="seedBtn" type="button">载入示例衣柜</button>
    </div>
  `;
  $("#seedBtn").addEventListener("click", seedWardrobe);
}

function getImagePalette(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 80;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      const buckets = new Map();
      for (let i = 0; i < data.length; i += 16) {
        const r = Math.round(data[i] / 32) * 32;
        const g = Math.round(data[i + 1] / 32) * 32;
        const b = Math.round(data[i + 2] / 32) * 32;
        const alpha = data[i + 3];
        if (alpha < 120) continue;
        const key = `${r},${g},${b}`;
        buckets.set(key, (buckets.get(key) || 0) + 1);
      }
      const colors = [...buckets.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([key]) => `rgb(${key})`);
      resolve(colors);
    };
    img.src = dataUrl;
  });
}

function renderPalette(colors) {
  els.palette.innerHTML = "";
  colors.forEach((color) => {
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = color;
    swatch.title = color;
    els.palette.appendChild(swatch);
  });
}

async function handleLookUpload(file) {
  currentLookDataUrl = await fileToDataUrl(file);
  els.lookPreview.src = currentLookDataUrl;
  els.lookPreview.parentElement.classList.add("has-image");
  state.palette = await getImagePalette(currentLookDataUrl);
  renderPalette(state.palette);
}

function saveLook() {
  if (!currentLookDataUrl && !state.palette.length) return;
  state.inspirations.unshift({
    id: crypto.randomUUID(),
    image: currentLookDataUrl,
    tags: [...state.selectedInspirationTags],
    note: els.lookNote.value.trim(),
    palette: [...state.palette],
    createdAt: new Date().toISOString()
  });
  els.lookNote.value = "";
  save();
  render();
}

function seedWardrobe() {
  const samples = [
    ["奶油白短针织", "上衣", ["法式", "优雅", "显瘦", "少女感"], 2, 3, "#f3ede1", "#c9b9a1"],
    ["黑色高腰西裤", "下装", ["通勤", "简约", "显瘦"], 2, 4, "#222426", "#5d6262"],
    ["雾蓝衬衫", "上衣", ["通勤", "清爽", "舒适"], 2, 3, "#9db4c8", "#eef3f4"],
    ["灰色廓形西装", "外套", ["正式", "通勤", "高级"], 4, 5, "#6e7377", "#d5d6d2"],
    ["酒红吊带裙", "连衣裙", ["性感", "浪漫", "复古"], 2, 3, "#8d2f3f", "#d9a0a5"],
    ["银色耳饰", "配饰", ["精致", "优雅", "约会"], 1, 3, "#c8ced0", "#f7f7f4"],
    ["玛丽珍单鞋", "鞋履", ["可爱", "复古", "舒适"], 2, 3, "#2a2321", "#dbc7b5"],
    ["细闪短袜", "袜子", ["可爱", "精致"], 1, 2, "#f6f1ed", "#c7a2a9"],
    ["小号腋下包", "包袋", ["法式", "复古", "通勤"], 1, 3, "#704c3c", "#d6bd9d"]
  ];
  state.clothes = [
    ...samples.map(([name, category, tags, warmth, formal, colorA, colorB], index) => ({
      id: crypto.randomUUID(),
      name,
      category,
      tags,
      warmth,
      formal,
      wearCount: index % 3 === 0 ? 0 : index % 2,
      lastWorn: index % 3 === 0 ? "" : "2026-06-02",
      image: makeSampleImage(name, category, colorA, colorB),
      createdAt: new Date().toISOString()
    })),
    ...state.clothes
  ];
  save();
  render();
  generateOutfit();
}

function makeSampleImage(name, category, colorA, colorB) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 800">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="${colorA}" offset="0"/>
          <stop stop-color="${colorB}" offset="1"/>
        </linearGradient>
      </defs>
      <rect width="640" height="800" fill="#f8f7f2"/>
      <rect x="70" y="80" width="500" height="640" rx="38" fill="url(#g)"/>
      <circle cx="476" cy="178" r="54" fill="rgba(255,255,255,.28)"/>
      <path d="M178 492c84-130 200-141 286-34 36 45 54 105 54 181H125c0-58 17-107 53-147Z" fill="rgba(255,255,255,.34)"/>
      <text x="320" y="690" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="rgba(31,37,40,.78)">${category}</text>
      <text x="320" y="734" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="rgba(31,37,40,.62)">${name}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function renderStats() {
  els.statTotal.textContent = state.clothes.length;
  els.statUnworn.textContent = state.clothes.filter((item) => item.wearCount === 0).length;
  els.statLooks.textContent = state.inspirations.length;
}

function render() {
  makeTagCloud(els.moodTags, "selectedMoodTags");
  makeTagCloud(els.importTags, "selectedImportTags");
  makeTagCloud(els.inspirationTags, "selectedInspirationTags");
  renderStats();
  renderCloset();
  renderPalette(state.palette);
}

els.customTagInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addCustomTag(event.currentTarget.value);
  }
});

els.clothesUpload.addEventListener("change", (event) => {
  pendingFiles = [...event.target.files];
});

els.addItemsBtn.addEventListener("click", addPendingItems);
els.searchInput.addEventListener("input", renderCloset);
els.filterCategory.addEventListener("change", renderCloset);
els.unwornToggle.addEventListener("click", () => {
  unwornOnly = !unwornOnly;
  els.unwornToggle.classList.toggle("active", unwornOnly);
  renderCloset();
});
els.generateBtn.addEventListener("click", generateOutfit);
els.seedBtn.addEventListener("click", seedWardrobe);
els.lookUpload.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) handleLookUpload(file);
});
els.saveLookBtn.addEventListener("click", saveLook);

render();
if (!state.clothes.length) renderEmptyRecommendation();
