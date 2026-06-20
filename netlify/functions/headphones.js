import { getStore } from "@netlify/blobs";

const STORE_NAME = "headphone-comparisons";
const STORE_KEY = "entries";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function normalizeEntry(entry) {
  return {
    id: entry.id,
    modelId: entry.modelId,
    modelName: entry.modelName,
    brand: entry.brand,
    price: Number(entry.price) || 0,
    note: entry.note || "",
    colors: Array.isArray(entry.colors) ? entry.colors : [],
    createdAt: entry.createdAt || new Date().toISOString(),
  };
}

async function readEntries() {
  const store = getStore(STORE_NAME);
  const items = await store.get(STORE_KEY, { type: "json" });
  return Array.isArray(items) ? items : [];
}

async function writeEntries(entries) {
  const store = getStore(STORE_NAME);
  await store.setJSON(STORE_KEY, entries);
}

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    if (request.method === "GET") {
      const entries = await readEntries();
      return jsonResponse({ entries });
    }

    if (request.method === "POST") {
      const payload = await request.json();
      const normalized = normalizeEntry({
        id: crypto.randomUUID(),
        modelId: String(payload.modelId || "").trim(),
        modelName: String(payload.modelName || "").trim(),
        brand: String(payload.brand || "").trim(),
        price: Number(payload.price),
        note: String(payload.note || "").trim(),
        colors: Array.isArray(payload.colors) ? payload.colors : [],
        createdAt: new Date().toISOString(),
      });

      if (!normalized.modelId || !normalized.modelName) {
        return jsonResponse({ error: "Model seçimi zorunlu." }, 400);
      }

      if (!Number.isFinite(normalized.price) || normalized.price < 0) {
        return jsonResponse({ error: "Geçerli bir fiyat gir." }, 400);
      }

      if (normalized.colors.length === 0) {
        return jsonResponse({ error: "En az bir renk varyantı ekle." }, 400);
      }

      const currentEntries = await readEntries();
      const nextEntries = [normalized, ...currentEntries].slice(0, 50);
      await writeEntries(nextEntries);

      return jsonResponse({ entry: normalized, entries: nextEntries }, 201);
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    return jsonResponse(
      {
        error: "Sunucu kulaklık kaydını işleyemedi.",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
}

export const config = {
  path: "/api/headphones",
};
