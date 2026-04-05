const locationDisplayNameById = {
  1: "Admin Block",
  2: "Computer Engineering Block (D1)",
  3: "IT & EC Department (D2)",
  4: "Humanities Block (D3)",
  5: "Commerce Department (D4)",
  6: "Civil Construction Site (D5)",
  7: "Civil Department (D6)",
  8: "Mechanical Department (D7)",
  9: "Pharmacy Block (D8)",
};

export function normalizeCampusLocationName(name, id = null) {
  const numericId = Number(id);
  if (Number.isSafeInteger(numericId) && locationDisplayNameById[numericId]) {
    return locationDisplayNameById[numericId];
  }

  const raw = String(name ?? "").trim();
  if (!raw) return raw;
  return raw;
}

export function mapCabinToBuilding(cabin) {
  const raw = String(cabin ?? "").trim();
  if (!raw) return null;

  if (raw.startsWith("D1")) return "Computer Engineering Block (D1)";
  if (raw.startsWith("D2")) return "IT & EC Department (D2)";
  if (raw.startsWith("D3")) return "Humanities Block (D3)";
  if (raw.startsWith("D4")) return "Commerce Department (D4)";
  if (raw.startsWith("D5")) return "Civil Construction Site (D5)";
  if (raw.startsWith("D6")) return "Civil Department (D6)";
  if (raw.startsWith("D7")) return "Mechanical Department (D7)";
  if (raw.startsWith("D8")) return "Pharmacy Block (D8)";

  return null;
}

export function mapCabinToLocationId(cabin) {
  const raw = String(cabin ?? "").trim();
  if (!raw) return null;

  if (raw.startsWith("D1")) return 2;
  if (raw.startsWith("D2")) return 3;
  if (raw.startsWith("D3")) return 4;
  if (raw.startsWith("D4")) return 5;
  if (raw.startsWith("D5")) return 6;
  if (raw.startsWith("D6")) return 7;
  if (raw.startsWith("D7")) return 8;
  if (raw.startsWith("D8")) return 9;

  return null;
}
