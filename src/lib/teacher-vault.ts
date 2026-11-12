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

const bytesToBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const base64ToBytes = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
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
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(iv) }, key, base64ToBytes(payload));
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

export async function unlockTeacherVault(dbName: string, passphrase: string) {
  if (passphrase.length < 10) throw new Error("Gunakan frasa sandi minimal 10 karakter.");
  const db = await openDb(dbName);
  const meta = await requestValue(db.transaction(META, "readonly").objectStore(META).get("vault")) as VaultMeta | undefined;
  db.close();

  if (meta) {
    const salt = base64ToBytes(meta.salt);
    const key = await deriveKey(passphrase, salt);
    try {
      const verifier = await unseal<string>(key, meta.verifierIv, meta.verifier);
      if (verifier !== "TMS-TEACHER-VAULT-V1") throw new Error("Frasa sandi tidak cocok.");
    } catch {
      throw new Error("Frasa sandi salah atau data vault rusak. Data terenkripsi tidak diubah.");
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
  const backup = JSON.parse(text) as { format?: string; version?: number; salt?: string; iv?: string; payload?: string };
  if (backup.format !== "tms-teacher-desk-encrypted" || backup.version !== 2 || !backup.salt || !backup.iv || !backup.payload) {
    throw new Error("Format paket terenkripsi tidak dikenali.");
  }
  const key = await deriveKey(passphrase, base64ToBytes(backup.salt));
  try {
    return await unseal<{ teacher: { teacherId: string }; items: VaultWorkItem[] }>(key, backup.iv, backup.payload);
  } catch {
    throw new Error("Frasa sandi paket salah atau file rusak.");
  }
}
