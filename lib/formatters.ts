const APP_LOCALE = "en-US";
const APP_TIME_ZONE = "Asia/Colombo";

type DateInput = Date | number | string | null | undefined;

function parseDate(value: DateInput): Date | null {
    if (value === null || value === undefined || value === "") return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

const shortDateFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: APP_TIME_ZONE,
});

const dateFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: APP_TIME_ZONE,
});

const longDateFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
    dateStyle: "long",
    timeZone: APP_TIME_ZONE,
});

const monthYearFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
    month: "long",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
});

const dateTimeFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: APP_TIME_ZONE,
});

export function formatAppDate(value: DateInput): string {
    const date = parseDate(value);
    return date ? dateFormatter.format(date) : "—";
}

export function formatAppDateShort(value: DateInput): string {
    const date = parseDate(value);
    return date ? shortDateFormatter.format(date) : "—";
}

export function formatAppDateLong(value: DateInput): string {
    const date = parseDate(value);
    return date ? longDateFormatter.format(date) : "—";
}

export function formatAppMonthYear(value: DateInput): string {
    const date = parseDate(value);
    return date ? monthYearFormatter.format(date) : "—";
}

export function formatAppDateTime(value: DateInput): string {
    const date = parseDate(value);
    return date ? dateTimeFormatter.format(date) : "—";
}

export function formatAppNumber(
    value: number | string,
    options?: Intl.NumberFormatOptions,
): string {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) return "0";
    return new Intl.NumberFormat(APP_LOCALE, options).format(numeric);
}

export function toDateInputValue(value: DateInput): string {
    const date = parseDate(value);
    if (!date) return "";

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
