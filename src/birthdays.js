// Keep calendar dates as strings to avoid timezone shifts.
export function normalizeBirthDate(value) {
  if (typeof value !== "string") return "";
  const date = value.split("T")[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : "";
}

export function birthdaysInMonth(participants, month) {
  return participants
    .filter(p => Number(normalizeBirthDate(p.birthDate).slice(5, 7)) === month)
    .sort((a, b) => a.birthDate.slice(8, 10).localeCompare(b.birthDate.slice(8, 10)) || a.name.localeCompare(b.name, "pt-BR"));
}
