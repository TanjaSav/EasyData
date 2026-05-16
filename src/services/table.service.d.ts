import type { CreateTableInput } from "../types/table.types.js";
export declare function getAppSchema(appId: string): {
    table: any;
    columns: unknown[];
}[];
export declare function createTable(appId: string, input: CreateTableInput): {
    success: boolean;
    table: string;
};
export declare function alterTable(appId: string, tableName: string, columns: CreateTableInput["columns"]): {
    success: boolean;
    table: string;
    addedColumns: import("../types/table.types.js").ColumnDefinition[];
};
export declare function insertRow(appId: string, tableName: string, data: Record<string, unknown>): {
    success: boolean;
    table: string;
    rowId: number | bigint;
};
export declare function getRows(appId: string, tableName: string, options?: {
    where?: string;
    order?: string;
    limit?: string;
}): unknown[];
export declare function updateRow(appId: string, tableName: string, rowId: string, data: Record<string, unknown>): {
    success: boolean;
    table: string;
    rowId: string;
    changes: number;
};
export declare function deleteRow(appId: string, tableName: string, rowId: string): {
    success: boolean;
    table: string;
    rowId: string;
    changes: number;
};
//# sourceMappingURL=table.service.d.ts.map