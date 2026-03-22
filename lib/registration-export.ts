export const REGISTRATION_EXPORT_DATA_KEYS = [
  "registerId",
  "programId",
  "programName",
  "programYear",
  "programDuration",
  "fullName",
  "nameWithInitials",
  "gender",
  "dateOfBirth",
  "nicNumber",
  "passportNumber",
  "nationality",
  "countryOfBirth",
  "countryOfResidence",
  "permanentAddress",
  "postalCode",
  "country",
  "district",
  "province",
  "emailAddress",
  "whatsappNumber",
  "homeContactNumber",
  "guardianContactName",
  "guardianContactNumber",
  "highestQualification",
  "qualificationOtherDetails",
  "qualificationStatus",
  "qualificationCompletedDate",
  "qualificationExpectedCompletionDate",
  "fullAmount",
  "currentPaidAmount",
  "tags",
  "termsAccepted",
  "createdAt",
  "updatedAt",
  "deletedAt",
] as const;

export type RegistrationExportDataKey =
  (typeof REGISTRATION_EXPORT_DATA_KEYS)[number];

export const REGISTRATION_EXPORT_FIELD_KEYS = [
  "registerId",
  "status",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "programId",
  "programName",
  "programYear",
  "programDuration",
  "fullName",
  "nameWithInitials",
  "gender",
  "dateOfBirth",
  "identifier",
  "nicNumber",
  "passportNumber",
  "nationality",
  "countryOfBirth",
  "countryOfResidence",
  "permanentAddress",
  "postalCode",
  "country",
  "province",
  "district",
  "emailAddress",
  "whatsappNumber",
  "homeContactNumber",
  "guardianContactName",
  "guardianContactNumber",
  "highestQualification",
  "qualificationOtherDetails",
  "qualificationStatus",
  "qualificationCompletedDate",
  "qualificationExpectedCompletionDate",
  "fullAmount",
  "currentPaidAmount",
  "balanceAmount",
  "tags",
  "termsAccepted",
] as const;

export type RegistrationExportFieldKey =
  (typeof REGISTRATION_EXPORT_FIELD_KEYS)[number];

export const REGISTRATION_EXPORT_GROUPS = [
  { key: "core", label: "Core" },
  { key: "program", label: "Program" },
  { key: "personal", label: "Personal" },
  { key: "location", label: "Location" },
  { key: "contact", label: "Contact" },
  { key: "guardian", label: "Guardian" },
  { key: "qualification", label: "Qualification" },
  { key: "finance", label: "Finance" },
] as const;

export type RegistrationExportGroupKey =
  (typeof REGISTRATION_EXPORT_GROUPS)[number]["key"];

export type RegistrationExportFieldDefinition = {
  key: RegistrationExportFieldKey;
  label: string;
  group: RegistrationExportGroupKey;
  description: string;
  dataKeys: readonly RegistrationExportDataKey[];
  defaultSelected?: boolean;
};

