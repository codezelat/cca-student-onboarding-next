import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const QUALIFICATIONS = new Set([
  "degree",
  "diploma",
  "postgraduate",
  "msc",
  "phd",
  "work_experience",
  "other",
]);

const QUALIFICATION_STATUS = new Set(["completed", "ongoing"]);
const PAYMENT_STATUS = new Set(["active", "voided"]);

function toBoolEnv(value, fallback = false) {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

function parseArgs(argv) {
  const args = {
    sqlPath: process.env.OLD_SQL_PATH || "old_db_export.sql",
    dryRun: toBoolEnv(process.env.DRY_RUN, false),
    importPayments: toBoolEnv(process.env.IMPORT_PAYMENTS, true),
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dry-run") args.dryRun = true;
    if (token === "--no-payments") args.importPayments = false;
    if (token.startsWith("--sql=")) args.sqlPath = token.slice("--sql=".length);
    if (token === "--sql" && argv[i + 1]) {
      args.sqlPath = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function splitCsvColumns(columnsPart) {
  return columnsPart
    .split(",")
    .map((part) => part.trim().replace(/^`|`$/g, ""))
    .filter(Boolean);
}

function findInsertStatements(sql, tableName) {
  const marker = `INSERT INTO \`${tableName}\``;
  const statements = [];
  let cursor = 0;

  while (cursor < sql.length) {
    const start = sql.indexOf(marker, cursor);
    if (start === -1) break;

    let i = start;
    let inString = false;
    let escaped = false;

    while (i < sql.length) {
      const ch = sql[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === "'") {
          inString = false;
        }
      } else if (ch === "'") {
        inString = true;
      } else if (ch === ";") {
        statements.push(sql.slice(start, i + 1));
        cursor = i + 1;
        break;
      }
      i += 1;
    }

    if (i >= sql.length) break;
  }

  return statements;
}

function decodeSqlString(raw) {
  let out = "";
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }

    const next = raw[i + 1];
    if (next == null) {
      out += "\\";
      continue;
    }

    i += 1;
    switch (next) {
      case "0":
        out += "\0";
        break;
      case "b":
        out += "\b";
        break;
      case "n":
        out += "\n";
        break;
      case "r":
        out += "\r";
        break;
      case "t":
        out += "\t";
        break;
      case "Z":
        out += "\x1a";
        break;
      case "'":
        out += "'";
        break;
      case '"':
        out += '"';
        break;
      case "\\":
        out += "\\";
        break;
      case "/":
        out += "/";
        break;
      default:
        out += next;
        break;
    }
  }
  return out;
}

function readBareToken(valuesText, index) {
  let i = index;
  while (i < valuesText.length && ![",", ")"].includes(valuesText[i])) {
    i += 1;
  }
  const token = valuesText.slice(index, i).trim();
  if (/^null$/i.test(token)) return { value: null, index: i };
  if (/^-?\d+$/.test(token)) return { value: Number.parseInt(token, 10), index: i };
  if (/^-?\d+\.\d+$/.test(token)) return { value: Number.parseFloat(token), index: i };
  if (/^true$/i.test(token)) return { value: true, index: i };
  if (/^false$/i.test(token)) return { value: false, index: i };
  return { value: token, index: i };
}

function readQuotedToken(valuesText, index) {
  let i = index + 1;
  let raw = "";
  while (i < valuesText.length) {
    const ch = valuesText[i];
    if (ch === "\\") {
      const next = valuesText[i + 1];
      if (next == null) {
        raw += "\\";
        i += 1;
      } else {
        raw += `\\${next}`;
        i += 2;
      }
      continue;
    }

    if (ch === "'") {
      if (valuesText[i + 1] === "'") {
        raw += "\\'";
        i += 2;
        continue;
      }
      return { value: decodeSqlString(raw), index: i + 1 };
    }
    raw += ch;
    i += 1;
  }
  throw new Error("Unterminated SQL quoted string while parsing VALUES");
}

function parseValues(valuesText) {
  const rows = [];
  let i = 0;

  while (i < valuesText.length) {
    while (i < valuesText.length && [",", " ", "\n", "\r", "\t"].includes(valuesText[i])) i += 1;
    if (i >= valuesText.length) break;

    if (valuesText[i] !== "(") {
      throw new Error(`Expected "(" at index ${i}, found "${valuesText[i]}"`);
    }
    i += 1;

    const row = [];
    while (i < valuesText.length) {
      while (i < valuesText.length && [" ", "\n", "\r", "\t"].includes(valuesText[i])) i += 1;

      let parsed;
      if (valuesText[i] === "'") {
        parsed = readQuotedToken(valuesText, i);
      } else {
        parsed = readBareToken(valuesText, i);
      }
      row.push(parsed.value);
      i = parsed.index;

      while (i < valuesText.length && [" ", "\n", "\r", "\t"].includes(valuesText[i])) i += 1;
      if (valuesText[i] === ",") {
        i += 1;
        continue;
      }
      if (valuesText[i] === ")") {
        i += 1;
        break;
      }
      throw new Error(`Expected "," or ")" at index ${i}, found "${valuesText[i]}"`);
    }

    rows.push(row);
  }

  return rows;
}

function parseTableRows(sql, tableName) {
  const statements = findInsertStatements(sql, tableName);
  const rows = [];
  let columns = null;

  for (const statement of statements) {
    const match = statement.match(
      new RegExp(
        String.raw`INSERT INTO \`${tableName}\`\s*\(([\s\S]*?)\)\s*VALUES\s*([\s\S]*);$`,
        "i",
      ),
    );

    if (!match) {
      throw new Error(`Could not parse INSERT statement for table ${tableName}`);
    }

    const statementColumns = splitCsvColumns(match[1]);
    if (!columns) {
      columns = statementColumns;
    } else if (columns.join(",") !== statementColumns.join(",")) {
      throw new Error(`Column list mismatch across INSERT statements for ${tableName}`);
    }

    const parsedRows = parseValues(match[2]);
    for (const values of parsedRows) {
      if (values.length !== columns.length) {
        throw new Error(
          `Value count mismatch for ${tableName}: expected ${columns.length}, got ${values.length}`,
        );
      }
      const row = {};
      for (let i = 0; i < columns.length; i += 1) {
        row[columns[i]] = values[i];
      }
      rows.push(row);
    }
  }

  return { columns: columns || [], rows };
}

function asString(value, fallback = "") {
  if (value == null) return fallback;
  return String(value);
}

function asNullableString(value) {
  if (value == null) return null;
  const out = String(value);
  return out.length ? out : null;
}

function asDate(value) {
  if (value == null) return null;
  return String(value).slice(0, 10);
}

function asTimestamp(value) {
  if (value == null) return null;
  return String(value).replace("T", " ").slice(0, 19);
}

function asNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseJsonSafe(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed.length) return fallback;
  try {
    return JSON.parse(trimmed);
  } catch {
    return fallback;
  }
}

