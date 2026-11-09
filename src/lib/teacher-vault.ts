export type VaultWorkItem = {
  id: string;
  itemType: string;
  title: string;
  content: { body: string };
  schemaVersion: number;
  clientUpdatedAt: string;
  syncState: "local" | "synced" | "conflict";
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
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" }, material,
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

export async function unlockTeacherVault(dbName: string, passphrase: string) {
  if (passphrase.length < 10) throw new Error("Gunakan frasa sandi minimal 10 karakter.");
  const db = await openDb(dbName);
  const tx = db.transaction([STORE, META], "readwrite");
  const metaStore = tx.objectStore(META);
  let meta = await requestValue(metaStore.get("vault")) as VaultMeta | undefined;
  let salt: Uint8Array;
  let key: CryptoKey;
  if (meta) {
    salt = base64ToBytes(meta.salt);
    key = await deriveKey(passphrase, salt);
    try {
      const verifier = await unseal<string>(key, meta.verifierIv, meta.verifier);
      if (verifier !== "TMS-TEACHER-VAULT-V1") throw new Error("Frasa sandi tidak cocok.");
    } catch {
      db.close();
      throw new Error("Frasa sandi salah atau data vault rusak. Data terenkripsi tidak diubah.");
    }
  } else {
    salt = randomBytes(16);
    key = await deriveKey(passphrase, salt);
    const proof = await seal(key, "TMS-TEACHER-VAULT-V1");
    meta = { id: "vault", salt: bytesToBase64(salt), verifierIv: proof.iv, verifier: proof.payload };
    metaStore.put(meta);
    const store = tx.objectStore(STORE);
    const existing = await requestValue(store.getAll()) as Array<VaultWorkItem | EncryptedRecord>;
    for (const item of existing) {
      if ("encrypted" in item && item.encrypted) continue;
      const encrypted = await seal(key, item);
      store.put({ id: item.id, encrypted: true, ...encrypted } satisfies EncryptedRecord);
    }
  }
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  db.close();
  return { key, salt: bytesToBase64(salt) };
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
