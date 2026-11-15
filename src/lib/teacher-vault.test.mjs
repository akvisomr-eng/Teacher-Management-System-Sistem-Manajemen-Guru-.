import test from "node:test";
import assert from "node:assert/strict";
import { bytesToBase64 } from "./teacher-vault.ts";

test("encodes small byte arrays as standard Base64", () => {
  assert.equal(bytesToBase64(new Uint8Array([84, 77, 83])), "VE1T");
});

test("encodes a 5 MB encrypted backup without argument-limit failures", () => {
  const source = new Uint8Array(5 * 1024 * 1024);
  for (let i = 0; i < source.length; i += 1) source[i] = (i * 31) % 256;
  const encoded = bytesToBase64(source);
  const decoded = new Uint8Array(Buffer.from(encoded, "base64"));
  assert.equal(decoded.length, source.length);
  assert.deepEqual(decoded, source);
});
