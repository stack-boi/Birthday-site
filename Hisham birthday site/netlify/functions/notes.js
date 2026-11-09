/* Shared sleeve notes for the Netlify deployment.
 *
 * Storage: Netlify Blobs (one JSON blob per note, so simultaneous writes do
 * not overwrite each other). The store is created automatically on first use.
 *
 * GET    /api/notes  -> { notes: [...] }
 * POST   /api/notes  -> { note: {...} }   body: { id?, text, author?, owner }
 * DELETE /api/notes  -> { ok: true }      body: { id, owner }
 */

const { randomUUID } = require("crypto");
const { connectLambda, getStore } = require("@netlify/blobs");

const STORE_NAME = "hisham-sleeve-notes";
const PREFIX = "note/";
const MAX_NOTES = 150;
const MAX_TEXT = 220;
const MAX_AUTHOR = 24;
const MAX_BODY = 8000;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = 6;

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    },
    body: JSON.stringify(body)
  };
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLength);
}

function cleanOwner(value) {
  if (typeof value !== "string") return "";
  const owner = value.trim();
  return /^[a-zA-Z0-9-]{8,64}$/.test(owner) ? owner : "";
}

function cleanId(value) {
  if (typeof value !== "string") return "";
  return /^[a-z0-9-]{6,40}$/i.test(value) ? value : "";
}

function publicNote(note, requester) {
  return {
    id: note.id,
    text: note.text,
    author: note.author || "",
    ts: note.ts,
    canDelete: Boolean(requester && note.owner === requester)
  };
}

async function readNotes(store) {
  const { blobs } = await store.list({ prefix: PREFIX });
  if (!blobs.length) return [];

  const notes = await Promise.all(
    blobs.map(async (blob) => {
      try {
        return await store.get(blob.key, { type: "json", consistency: "strong" });
      } catch (error) {
        return null;
      }
    })
  );

  return notes
    .filter((note) => note && typeof note.text === "string" && note.text.trim())
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .slice(0, MAX_NOTES);
}

exports.handler = async (event) => {
  try {
    connectLambda(event);
    const store = getStore({ name: STORE_NAME, consistency: "strong" });
    const requester = cleanOwner(event.headers["x-note-owner"] || event.headers["X-Note-Owner"]);
    const method = event.httpMethod;

    if (method === "OPTIONS") {
      return response(204, {});
    }

    if (method === "GET") {
      const notes = await readNotes(store);
      return response(200, { notes: notes.map((note) => publicNote(note, requester)) });
    }

    if (method === "POST") {
      if (typeof event.body !== "string" || event.body.length > MAX_BODY) {
        return response(413, { error: "That note is a little too heavy for the sleeve." });
      }

      let payload;
      try {
        payload = JSON.parse(event.body || "{}");
      } catch (error) {
        return response(400, { error: "Could not read that note." });
      }

      const text = cleanText(payload.text, MAX_TEXT);
      const author = cleanText(payload.author, MAX_AUTHOR);
      const owner = cleanOwner(payload.owner) || requester;

      if (!text) return response(400, { error: "Write something first." });
      if (!owner) return response(400, { error: "Missing note owner." });

      const id = cleanId(payload.id) || randomUUID();
      const key = PREFIX + id;

      const existing = await store.get(key, { type: "json", consistency: "strong" });
      if (existing) {
        if (existing.owner !== owner) {
          return response(409, { error: "That note id is already taken." });
        }
        return response(200, { note: publicNote(existing, owner) });
      }

      const notes = await readNotes(store);
      if (notes.length >= MAX_NOTES) {
        return response(429, { error: "The sleeve is full — the record is already packed." });
      }

      const recentFromOwner = notes.filter(
        (note) => note.owner === owner && Number(note.ts) > Date.now() - RATE_WINDOW_MS
      ).length;
      if (recentFromOwner >= RATE_LIMIT) {
        return response(429, { error: "Easy there — give the sleeve a minute." });
      }

      const note = {
        id,
        text,
        author,
        owner,
        ts: Date.now()
      };

      await store.setJSON(key, note);
      return response(201, { note: publicNote(note, owner) });
    }

    if (method === "DELETE") {
      let payload;
      try {
        payload = JSON.parse(event.body || "{}");
      } catch (error) {
        return response(400, { error: "Could not read that request." });
      }

      const id = cleanId(payload.id);
      const owner = cleanOwner(payload.owner) || requester;
      if (!id || !owner) return response(400, { error: "Missing note id or owner." });

      const key = PREFIX + id;
      const note = await store.get(key, { type: "json", consistency: "strong" });
      if (!note) return response(404, { error: "That note is already gone." });
      if (note.owner !== owner) return response(403, { error: "Only the author can remove this note." });

      await store.delete(key);
      return response(200, { ok: true });
    }

    return response(405, { error: "Method not allowed." });
  } catch (error) {
    console.error("Sleeve notes function failed:", error);
    return response(500, { error: "The sleeve is temporarily unavailable. Your note is safe on this device." });
  }
};
