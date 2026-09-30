import { test } from "node:test";
import assert from "node:assert/strict";
import { api } from "./api.js";

test("notebook API preserves text and uses the backend CRUD contract", async t => {
  const calls = [];
  const page = { _id: "page-1", title: "", text: "  Primeiro parágrafo\n\nSegundo parágrafo  " };
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    if (options.method === "DELETE") return new Response(null, { status: 204 });
    return Response.json(options.method ? page : [page]);
  });
  assert.deepEqual(await api.notebook.list(), [page]);
  assert.deepEqual(await api.notebook.create({ title: "", text: "" }), page);
  assert.deepEqual(await api.notebook.update(page._id, { title: page.title, text: page.text }), page);
  assert.equal(await api.notebook.remove(page._id), null);
  assert.deepEqual(calls.map(c => [c.url, c.options.method || "GET"]), [
    ["http://localhost:3001/api/notebook/pages", "GET"],
    ["http://localhost:3001/api/notebook/pages", "POST"],
    ["http://localhost:3001/api/notebook/pages/page-1", "PATCH"],
    ["http://localhost:3001/api/notebook/pages/page-1", "DELETE"]
  ]);
  assert.deepEqual(JSON.parse(calls[1].options.body), { title: "", text: "" });
  assert.equal(JSON.parse(calls[2].options.body).text, page.text);
});

test("notebook API propagates server and connection errors instead of claiming success", async t => {
  const mocked = t.mock.method(globalThis, "fetch", async () => Response.json({ message: "Página não encontrada" }, { status: 404 }));
  await assert.rejects(api.notebook.update("missing", { text: "Rascunho" }), /Página não encontrada/);
  await assert.rejects(api.notebook.remove("missing"), /Página não encontrada/);
  mocked.mock.mockImplementation(async () => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(api.notebook.list(), /Failed to fetch/);
});