function normalizeGender(value) {
  const raw = asString(value, "male").trim().toLowerCase();
  if (raw === "female") return "female";
  return "male";
}

function normalizeQualification(value) {
  const raw = asString(value, "other").trim().toLowerCase();
  if (QUALIFICATIONS.has(raw)) return raw;
  return "other";
}

function normalizeQualificationStatus(value) {
  const raw = asString(value, "ongoing").trim().toLowerCase();
  if (QUALIFICATION_STATUS.has(raw)) return raw;
  return "ongoing";
}

function normalizePaymentStatus(value) {
  const raw = asString(value, "active").trim().toLowerCase();
  if (PAYMENT_STATUS.has(raw)) return raw;
  return "active";
}

function normalizeRegistrationRow(row) {
  return {
    register_id: asString(row.register_id),
    program_id: asString(row.program_id),
    program_name: asString(row.program_name),
    program_year: asString(row.program_year),
    program_duration: asString(row.program_duration),
    full_name: asString(row.full_name),
    name_with_initials: asString(row.name_with_initials),
    gender: normalizeGender(row.gender),
    date_of_birth: asDate(row.date_of_birth),
    nic_number: asNullableString(row.nic_number),
    passport_number: asNullableString(row.passport_number),
    nationality: asString(row.nationality),
    country_of_birth: asString(row.country_of_birth),
    country_of_residence: asString(row.country_of_residence),
    permanent_address: asString(row.permanent_address),
    postal_code: asString(row.postal_code),
    country: asString(row.country),
    district: asNullableString(row.district),
    province: asNullableString(row.province),
    email_address: asString(row.email_address),
    whatsapp_number: asString(row.whatsapp_number),
    home_contact_number: asNullableString(row.home_contact_number),
    guardian_contact_name: asString(row.guardian_contact_name),
    guardian_contact_number: asString(row.guardian_contact_number),
    highest_qualification: normalizeQualification(row.highest_qualification),
    qualification_other_details: asNullableString(row.qualification_other_details),
    qualification_status: normalizeQualificationStatus(row.qualification_status),
    qualification_completed_date: asDate(row.qualification_completed_date),
    qualification_expected_completion_date: asDate(row.qualification_expected_completion_date),
    academic_qualification_documents: parseJsonSafe(row.academic_qualification_documents, []),
    nic_documents: row.nic_documents == null ? null : parseJsonSafe(row.nic_documents, []),
    passport_documents:
      row.passport_documents == null ? null : parseJsonSafe(row.passport_documents, []),
    passport_photo: parseJsonSafe(row.passport_photo, {}),
    payment_slip: parseJsonSafe(row.payment_slip, {}),
    terms_accepted: Number(row.terms_accepted) === 1,
    tags: row.tags == null ? null : parseJsonSafe(row.tags, null),
    full_amount: asNumber(row.full_amount),
    current_paid_amount: asNumber(row.current_paid_amount),
    created_at: asTimestamp(row.created_at),
    updated_at: asTimestamp(row.updated_at),
    deleted_at: asTimestamp(row.deleted_at),
  };
}

