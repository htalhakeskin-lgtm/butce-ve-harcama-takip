export const REPORT_PERIODS = ["6m", "12m", "year"] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];
