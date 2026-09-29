import assert from "node:assert/strict";
import { test } from "node:test";
import { birthdaysInMonth, normalizeBirthDate } from "./birthdays.js";

test("normalizes dates without changing their calendar day and rejects invalid dates", () => {
  assert.equal(normalizeBirthDate("2000-02-29T00:00:00.000Z"), "2000-02-29");
  for (const value of [null, undefined, "", "2001-02-29", "2000-13-01", "2000-04-31"]) {
    assert.equal(normalizeBirthDate(value), "");
  }
});

test("filters by birth month, includes leap day and sorts by day then name", () => {
  const participants = [
    { name: "Zoe", birthDate: "2000-02-29" },
    { name: "Bia", birthDate: "1990-02-01" },
    { name: "Ana", birthDate: "1999-02-01" },
    { name: "Dez", birthDate: "1990-12-01" },
    { name: "Sem data" }
  ];
  assert.deepEqual(birthdaysInMonth(participants, 2).map(p => p.name), ["Ana", "Bia", "Zoe"]);
  assert.deepEqual(birthdaysInMonth(participants, 1), []);
  assert.deepEqual(birthdaysInMonth(participants, 12).map(p => p.name), ["Dez"]);
  assert.equal(participants[0].name, "Zoe");
});
