import { test } from "node:test";
import assert from "node:assert/strict";
import { api } from "./api.js";

test("login sends credentials to the backend and propagates rejected credentials", async t => {
  const credentials = { email: "test@example.com", password: "test-password" };
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "http://localhost:3001/api/auth/login");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), credentials);
    return Response.json({ message: "Credenciais inválidas" }, { status: 401 });
  });
  await assert.rejects(api.login(credentials), /Credenciais inválidas/);
});

test("HTML returned by a wrong API URL is not treated as successful login", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response("<!doctype html><html></html>"));
  await assert.rejects(api.login({}), /Resposta inválida.*auth\/login/);
});

test("connection failures identify the backend URL", async t => {
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(api.login({}), /Não foi possível conectar.*localhost:3001\/api/);
});
