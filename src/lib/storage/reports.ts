import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DriftReport } from "@/lib/engine/schema";

/**
 * Report persistence. Vercel Blob in production, a local folder in development
 * so the app runs end to end without any provisioned store.
 */

export interface ReportStore {
  save(report: DriftReport): Promise<void>;
  load(id: string): Promise<DriftReport | null>;
  delete(id: string): Promise<boolean>;
}

const ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no 0/o/1/l
const ID_LENGTH = 12;

export function newReportId(): string {
  const bytes = randomBytes(ID_LENGTH);
  let out = "";
  for (let i = 0; i < ID_LENGTH; i++) out += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
  return out;
}

export function isValidReportId(id: string): boolean {
  return /^[a-z0-9]{8,32}$/.test(id);
}

/** A secret handed only to the person who ran the scan. Its hash is stored with the report. */
export function newOwnerToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isValidOwnerToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{24,64}$/.test(token);
}

export function tokenMatches(token: string, hash: string | undefined): boolean {
  if (!hash) return false;
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Everything a visitor may see. Drops the owner hash. */
export function publicReport(report: DriftReport): Omit<DriftReport, "ownerTokenHash"> {
  const copy = { ...report };
  delete copy.ownerTokenHash;
  return copy;
}

function blobPath(id: string): string {
  return `reports/${id}.json`;
}

class BlobReportStore implements ReportStore {
  private access: "public" | "private";
  constructor() {
    this.access = process.env.BLOB_ACCESS === "private" ? "private" : "public";
  }
  async save(report: DriftReport): Promise<void> {
    const { put } = await import("@vercel/blob");
    await put(blobPath(report.id), JSON.stringify(report), {
      access: this.access,
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
  }
  async load(id: string): Promise<DriftReport | null> {
    const { get, BlobNotFoundError } = await import("@vercel/blob");
    try {
      const result = await get(blobPath(id), { access: this.access });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      const text = await new Response(result.stream).text();
      return JSON.parse(text) as DriftReport;
    } catch (err) {
      if (err instanceof BlobNotFoundError) return null;
      throw err;
    }
  }
  async delete(id: string): Promise<boolean> {
    const { del } = await import("@vercel/blob");
    await del(blobPath(id));
    return true;
  }
}

class FileReportStore implements ReportStore {
  private dir = path.join(process.cwd(), ".msgdrift-data", "reports");
  private file(id: string) {
    return path.join(this.dir, `${id}.json`);
  }
  async save(report: DriftReport): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.file(report.id), JSON.stringify(report, null, 2), "utf8");
  }
  async load(id: string): Promise<DriftReport | null> {
    try {
      const text = await readFile(this.file(id), "utf8");
      return JSON.parse(text) as DriftReport;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }
  async delete(id: string): Promise<boolean> {
    try {
      await unlink(this.file(id));
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw err;
    }
  }
}

let store: ReportStore | null = null;

export function getReportStore(): ReportStore {
  if (store) return store;
  const hasBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID || process.env.VERCEL);
  store = hasBlob ? new BlobReportStore() : new FileReportStore();
  return store;
}
