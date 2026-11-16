export type VaultWorkItem = {
  id: string;
  itemType: string;
  title: string;
  content: { body: string; subject?: string; className?: string; dueDate?: string; formData?: Record<string, string>; templateKey?: string; templateVersion?: number };
  schemaVersion: number;
  clientUpdatedAt: string;
  syncState: "local" | "synced" | "conflict";
  serverVersion?: { itemType: string; title: string; content: VaultWorkItem["content"]; schemaVersion: number; clientUpdatedAt: string };
};

type EncryptedRecord = { id: string; encrypted: true; iv: string; payload: string };
type VaultMeta = { id: "vault"; salt: string; verifierIv: string; verifier: string };
const STORE = "work-items";
const META = "vault-meta";
const ITERATIONS = 310_000;

export function bytesToBase64(bytes: Uint8Array): string {
  // Avoid spreading a multi-megabyte encrypted backup into a single function call.
  // Chunking keeps the conversion below browser argument-count limits.
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
export function base64ToBytes(value: string): Uint8Array {
  if (typeof value !== "string" || !value || value.length % 4 !== 0 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error("Data Base64 tidak valid.");
  }
  const decoded = Uint8Array.from(atob(value), character => character.charCodeAt(0));
  if (bytesToBase64(decoded) !== value) throw new Error("Data Base64 tidak valid.");
  return decoded;
}

type TeacherBackupEnvelope = { format: "tms-teacher-desk-encrypted"; version: 2; salt: string; iv: string; payload: string };

export function validateTeacherBackupEnvelope(text: string): TeacherBackupEnvelope {
  if (typeof text !== "string" || new TextEncoder().encode(text).byteLength > 5 * 1024 * 1024) {
    throw new Error("Ukuran paket melebihi batas 5 MB.");
  }
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error("File cadangan bukan JSON yang valid."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Format paket terenkripsi tidak dikenali.");
  }
  const backup = parsed as Record<string, unknown>;
  if (backup.format !== "tms-teacher-desk-encrypted" || backup.version !== 2 ||
      typeof backup.salt !== "string" || typeof backup.iv !== "string" || typeof backup.payload !== "string") {
    throw new Error("Format paket terenkripsi tidak dikenali.");
  }
  const salt = base64ToBytes(backup.salt);
  const iv = base64ToBytes(backup.iv);
  const payload = base64ToBytes(backup.payload);
  if (salt.byteLength !== 16 || iv.byteLength !== 12 || payload.byteLength < 16) {
    throw new Error("Struktur enkripsi paket tidak valid.");
  }
  return backup as TeacherBackupEnvelope;
}
const randomBytes = (length: number) => crypto.getRandomValues(new Uint8Array(length));

function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const saltBuffer = new ArrayBuffer(salt.byteLength);
  new Uint8Array(saltBuffer).set(salt);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: saltBuffer, iterations: ITERATIONS, hash: "SHA-256" }, material,
    { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function seal(key: CryptoKey, value: unknown) {
  const iv = randomBytes(12);
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return { iv: bytesToBase64(iv), payload: bytesToBase64(new Uint8Array(encrypted)) };
}

async function unseal<T>(key: CryptoKey, iv: string, payload: string): Promise<T> {
  const ivBytes = base64ToBytes(iv);
  const payloadBytes = base64ToBytes(payload);
  const ivBuffer = new ArrayBuffer(ivBytes.byteLength);
  const payloadBuffer = new ArrayBuffer(payloadBytes.byteLength);
  new Uint8Array(ivBuffer).set(ivBytes);
  new Uint8Array(payloadBuffer).set(payloadBytes);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuffer }, key, payloadBuffer);
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readRawRows(dbName: string): Promise<Array<VaultWorkItem | EncryptedRecord>> {
  const db = await openDb(dbName);
  const rows = await requestValue(db.transaction(STORE, "readonly").objectStore(STORE).getAll()) as Array<VaultWorkItem | EncryptedRecord>;
  db.close();
  return rows;
}

export type TeacherVaultDiagnostic = {
  databaseFound: boolean;
  metadataFound: boolean;
  metadataValid: boolean | null;
  encryptedRecords: number;
  legacyRecords: number;
  malformedRecords: number;
  metadataIssue?: string;
};

/**
 * Read-only inspection. Does not create a database, decrypt records, or expose
 * metadata values, record IDs, passphrases, or document content.
 */
