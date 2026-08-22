import type { AuditIssue } from './types.js';
import { getElementSelector } from './headings.js';

export interface ImageContext {
  src: string;
  currentAlt?: string;
  hasAltAttribute: boolean;
  caption?: string;
  precedingHeading?: string;
  surroundingText?: string;
  parentLinkHref?: string;
  parentLinkText?: string;
  isDecorativeCandidate: boolean;
}

const GENERIC_ALT_PATTERNS = [
  /^(image|img|photo|photograph|pic|picture|graphic|icon|logo|banner|thumbnail|avatar|placeholder|spacer)$/i,
  /^(image\s*\d+|photo\s*\d+|pic\s*\d+|dsc\d+|img_\d+|screenshot)$/i,
  /\.(jpe?g|png|gif|svg|webp|avif|bmp|tiff)$/i,
  /^(untitled|unnamed|null|undefined|blank|default)$/i,
];

export function isGenericAlt(alt: string): boolean {
  const trimmed = alt.trim();
  if (!trimmed) return false;
  return GENERIC_ALT_PATTERNS.some(pattern => pattern.test(trimmed));
}

export function extractImageContext(img: Element): ImageContext {
  const src = img.getAttribute('src') || '';
  const alt = img.getAttribute('alt');
  const hasAltAttribute = img.hasAttribute('alt');

  // Check figcaption
  let caption: string | undefined;
  const figure = img.closest('figure');
  if (figure) {
    const figcaption = figure.querySelector('figcaption');
    if (figcaption) {
      caption = (figcaption.textContent || '').trim();
    }
  }

  // Preceding heading search
  let precedingHeading: string | undefined;
  let current: Element | null = img;
  const docBody = typeof document !== 'undefined' ? document.body : null;
  const docElement = typeof document !== 'undefined' ? document.documentElement : null;

  while (current && !precedingHeading && current !== docBody && current !== docElement) {
    let prev = current.previousElementSibling;
    while (prev) {
      if (/^H[1-6]$/i.test(prev.tagName)) {
        precedingHeading = (prev.textContent || '').trim();
        break;
      }
      const innerHeading = prev.querySelector?.('h1, h2, h3, h4, h5, h6');
      if (innerHeading) {
        precedingHeading = (innerHeading.textContent || '').trim();
        break;
      }
      prev = prev.previousElementSibling;
    }
    current = current.parentElement;
  }

  // Surrounding text from parent container
  let surroundingText: string | undefined;
  const parent = img.parentElement;
  if (parent) {
    const clone = parent.cloneNode(true) as Element;
    if (typeof clone.querySelectorAll === 'function') {
      clone.querySelectorAll('img, script, style, svg').forEach(node => {
        if (typeof (node as any).remove === 'function') {
          (node as any).remove();
        }
      });
    }
    const text = (clone.textContent || '').replace(/\s+/g, ' ').trim();
    if (text) {
      surroundingText = text.slice(0, 250);
    }
  }

  // Parent link context
  const anchor = img.closest('a');
  let parentLinkHref: string | undefined;
  let parentLinkText: string | undefined;
  if (anchor) {
    parentLinkHref = anchor.getAttribute('href') || undefined;
    const anchorClone = anchor.cloneNode(true) as Element;
    if (typeof anchorClone.querySelectorAll === 'function') {
      anchorClone.querySelectorAll('img, svg').forEach(n => {
        if (typeof (n as any).remove === 'function') {
          (n as any).remove();
        }
      });
    }
    parentLinkText = (anchorClone.textContent || '').trim();
  }

  const role = img.getAttribute('role');
  const ariaHidden = img.getAttribute('aria-hidden') === 'true';
  const isDecorativeCandidate = role === 'presentation' || role === 'none' || ariaHidden;

  return {
    src,
    currentAlt: alt !== null ? alt : undefined,
    hasAltAttribute,
    caption,
    precedingHeading,
    surroundingText,
    parentLinkHref,
    parentLinkText,
    isDecorativeCandidate,
  };
}

