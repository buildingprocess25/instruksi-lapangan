import assert from "node:assert/strict"
import { test } from "node:test"

import { slugify, toUsername, withSuffix } from "./slug.ts"

test("slugify", () => {
  assert.equal(slugify("  Ekonomi Indonésia: Naik 5%!  "), "ekonomi-indonesia-naik-5")
  assert.equal(slugify("!!!"), "berita")
  assert.ok(slugify("a".repeat(200)).length <= 80)
})

test("withSuffix", () => {
  assert.match(withSuffix("judul"), /^judul-[0-9a-f]{6}$/)
})

test("toUsername", () => {
  assert.equal(toUsername("John.Doe+x"), "johndoex")
  assert.equal(toUsername("ab"), "abuser")
  assert.ok(toUsername("x".repeat(50)).length <= 20)
})
