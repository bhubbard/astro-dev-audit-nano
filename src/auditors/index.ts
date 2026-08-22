import type { AuditIssue, AuditResult } from './types.js';
import { auditHeadings } from './headings.js';
import { auditImages } from './images.js';
import { auditContrast } from './contrast.js';
import { auditSeo } from './seo.js';

export * from './types.js';
export * from './headings.js';
export * from './images.js';
export * from './contrast.js';
export * from './seo.js';

export function runAudit(root: Document | Element = typeof document !== 'undefined' ? document : ({} as Document)): AuditResult {
  const issues: AuditIssue[] = [];

  issues.push(...auditHeadings(root));
  issues.push(...auditImages(root));
  issues.push(...auditContrast(root));
  issues.push(...auditSeo(root));

  const summary = {
    total: issues.length,
    errors: issues.filter(i => i.severity === 'error').length,
    warnings: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
  };

  const currentUrl = typeof window !== 'undefined' && window.location ? window.location.href : 'http://localhost:4321';

  return {
    issues,
    summary,
    timestamp: Date.now(),
    url: currentUrl,
  };
}
