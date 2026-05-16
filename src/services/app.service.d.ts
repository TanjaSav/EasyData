import { type EasyDataApp } from "../types/app.types.js";
export declare function createApp(name: string, description?: string): EasyDataApp;
export declare function getAppMeta(appId: string): EasyDataApp;
export declare function validateAppToken(appId: string, token: string): boolean;
export declare function listApps(): EasyDataApp[];
//# sourceMappingURL=app.service.d.ts.map