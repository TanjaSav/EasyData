const identifierPattern = /^[A-Za-z][A-Za-z0-9_]*$/;

const reservedIdentifiers = new Set([
  "sqlite_master",
  "sqlite_sequence",
  "easydata_meta",
  "_easydata_meta",
]);

export function validateIdentifier(value: string, label = "Identifier") {
  if (!identifierPattern.test(value) || reservedIdentifiers.has(value.toLowerCase())) {
    throw new Error(
      `${label} is invalid. Use letters, numbers, and underscores only; start with a letter; do not use internal table names.`
    );
  }

  return value;
}

export function validateIdentifiers(values: string[], label = "Identifier") {
  for (const value of values) {
    validateIdentifier(value, label);
  }

  return values;
}
