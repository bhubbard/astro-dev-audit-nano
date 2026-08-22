export type AuditSeverity = 'error' | 'warning' | 'info';

export type AuditCategory = 'a11y' | 'seo';

export interface AuditIssue {
  id: string;
  ruleId: string;
  category: AuditCategory;
  severity: AuditSeverity;
  title: string;
  description: string;
  wcagCriterion?: string;
  element?: Element;
  selector?: string;
  htmlSnippet?: string;
  context?: Record<string, unknown>;
  remedyHint?: string;
  aiSuggestedFix?: string;
}

export interface AuditSummary {
  total: number;
  errors: number;
  warnings: number;
  info: number;
}

export interface AuditResult {
  issues: AuditIssue[];
  summary: AuditSummary;
  timestamp: number;
  url: string;
}

export interface AuditorContext {
  document: Document;
  root?: Element | Document;
}