function normalizePaymentRow(row, oldIdToNewId) {
  const newRegistrationId = oldIdToNewId.get(Number(row.cca_registration_id));
  if (!newRegistrationId) return null;

  return {
    cca_registration_id: newRegistrationId,
    payment_no: Number(row.payment_no),
    payment_date: asDate(row.payment_date),
    amount: asNumber(row.amount),
    payment_method: asString(row.payment_method, "legacy"),
    receipt_reference: asNullableString(row.receipt_reference),
    note: asNullableString(row.note),
    status: normalizePaymentStatus(row.status),
    void_reason: asNullableString(row.void_reason),
    voided_at: asTimestamp(row.voided_at),
    created_by: row.created_by == null ? null : Number(row.created_by),
    updated_by: row.updated_by == null ? null : Number(row.updated_by),
    created_at: asTimestamp(row.created_at),
    updated_at: asTimestamp(row.updated_at),
  };
}

function chunkArray(items, chunkSize) {
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

async function ensureProgramsExist(supabase, registrations) {
  const programByCode = new Map();
  for (const reg of registrations) {
    if (!programByCode.has(reg.program_id)) {
      programByCode.set(reg.program_id, reg);
    }
  }

  const programCodes = [...programByCode.keys()];
  if (!programCodes.length) return { created: 0, existing: 0 };

  const { data: existingPrograms, error: existingProgramsError } = await supabase
    .from("programs")
    .select("code")
    .in("code", programCodes);

  if (existingProgramsError) {
    throw new Error(`Failed to read existing programs: ${existingProgramsError.message}`);
  }

  const existingSet = new Set((existingPrograms || []).map((p) => p.code));
  const missingCodes = programCodes.filter((code) => !existingSet.has(code));
  if (!missingCodes.length) {
    return { created: 0, existing: existingSet.size };
  }

  const { data: maxOrderRows, error: maxOrderError } = await supabase
    .from("programs")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);
  if (maxOrderError) {
    throw new Error(`Failed to fetch program display order: ${maxOrderError.message}`);
  }
  let nextOrder = Number(maxOrderRows?.[0]?.display_order || 0) + 1;

  const payload = missingCodes.map((code) => {
    const source = programByCode.get(code);
    const row = {
      code,
      name: source?.program_name || code,
      year_label: source?.program_year || "N/A",
      duration_label: source?.program_duration || "N/A",
      base_price: source?.full_amount || 0,
      currency: "LKR",
      is_active: false,
      display_order: nextOrder,
    };
    nextOrder += 1;
    return row;
  });

  const { error: insertError } = await supabase.from("programs").insert(payload);
  if (insertError) {
    throw new Error(`Failed to create missing programs: ${insertError.message}`);
  }

  return { created: payload.length, existing: existingSet.size };
}

async function upsertRegistrations(supabase, registrations) {
  const chunks = chunkArray(registrations, 25);
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const { error } = await supabase
      .from("cca_registrations")
      .upsert(chunk, { onConflict: "register_id", ignoreDuplicates: false });
    if (error) {
      throw new Error(
        `Failed upserting registration chunk ${i + 1}/${chunks.length}: ${error.message}`,
      );
    }
  }
}

