import assert from "node:assert/strict"
import { test } from "node:test"

import { initials, stripHtml } from "./format.ts"

test("initials", () => {
  assert.equal(initials("Budi Santoso"), "BS")
  assert.equal(initials("Admin"), "A")
  assert.equal(initials(""), "?")
})

test("stripHtml", () => {
  assert.equal(stripHtml("<p>Halo <strong>dunia</strong>!</p>"), "Halo dunia!")
  assert.equal(stripHtml("Tanpa tag"), "Tanpa tag")
})
