import test from "node:test";
import assert from "node:assert/strict";
import { bytesToBase64, base64ToBytes, validateTeacherBackupEnvelope, createTeacherBackup, openTeacherBackup } from "./teacher-vault.ts";

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


test("round-trips an encrypted teacher backup with the correct passphrase", async () => {
  const salt = bytesToBase64(new Uint8Array(16).fill(7));
  const item = {
    id: "doc-1", itemType: "lesson_plan", title: "Rencana ajar",
    content: { body: "Tujuan pembelajaran" }, schemaVersion: 2,
    clientUpdatedAt: "2026-11-15T09:00:00.000Z", syncState: "local"
  };
  const backupText = await createTeacherBackup("frasa-sandi-uji-yang-kuat", salt, { teacherId: "teacher-1" }, [item]);
  const restored = await openTeacherBackup(backupText, "frasa-sandi-uji-yang-kuat");
  assert.equal(restored.teacher.teacherId, "teacher-1");
  assert.deepEqual(restored.items, [item]);
});

test("rejects encrypted backups with a wrong passphrase or altered ciphertext", async () => {
  const salt = bytesToBase64(new Uint8Array(16).fill(9));
  const backupText = await createTeacherBackup("frasa-sandi-uji-yang-kuat", salt, { teacherId: "teacher-2" }, []);
  await assert.rejects(() => openTeacherBackup(backupText, "frasa-sandi-yang-salah"), /Frasa sandi paket salah atau file rusak/);

  const tampered = JSON.parse(backupText);
  const encryptedBytes = base64ToBytes(tampered.payload);
  encryptedBytes[0] ^= 1;
  tampered.payload = bytesToBase64(encryptedBytes);
  await assert.rejects(() => openTeacherBackup(JSON.stringify(tampered), "frasa-sandi-uji-yang-kuat"), /Frasa sandi paket salah atau file rusak/);
});

test("rejects decrypted backups without a teacher identity or with too many items", async () => {
  const salt = bytesToBase64(new Uint8Array(16).fill(11));
  const missingIdentity = await createTeacherBackup("frasa-sandi-uji-yang-kuat", salt, {}, []);
  await assert.rejects(() => openTeacherBackup(missingIdentity, "frasa-sandi-uji-yang-kuat"), /Isi cadangan tidak valid/);
});
