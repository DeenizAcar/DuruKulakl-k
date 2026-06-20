import { headphoneCatalog } from "./data/catalog.js";

const apiPath = "/api/headphones";

const elements = {
  openAddModal: document.getElementById("open-add-modal"),
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

function renderModelSelect() {
  elements.modelSelect.innerHTML = headphoneCatalog
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} · ${escapeHtml(item.brand)}</option>`)
    .join("");

  elements.modelSelect.value = headphoneCatalog[0]?.id || "";
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
    <img class="color-preview" alt="Renk önizleme" ${image ? `src="${image}"` : 'style="display:none"'} />
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

function openModal() {
  seedColorRows();
  elements.addModal.showModal();
}

function closeModal() {
  elements.addModal.close();
}

function wireEvents() {
  elements.openAddModal.addEventListener("click", openModal);
  elements.closeModal.addEventListener("click", closeModal);
  elements.cancelAdd.addEventListener("click", closeModal);
  elements.addColorRow.addEventListener("click", () => {
    elements.colorRows.append(createColorRow(""));
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

    closeModal();
    elements.addForm.reset();
    seedColorRows();
    alert("Kulaklık kaydedildi ve ortak JSON deposuna yazıldı.");
  } catch (error) {
    alert(error instanceof Error ? error.message : "Kayıt yapılamadı.");
  }
}

function init() {
  renderModelSelect();
  seedColorRows();
  wireEvents();
}

init();
