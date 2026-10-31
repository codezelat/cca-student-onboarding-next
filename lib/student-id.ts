const formatter = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "Asia/Colombo" });

export function formatStudentId(registerId: string, registeredAt: Date | string) {
  const id = registerId.trim().toUpperCase();
  const date = new Date(registeredAt);
  return Number.isNaN(date.getTime()) ? id : `${id}-${formatter.format(date).slice(-2)}`;
}
