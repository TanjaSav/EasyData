export type ColumnDefinition = {
  name: string;
  type: "TEXT" | "INTEGER" | "REAL" | "BOOLEAN";
};

export type CreateTableInput = {
  tableName: string;
  columns: ColumnDefinition[];
};