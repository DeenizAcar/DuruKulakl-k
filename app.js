import { headphoneCatalog } from "./data/catalog.js";

const apiPath = "/api/headphones";
const cacheKey = "headphone-comparisons-cache";

const state = {
  entries: [],
  leftId: headphoneCatalog[0]?.id || "",
  rightId: headphoneCatalog[1]?.id || headphoneCatalog[0]?.id || "",
  activeColors: new Map(),
};

const specLabels = [
  ["driver", "Sürücü"],
  ["connection", "Bağlantı"],
  ["battery", "Pil"],
  ["noiseCancelling", "Ses yalıtımı"],
  ["microphone", "Mikrofon"],
  ["latency", "Gecikme"],
  ["weight", "Ağırlık"],
  ["codec", "Codec"],
];

const elements = {
  catalogCount: document.getElementById("catalog-count"),
  entryCount: document.getElementById("entry-count"),
  leftSlot: document.getElementById("left-slot"),
  rightSlot: document.getElementById("right-slot"),
  comparisonGrid: document.getElementById("comparison-grid"),
  entryGrid: document.getElementById("entry-grid"),
  refreshData: document.getElementById("refresh-data"),
  openAddModal: document.getElementById("open-add-modal"),
  focusCompare: document.getElementById("focus-compare"),
  addModal: document.getElementById("add-modal"),
  addForm: document.getElementById("add-form"),
  closeModal: document.getElementById("close-modal"),
  cancelAdd: document.getElementById("cancel-add"),
  modelSelect: document.getElementById("model-select"),
  priceInput: document.getElementById("price-input"),
  noteInput: document.getElementById("note-input"),
  addColorRow: document.getElementById("add-color-row"),
  colorRows: document.getElementById("color-rows"),
};

function formatPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "Fiyat yok";
  }

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getCatalogItem(modelId) {
  return headphoneCatalog.find((item) => item.id === modelId) || null;
}

function getMergedEntriesForModel(modelId) {
  return state.entries.filter((entry) => entry.modelId === modelId);
}

function getLatestEntryForModel(modelId) {
  return getMergedEntriesForModel(modelId)[0] || null;
}

function getActiveColorIndex(entryId) {
  return state.activeColors.get(entryId) ?? 0;
}

function getImageForEntry(entry) {
  if (!entry || !Array.isArray(entry.colors) || entry.colors.length === 0) {
    return "";
  }

  const activeIndex = getActiveColorIndex(entry.id);
  return entry.colors[activeIndex]?.image || entry.colors[0]?.image || "";
}

function getColorNameForEntry(entry) {
  if (!entry || !Array.isArray(entry.colors) || entry.colors.length === 0) {
    return "Renk yok";
  }

  const activeIndex = getActiveColorIndex(entry.id);
  return entry.colors[activeIndex]?.name || entry.colors[0]?.name || "Renk yok";
}

function getCompareGroup(modelId) {
  const catalogItem = getCatalogItem(modelId);
  if (!catalogItem) {
    return null;
  }

  return {
    ...catalogItem,
    savedEntries: getMergedEntriesForModel(modelId),
  };
}

function ensureSelectionFallback() {
  if (!getCatalogItem(state.leftId)) {
    state.leftId = headphoneCatalog[0]?.id || "";
  }

  if (!getCatalogItem(state.rightId)) {
    state.rightId = headphoneCatalog[1]?.id || headphoneCatalog[0]?.id || "";
  }

  if (state.leftId === state.rightId && headphoneCatalog.length > 1) {
    state.rightId = headphoneCatalog.find((item) => item.id !== state.leftId)?.id || state.leftId;
  }
}

function renderModelSelect() {
  const currentValue = elements.modelSelect.value || headphoneCatalog[0]?.id || "";
  elements.modelSelect.innerHTML = headphoneCatalog
    .map((item) => `<option value="${item.id}">${escapeHtml(item.name)} · ${escapeHtml(item.brand)}</option>`)
    .join("");
  elements.modelSelect.value = currentValue;
}

