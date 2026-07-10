export const CERTIFICATE_RESULT_VALUES = [
  "A",
  "B",
  "C",
  "D",
  "F",
  "Pass",
  "Merit",
  "Distinction",
  "Refer",
  "Withheld",
] as const;

export type CertificateResultValue = (typeof CERTIFICATE_RESULT_VALUES)[number];
