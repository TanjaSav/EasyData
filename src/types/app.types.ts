export type RetentionPolicy = {
  policy: "end_of_school_year" | "custom" | "none";
  retainUntil: string | null;
  note: string;
};

export type EasyDataApp = {
  id: string;
  name: string;
  description?: string;
  apiToken: string;
  createdAt: string;
  retentionPolicy: RetentionPolicy;
};