async function loadRegistrationIdMap(supabase, oldRegistrations) {
  const registerIds = oldRegistrations.map((r) => r.register_id).filter(Boolean);
  const idRows = [];
  const chunks = chunkArray(registerIds, 500);
  for (const chunk of chunks) {
    const { data, error } = await supabase
      .from("cca_registrations")
      .select("id,register_id")
      .in("register_id", chunk);
    if (error) {
      throw new Error(`Failed reading inserted registrations: ${error.message}`);
    }
    idRows.push(...(data || []));
  }

  const registerToNewId = new Map(idRows.map((row) => [row.register_id, Number(row.id)]));
  const oldIdToNewId = new Map();
  for (const oldRow of oldRegistrations) {
    const oldId = Number(oldRow.id);
    const newId = registerToNewId.get(oldRow.register_id);
    if (Number.isFinite(oldId) && Number.isFinite(newId)) {
      oldIdToNewId.set(oldId, newId);
    }
  }
  return oldIdToNewId;
}

async function upsertPayments(supabase, payments) {
  if (!payments.length) return;
  const chunks = chunkArray(payments, 100);
  for (let i = 0; i < chunks.length; i += 1) {
    const { error } = await supabase
      .from("registration_payments")
      .upsert(chunks[i], {
        onConflict: "cca_registration_id,payment_no",
        ignoreDuplicates: false,
      });
    if (error) {
      throw new Error(`Failed upserting payment chunk ${i + 1}/${chunks.length}: ${error.message}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const sqlFile = path.resolve(args.sqlPath);

  const sql = await fs.readFile(sqlFile, "utf8");
  const registrationsParsed = parseTableRows(sql, "cca_registrations");
  const paymentsParsed = parseTableRows(sql, "registration_payments");

  const normalizedRegistrations = registrationsParsed.rows.map(normalizeRegistrationRow);
  const oldRegistrationRows = registrationsParsed.rows;

  console.log(
    `[import-old-registrations] parsed registrations=${normalizedRegistrations.length}, payments=${paymentsParsed.rows.length}`,
  );

  if (!normalizedRegistrations.length) {
    throw new Error("No registration rows found in SQL backup.");
  }

  if (args.dryRun) {
    const programCodes = new Set(normalizedRegistrations.map((r) => r.program_id));
    console.log(
      `[import-old-registrations] dry-run complete: unique programs=${programCodes.size}`,
    );
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment.");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const programsResult = await ensureProgramsExist(supabase, normalizedRegistrations);
  console.log(
    `[import-old-registrations] programs existing=${programsResult.existing}, created=${programsResult.created}`,
  );

  await upsertRegistrations(supabase, normalizedRegistrations);
  console.log(
    `[import-old-registrations] registrations upserted=${normalizedRegistrations.length}`,
  );

  if (args.importPayments) {
    const oldIdToNewId = await loadRegistrationIdMap(supabase, oldRegistrationRows);
    const normalizedPayments = paymentsParsed.rows
      .map((row) => normalizePaymentRow(row, oldIdToNewId))
      .filter(Boolean);
    const skippedPayments = paymentsParsed.rows.length - normalizedPayments.length;
    await upsertPayments(supabase, normalizedPayments);
    console.log(
      `[import-old-registrations] payments upserted=${normalizedPayments.length}, skipped=${skippedPayments}`,
    );
  } else {
    console.log("[import-old-registrations] payment import skipped by --no-payments");
  }

  const { count: registrationCount, error: registrationCountError } = await supabase
    .from("cca_registrations")
    .select("id", { count: "exact", head: true });
  if (registrationCountError) {
    throw new Error(`Failed to verify registration count: ${registrationCountError.message}`);
  }
  const { count: paymentCount, error: paymentCountError } = await supabase
    .from("registration_payments")
    .select("id", { count: "exact", head: true });
  if (paymentCountError) {
    throw new Error(`Failed to verify payment count: ${paymentCountError.message}`);
  }

  console.log(
    `[import-old-registrations] complete registrations_total=${registrationCount || 0}, payments_total=${paymentCount || 0}`,
  );
}

main().catch((error) => {
  console.error(`[import-old-registrations] failed: ${error.message}`);
  process.exit(1);
});