export async function inspectTeacherVault(dbName: string): Promise<TeacherVaultDiagnostic> {
  if (typeof indexedDB.databases !== "function") {
    throw new Error("Browser ini tidak mendukung pemeriksaan daftar database lokal secara aman. Gunakan Chrome versi terbaru.");
  }
  const databases = await indexedDB.databases();
  if (!databases.some(database => database.name === dbName)) {
    return { databaseFound: false, metadataFound: false, metadataValid: null, encryptedRecords: 0, legacyRecords: 0, malformedRecords: 0 };
  }
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Pemeriksaan penyimpanan sedang tertahan oleh tab lain."));
  });
  try {
    if (!db.objectStoreNames.contains(META) || !db.objectStoreNames.contains(STORE)) {
      return { databaseFound: true, metadataFound: false, metadataValid: false, encryptedRecords: 0, legacyRecords: 0, malformedRecords: 0, metadataIssue: "Struktur penyimpanan tidak lengkap." };
    }
    const tx = db.transaction([META, STORE], "readonly");
    const [meta, rows] = await Promise.all([
      requestValue(tx.objectStore(META).get("vault")) as Promise<VaultMeta | undefined>,
      requestValue(tx.objectStore(STORE).getAll()) as Promise<Array<VaultWorkItem | EncryptedRecord>>
    ]);
    let metadataValid: boolean | null = null;
    let metadataIssue: string | undefined;
    if (meta) {
      try {
        if (typeof meta.salt !== "string" || typeof meta.verifierIv !== "string" || typeof meta.verifier !== "string") throw new Error();
        if (base64ToBytes(meta.salt).byteLength !== 16 || base64ToBytes(meta.verifierIv).byteLength !== 12 || base64ToBytes(meta.verifier).byteLength < 16) throw new Error();
        metadataValid = true;
      } catch {
        metadataValid = false;
        metadataIssue = "Metadata ditemukan tetapi format atau ukuran datanya tidak valid.";
      }
    }
    let encryptedRecords = 0, legacyRecords = 0, malformedRecords = 0;
    for (const row of rows) {
      if ("encrypted" in row && row.encrypted === true && typeof row.iv === "string" && typeof row.payload === "string") {
        try {
          if (base64ToBytes(row.iv).byteLength !== 12 || base64ToBytes(row.payload).byteLength < 16) malformedRecords++;
          else encryptedRecords++;
        } catch { malformedRecords++; }
      } else if ("encrypted" in row) {
        malformedRecords++;
      } else {
        legacyRecords++;
      }
    }
    return { databaseFound: true, metadataFound: Boolean(meta), metadataValid, encryptedRecords, legacyRecords, malformedRecords, metadataIssue };
  } finally {
    db.close();
  }
}

export async function unlockTeacherVault(dbName: string, passphrase: string) {
  if (passphrase.length < 10) throw new Error("Gunakan frasa sandi minimal 10 karakter.");
  const db = await openDb(dbName);
  const meta = await requestValue(db.transaction(META, "readonly").objectStore(META).get("vault")) as VaultMeta | undefined;
  db.close();

  if (meta) {
    let salt: Uint8Array;
    try {
      if (typeof meta.salt !== "string" || typeof meta.verifierIv !== "string" || typeof meta.verifier !== "string") {
        throw new Error("Metadata tidak lengkap.");
      }
      salt = base64ToBytes(meta.salt);
      const verifierIv = base64ToBytes(meta.verifierIv);
      const verifierPayload = base64ToBytes(meta.verifier);
      if (salt.byteLength !== 16 || verifierIv.byteLength !== 12 || verifierPayload.byteLength < 16) {
        throw new Error("Ukuran metadata tidak valid.");
      }
    } catch {
      throw new Error("Metadata keamanan vault rusak atau tidak lengkap. Data terenkripsi tetap dipertahankan; jangan hapus penyimpanan browser.");
    }
    const key = await deriveKey(passphrase, salt);
    let verifier: string;
    try {
      verifier = await unseal<string>(key, meta.verifierIv, meta.verifier);
    } catch {
      throw new Error("Kunci tidak cocok dengan vault ini, atau pemeriksaan integritas vault gagal. Pastikan akun guru dan browser/perangkat yang sama digunakan serta frasa sandi dimasukkan persis (huruf besar-kecil dan spasi ikut dihitung). Data terenkripsi tidak diubah.");
    }
    if (verifier !== "TMS-TEACHER-VAULT-V1") {
      throw new Error("Pemeriksaan identitas vault tidak valid. Metadata keamanan mungkin rusak; data terenkripsi tidak diubah.");
    }
    return { key, salt: meta.salt };
  }

  const salt = randomBytes(16);
  const key = await deriveKey(passphrase, salt);
  const proof = await seal(key, "TMS-TEACHER-VAULT-V1");
  const nextMeta: VaultMeta = { id: "vault", salt: bytesToBase64(salt), verifierIv: proof.iv, verifier: proof.payload };
  const existing = await readRawRows(dbName);
  const encryptedRows: EncryptedRecord[] = [];
  for (const item of existing) {
    if ("encrypted" in item && item.encrypted) {
      throw new Error("Data terenkripsi ditemukan tanpa metadata vault. Hentikan proses untuk mencegah kehilangan data.");
    }
    const encrypted = await seal(key, item);
    encryptedRows.push({ id: item.id, encrypted: true, ...encrypted });
  }

  const writeDb = await openDb(dbName);
  const tx = writeDb.transaction([STORE, META], "readwrite");
  tx.objectStore(META).put(nextMeta);
  for (const row of encryptedRows) tx.objectStore(STORE).put(row);
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
  writeDb.close();
  return { key, salt: nextMeta.salt };
}