function createColorRow(name = "", image = "") {
  const row = document.createElement("div");
  row.className = "color-row";
  row.innerHTML = `
    <label class="file-label">
      Renk adı
      <input type="text" class="color-name" maxlength="32" placeholder="Siyah" value="${escapeHtml(name)}" required />
    </label>
    <label class="file-label">
      Resim yükle
      <input type="file" class="color-file" accept="image/*" required />
    </label>
    <img class="color-preview" alt="Renk önizleme" ${image ? `src="${image}"` : "style=\"display:none\""} />
    <button class="remove-row" type="button" aria-label="Rengi kaldır">×</button>
  `;

  const preview = row.querySelector(".color-preview");
  const fileInput = row.querySelector(".color-file");
  const removeButton = row.querySelector(".remove-row");

  if (image) {
    fileInput.dataset.preview = image;
  }

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) {
      preview.removeAttribute("src");
      preview.style.display = "none";
      fileInput.dataset.preview = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      fileInput.value = "";
      alert("Sadece resim dosyası yükle.");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    preview.src = dataUrl;
    preview.style.display = "block";
    fileInput.dataset.preview = dataUrl;
  });

  removeButton.addEventListener("click", () => {
    if (elements.colorRows.children.length === 1) {
      alert("En az bir renk satırı kalmalı.");
      return;
    }

    row.remove();
  });

  return row;
}

function seedColorRows() {
  const model = getCatalogItem(elements.modelSelect.value) || headphoneCatalog[0];
  elements.colorRows.innerHTML = "";
  elements.colorRows.append(createColorRow(model?.colorHints?.[0] || "Standart"));
}

function syncSlotSelects() {
  const options = headphoneCatalog
    .map((item) => `<option value="${item.id}">${escapeHtml(item.name)} · ${formatPrice(item.priceHint)}</option>`)
    .join("");

  elements.leftSlot.innerHTML = options;
  elements.rightSlot.innerHTML = options;
  elements.leftSlot.value = state.leftId;
  elements.rightSlot.value = state.rightId;
}

function renderComparisonCard(modelId, slotName) {
  const group = getCompareGroup(modelId);
  if (!group) {
    return `
      <article class="compare-card placeholder-card">
        <p class="section-kicker">${slotName} slot</p>
        <h3>Model seç</h3>
        <p class="muted">Karşılaştırmak için bir model seç.</p>
      </article>
    `;
  }

  const latestEntry = getLatestEntryForModel(modelId);
  const image = latestEntry ? getImageForEntry(latestEntry) : group.variants?.[0]?.image || "";
  const colorLabel = latestEntry ? getColorNameForEntry(latestEntry) : group.variants?.[0]?.colorName || "Gömülü renk";
  const priceLabel = latestEntry ? formatPrice(latestEntry.price) : formatPrice(group.variants?.[0]?.price || group.priceHint);
  const specs = group.specs || {};

  return `
    <article class="compare-card">
      <div class="compare-head">
        <div class="compare-title">
          <p class="section-kicker">${slotName} slot</p>
          <h3>${escapeHtml(group.name)}</h3>
          <p class="muted">${escapeHtml(group.brand)} · ${priceLabel}</p>
        </div>
        ${image ? `<img src="${image}" alt="${escapeHtml(group.name)}" />` : `<div class="stat-card"><strong>PNG</strong><span>yüklenmedi</span></div>`}
      </div>
      <div class="badges" style="margin-top:14px">
        <span class="badge">${escapeHtml(colorLabel)}</span>
        <span class="badge">${escapeHtml(group.savedEntries.length)} kayıt</span>
        ${latestEntry?.note ? `<span class="badge">${escapeHtml(latestEntry.note)}</span>` : ""}
      </div>
      <ul class="spec-list">
        ${specLabels
          .map(([key, label]) => `<li><span>${escapeHtml(label)}</span><strong>${escapeHtml(specs[key] || "-")}</strong></li>`)
          .join("")}
      </ul>
    </article>
  `;
}

