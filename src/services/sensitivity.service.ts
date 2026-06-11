import type { ColumnDefinition } from "../types/table.types.js";

export type SensitivityWarning = {
  field: string;
  category: string;
  message: string;
};

const patterns = [
  {
    category: "photos and media",
    words: ["photo", "image", "video", "face"],
    gdprWarning: "Student media can identify minors. Under GDPR Articles 7 & 8, processing data of children (under 13 in Iceland, or up to 16 in other EU states) requires verified parental consent. Biometric processing (face scanning) also violates GDPR Article 9 without explicit consent.",
  },
  {
    category: "health",
    words: ["health", "medical", "diagnosis", "allergy", "medication"],
    gdprWarning: "Health data is classified as Special Category Data under GDPR Article 9. Processing health details (e.g. diagnoses, medical history) is prohibited in unofficial classroom apps unless explicit parental consent and high security measures are put in place.",
  },
  {
    category: "location",
    words: ["location", "gps", "address", "home_address"],
    gdprWarning: "Physical location data and addresses pose high security/safety risks. Collecting location details requires a clear legal basis and strong security controls under GDPR Article 5(1)(f).",
  },
  {
    category: "behavior",
    words: ["behavior", "discipline", "incident"],
    gdprWarning: "Discipline and behavior notes are highly sensitive personal data. Storing behavioral logs in local databases without school authorization violates GDPR Article 5(1)(c) (Data Minimization) and Article 6.",
  },
  {
    category: "identity",
    words: ["student_name", "email", "phone", "kennitala", "national_id"],
    gdprWarning: "National identification numbers (like Iceland's Kennitala) are subject to strict national rules under GDPR Article 87. General student identifiers (names, emails) must be minimized; consider using randomized/pseudonymous IDs (GDPR Article 25).",
  },
  {
    category: "special category",
    words: ["religion", "ethnicity", "disability", "special_needs"],
    gdprWarning: "Special category data (religion, ethnic origin, disability) is strictly prohibited under GDPR Article 9 unless an explicit legal exception applies. Do not collect this information in unofficial classroom apps.",
  },
];

export function analyzeSensitiveColumns(
  columns: ColumnDefinition[]
): SensitivityWarning[] {
  const warnings: SensitivityWarning[] = [];

  for (const column of columns) {
    const normalized = column.name.toLowerCase();

    for (const pattern of patterns) {
      if (pattern.words.some((word) => normalized.includes(word))) {
        warnings.push({
          field: column.name,
          category: pattern.category,
          message: `Field '${column.name}' collects sensitive ${pattern.category} data. GDPR Warning: ${pattern.gdprWarning}`,
        });
        break;
      }
    }
  }

  return warnings;
}
