export const DOCUMENT_CATEGORIES = [
  "academicQualificationDocuments",
  "nicDocuments",
  "passportDocuments",
  "passportPhoto",
  "paymentSlip",
] as const;

export type RegistrationDocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
export const NIC_DOCUMENT_SIDES = ["front", "back"] as const;
export type NicDocumentSide = (typeof NIC_DOCUMENT_SIDES)[number];

export type RegistrationDocumentEntry = {
  id: string;
  url: string;
  uploadedAt: string;
  key?: string;
  filename?: string;
  contentType?: string;
  sizeBytes?: number;
  source?: string;
  uploadedBy?: string;
  side?: NicDocumentSide;
  [key: string]: unknown;
};

function createDocumentId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeOptionalString(value: unknown): string | undefined {
  const trimmed = toTrimmedString(value);
  return trimmed ?? undefined;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  }

  return undefined;
}

export function normalizeNicDocumentSide(value: unknown): NicDocumentSide | undefined {
  const normalized = toTrimmedString(value)?.toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "front" || normalized === "back") {
    return normalized;
  }
  return undefined;
}

function normalizeDateToIso(value: unknown, fallbackMs: number): string {
  if (typeof value === "string" && value.trim().length) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date(fallbackMs).toISOString();
}

export function canonicalizeDocumentUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:") {
    return null;
  }

  parsed.protocol = "https:";
  parsed.username = "";
  parsed.password = "";

  return parsed.toString();
}

export function normalizeDocumentEntry(
  input: unknown,
  options?: {
    fallbackMs?: number;
    fallbackIdSeed?: string;
  },
): RegistrationDocumentEntry | null {
  const fallbackMs = options?.fallbackMs ?? Date.now();
  const fallbackIdSeed = options?.fallbackIdSeed;
  const fallbackId = fallbackIdSeed ? `doc_${fallbackIdSeed}` : createDocumentId();

  if (typeof input === "string") {
    const normalizedUrl = canonicalizeDocumentUrl(input);
    if (!normalizedUrl) return null;

    return {
      id: fallbackId,
      url: normalizedUrl,
      uploadedAt: new Date(fallbackMs).toISOString(),
    };
  }

  if (!input || typeof input !== "object") {
    return null;
  }

  const rawObject = { ...(input as Record<string, unknown>) };
  const rawUrl = toTrimmedString(rawObject.url);
  if (!rawUrl) return null;

  const normalizedUrl = canonicalizeDocumentUrl(rawUrl);
  if (!normalizedUrl) return null;

  const normalized: RegistrationDocumentEntry = {
    ...rawObject,
    id: normalizeOptionalString(rawObject.id) ?? fallbackId,
    url: normalizedUrl,
    uploadedAt: normalizeDateToIso(rawObject.uploadedAt, fallbackMs),
  };

  const key = normalizeOptionalString(rawObject.key);
  if (key) normalized.key = key;
  else delete normalized.key;

  const filename = normalizeOptionalString(rawObject.filename);
  if (filename) normalized.filename = filename;
  else delete normalized.filename;

  const contentType = normalizeOptionalString(rawObject.contentType);
  if (contentType) normalized.contentType = contentType;
  else delete normalized.contentType;

  const source = normalizeOptionalString(rawObject.source);
  if (source) normalized.source = source;
  else delete normalized.source;

  const uploadedBy = normalizeOptionalString(rawObject.uploadedBy);
  if (uploadedBy) normalized.uploadedBy = uploadedBy;
  else delete normalized.uploadedBy;

  const sizeBytes = normalizeOptionalNumber(rawObject.sizeBytes);
  if (sizeBytes) normalized.sizeBytes = sizeBytes;
  else delete normalized.sizeBytes;

  const side = normalizeNicDocumentSide(rawObject.side);
  if (side) normalized.side = side;
  else delete normalized.side;

  return normalized;
}

export function normalizeDocumentCollection(
  input: unknown,
): RegistrationDocumentEntry[] {
  const rawItems = Array.isArray(input)
    ? input
    : input && typeof input === "object"
      ? [input]
      : [];

  const normalizedItems = rawItems
    .map((item, index) => {
      const fallbackMs = index * 1000;
      const normalized = normalizeDocumentEntry(item, {
        fallbackMs,
        fallbackIdSeed: `${index}`,
      });

      if (!normalized) return null;

      return {
        index,
        item: normalized,
      };
    })
    .filter((entry): entry is { index: number; item: RegistrationDocumentEntry } =>
      Boolean(entry),
    );

  normalizedItems.sort((a, b) => {
    const left = new Date(a.item.uploadedAt).getTime();
    const right = new Date(b.item.uploadedAt).getTime();
    if (left !== right) return right - left;
    return b.index - a.index;
  });

  return normalizedItems.map((entry) => entry.item);
}

export function getNicDocumentCurrentIds(
  documents: RegistrationDocumentEntry[],
): Set<string> {
  const currentIds = new Set<string>();

  const front = documents.find((document) => document.side === "front");
  if (front) currentIds.add(front.id);

  const back = documents.find((document) => document.side === "back");
  if (back) currentIds.add(back.id);

  if (currentIds.size >= 2) return currentIds;

  for (const document of documents) {
    if (currentIds.has(document.id)) continue;
    currentIds.add(document.id);
    if (currentIds.size >= 2) break;
  }

  return currentIds;
}

export function getNicDocumentSideLabel(side: unknown): string {
  const normalized = normalizeNicDocumentSide(side);
  if (normalized === "front") return "Front";
  if (normalized === "back") return "Back";
  return "Unspecified";
}

export function extractStorageKeyFromPublicUrl(
  publicUrl: string,
  publicBaseUrl: string | undefined,
): string | null {
  if (!publicBaseUrl) return null;
  const normalizedPublicUrl = canonicalizeDocumentUrl(publicUrl);
  const normalizedBaseUrl = canonicalizeDocumentUrl(publicBaseUrl);

  if (!normalizedPublicUrl || !normalizedBaseUrl) {
    return null;
  }

  let url: URL;
  let base: URL;
  try {
    url = new URL(normalizedPublicUrl);
    base = new URL(normalizedBaseUrl);
  } catch {
    return null;
  }

  if (url.host !== base.host) {
    return null;
  }

  const basePath = base.pathname.endsWith("/")
    ? base.pathname
    : `${base.pathname}/`;
  const resourcePath = url.pathname.startsWith("/")
    ? url.pathname
    : `/${url.pathname}`;

  if (!resourcePath.startsWith(basePath)) {
    return null;
  }

  const key = resourcePath.slice(basePath.length);
  return key.length ? decodeURIComponent(key) : null;
}