function renderComparison() {
  elements.comparisonGrid.innerHTML = [state.leftId, state.rightId]
    .map((modelId, index) => renderComparisonCard(modelId, index === 0 ? "Sol" : "Sağ"))
    .join("");
}

function renderEntries() {
  if (state.entries.length === 0) {
    elements.entryGrid.innerHTML = `
      <article class="compare-card placeholder-card" style="grid-column:1/-1">
        <p class="section-kicker">Kayıt yok</p>
        <h3>Henüz ortak kayıt yok</h3>
        <p class="muted">Kulaklık ekle butonuyla ilk kayıtları oluştur.</p>
      </article>
    `;
    return;
  }

  elements.entryGrid.innerHTML = state.entries
    .map((entry) => {
      const model = getCatalogItem(entry.modelId);
      const image = getImageForEntry(entry);
      const colorName = getColorNameForEntry(entry);
      const activeIndex = getActiveColorIndex(entry.id);
      const colors = Array.isArray(entry.colors) ? entry.colors : [];

      return `
        <article class="entry-card">
          <div class="entry-head">
            <div class="entry-title">
              <p class="section-kicker">${escapeHtml(model?.brand || entry.brand || "Kayıt")}</p>
              <h3>${escapeHtml(entry.modelName)}</h3>
              <p class="muted">${formatPrice(entry.price)} · ${escapeHtml(colorName)}</p>
            </div>
            ${image ? `<img src="${image}" alt="${escapeHtml(entry.modelName)}" />` : `<div class="stat-card"><strong>PNG</strong><span>yok</span></div>`}
          </div>
          <div class="badges" style="margin-top:14px">
            ${colors.map((color, index) => `<button class="swatch ${index === activeIndex ? "is-active" : ""}" data-entry-id="${entry.id}" data-color-index="${index}" type="button"><span class="swatch-dot"></span>${escapeHtml(color.name)}</button>`).join("")}
          </div>
          <p class="muted" style="margin-top:14px">${escapeHtml(entry.note || model?.description || "Karşılaştırma notu yok")}</p>
          <div class="entry-actions">
            <button class="secondary-button pin-left" data-pin-left="${entry.modelId}" type="button">Sola al</button>
            <button class="secondary-button pin-right" data-pin-right="${entry.modelId}" type="button">Sağa al</button>
          </div>
        </article>
      `;
    })
    .join("");

  elements.entryGrid.querySelectorAll("[data-entry-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const entryId = button.getAttribute("data-entry-id");
      const colorIndex = Number(button.getAttribute("data-color-index") || 0);
      state.activeColors.set(entryId, colorIndex);
      renderEntries();
      renderComparison();
    });
  });

  elements.entryGrid.querySelectorAll("[data-pin-left]").forEach((button) => {
    button.addEventListener("click", () => {
      state.leftId = button.getAttribute("data-pin-left") || state.leftId;
      syncSlotSelects();
      renderComparison();
    });
  });

  elements.entryGrid.querySelectorAll("[data-pin-right]").forEach((button) => {
    button.addEventListener("click", () => {
      state.rightId = button.getAttribute("data-pin-right") || state.rightId;
      syncSlotSelects();
      renderComparison();
    });
  });
}

function renderStats() {
  elements.catalogCount.textContent = String(headphoneCatalog.length);
  elements.entryCount.textContent = String(state.entries.length);
}

function renderAll() {
  ensureSelectionFallback();
  renderStats();
  renderModelSelect();
  syncSlotSelects();
  renderComparison();
  renderEntries();
}