export const REGISTRATION_EXPORT_FIELDS: readonly RegistrationExportFieldDefinition[] = [
  {
    key: "registerId",
    label: "Registration ID",
    group: "core",
    description: "System-generated registration reference.",
    dataKeys: ["registerId"],
    defaultSelected: true,
  },
  {
    key: "status",
    label: "Status",
    group: "core",
    description: "Active or trashed registration state.",
    dataKeys: ["deletedAt"],
  },
  {
    key: "createdAt",
    label: "Created At",
    group: "core",
    description: "When the registration was submitted.",
    dataKeys: ["createdAt"],
    defaultSelected: true,
  },
  {
    key: "updatedAt",
    label: "Updated At",
    group: "core",
    description: "Last modification timestamp.",
    dataKeys: ["updatedAt"],
  },
  {
    key: "deletedAt",
    label: "Deleted At",
    group: "core",
    description: "Trash timestamp when applicable.",
    dataKeys: ["deletedAt"],
  },
  {
    key: "programId",
    label: "Program ID",
    group: "program",
    description: "Program code selected by the student.",
    dataKeys: ["programId"],
    defaultSelected: true,
  },
  {
    key: "programName",
    label: "Program Name",
    group: "program",
    description: "Program name snapshot stored on registration.",
    dataKeys: ["programName"],
    defaultSelected: true,
  },
  {
    key: "programYear",
    label: "Program Year",
    group: "program",
    description: "Program year label at submission time.",
    dataKeys: ["programYear"],
  },
  {
    key: "programDuration",
    label: "Program Duration",
    group: "program",
    description: "Program duration label at submission time.",
    dataKeys: ["programDuration"],
  },
  {
    key: "fullName",
    label: "Full Name",
    group: "personal",
    description: "Student full name.",
    dataKeys: ["fullName"],
    defaultSelected: true,
  },
  {
    key: "nameWithInitials",
    label: "Name With Initials",
    group: "personal",
    description: "Name with initials as submitted.",
    dataKeys: ["nameWithInitials"],
  },
  {
    key: "gender",
    label: "Gender",
    group: "personal",
    description: "Stored gender value.",
    dataKeys: ["gender"],
  },
  {
    key: "dateOfBirth",
    label: "Date Of Birth",
    group: "personal",
    description: "Student date of birth.",
    dataKeys: ["dateOfBirth"],
  },
  {
    key: "identifier",
    label: "NIC / Passport",
    group: "personal",
    description: "Best available identity number.",
    dataKeys: ["nicNumber", "passportNumber"],
    defaultSelected: true,
  },
  {
    key: "nicNumber",
    label: "NIC Number",
    group: "personal",
    description: "National identity card number.",
    dataKeys: ["nicNumber"],
  },
  {
    key: "passportNumber",
    label: "Passport Number",
    group: "personal",
    description: "Passport number for international students.",
    dataKeys: ["passportNumber"],
  },
  {
    key: "nationality",
    label: "Nationality",
    group: "personal",
    description: "Declared nationality.",
    dataKeys: ["nationality"],
  },
  {
    key: "countryOfBirth",
    label: "Country Of Birth",
    group: "location",
    description: "Country of birth.",
    dataKeys: ["countryOfBirth"],
  },
  {
    key: "countryOfResidence",
    label: "Country Of Residence",
    group: "location",
    description: "Country of permanent residence.",
    dataKeys: ["countryOfResidence"],
  },
  {
    key: "permanentAddress",
    label: "Permanent Address",
    group: "location",
    description: "Permanent address.",
    dataKeys: ["permanentAddress"],
  },
  {
    key: "postalCode",
    label: "Postal Code",
    group: "location",
    description: "Postal code.",
    dataKeys: ["postalCode"],
  },
  {
    key: "country",
    label: "Country",
    group: "location",
    description: "Country field submitted with address.",
    dataKeys: ["country"],
  },
  {
    key: "province",
    label: "Province",
    group: "location",
    description: "Province when provided.",
    dataKeys: ["province"],
  },
  {
    key: "district",
    label: "District",
    group: "location",
    description: "District when provided.",
    dataKeys: ["district"],
  },
  {
    key: "emailAddress",
    label: "Email Address",
    group: "contact",
    description: "Student email address.",
    dataKeys: ["emailAddress"],
    defaultSelected: true,
  },
  {
    key: "whatsappNumber",
    label: "WhatsApp Number",
    group: "contact",
    description: "Primary WhatsApp contact.",
    dataKeys: ["whatsappNumber"],
    defaultSelected: true,
  },
  {
    key: "homeContactNumber",
    label: "Home Contact Number",
    group: "contact",
    description: "Alternate home contact when provided.",
    dataKeys: ["homeContactNumber"],
  },
  {
    key: "guardianContactName",
    label: "Guardian Name",
    group: "guardian",
    description: "Guardian contact name.",
    dataKeys: ["guardianContactName"],
  },
  {
    key: "guardianContactNumber",
    label: "Guardian Number",
    group: "guardian",
    description: "Guardian contact number.",
    dataKeys: ["guardianContactNumber"],
  },
  {
    key: "highestQualification",
    label: "Highest Qualification",
    group: "qualification",
    description: "Highest qualification level.",
    dataKeys: ["highestQualification"],
  },
  {
    key: "qualificationOtherDetails",
    label: "Qualification Other Details",
    group: "qualification",
    description: "Additional qualification text when applicable.",
    dataKeys: ["qualificationOtherDetails"],
  },
  {
    key: "qualificationStatus",
    label: "Qualification Status",
    group: "qualification",
    description: "Completed or ongoing.",
    dataKeys: ["qualificationStatus"],
  },
  {
    key: "qualificationCompletedDate",
    label: "Qualification Completed Date",
    group: "qualification",
    description: "Completed date when provided.",
    dataKeys: ["qualificationCompletedDate"],
  },
  {
    key: "qualificationExpectedCompletionDate",
    label: "Qualification Expected Completion Date",
    group: "qualification",
    description: "Expected completion date for ongoing studies.",
    dataKeys: ["qualificationExpectedCompletionDate"],
  },
  {
    key: "fullAmount",
    label: "Full Amount",
    group: "finance",
    description: "Full fee amount.",
    dataKeys: ["fullAmount"],
    defaultSelected: true,
  },
  {
    key: "currentPaidAmount",
    label: "Paid Amount",
    group: "finance",
    description: "Stored paid amount value.",
    dataKeys: ["currentPaidAmount"],
    defaultSelected: true,
  },
  {
    key: "balanceAmount",
    label: "Balance Amount",
    group: "finance",
    description: "Full amount minus paid amount.",
    dataKeys: ["fullAmount", "currentPaidAmount"],
  },
  {
    key: "tags",
    label: "Tags",
    group: "finance",
    description: "Registration tags or offers.",
    dataKeys: ["tags"],
  },
  {
    key: "termsAccepted",
    label: "Terms Accepted",
    group: "finance",
    description: "Whether terms were accepted.",
    dataKeys: ["termsAccepted"],
  },
] as const;