export function auditImages(root: Document | Element = typeof document !== 'undefined' ? document : ({} as Document)): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (!root || typeof root.querySelectorAll !== 'function') {
    return issues;
  }

  const images = Array.from(root.querySelectorAll('img'));

  images.forEach((img, index) => {
    const hasAlt = img.hasAttribute('alt');
    const altValue = img.getAttribute('alt');
    const role = img.getAttribute('role');
    const ariaHidden = img.getAttribute('aria-hidden') === 'true';
    const selector = getElementSelector(img);
    const htmlSnippet = img.outerHTML ? img.outerHTML.slice(0, 160) : `<img>`;
    const context = extractImageContext(img);

    // Case 1: Missing alt attribute altogether
    if (!hasAlt) {
      if (role === 'presentation' || role === 'none' || ariaHidden) {
        // Technically has presentation role, but best practice is alt=""
        issues.push({
          id: `img-missing-alt-decorative-${index}`,
          ruleId: 'img-alt-missing',
          category: 'a11y',
          severity: 'info',
          title: 'Decorative image missing alt="" attribute',
          description: 'Image has role="presentation" or aria-hidden="true" but lacks an explicit alt="" attribute. Screen readers best recognize decorative images with an explicit empty alt="".',
          wcagCriterion: 'WCAG 1.1.1 Non-text Content (Level A)',
          element: img,
          selector,
          htmlSnippet,
          remedyHint: 'Add alt="" to explicitly indicate this image is decorative.',
          context: { ...context },
        });
      } else {
        issues.push({
          id: `img-missing-alt-${index}`,
          ruleId: 'img-alt-missing',
          category: 'a11y',
          severity: 'error',
          title: 'Missing image alt attribute',
          description: 'Image element has no alt attribute. Assistive technologies may read the file path or URL aloud, leading to a degraded user experience.',
          wcagCriterion: 'WCAG 1.1.1 Non-text Content (Level A)',
          element: img,
          selector,
          htmlSnippet,
          remedyHint: 'Provide a concise, descriptive alt attribute or alt="" if decorative.',
          context: { ...context },
        });
      }
      return;
    }

    // Case 2: Generic / placeholder alt text
    if (altValue && isGenericAlt(altValue)) {
      issues.push({
        id: `img-generic-alt-${index}`,
        ruleId: 'img-alt-generic',
        category: 'a11y',
        severity: 'warning',
        title: `Generic or uninformative alt text: "${altValue}"`,
        description: `The alt attribute "${altValue}" provides no meaningful context to users who cannot view the image. Avoid words like "image", "photo", or filenames.`,
        wcagCriterion: 'WCAG 1.1.1 Non-text Content (Level A)',
        element: img,
        selector,
        htmlSnippet,
        remedyHint: 'Replace generic words with descriptive text explaining the meaning or purpose of the image.',
        context: { ...context, currentAlt: altValue },
      });
      return;
    }

    // Case 3: Linked image with empty alt and no other link text
    const anchor = img.closest('a');
    if (anchor && altValue === '') {
      const anchorText = (anchor.textContent || '').trim();
      const hasAriaLabel = anchor.hasAttribute('aria-label') || anchor.hasAttribute('aria-labelledby');
      if (!anchorText && !hasAriaLabel) {
        issues.push({
          id: `img-link-empty-alt-${index}`,
          ruleId: 'img-link-empty-alt',
          category: 'a11y',
          severity: 'error',
          title: 'Linked image has empty alt with no link text',
          description: 'This image is inside a link (<a>), has alt="", but the link contains no other text or aria-label. Screen readers cannot determine the link target.',
          wcagCriterion: 'WCAG 2.4.4 Link Purpose (In Context) (Level A)',
          element: img,
          selector,
          htmlSnippet,
          remedyHint: 'Add descriptive alt text to the image explaining where the link navigates, or provide an aria-label on the <a>.',
          context: { ...context },
        });
      }
    }
  });

  return issues;
}