async function loadEntries() {
  try {
    const response = await fetch(apiPath, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    state.entries = Array.isArray(data.entries) ? data.entries : [];
    window.localStorage.setItem(cacheKey, JSON.stringify(state.entries));
  } catch {
    const cached = window.localStorage.getItem(cacheKey);
    state.entries = cached ? JSON.parse(cached) : [];
  }

  state.entries.forEach((entry) => {
    if (!state.activeColors.has(entry.id)) {
      state.activeColors.set(entry.id, 0);
    }
  });

  renderAll();
}

function openModal() {
  seedColorRows();
  elements.addModal.showModal();
}

function closeModal() {
  elements.addModal.close();
}

function wireEvents() {
  elements.openAddModal.addEventListener("click", openModal);
  elements.focusCompare.addEventListener("click", () => {
    document.querySelector(".compare-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  elements.closeModal.addEventListener("click", closeModal);
  elements.cancelAdd.addEventListener("click", closeModal);
  elements.refreshData.addEventListener("click", loadEntries);
  elements.leftSlot.addEventListener("change", () => {
    state.leftId = elements.leftSlot.value;
    renderComparison();
  });
  elements.rightSlot.addEventListener("change", () => {
    state.rightId = elements.rightSlot.value;
    renderComparison();
  });
  elements.modelSelect.addEventListener("change", () => {
    const model = getCatalogItem(elements.modelSelect.value);
    if (!model) {
      return;
    }

    if (!elements.priceInput.value) {
      elements.priceInput.value = String(model.priceHint || "");
    }

    if (elements.colorRows.children.length === 1) {
      const row = elements.colorRows.firstElementChild;
      const nameInput = row?.querySelector(".color-name");
      if (nameInput && !nameInput.value) {
        nameInput.value = model.colorHints?.[0] || "Standart";
      }
    }
  });
  elements.addColorRow.addEventListener("click", () => {
    elements.colorRows.append(createColorRow(""));
  });
  elements.addForm.addEventListener("submit", submitForm);
}

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Resim okunamadı."));
    reader.readAsDataURL(file);
  });
}

async function submitForm(event) {
  event.preventDefault();

  const model = getCatalogItem(elements.modelSelect.value);
  if (!model) {
    alert("Lütfen bir model seç.");
    return;
  }

  const colorRows = Array.from(elements.colorRows.querySelectorAll(".color-row"));
  const colors = [];

  for (const row of colorRows) {
    const name = row.querySelector(".color-name")?.value.trim();
    const fileInput = row.querySelector(".color-file");
    const image = fileInput?.dataset.preview || "";

    if (!name) {
      alert("Renk adı boş olamaz.");
      return;
    }

    if (!image) {
      alert(`${name} için bir resim yükle.`);
      return;
    }

    colors.push({ name, image });
  }

  const payload = {
    modelId: model.id,
    modelName: model.name,
    brand: model.brand,
    price: Number(elements.priceInput.value),
    note: elements.noteInput.value.trim(),
    colors,
  };

  try {
    const response = await fetch(apiPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Kayıt oluşturulamadı.");
    }

    window.localStorage.setItem(cacheKey, JSON.stringify(data.entries || []));
    state.entries = Array.isArray(data.entries) ? data.entries : [data.entry, ...state.entries];
    state.activeColors.set(data.entry.id, 0);
    state.leftId = data.entry.modelId;
    if (!state.rightId || state.rightId === state.leftId) {
      state.rightId = headphoneCatalog.find((item) => item.id !== state.leftId)?.id || state.leftId;
    }
    renderAll();
    closeModal();
    elements.addForm.reset();
    alert("Kulaklık kaydedildi ve ortak JSON deposuna yazıldı.");
  } catch (error) {
    alert(error instanceof Error ? error.message : "Kayıt yapılamadı.");
  }
}

function init() {
  elements.catalogCount.textContent = String(headphoneCatalog.length);
  elements.modelSelect.innerHTML = headphoneCatalog
    .map((item) => `<option value="${item.id}">${escapeHtml(item.name)} · ${escapeHtml(item.brand)}</option>`)
    .join("");
  elements.modelSelect.value = headphoneCatalog[0]?.id || "";
  seedColorRows();
  wireEvents();
  loadEntries();
}

init();
