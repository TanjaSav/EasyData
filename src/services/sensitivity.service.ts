import type { ColumnDefinition } from "../types/table.types.js";

export type SensitivityWarning = {
  field: string;
  category: string;
  message: string;
};

const patterns = [
  { category: "photos and media", words: ["photo", "image", "video", "face"] },
  { category: "health", words: ["health", "medical", "diagnosis", "allergy", "medication"] },
  { category: "location", words: ["location", "gps", "address", "home_address"] },
  { category: "behavior", words: ["behavior", "discipline", "incident"] },
  { category: "identity", words: ["student_name", "email", "phone", "kennitala", "national_id"] },
  { category: "special category", words: ["religion", "ethnicity", "disability", "special_needs"] },
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
          message: `Field '${column.name}' may contain ${pattern.category} data. Collect only what is necessary and define a retention period.`,
        });
        break;
      }
    }
  }

  return warnings;
}
