import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  plan: "free" | "basic" | "standard" | "enterprise";
  salt: string;
  passwordHash: string;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
}

export type ConnectionStatus = "connected" | "syncing" | "error" | "paused";

export interface Connection {
  id: string;
  userId: string;
  connector: string;
  accountId: string;
  accountName: string;
  status: ConnectionStatus;
  frequency: "hourly" | "daily" | "weekly";
  lastSyncAt: string | null;
  createdAt: string;
  error?: string;
  /** "live" reads the platform API; "sample" serves generated demo rows. */
  mode: "live" | "sample";
  /** Encrypted ProviderAuth. Never leaves the server. */
  credentials?: string;
  currency?: string;
}

/**
 * Tokens land here between the OAuth callback and the user picking accounts,
 * so a half-finished connect flow never writes a connection.
 */
export interface AuthSession {
  id: string;
  userId: string;
  provider: string;
  connector: string;
  credentials: string;
  createdAt: string;
}

export interface DestinationConfig {
  id: string;
  userId: string;
  destination: string;
  name: string;
  config: Record<string, string>;
  connectors: string[];
  fields: string[];
  schedule: "hourly" | "daily" | "weekly";
  status: "active" | "paused";
  lastRunAt: string | null;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface Database {
  users: User[];
  sessions: Session[];
  connections: Connection[];
  destinations: DestinationConfig[];
  apiKeys: ApiKey[];
  authSessions: AuthSession[];
}

const EMPTY: Database = {
  users: [],
  sessions: [],
  connections: [],
  destinations: [],
  apiKeys: [],
  authSessions: [],
};

const DATA_DIR = process.env.ADSCONNECT_DATA_DIR || path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "db.json");

/**
 * File-backed JSON store with an in-memory fallback, so the app also runs on
 * read-only hosts. Swap this module for a real database without touching callers.
 */
let memory: Database | null = null;
let writable = true;
let loadedMtimeMs = -1;

function fileMtime(): number {
  try {
    return fs.statSync(DB_PATH).mtimeMs;
  } catch {
    return -1;
  }
}

/**
 * Re-reads the file whenever another process has written it. Next.js serves
 * requests from several workers, so a cache that never revalidates would hand
 * one worker a session another worker created.
 */
function load(): Database {
  const mtime = fileMtime();
  if (memory && mtime === loadedMtimeMs) return memory;

  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    memory = { ...EMPTY, ...(JSON.parse(raw) as Partial<Database>) };
    loadedMtimeMs = mtime;
  } catch {
    memory = structuredClone(EMPTY);
    loadedMtimeMs = -1;
  }
  seed(memory);
  return memory;
}

function persist() {
  if (!memory || !writable) return;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(memory, null, 2));
    loadedMtimeMs = fileMtime();
  } catch {
    writable = false;
  }
}

export function id(prefix: string): string {
  return prefix + "_" + crypto.randomBytes(9).toString("hex");
}

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const passwordHash = crypto.scryptSync(password, salt, 32).toString("hex");
  return { salt, passwordHash };
}

export function verifyPassword(password: string, user: User): boolean {
  const candidate = crypto.scryptSync(password, user.salt, 32);
  const known = Buffer.from(user.passwordHash, "hex");
  return candidate.length === known.length && crypto.timingSafeEqual(candidate, known);
}

/* ------------------------------------------------------------------- seeding */

const DEMO_EMAIL = "demo@adsconnect.io";
export const DEMO_PASSWORD = "demo1234";

const DEMO_CONNECTORS = [
  "google-ads",
  "facebook-ads",
  "tiktok-ads",
  "linkedin-ads",
  "klaviyo",
  "google-analytics-4",
  "shopify",
];

