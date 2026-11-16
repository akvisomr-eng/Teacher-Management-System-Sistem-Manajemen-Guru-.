import test from "node:test";
import assert from "node:assert/strict";
import { bytesToBase64, base64ToBytes, validateTeacherBackupEnvelope } from "./teacher-vault.ts";

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


test("decodes canonical Base64 and rejects malformed encodings", () => {
  assert.deepEqual(base64ToBytes("VE1T"), new Uint8Array([84, 77, 83]));
  for (const value of ["", "V E1T", "VE1", "VE1T====", "!!!!", "VR=="]) {
    assert.throws(() => base64ToBytes(value), /Base64 tidak valid/);
  }
});

test("validates encrypted backup envelope dimensions before decryption", () => {
  const valid = {
    format: "tms-teacher-desk-encrypted",
    version: 2,
    salt: bytesToBase64(new Uint8Array(16)),
    iv: bytesToBase64(new Uint8Array(12)),
    payload: bytesToBase64(new Uint8Array(16))
  };
  assert.deepEqual(validateTeacherBackupEnvelope(JSON.stringify(valid)), valid);
  assert.throws(() => validateTeacherBackupEnvelope("{broken"), /JSON yang valid/);
  assert.throws(() => validateTeacherBackupEnvelope(JSON.stringify({ ...valid, salt: "AA==" })), /struktur enkripsi/i);
  assert.throws(() => validateTeacherBackupEnvelope(JSON.stringify({ ...valid, iv: "AA==" })), /struktur enkripsi/i);
  assert.throws(() => validateTeacherBackupEnvelope(JSON.stringify({ ...valid, payload: "AA==" })), /struktur enkripsi/i);
  assert.throws(() => validateTeacherBackupEnvelope(JSON.stringify({ ...valid, version: 1 })), /Format paket/);
});

test("rejects backup text larger than the import size limit", () => {
  assert.throws(() => validateTeacherBackupEnvelope(" ".repeat(5 * 1024 * 1024 + 1)), /5 MB/);
});
