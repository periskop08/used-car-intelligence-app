export interface ReportFilterDto {
  dateFrom?: string;
  dateTo?: string;
  periodCompare?: boolean;
  package?: string;
  userType?: string;
  country?: string;
  city?: string;
  language?: string;
  device?: string;
  brand?: string;
  model?: string;
  aiProvider?: string;
  status?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface KpiMetric {
  key: string;
  title: string;
  value: number;
  previousValue?: number;
  changePercentage?: number;
  trend?: 'up' | 'down' | 'neutral';
  alertLevel?: 'normal' | 'warning' | 'critical';
  drilldownKey?: string;
  drilldownParams?: Record<string, string | number | boolean>;
  formattedValue?: string;
}

export interface ChartSeriesPoint {
  x: string;
  y: number;
}

export interface ChartSeries {
  name: string;
  data: ChartSeriesPoint[];
}

export interface ReportColumnDefinition {
  key: string;
  label: string;
  type: 'STRING' | 'NUMBER' | 'MONEY' | 'DATE' | 'BADGE' | 'CUSTOMER_REF';
  sortable?: boolean;
}

export interface ReportDrilldownResponse {
  drilldownKey: string;
  total: number;
  columns: ReportColumnDefinition[];
  rows: Record<string, unknown>[];
  nextCursor?: string;
  appliedFilters: ReportFilterDto;
}

export interface CreateExportJobDto {
  reportType: string;
  format: 'CSV' | 'XLSX';
  filters: ReportFilterDto;
  columns?: string[];
}

export interface ExportJobStatusDto {
  jobId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  progressPercent: number;
  rowCount?: number;
  fileName?: string;
  downloadUrl?: string;
  errorCode?: string;
  failureReason?: string;
  expiresAt?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ImportAdSpendDto {
  date: string;
  channel: string;
  externalAccountId?: string;
  externalCampaignId?: string;
  campaignName: string;
  spendAmount: number;
  currency?: string;
  impressions?: number;
  clicks?: number;
}
