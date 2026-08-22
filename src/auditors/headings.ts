import type { AuditIssue } from './types.js';

export function getHeadingLevel(el: Element): number | null {
  const tagName = el.tagName.toLowerCase();
  const match = tagName.match(/^h([1-6])$/);
  if (match) {
    return parseInt(match[1], 10);
  }

  const role = el.getAttribute('role');
  if (role === 'heading') {
    const ariaLevel = el.getAttribute('aria-level');
    if (ariaLevel) {
      const level = parseInt(ariaLevel, 10);
      if (!isNaN(level) && level >= 1 && level <= 6) {
        return level;
      }
    }
    return 2; // default heading level if role="heading" has no aria-level
  }

  return null;
}

export function getElementSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  const tag = el.tagName.toLowerCase();
  const classes = Array.from(el.classList).slice(0, 2).map(c => `.${c}`).join('');
  
  if (el.parentElement) {
    const siblings = Array.from(el.parentElement.children).filter(c => c.tagName === el.tagName);
    if (siblings.length > 1) {
      const index = siblings.indexOf(el) + 1;
      return `${tag}${classes}:nth-of-type(${index})`;
    }
  }
  return `${tag}${classes}`;
}

export function auditHeadings(root: Document | Element = typeof document !== 'undefined' ? document : ({} as Document)): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (!root || typeof root.querySelectorAll !== 'function') {
    return issues;
  }

  const headingElements = Array.from(
    root.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')
  );

  if (headingElements.length === 0) {
    issues.push({
      id: 'headings-none',
      ruleId: 'headings-none',
      category: 'a11y',
      severity: 'warning',
      title: 'No heading elements found',
      description: 'The page contains no heading elements (h1-h6). Headings provide structure and aid navigation for screen reader users.',
      wcagCriterion: 'WCAG 1.3.1 Info and Relationships (Level A)',
      remedyHint: 'Add an <h1> heading to identify the primary subject of the page.',
    });
    return issues;
  }

  const h1Elements: Element[] = [];
  let previousLevel = 0;

  headingElements.forEach((el, index) => {
    const level = getHeadingLevel(el);
    if (level === null) return;

    const text = (el.textContent || '').trim();
    const selector = getElementSelector(el);
    const htmlSnippet = el.outerHTML ? el.outerHTML.slice(0, 160) : `<h${level}>${text}</h${level}>`;

    // Check empty heading
    if (text.length === 0 && !el.querySelector('img[alt], svg[aria-label]')) {
      issues.push({
        id: `headings-empty-${index}`,
        ruleId: 'headings-empty',
        category: 'a11y',
        severity: 'error',
        title: `Empty <h${level}> heading`,
        description: `The <h${level}> heading has no accessible text content. Screen readers announce blank headings, causing confusion.`,
        wcagCriterion: 'WCAG 1.3.1 Info and Relationships (Level A)',
        element: el,
        selector,
        htmlSnippet,
        remedyHint: `Provide descriptive text content inside this <h${level}> or remove the empty tag.`,
        context: { level, text },
      });
    }

    if (level === 1) {
      h1Elements.push(el);
    }

    // Check first heading level
    if (index === 0 && level > 1) {
      issues.push({
        id: `headings-first-not-h1`,
        ruleId: 'headings-invalid-start',
        category: 'a11y',
        severity: 'warning',
        title: `Page heading structure starts with <h${level}> instead of <h1>`,
        description: `The first heading on the page is <h${level}>. Main content should begin with an <h1> describing the document topic.`,
        wcagCriterion: 'WCAG 1.3.1 Info and Relationships (Level A)',
        element: el,
        selector,
        htmlSnippet,
        remedyHint: `Change this <h${level}> to an <h1> or ensure the primary page heading precedes it.`,
        context: { level, text },
      });
    }

    // Check skipped heading levels (e.g. h1 -> h3 or h2 -> h4)
    if (previousLevel > 0 && level > previousLevel + 1) {
      issues.push({
        id: `headings-skip-${index}`,
        ruleId: 'headings-skip-level',
        category: 'a11y',
        severity: 'error',
        title: `Skipped heading level: <h${previousLevel}> to <h${level}>`,
        description: `Heading level jumps from <h${previousLevel}> to <h${level}> without an intervening <h${previousLevel + 1}>. Headings must not skip levels.`,
        wcagCriterion: 'WCAG 1.3.1 Info and Relationships (Level A)',
        element: el,
        selector,
        htmlSnippet,
        remedyHint: `Change this <h${level}> to an <h${previousLevel + 1}> or add the missing intermediate heading.`,
        context: { previousLevel, currentLevel: level, text },
      });
    }

    previousLevel = level;
  });

  // Check missing H1
  if (h1Elements.length === 0) {
    issues.push({
      id: 'headings-missing-h1',
      ruleId: 'headings-missing-h1',
      category: 'seo',
      severity: 'error',
      title: 'Missing top-level <h1> heading',
      description: 'The page lacks a main <h1> heading. An <h1> is vital for both accessibility navigation and SEO topic indexing.',
      wcagCriterion: 'WCAG 1.3.1 Info and Relationships (Level A)',
      remedyHint: 'Add a single top-level <h1> representing the main topic or title of this page.',
    });
  } else if (h1Elements.length > 1) {
    // Multiple H1s warning
    h1Elements.slice(1).forEach((el, i) => {
      issues.push({
        id: `headings-multiple-h1-${i + 1}`,
        ruleId: 'headings-multiple-h1',
        category: 'seo',
        severity: 'warning',
        title: 'Multiple <h1> headings detected',
        description: `Found ${h1Elements.length} <h1> tags on the page. While HTML5 permits multiple H1s in sectioning elements, standard SEO and WCAG best practice recommends a single <h1> per page.`,
        wcagCriterion: 'WCAG 1.3.1 Info and Relationships (Level A)',
        element: el,
        selector: getElementSelector(el),
        htmlSnippet: el.outerHTML ? el.outerHTML.slice(0, 160) : `<h1>${(el.textContent || '').trim()}</h1>`,
        remedyHint: 'Demote secondary <h1> tags to <h2> subheadings.',
        context: { totalH1Count: h1Elements.length, text: (el.textContent || '').trim() },
      });
    });
  }

  return issues;
}