export const DEFAULT_REGISTRATION_EXPORT_FIELD_KEYS =
  REGISTRATION_EXPORT_FIELDS.filter((field) => field.defaultSelected).map(
    (field) => field.key,
  );

type RegistrationExportRow = Partial<
  Record<RegistrationExportDataKey, unknown>
>;

function toTrimmedString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toDateString(value: unknown): string {
  const raw = toTrimmedString(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toISOString().slice(0, 10);
}

function toDateTimeString(value: unknown): string {
  const raw = toTrimmedString(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toISOString();
}

function toCurrencyString(value: unknown): string {
  const raw = toTrimmedString(value);
  if (!raw) return "";
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return raw;
  return parsed.toFixed(2);
}

function toBalanceString(
  fullAmount: unknown,
  currentPaidAmount: unknown,
): string {
  const full = Number(toTrimmedString(fullAmount) || "0");
  const paid = Number(toTrimmedString(currentPaidAmount) || "0");

  if (!Number.isFinite(full) && !Number.isFinite(paid)) {
    return "";
  }

  return ((Number.isFinite(full) ? full : 0) - (Number.isFinite(paid) ? paid : 0))
    .toFixed(2);
}

export function getOrderedRegistrationExportFields(
  selectedFieldKeys?: readonly RegistrationExportFieldKey[],
): RegistrationExportFieldDefinition[] {
  const activeKeys = new Set(
    (selectedFieldKeys?.length
      ? selectedFieldKeys
      : DEFAULT_REGISTRATION_EXPORT_FIELD_KEYS) as readonly RegistrationExportFieldKey[],
  );

  return REGISTRATION_EXPORT_FIELDS.filter((field) => activeKeys.has(field.key));
}

export function getRegistrationExportFieldsByGroup(): Array<{
  key: RegistrationExportGroupKey;
  label: string;
  fields: RegistrationExportFieldDefinition[];
}> {
  return REGISTRATION_EXPORT_GROUPS.map((group) => ({
    ...group,
    fields: REGISTRATION_EXPORT_FIELDS.filter((field) => field.group === group.key),
  }));
}

export function getRegistrationExportCellValue(
  row: RegistrationExportRow,
  fieldKey: RegistrationExportFieldKey,
): string {
  switch (fieldKey) {
    case "status":
      return row.deletedAt ? "Trashed" : "Active";
    case "createdAt":
    case "updatedAt":
    case "deletedAt":
      return toDateTimeString(row[fieldKey]);
    case "dateOfBirth":
    case "qualificationCompletedDate":
    case "qualificationExpectedCompletionDate":
      return toDateString(row[fieldKey]);
    case "identifier":
      return toTrimmedString(row.nicNumber) || toTrimmedString(row.passportNumber);
    case "fullAmount":
    case "currentPaidAmount":
      return toCurrencyString(row[fieldKey]);
    case "balanceAmount":
      return toBalanceString(row.fullAmount, row.currentPaidAmount);
    case "tags":
      return Array.isArray(row.tags)
        ? row.tags
            .map((tag) => toTrimmedString(tag))
            .filter(Boolean)
            .join(" | ")
        : toTrimmedString(row.tags);
    case "termsAccepted":
      return row.termsAccepted ? "Yes" : "No";
    default:
      return toTrimmedString(row[fieldKey as RegistrationExportDataKey]);
  }
}

