import type { AuditIssue } from './types.js';
import { getElementSelector } from './headings.js';

const GENERIC_LINK_TEXTS = [
  /^click\s+here$/i,
  /^here$/i,
  /^read\s+more$/i,
  /^learn\s+more$/i,
  /^more$/i,
  /^link$/i,
  /^go$/i,
  /^details$/i,
  /^this\s+page$/i,
];

export function auditSeo(root: Document | Element = typeof document !== 'undefined' ? document : ({} as Document)): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (!root) return issues;

  const doc = (root && 'ownerDocument' in root && (root as Element).ownerDocument)
    ? (root as Element).ownerDocument
    : (typeof document !== 'undefined' ? document : null);

  if (doc) {
    // 1. Check HTML lang attribute (WCAG 3.1.1 & SEO)
    const htmlEl = doc.documentElement;
    if (htmlEl) {
      const lang = htmlEl.getAttribute('lang');
      if (!lang || !lang.trim()) {
        issues.push({
          id: 'seo-html-lang-missing',
          ruleId: 'html-lang-missing',
          category: 'a11y',
          severity: 'error',
          title: 'Missing <html lang> attribute',
          description: 'The <html> element does not have a lang attribute. Screen readers and search engine indexing bots rely on this to pronounce and categorize the language correctly.',
          wcagCriterion: 'WCAG 3.1.1 Language of Page (Level A)',
          element: htmlEl,
          selector: 'html',
          htmlSnippet: '<html>',
          remedyHint: 'Add a lang attribute to your <html> tag, e.g. <html lang="en">.',
        });
      }
    }

    // 2. Check Document Title
    const titleEl = doc.querySelector('title');
    const titleText = titleEl ? (titleEl.textContent || '').trim() : '';
    if (!titleEl || !titleText) {
      issues.push({
        id: 'seo-title-missing',
        ruleId: 'meta-title-missing',
        category: 'seo',
        severity: 'error',
        title: 'Missing or empty <title> tag',
        description: 'The document lacks a <title> element or the title is empty. Page titles are critical for tab identification, screen readers, and search engine results.',
        wcagCriterion: 'WCAG 2.4.2 Page Titled (Level A)',
        remedyHint: 'Add a descriptive <title> tag inside the <head> section.',
      });
    } else if (titleText.length < 10) {
      issues.push({
        id: 'seo-title-short',
        ruleId: 'meta-title-short',
        category: 'seo',
        severity: 'warning',
        title: `Short document title (${titleText.length} chars)`,
        description: `The page title "${titleText}" is very short (< 10 chars). Descriptive titles (30-60 characters) improve search ranking and user comprehension.`,
        wcagCriterion: 'WCAG 2.4.2 Page Titled (Level A)',
        remedyHint: 'Expand the title to accurately summarize the specific page content.',
        context: { title: titleText, length: titleText.length },
      });
    }

    // 3. Check Meta Description
    const metaDesc = doc.querySelector('meta[name="description"]');
    const descContent = metaDesc ? (metaDesc.getAttribute('content') || '').trim() : '';
    if (!metaDesc || !descContent) {
      issues.push({
        id: 'seo-description-missing',
        ruleId: 'meta-description-missing',
        category: 'seo',
        severity: 'warning',
        title: 'Missing meta description',
        description: 'No <meta name="description"> tag found. Search engines display this snippet in search results to attract clicks.',
        remedyHint: 'Add <meta name="description" content="..."> with 50-160 characters describing the page.',
      });
    }

    // 4. Check Viewport Meta
    const viewportMeta = doc.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      issues.push({
        id: 'seo-viewport-missing',
        ruleId: 'meta-viewport-missing',
        category: 'seo',
        severity: 'error',
        title: 'Missing responsive viewport meta tag',
        description: 'No <meta name="viewport"> tag detected. Mobile devices will render at desktop width without mobile responsiveness.',
        remedyHint: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to <head>.',
      });
    }
  }

  // 5. Check Generic Link Text
  if (typeof root.querySelectorAll === 'function') {
    const links = Array.from(root.querySelectorAll('a[href]'));
    links.forEach((a, index) => {
      const text = (a.textContent || '').trim();
      const ariaLabel = a.getAttribute('aria-label') || a.getAttribute('aria-labelledby');
      const href = a.getAttribute('href') || '';
      
      if (!ariaLabel && GENERIC_LINK_TEXTS.some(p => p.test(text))) {
        issues.push({
          id: `seo-generic-link-${index}`,
          ruleId: 'link-text-generic',
          category: 'a11y',
          severity: 'warning',
          title: `Generic link anchor text: "${text}"`,
          description: `The link text "${text}" is generic and does not convey the destination context when read out of context by screen reader link-lists.`,
          wcagCriterion: 'WCAG 2.4.4 Link Purpose (In Context) (Level A)',
          element: a,
          selector: getElementSelector(a),
          htmlSnippet: a.outerHTML ? a.outerHTML.slice(0, 160) : `<a>${text}</a>`,
          remedyHint: 'Use descriptive text or an aria-label indicating what will happen when clicking this link.',
          context: { text, href },
        });
      }
    });
  }

  return issues;
}
