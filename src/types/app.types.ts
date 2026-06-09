export type RetentionPolicy = {
  policy: "end_of_school_year" | "custom" | "none";
  retainUntil: string | null;
  note: string;
};

export type BillingPlan = {
  plan: "free" | "paid_storage";
  paymentStatus: "not_required" | "payment_required" | "active";
  storageQuotaBytes: number;
  checkoutUrl?: string | null;
  paidAt?: string;
  paymentProvider?: string;
  externalPaymentId?: string;
};

export type EasyDataApp = {
  id: string;
  name: string;
  description?: string;
  apiToken: string;
  createdAt: string;
  retentionPolicy: RetentionPolicy;
  billing: BillingPlan;
};