export async function readTeacherItems(dbName: string, key: CryptoKey): Promise<VaultWorkItem[]> {
  const db = await openDb(dbName);
  const tx = db.transaction(STORE, "readonly");
  const rows = await requestValue(tx.objectStore(STORE).getAll()) as Array<VaultWorkItem | EncryptedRecord>;
  db.close();
  return Promise.all(rows.map(async row => {
    if (!("encrypted" in row) || !row.encrypted) throw new Error("Data lama belum terenkripsi. Buka kembali vault untuk menyelesaikan migrasi.");
    return unseal<VaultWorkItem>(key, row.iv, row.payload);
  }));
}

export async function writeTeacherItem(dbName: string, key: CryptoKey, item: VaultWorkItem) {
  const db = await openDb(dbName);
  const encrypted = await seal(key, item);
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put({ id: item.id, encrypted: true, ...encrypted } satisfies EncryptedRecord);
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  db.close();
}

export async function writeTeacherItems(dbName: string, key: CryptoKey, items: VaultWorkItem[]) {
  if (!items.length) return;
  const encryptedRows = await Promise.all(items.map(async item => ({
    id: item.id, encrypted: true as const, ...await seal(key, item)
  })));
  const db = await openDb(dbName);
  try {
    const tx = db.transaction(STORE, "readwrite");
    for (const row of encryptedRows) tx.objectStore(STORE).put(row);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Penyimpanan dibatalkan."));
    });
  } finally {
    db.close();
  }
}

export async function clearTeacherItems(dbName: string) {
  const db = await openDb(dbName);
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).clear();
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  db.close();
}

export async function createTeacherBackup(passphrase: string, salt: string, teacher: unknown, items: VaultWorkItem[]) {
  const key = await deriveKey(passphrase, base64ToBytes(salt));
  const encrypted = await seal(key, { format: "tms-teacher-desk", version: 2, exportedAt: new Date().toISOString(), teacher, items });
  return JSON.stringify({ format: "tms-teacher-desk-encrypted", version: 2, salt, ...encrypted }, null, 2);
}

export async function openTeacherBackup(text: string, passphrase: string) {
  const backup = validateTeacherBackupEnvelope(text);
  const key = await deriveKey(passphrase, base64ToBytes(backup.salt));
  let result: { teacher: { teacherId: string }; items: VaultWorkItem[] };
  try {
    result = await unseal<{ teacher: { teacherId: string }; items: VaultWorkItem[] }>(key, backup.iv, backup.payload);
  } catch {
    throw new Error("Frasa sandi paket salah atau file rusak.");
  }
  if (!result || typeof result !== "object" || !result.teacher ||
      typeof result.teacher.teacherId !== "string" || !result.teacher.teacherId.trim() ||
      !Array.isArray(result.items) || result.items.length > 500) {
    throw new Error("Isi cadangan tidak valid atau melebihi batas jumlah dokumen.");
  }
  return result;
}