function seed(db: Database) {
  if (db.users.some((u) => u.email === DEMO_EMAIL)) return;
  const { salt, passwordHash } = hashPassword(DEMO_PASSWORD);
  const user: User = {
    id: "usr_demo",
    email: DEMO_EMAIL,
    name: "Demo Analyst",
    company: "Acme Commerce",
    plan: "standard",
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  seedWorkspace(db, user.id, DEMO_CONNECTORS);
}

/** Gives a brand new workspace something to look at on first login. */
export function seedWorkspace(db: Database, userId: string, connectors: string[]) {
  const now = new Date();
  connectors.forEach((connector, i) => {
    db.connections.push({
      id: id("con"),
      userId,
      connector,
      accountId: "act_" + (4821000 + i * 977),
      accountName: "Acme Commerce",
      status: "connected",
      frequency: "daily",
      mode: "sample",
      lastSyncAt: new Date(now.getTime() - (i + 1) * 37 * 60000).toISOString(),
      createdAt: new Date(now.getTime() - (i + 3) * 86400000).toISOString(),
    });
  });

  db.destinations.push({
    id: id("dst"),
    userId,
    destination: "looker-studio",
    name: "Paid media overview",
    config: { report_name: "Paid media overview" },
    connectors: connectors.slice(0, 4),
    fields: ["date", "source", "campaign", "spend", "clicks", "conversions", "revenue"],
    schedule: "daily",
    status: "active",
    lastRunAt: new Date(now.getTime() - 3 * 3600000).toISOString(),
    createdAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
  });

  db.destinations.push({
    id: id("dst"),
    userId,
    destination: "google-sheets",
    name: "Weekly board numbers",
    config: { spreadsheet_id: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms", sheet_name: "adsconnect_raw" },
    connectors,
    fields: ["date", "source", "spend", "conversions", "revenue", "roas"],
    schedule: "weekly",
    status: "active",
    lastRunAt: new Date(now.getTime() - 26 * 3600000).toISOString(),
    createdAt: new Date(now.getTime() - 12 * 86400000).toISOString(),
  });

  db.apiKeys.push({
    id: id("key"),
    userId,
    name: "Default key",
    key: apiKeyValue(userId),
    createdAt: now.toISOString(),
    lastUsedAt: null,
  });
}

function apiKeyValue(seedValue: string): string {
  return "ac_" + crypto.createHash("sha256").update(seedValue + ":key").digest("hex").slice(0, 32);
}

/* --------------------------------------------------------------------- users */

export function findUserByEmail(email: string): User | undefined {
  return load().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(userId: string): User | undefined {
  return load().users.find((u) => u.id === userId);
}

export function createUser(input: {
  email: string;
  password: string;
  name: string;
  company: string;
}): User {
  const db = load();
  const { salt, passwordHash } = hashPassword(input.password);
  const user: User = {
    id: id("usr"),
    email: input.email,
    name: input.name,
    company: input.company,
    plan: "free",
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  db.apiKeys.push({
    id: id("key"),
    userId: user.id,
    name: "Default key",
    key: apiKeyValue(user.id),
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  });
  persist();
  return user;
}

export function updateUser(userId: string, patch: Partial<Pick<User, "name" | "company" | "plan">>) {
  const db = load();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return;
  Object.assign(user, patch);
  persist();
}

/* ------------------------------------------------------------------ sessions */

export function createSession(userId: string): Session {
  const db = load();
  const session: Session = {
    token: crypto.randomBytes(24).toString("hex"),
    userId,
    createdAt: new Date().toISOString(),
  };
  db.sessions.push(session);
  persist();
  return session;
}

export function userForToken(token: string | undefined): User | undefined {
  if (!token) return undefined;
  const db = load();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return undefined;
  return db.users.find((u) => u.id === session.userId);
}

export function destroySession(token: string | undefined) {
  if (!token) return;
  const db = load();
  const idx = db.sessions.findIndex((s) => s.token === token);
  if (idx >= 0) {
    db.sessions.splice(idx, 1);
    persist();
  }
}

/* --------------------------------------------------------------- connections */

export function listConnections(userId: string): Connection[] {
  return load().connections.filter((c) => c.userId === userId);
}

export function addConnection(input: {
  userId: string;
  connector: string;
  accountId: string;
  accountName: string;
  frequency?: Connection["frequency"];
  mode?: Connection["mode"];
  credentials?: string;
  currency?: string;
}): Connection {
  const db = load();
  const existing = db.connections.find(
    (c) => c.userId === input.userId && c.connector === input.connector && c.accountId === input.accountId,
  );
  if (existing) {
    // Reconnecting an account refreshes its credentials instead of duplicating it.
    if (input.credentials) {
      existing.credentials = input.credentials;
      existing.mode = input.mode ?? "live";
      existing.status = "connected";
      delete existing.error;
      persist();
    }
    return existing;
  }
  const connection: Connection = {
    id: id("con"),
    userId: input.userId,
    connector: input.connector,
    accountId: input.accountId,
    accountName: input.accountName,
    status: "connected",
    frequency: input.frequency ?? "daily",
    mode: input.mode ?? (input.credentials ? "live" : "sample"),
    credentials: input.credentials,
    currency: input.currency,
    lastSyncAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  db.connections.push(connection);
  persist();
  return connection;
}

export function updateConnection(userId: string, connectionId: string, patch: Partial<Connection>) {
  const db = load();
  const connection = db.connections.find((c) => c.id === connectionId && c.userId === userId);
  if (!connection) return undefined;
  Object.assign(connection, patch);
  persist();
  return connection;
}

export function removeConnection(userId: string, connectionId: string) {
  const db = load();
  const idx = db.connections.findIndex((c) => c.id === connectionId && c.userId === userId);
  if (idx >= 0) {
    db.connections.splice(idx, 1);
    persist();
  }
}

/* -------------------------------------------------------------- destinations */

export function listDestinations(userId: string): DestinationConfig[] {
  return load().destinations.filter((d) => d.userId === userId);
}

export function addDestination(input: Omit<DestinationConfig, "id" | "createdAt" | "lastRunAt" | "status">): DestinationConfig {
  const db = load();
  const destination: DestinationConfig = {
    ...input,
    id: id("dst"),
    status: "active",
    lastRunAt: null,
    createdAt: new Date().toISOString(),
  };
  db.destinations.push(destination);
  persist();
  return destination;
}

export function updateDestination(userId: string, destinationId: string, patch: Partial<DestinationConfig>) {
  const db = load();
  const destination = db.destinations.find((d) => d.id === destinationId && d.userId === userId);
  if (!destination) return undefined;
  Object.assign(destination, patch);
  persist();
  return destination;
}

export function removeDestination(userId: string, destinationId: string) {
  const db = load();
  const idx = db.destinations.findIndex((d) => d.id === destinationId && d.userId === userId);
  if (idx >= 0) {
    db.destinations.splice(idx, 1);
    persist();
  }
}

/* ------------------------------------------------------------------ api keys */

export function listApiKeys(userId: string): ApiKey[] {
  return load().apiKeys.filter((k) => k.userId === userId);
}

export function createApiKey(userId: string, name: string): ApiKey {
  const db = load();
  const key: ApiKey = {
    id: id("key"),
    userId,
    name,
    key: "ac_" + crypto.randomBytes(16).toString("hex"),
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };
  db.apiKeys.push(key);
  persist();
  return key;
}

export function revokeApiKey(userId: string, keyId: string) {
  const db = load();
  const idx = db.apiKeys.findIndex((k) => k.id === keyId && k.userId === userId);
  if (idx >= 0) {
    db.apiKeys.splice(idx, 1);
    persist();
  }
}

export function userForApiKey(key: string): User | undefined {
  const db = load();
  const match = db.apiKeys.find((k) => k.key === key);
  if (!match) return undefined;
  match.lastUsedAt = new Date().toISOString();
  persist();
  return db.users.find((u) => u.id === match.userId);
}

export function bootstrapWorkspace(userId: string, connectors: string[]) {
  const db = load();
  if (db.connections.some((c) => c.userId === userId)) return;
  seedWorkspace(db, userId, connectors);
  persist();
}

/* -------------------------------------------------------------- auth sessions */

const AUTH_SESSION_TTL_MS = 30 * 60 * 1000;

export function createAuthSession(input: {
  userId: string;
  provider: string;
  connector: string;
  credentials: string;
}): AuthSession {
  const db = load();
  const now = Date.now();
  // Drop anything the user abandoned rather than letting tokens pile up.
  db.authSessions = db.authSessions.filter(
    (session) => now - Date.parse(session.createdAt) < AUTH_SESSION_TTL_MS,
  );
  const session: AuthSession = {
    id: id("auth"),
    userId: input.userId,
    provider: input.provider,
    connector: input.connector,
    credentials: input.credentials,
    createdAt: new Date().toISOString(),
  };
  db.authSessions.push(session);
  persist();
  return session;
}

export function getAuthSession(userId: string, sessionId: string): AuthSession | undefined {
  const session = load().authSessions.find((s) => s.id === sessionId && s.userId === userId);
  if (!session) return undefined;
  if (Date.now() - Date.parse(session.createdAt) > AUTH_SESSION_TTL_MS) return undefined;
  return session;
}

export function consumeAuthSession(userId: string, sessionId: string) {
  const db = load();
  const index = db.authSessions.findIndex((s) => s.id === sessionId && s.userId === userId);
  if (index >= 0) {
    db.authSessions.splice(index, 1);
    persist();
  }
}

/** Persists refreshed tokens without touching anything else on the connection. */
export function saveConnectionCredentials(connectionId: string, credentials: string) {
  const db = load();
  const connection = db.connections.find((c) => c.id === connectionId);
  if (!connection) return;
  connection.credentials = credentials;
  persist();
}

export function markConnectionError(connectionId: string, message: string | null) {
  const db = load();
  const connection = db.connections.find((c) => c.id === connectionId);
  if (!connection) return;
  if (message) {
    connection.status = "error";
    connection.error = message;
  } else {
    connection.status = "connected";
    delete connection.error;
    connection.lastSyncAt = new Date().toISOString();
  }
  persist();
}
