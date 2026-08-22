// node_modules/astro/dist/toolbar/index.js
function defineToolbarApp(app) {
  return app;
}

// src/auditors/headings.ts
function getHeadingLevel(el) {
  const tagName = el.tagName.toLowerCase();
  const match = tagName.match(/^h([1-6])$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  const role = el.getAttribute("role");
  if (role === "heading") {
    const ariaLevel = el.getAttribute("aria-level");
    if (ariaLevel) {
      const level = parseInt(ariaLevel, 10);
      if (!isNaN(level) && level >= 1 && level <= 6) {
        return level;
      }
    }
    return 2;
  }
  return null;
}
function getElementSelector(el) {
  if (el.id)
    return `#${el.id}`;
  const tag = el.tagName.toLowerCase();
  const classes = Array.from(el.classList).slice(0, 2).map((c) => `.${c}`).join("");
  if (el.parentElement) {
    const siblings = Array.from(el.parentElement.children).filter((c) => c.tagName === el.tagName);
    if (siblings.length > 1) {
      const index = siblings.indexOf(el) + 1;
      return `${tag}${classes}:nth-of-type(${index})`;
    }
  }
  return `${tag}${classes}`;
}
function auditHeadings(root = typeof document !== "undefined" ? document : {}) {
  const issues = [];
  if (!root || typeof root.querySelectorAll !== "function") {
    return issues;
  }
  const headingElements = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]'));
  if (headingElements.length === 0) {
    issues.push({
      id: "headings-none",
      ruleId: "headings-none",
      category: "a11y",
      severity: "warning",
      title: "No heading elements found",
      description: "The page contains no heading elements (h1-h6). Headings provide structure and aid navigation for screen reader users.",
      wcagCriterion: "WCAG 1.3.1 Info and Relationships (Level A)",
      remedyHint: "Add an <h1> heading to identify the primary subject of the page."
    });
    return issues;
  }
  const h1Elements = [];
  let previousLevel = 0;
  headingElements.forEach((el, index) => {
    const level = getHeadingLevel(el);
    if (level === null)
      return;
    const text = (el.textContent || "").trim();
    const selector = getElementSelector(el);
    const htmlSnippet = el.outerHTML ? el.outerHTML.slice(0, 160) : `<h${level}>${text}</h${level}>`;
    if (text.length === 0 && !el.querySelector("img[alt], svg[aria-label]")) {
      issues.push({
        id: `headings-empty-${index}`,
        ruleId: "headings-empty",
        category: "a11y",
        severity: "error",
        title: `Empty <h${level}> heading`,
        description: `The <h${level}> heading has no accessible text content. Screen readers announce blank headings, causing confusion.`,
        wcagCriterion: "WCAG 1.3.1 Info and Relationships (Level A)",
        element: el,
        selector,
        htmlSnippet,
        remedyHint: `Provide descriptive text content inside this <h${level}> or remove the empty tag.`,
        context: { level, text }
      });
    }
    if (level === 1) {
      h1Elements.push(el);
    }
    if (index === 0 && level > 1) {
      issues.push({
        id: `headings-first-not-h1`,
        ruleId: "headings-invalid-start",
        category: "a11y",
        severity: "warning",
        title: `Page heading structure starts with <h${level}> instead of <h1>`,
        description: `The first heading on the page is <h${level}>. Main content should begin with an <h1> describing the document topic.`,
        wcagCriterion: "WCAG 1.3.1 Info and Relationships (Level A)",
        element: el,
        selector,
        htmlSnippet,
        remedyHint: `Change this <h${level}> to an <h1> or ensure the primary page heading precedes it.`,
        context: { level, text }
      });
    }
    if (previousLevel > 0 && level > previousLevel + 1) {
      issues.push({
        id: `headings-skip-${index}`,
        ruleId: "headings-skip-level",
        category: "a11y",
        severity: "error",
        title: `Skipped heading level: <h${previousLevel}> to <h${level}>`,
        description: `Heading level jumps from <h${previousLevel}> to <h${level}> without an intervening <h${previousLevel + 1}>. Headings must not skip levels.`,
        wcagCriterion: "WCAG 1.3.1 Info and Relationships (Level A)",
        element: el,
        selector,
        htmlSnippet,
        remedyHint: `Change this <h${level}> to an <h${previousLevel + 1}> or add the missing intermediate heading.`,
        context: { previousLevel, currentLevel: level, text }
      });
    }
    previousLevel = level;
  });
  if (h1Elements.length === 0) {
    issues.push({
      id: "headings-missing-h1",
      ruleId: "headings-missing-h1",
      category: "seo",
      severity: "error",
      title: "Missing top-level <h1> heading",
      description: "The page lacks a main <h1> heading. An <h1> is vital for both accessibility navigation and SEO topic indexing.",
      wcagCriterion: "WCAG 1.3.1 Info and Relationships (Level A)",
      remedyHint: "Add a single top-level <h1> representing the main topic or title of this page."
    });
  } else if (h1Elements.length > 1) {
    h1Elements.slice(1).forEach((el, i) => {
      issues.push({
        id: `headings-multiple-h1-${i + 1}`,
        ruleId: "headings-multiple-h1",
        category: "seo",
        severity: "warning",
        title: "Multiple <h1> headings detected",
        description: `Found ${h1Elements.length} <h1> tags on the page. While HTML5 permits multiple H1s in sectioning elements, standard SEO and WCAG best practice recommends a single <h1> per page.`,
        wcagCriterion: "WCAG 1.3.1 Info and Relationships (Level A)",
        element: el,
        selector: getElementSelector(el),
        htmlSnippet: el.outerHTML ? el.outerHTML.slice(0, 160) : `<h1>${(el.textContent || "").trim()}</h1>`,
        remedyHint: "Demote secondary <h1> tags to <h2> subheadings.",
        context: { totalH1Count: h1Elements.length, text: (el.textContent || "").trim() }
      });
    });
  }
  return issues;
}

// src/auditors/images.ts
var GENERIC_ALT_PATTERNS = [
  /^(image|img|photo|photograph|pic|picture|graphic|icon|logo|banner|thumbnail|avatar|placeholder|spacer)$/i,
  /^(image\s*\d+|photo\s*\d+|pic\s*\d+|dsc\d+|img_\d+|screenshot)$/i,
  /\.(jpe?g|png|gif|svg|webp|avif|bmp|tiff)$/i,
  /^(untitled|unnamed|null|undefined|blank|default)$/i
];
function isGenericAlt(alt) {
  const trimmed = alt.trim();
  if (!trimmed)
    return false;
  return GENERIC_ALT_PATTERNS.some((pattern) => pattern.test(trimmed));
}
function extractImageContext(img) {
  const src = img.getAttribute("src") || "";
  const alt = img.getAttribute("alt");
  const hasAltAttribute = img.hasAttribute("alt");
  let caption;
  const figure = img.closest("figure");
  if (figure) {
    const figcaption = figure.querySelector("figcaption");
    if (figcaption) {
      caption = (figcaption.textContent || "").trim();
    }
  }
  let precedingHeading;
  let current = img;
  const docBody = typeof document !== "undefined" ? document.body : null;
  const docElement = typeof document !== "undefined" ? document.documentElement : null;
  while (current && !precedingHeading && current !== docBody && current !== docElement) {
    let prev = current.previousElementSibling;
    while (prev) {
      if (/^H[1-6]$/i.test(prev.tagName)) {
        precedingHeading = (prev.textContent || "").trim();
        break;
      }
      const innerHeading = prev.querySelector?.("h1, h2, h3, h4, h5, h6");
      if (innerHeading) {
        precedingHeading = (innerHeading.textContent || "").trim();
        break;
      }
      prev = prev.previousElementSibling;
    }
    current = current.parentElement;
  }
  let surroundingText;
  const parent = img.parentElement;
  if (parent) {
    const clone = parent.cloneNode(true);
    if (typeof clone.querySelectorAll === "function") {
      clone.querySelectorAll("img, script, style, svg").forEach((node) => {
        if (typeof node.remove === "function") {
          node.remove();
        }
      });
    }
    const text = (clone.textContent || "").replace(/\s+/g, " ").trim();
    if (text) {
      surroundingText = text.slice(0, 250);
    }
  }
  const anchor = img.closest("a");
  let parentLinkHref;
  let parentLinkText;
  if (anchor) {
    parentLinkHref = anchor.getAttribute("href") || undefined;
    const anchorClone = anchor.cloneNode(true);
    if (typeof anchorClone.querySelectorAll === "function") {
      anchorClone.querySelectorAll("img, svg").forEach((n) => {
        if (typeof n.remove === "function") {
          n.remove();
        }
      });
    }
    parentLinkText = (anchorClone.textContent || "").trim();
  }
  const role = img.getAttribute("role");
  const ariaHidden = img.getAttribute("aria-hidden") === "true";
  const isDecorativeCandidate = role === "presentation" || role === "none" || ariaHidden;
  return {
    src,
    currentAlt: alt !== null ? alt : undefined,
    hasAltAttribute,
    caption,
    precedingHeading,
    surroundingText,
    parentLinkHref,
    parentLinkText,
    isDecorativeCandidate
  };
}
function auditImages(root = typeof document !== "undefined" ? document : {}) {
  const issues = [];
  if (!root || typeof root.querySelectorAll !== "function") {
    return issues;
  }
  const images = Array.from(root.querySelectorAll("img"));
  images.forEach((img, index) => {
    const hasAlt = img.hasAttribute("alt");
    const altValue = img.getAttribute("alt");
    const role = img.getAttribute("role");
    const ariaHidden = img.getAttribute("aria-hidden") === "true";
    const selector = getElementSelector(img);
    const htmlSnippet = img.outerHTML ? img.outerHTML.slice(0, 160) : `<img>`;
    const context = extractImageContext(img);
    if (!hasAlt) {
      if (role === "presentation" || role === "none" || ariaHidden) {
        issues.push({
          id: `img-missing-alt-decorative-${index}`,
          ruleId: "img-alt-missing",
          category: "a11y",
          severity: "info",
          title: 'Decorative image missing alt="" attribute',
          description: 'Image has role="presentation" or aria-hidden="true" but lacks an explicit alt="" attribute. Screen readers best recognize decorative images with an explicit empty alt="".',
          wcagCriterion: "WCAG 1.1.1 Non-text Content (Level A)",
          element: img,
          selector,
          htmlSnippet,
          remedyHint: 'Add alt="" to explicitly indicate this image is decorative.',
          context: { ...context }
        });
      } else {
        issues.push({
          id: `img-missing-alt-${index}`,
          ruleId: "img-alt-missing",
          category: "a11y",
          severity: "error",
          title: "Missing image alt attribute",
          description: "Image element has no alt attribute. Assistive technologies may read the file path or URL aloud, leading to a degraded user experience.",
          wcagCriterion: "WCAG 1.1.1 Non-text Content (Level A)",
          element: img,
          selector,
          htmlSnippet,
          remedyHint: 'Provide a concise, descriptive alt attribute or alt="" if decorative.',
          context: { ...context }
        });
      }
      return;
    }
    if (altValue && isGenericAlt(altValue)) {
      issues.push({
        id: `img-generic-alt-${index}`,
        ruleId: "img-alt-generic",
        category: "a11y",
        severity: "warning",
        title: `Generic or uninformative alt text: "${altValue}"`,
        description: `The alt attribute "${altValue}" provides no meaningful context to users who cannot view the image. Avoid words like "image", "photo", or filenames.`,
        wcagCriterion: "WCAG 1.1.1 Non-text Content (Level A)",
        element: img,
        selector,
        htmlSnippet,
        remedyHint: "Replace generic words with descriptive text explaining the meaning or purpose of the image.",
        context: { ...context, currentAlt: altValue }
      });
      return;
    }
    const anchor = img.closest("a");
    if (anchor && altValue === "") {
      const anchorText = (anchor.textContent || "").trim();
      const hasAriaLabel = anchor.hasAttribute("aria-label") || anchor.hasAttribute("aria-labelledby");
      if (!anchorText && !hasAriaLabel) {
        issues.push({
          id: `img-link-empty-alt-${index}`,
          ruleId: "img-link-empty-alt",
          category: "a11y",
          severity: "error",
          title: "Linked image has empty alt with no link text",
          description: 'This image is inside a link (<a>), has alt="", but the link contains no other text or aria-label. Screen readers cannot determine the link target.',
          wcagCriterion: "WCAG 2.4.4 Link Purpose (In Context) (Level A)",
          element: img,
          selector,
          htmlSnippet,
          remedyHint: "Add descriptive alt text to the image explaining where the link navigates, or provide an aria-label on the <a>.",
          context: { ...context }
        });
      }
    }
  });
  return issues;
}

// src/auditors/contrast.ts
var NAMED_COLORS = {
  black: [0, 0, 0],
  white: [255, 255, 255],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  darkgray: [169, 169, 169],
  lightgray: [211, 211, 211],
  transparent: [0, 0, 0]
};
function parseColor(colorStr) {
  const str = colorStr.trim().toLowerCase();
  if (!str || str === "inherit" || str === "initial" || str === "unset")
    return null;
  if (str === "transparent") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  if (NAMED_COLORS[str]) {
    const [r, g, b] = NAMED_COLORS[str];
    return { r, g, b, a: 1 };
  }
  if (str.startsWith("#")) {
    const hex = str.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1
      };
    }
    if (hex.length === 4) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: parseInt(hex[3] + hex[3], 16) / 255
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255
      };
    }
  }
  const rgbMatch = str.match(/rgba?\s*\(\s*([\d.%]+)[\s,]+([\d.%]+)[\s,]+([\d.%]+)(?:[\s,/]+([\d.%]+))?\s*\)/);
  if (rgbMatch) {
    const parseChannel = (val) => {
      if (val.endsWith("%")) {
        return Math.round(parseFloat(val) / 100 * 255);
      }
      return parseFloat(val);
    };
    const parseAlpha = (val) => {
      if (!val)
        return 1;
      if (val.endsWith("%")) {
        return parseFloat(val) / 100;
      }
      return parseFloat(val);
    };
    return {
      r: parseChannel(rgbMatch[1]),
      g: parseChannel(rgbMatch[2]),
      b: parseChannel(rgbMatch[3]),
      a: parseAlpha(rgbMatch[4])
    };
  }
  return null;
}
function blendColors(foreground, background) {
  if (foreground.a >= 1)
    return foreground;
  const a = foreground.a + background.a * (1 - foreground.a);
  if (a === 0)
    return { r: 0, g: 0, b: 0, a: 0 };
  const r = Math.round((foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / a);
  const g = Math.round((foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / a);
  const b = Math.round((foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / a);
  return { r, g, b, a };
}
function getRelativeLuminance(rgba) {
  const toLinear = (channel) => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLinear(rgba.r);
  const g = toLinear(rgba.g);
  const b = toLinear(rgba.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function getContrastRatio(c1, c2) {
  const color1 = typeof c1 === "string" ? parseColor(c1) : c1;
  const color2 = typeof c2 === "string" ? parseColor(c2) : c2;
  if (!color1 || !color2)
    return 1;
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  const ratio = (brightest + 0.05) / (darkest + 0.05);
  return Math.round(ratio * 100) / 100;
}
function isLargeText(fontSizePx, fontWeight) {
  const weightNum = typeof fontWeight === "string" ? parseInt(fontWeight, 10) || (fontWeight === "bold" ? 700 : 400) : fontWeight;
  if (fontSizePx >= 24)
    return true;
  if (fontSizePx >= 18.66 && weightNum >= 700)
    return true;
  return false;
}
function getMinContrastThreshold(fontSizePx, fontWeight, level = "AA") {
  const isLarge = isLargeText(fontSizePx, fontWeight);
  if (level === "AAA") {
    return isLarge ? 4.5 : 7;
  }
  return isLarge ? 3 : 4.5;
}
function getEffectiveBackgroundColor(el) {
  let current = el;
  let blended = { r: 255, g: 255, b: 255, a: 1 };
  const docElement = typeof document !== "undefined" ? document.documentElement : null;
  const bgColors = [];
  while (current && current !== docElement) {
    if (typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
      const style = window.getComputedStyle(current);
      const bg = parseColor(style.backgroundColor);
      if (bg && bg.a > 0) {
        bgColors.unshift(bg);
        if (bg.a === 1) {
          break;
        }
      }
    }
    current = current.parentElement;
  }
  for (const bg of bgColors) {
    blended = blendColors(bg, blended);
  }
  return blended;
}
function auditContrast(root = typeof document !== "undefined" ? document : {}) {
  const issues = [];
  if (typeof window === "undefined" || !root || typeof root.querySelectorAll !== "function") {
    return issues;
  }
  const textNodesCandidates = Array.from(root.querySelectorAll("p, span, a, h1, h2, h3, h4, h5, h6, li, label, button, blockquote, dt, dd, th, td"));
  const seenElements = new Set;
  textNodesCandidates.forEach((el, index) => {
    if (seenElements.has(el))
      return;
    const text = (el.textContent || "").trim();
    if (!text || text.length === 0)
      return;
    if (typeof window.getComputedStyle === "function") {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
        return;
      }
      const fgColor = parseColor(style.color);
      if (!fgColor)
        return;
      const bgColor = getEffectiveBackgroundColor(el);
      const effectiveFg = blendColors(fgColor, bgColor);
      const ratio = getContrastRatio(effectiveFg, bgColor);
      const fontSize = parseFloat(style.fontSize) || 16;
      const fontWeight = style.fontWeight || "400";
      const isLarge = isLargeText(fontSize, fontWeight);
      const minRatio = getMinContrastThreshold(fontSize, fontWeight, "AA");
      if (ratio < minRatio) {
        seenElements.add(el);
        const selector = getElementSelector(el);
        const htmlSnippet = el.outerHTML ? el.outerHTML.slice(0, 160) : `<${el.tagName.toLowerCase()}>${text.slice(0, 40)}</${el.tagName.toLowerCase()}>`;
        issues.push({
          id: `contrast-low-${index}`,
          ruleId: "contrast-ratio-low",
          category: "a11y",
          severity: "error",
          title: `Low contrast ratio (${ratio}:1 < ${minRatio}:1)`,
          description: `Element text has a contrast ratio of ${ratio}:1 against its background. WCAG 2.1 AA requires a minimum contrast of ${minRatio}:1 for ${isLarge ? "large" : "normal"} text.`,
          wcagCriterion: "WCAG 1.4.3 Contrast (Minimum) (Level AA)",
          element: el,
          selector,
          htmlSnippet,
          remedyHint: `Adjust text color (${style.color}) or background color to achieve at least ${minRatio}:1 contrast.`,
          context: {
            ratio,
            minRatio,
            textColor: style.color,
            fontSize,
            fontWeight,
            isLargeText: isLarge,
            snippet: text.slice(0, 60)
          }
        });
      }
    }
  });
  return issues;
}

// src/auditors/seo.ts
var GENERIC_LINK_TEXTS = [
  /^click\s+here$/i,
  /^here$/i,
  /^read\s+more$/i,
  /^learn\s+more$/i,
  /^more$/i,
  /^link$/i,
  /^go$/i,
  /^details$/i,
  /^this\s+page$/i
];
function auditSeo(root = typeof document !== "undefined" ? document : {}) {
  const issues = [];
  if (!root)
    return issues;
  const doc = root && "ownerDocument" in root && root.ownerDocument ? root.ownerDocument : typeof document !== "undefined" ? document : null;
  if (doc) {
    const htmlEl = doc.documentElement;
    if (htmlEl) {
      const lang = htmlEl.getAttribute("lang");
      if (!lang || !lang.trim()) {
        issues.push({
          id: "seo-html-lang-missing",
          ruleId: "html-lang-missing",
          category: "a11y",
          severity: "error",
          title: "Missing <html lang> attribute",
          description: "The <html> element does not have a lang attribute. Screen readers and search engine indexing bots rely on this to pronounce and categorize the language correctly.",
          wcagCriterion: "WCAG 3.1.1 Language of Page (Level A)",
          element: htmlEl,
          selector: "html",
          htmlSnippet: "<html>",
          remedyHint: 'Add a lang attribute to your <html> tag, e.g. <html lang="en">.'
        });
      }
    }
    const titleEl = doc.querySelector("title");
    const titleText = titleEl ? (titleEl.textContent || "").trim() : "";
    if (!titleEl || !titleText) {
      issues.push({
        id: "seo-title-missing",
        ruleId: "meta-title-missing",
        category: "seo",
        severity: "error",
        title: "Missing or empty <title> tag",
        description: "The document lacks a <title> element or the title is empty. Page titles are critical for tab identification, screen readers, and search engine results.",
        wcagCriterion: "WCAG 2.4.2 Page Titled (Level A)",
        remedyHint: "Add a descriptive <title> tag inside the <head> section."
      });
    } else if (titleText.length < 10) {
      issues.push({
        id: "seo-title-short",
        ruleId: "meta-title-short",
        category: "seo",
        severity: "warning",
        title: `Short document title (${titleText.length} chars)`,
        description: `The page title "${titleText}" is very short (< 10 chars). Descriptive titles (30-60 characters) improve search ranking and user comprehension.`,
        wcagCriterion: "WCAG 2.4.2 Page Titled (Level A)",
        remedyHint: "Expand the title to accurately summarize the specific page content.",
        context: { title: titleText, length: titleText.length }
      });
    }
    const metaDesc = doc.querySelector('meta[name="description"]');
    const descContent = metaDesc ? (metaDesc.getAttribute("content") || "").trim() : "";
    if (!metaDesc || !descContent) {
      issues.push({
        id: "seo-description-missing",
        ruleId: "meta-description-missing",
        category: "seo",
        severity: "warning",
        title: "Missing meta description",
        description: 'No <meta name="description"> tag found. Search engines display this snippet in search results to attract clicks.',
        remedyHint: 'Add <meta name="description" content="..."> with 50-160 characters describing the page.'
      });
    }
    const viewportMeta = doc.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      issues.push({
        id: "seo-viewport-missing",
        ruleId: "meta-viewport-missing",
        category: "seo",
        severity: "error",
        title: "Missing responsive viewport meta tag",
        description: 'No <meta name="viewport"> tag detected. Mobile devices will render at desktop width without mobile responsiveness.',
        remedyHint: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to <head>.'
      });
    }
  }
  if (typeof root.querySelectorAll === "function") {
    const links = Array.from(root.querySelectorAll("a[href]"));
    links.forEach((a, index) => {
      const text = (a.textContent || "").trim();
      const ariaLabel = a.getAttribute("aria-label") || a.getAttribute("aria-labelledby");
      const href = a.getAttribute("href") || "";
      if (!ariaLabel && GENERIC_LINK_TEXTS.some((p) => p.test(text))) {
        issues.push({
          id: `seo-generic-link-${index}`,
          ruleId: "link-text-generic",
          category: "a11y",
          severity: "warning",
          title: `Generic link anchor text: "${text}"`,
          description: `The link text "${text}" is generic and does not convey the destination context when read out of context by screen reader link-lists.`,
          wcagCriterion: "WCAG 2.4.4 Link Purpose (In Context) (Level A)",
          element: a,
          selector: getElementSelector(a),
          htmlSnippet: a.outerHTML ? a.outerHTML.slice(0, 160) : `<a>${text}</a>`,
          remedyHint: "Use descriptive text or an aria-label indicating what will happen when clicking this link.",
          context: { text, href }
        });
      }
    });
  }
  return issues;
}

// src/auditors/index.ts
function runAudit(root = typeof document !== "undefined" ? document : {}) {
  const issues = [];
  issues.push(...auditHeadings(root));
  issues.push(...auditImages(root));
  issues.push(...auditContrast(root));
  issues.push(...auditSeo(root));
  const summary = {
    total: issues.length,
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
    info: issues.filter((i) => i.severity === "info").length
  };
  const currentUrl = typeof window !== "undefined" && window.location ? window.location.href : "http://localhost:4321";
  return {
    issues,
    summary,
    timestamp: Date.now(),
    url: currentUrl
  };
}

// src/prompts.ts
function buildRemedyPrompt(issue) {
  const contextStr = issue.context ? JSON.stringify(issue.context, null, 2) : "None";
  return `You are an expert web accessibility (WCAG 2.1 AA/AAA) and SEO specialist.
Analyze this audit issue detected on a web page and provide:
1. A concise explanation of why this is an issue and its impact on users or search engines.
2. The exact fixed HTML or CSS code snippet that resolves it.

--- Issue Details ---
Rule ID: ${issue.ruleId}
Title: ${issue.title}
Severity: ${issue.severity}
WCAG Criterion: ${issue.wcagCriterion || "N/A"}
HTML Snippet: ${issue.htmlSnippet || "N/A"}
Selector: ${issue.selector || "N/A"}
Context: ${contextStr}

Respond in concise markdown with a code block containing the recommended fix.`;
}
function buildAltTextPrompt(context) {
  const surrounding = context.surroundingText ? `Surrounding page text: "${context.surroundingText}"` : "";
  const heading = context.precedingHeading ? `Preceding section heading: "${context.precedingHeading}"` : "";
  const caption = context.caption ? `Caption / figcaption: "${context.caption}"` : "";
  const link = context.parentLinkHref ? `Contained inside link target: "${context.parentLinkHref}" (Link text: "${context.parentLinkText || ""}")` : "";
  const currentAlt = context.currentAlt ? `Current placeholder/generic alt: "${context.currentAlt}"` : "";
  const src = context.src ? `Image source filename: "${context.src.split("/").pop() || context.src}"` : "";
  return `You are an accessibility expert specializing in WCAG 1.1.1 (Non-text Content).
Write a concise, descriptive, and context-aware 'alt' attribute text for this image based on its surrounding DOM context.

--- DOM Context ---
${src}
${heading}
${caption}
${surrounding}
${link}
${currentAlt}

--- Instructions ---
- If the image appears purely decorative given the context, output: alt="" (Decorative image).
- If informative, output 1-2 concise alternative text recommendations (under 120 characters).
- Do NOT start with "Image of" or "Photo of".
- Format your response with:
  Draft Alt: "<recommended text>"
  Rationale: <1 sentence rationale>`;
}
async function checkChromeAIAvailability() {
  if (typeof window === "undefined" || !window.ai || !window.ai.languageModel) {
    return "unsupported";
  }
  try {
    const capabilities = await window.ai.languageModel.capabilities();
    return capabilities.available;
  } catch (err) {
    console.warn("[astro-dev-audit-nano] Failed to query Chrome AI capabilities:", err);
    return "unsupported";
  }
}
async function createNanoModel(systemPrompt) {
  if (typeof window === "undefined" || !window.ai || !window.ai.languageModel) {
    return null;
  }
  try {
    const capabilities = await window.ai.languageModel.capabilities();
    if (capabilities.available === "no") {
      return null;
    }
    const defaultSystemPrompt = "You are an on-device AI auditor assisting web developers with real-time WCAG accessibility and SEO fixes.";
    return await window.ai.languageModel.create({
      systemPrompt: systemPrompt || defaultSystemPrompt,
      temperature: 0.2,
      topK: 3
    });
  } catch (err) {
    console.error("[astro-dev-audit-nano] Failed to create Chrome AI session:", err);
    return null;
  }
}
async function generateNanoRemedy(issue, onChunk) {
  const model = await createNanoModel();
  if (!model) {
    return `Chrome Built-in AI (Gemini Nano) is not currently available in this browser.

` + `Suggested Quick Fix:
${issue.remedyHint || "Review element markup against WCAG guidelines."}

` + `To enable on-device Gemini Nano:
` + `1. Open chrome://flags/#prompt-api-for-gemini-nano -> Set to 'Enabled'
` + `2. Open chrome://flags/#optimization-guide-on-device-model -> Set to 'Enabled BypassPerfRequirement'
` + `3. Open chrome://components -> Click 'Check for update' under 'Optimization Guide On Device Model'.`;
  }
  const prompt = buildRemedyPrompt(issue);
  let fullText = "";
  try {
    if (typeof model.promptStreaming === "function" && onChunk) {
      const stream = model.promptStreaming(prompt);
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done)
          break;
        if (value) {
          fullText = value;
          onChunk(fullText);
        }
      }
    } else {
      fullText = await model.prompt(prompt);
      if (onChunk)
        onChunk(fullText);
    }
  } catch (err) {
    fullText = `AI Generation error: ${err?.message || String(err)}

Fallback suggestion: ${issue.remedyHint || "None"}`;
  } finally {
    try {
      model.destroy();
    } catch (_) {}
  }
  return fullText;
}
async function generateNanoAltText(context, onChunk) {
  const model = await createNanoModel("You are an expert accessibility consultant drafting WCAG-compliant image alternative text.");
  if (!model) {
    const fallbackAlt = context.caption || context.precedingHeading || "Descriptive image";
    return `Chrome AI unavailable. Suggested alt draft based on context: alt="${fallbackAlt}"`;
  }
  const prompt = buildAltTextPrompt(context);
  let fullText = "";
  try {
    if (typeof model.promptStreaming === "function" && onChunk) {
      const stream = model.promptStreaming(prompt);
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done)
          break;
        if (value) {
          fullText = value;
          onChunk(fullText);
        }
      }
    } else {
      fullText = await model.prompt(prompt);
      if (onChunk)
        onChunk(fullText);
    }
  } catch (err) {
    fullText = `AI Alt-text generation error: ${err?.message || String(err)}`;
  } finally {
    try {
      model.destroy();
    } catch (_) {}
  }
  return fullText;
}

// src/app.ts
var STYLES = `
  :host {
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #e2e8f0;
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --bg-tertiary: #334155;
    --border-color: #475569;
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --accent-color: #6366f1;
    --accent-hover: #4f46e5;
    --error-color: #ef4444;
    --error-bg: rgba(239, 68, 68, 0.15);
    --warning-color: #f59e0b;
    --warning-bg: rgba(245, 158, 11, 0.15);
    --info-color: #3b82f6;
    --info-bg: rgba(59, 130, 246, 0.15);
    --success-color: #10b981;
    --success-bg: rgba(16, 185, 129, 0.15);
  }

  .audit-panel {
    position: fixed;
    bottom: 4rem;
    right: 1.5rem;
    width: 480px;
    max-width: calc(100vw - 3rem);
    max-height: 80vh;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 999999;
  }

  .panel-header {
    padding: 1rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .header-title-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .header-icon {
    width: 24px;
    height: 24px;
    color: var(--accent-color);
  }

  .header-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .ai-badge {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
    border-radius: 9999px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .ai-ready {
    background: var(--success-bg);
    color: var(--success-color);
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .ai-downloading {
    background: var(--warning-bg);
    color: var(--warning-color);
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  .ai-disabled {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
  }

  .pulse-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
    font-weight: 600;
    border-radius: 6px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-primary {
    background: var(--accent-color);
    color: white;
  }

  .btn-primary:hover {
    background: var(--accent-hover);
  }

  .btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-color: var(--border-color);
  }

  .btn-secondary:hover {
    background: #475569;
  }

  .filter-bar {
    padding: 0.6rem 1rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .filter-tabs {
    display: flex;
    gap: 0.25rem;
  }

  .tab-btn {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    padding: 0.25rem 0.6rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tab-btn.active {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .tab-btn:hover:not(.active) {
    color: var(--text-primary);
  }

  .issues-container {
    padding: 0.75rem 1rem;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .issue-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: border-color 0.15s ease;
  }

  .issue-card:hover {
    border-color: #64748b;
  }

  .issue-card.severity-error {
    border-left: 4px solid var(--error-color);
  }

  .issue-card.severity-warning {
    border-left: 4px solid var(--warning-color);
  }

  .issue-card.severity-info {
    border-left: 4px solid var(--info-color);
  }

  .card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .badge-group {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .severity-badge {
    font-size: 0.65rem;
    text-transform: uppercase;
    font-weight: 700;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    letter-spacing: 0.025em;
  }

  .severity-badge.error {
    background: var(--error-bg);
    color: var(--error-color);
  }

  .severity-badge.warning {
    background: var(--warning-bg);
    color: var(--warning-color);
  }

  .severity-badge.info {
    background: var(--info-bg);
    color: var(--info-color);
  }

  .category-badge {
    font-size: 0.65rem;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    text-transform: uppercase;
    font-weight: 600;
  }

  .issue-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .issue-desc {
    font-size: 0.75rem;
    color: var(--text-secondary);
    line-height: 1.4;
    margin: 0;
  }

  .issue-wcag {
    font-size: 0.7rem;
    color: #a5b4fc;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .code-snippet {
    background: #090d16;
    border: 1px solid #1e293b;
    border-radius: 4px;
    padding: 0.4rem 0.6rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.7rem;
    color: #38bdf8;
    overflow-x: auto;
    white-space: pre;
  }

  .card-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .ai-fix-box {
    margin-top: 0.5rem;
    background: #090d16;
    border: 1px solid #3730a3;
    border-radius: 6px;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .ai-fix-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.75rem;
    font-weight: 600;
    color: #818cf8;
  }

  .ai-fix-content {
    font-size: 0.75rem;
    line-height: 1.5;
    color: #cbd5e1;
    white-space: pre-wrap;
    font-family: ui-sans-serif, system-ui, sans-serif;
  }

  .ai-fix-content code {
    font-family: ui-monospace, monospace;
    background: #1e293b;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    color: #38bdf8;
  }

  .empty-state {
    padding: 2.5rem 1rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    color: var(--text-secondary);
  }

  .empty-icon {
    font-size: 2.5rem;
  }

  .empty-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .empty-subtitle {
    font-size: 0.8rem;
    margin: 0;
  }

  .nano-guide {
    background: #1e1b4b;
    border: 1px solid #4338ca;
    border-radius: 6px;
    padding: 0.75rem;
    font-size: 0.75rem;
    line-height: 1.4;
    color: #c7d2fe;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .nano-guide a {
    color: #93c5fd;
    text-decoration: underline;
  }
`;
var app_default = defineToolbarApp({
  init(canvas, app) {
    let currentResult = runAudit(document);
    let activeCategoryFilter = "all";
    let activeSeverityFilter = "all";
    let activeHighlightEl = null;
    let aiStatus = "unsupported";
    const styleEl = document.createElement("style");
    styleEl.textContent = STYLES;
    canvas.appendChild(styleEl);
    const panel = document.createElement("div");
    panel.className = "audit-panel";
    canvas.appendChild(panel);
    const highlightOverlay = document.createElement("div");
    highlightOverlay.style.cssText = `
      position: absolute;
      border: 3px solid #ef4444;
      background: rgba(239, 68, 68, 0.2);
      border-radius: 4px;
      pointer-events: none;
      z-index: 999998;
      transition: all 0.2s ease;
      display: none;
      box-shadow: 0 0 15px rgba(239, 68, 68, 0.8);
    `;
    document.body.appendChild(highlightOverlay);
    function updateHighlight(el) {
      if (!el || !document.body.contains(el)) {
        highlightOverlay.style.display = "none";
        activeHighlightEl = null;
        return;
      }
      activeHighlightEl = el;
      const rect = el.getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      highlightOverlay.style.display = "block";
      highlightOverlay.style.top = `${rect.top + scrollY - 2}px`;
      highlightOverlay.style.left = `${rect.left + scrollX - 2}px`;
      highlightOverlay.style.width = `${rect.width + 4}px`;
      highlightOverlay.style.height = `${rect.height + 4}px`;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    async function checkAI() {
      aiStatus = await checkChromeAIAvailability();
      render();
    }
    function runNewAudit() {
      currentResult = runAudit(document);
      if (activeHighlightEl) {
        updateHighlight(null);
      }
      render();
    }
    function render() {
      panel.innerHTML = "";
      const header = document.createElement("div");
      header.className = "panel-header";
      const titleGroup = document.createElement("div");
      titleGroup.className = "header-title-group";
      titleGroup.innerHTML = `
        <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
        <div>
          <h3 class="header-title">AI a11y & SEO Auditor</h3>
        </div>
      `;
      const aiBadge = document.createElement("span");
      if (aiStatus === "readily") {
        aiBadge.className = "ai-badge ai-ready";
        aiBadge.innerHTML = '<span class="pulse-dot"></span> Gemini Nano Ready';
      } else if (aiStatus === "after-download") {
        aiBadge.className = "ai-badge ai-downloading";
        aiBadge.innerHTML = '<span class="pulse-dot"></span> Nano Downloading...';
      } else {
        aiBadge.className = "ai-badge ai-disabled";
        aiBadge.innerHTML = '<span class="pulse-dot"></span> Chrome AI Offline';
      }
      titleGroup.appendChild(aiBadge);
      header.appendChild(titleGroup);
      const headerActions = document.createElement("div");
      headerActions.className = "header-actions";
      const reauditBtn = document.createElement("button");
      reauditBtn.className = "btn btn-primary";
      reauditBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        Re-Audit
      `;
      reauditBtn.onclick = () => runNewAudit();
      headerActions.appendChild(reauditBtn);
      header.appendChild(headerActions);
      panel.appendChild(header);
      const filterBar = document.createElement("div");
      filterBar.className = "filter-bar";
      const catTabs = document.createElement("div");
      catTabs.className = "filter-tabs";
      const categories = [
        { id: "all", label: "All" },
        { id: "a11y", label: "A11y" },
        { id: "seo", label: "SEO" }
      ];
      categories.forEach((cat) => {
        const btn = document.createElement("button");
        btn.className = `tab-btn ${activeCategoryFilter === cat.id ? "active" : ""}`;
        btn.textContent = cat.label;
        btn.onclick = () => {
          activeCategoryFilter = cat.id;
          render();
        };
        catTabs.appendChild(btn);
      });
      const sevTabs = document.createElement("div");
      sevTabs.className = "filter-tabs";
      const severities = [
        { id: "all", label: "All", count: currentResult.summary.total },
        { id: "error", label: "Errors", count: currentResult.summary.errors },
        { id: "warning", label: "Warn", count: currentResult.summary.warnings }
      ];
      severities.forEach((sev) => {
        const btn = document.createElement("button");
        btn.className = `tab-btn ${activeSeverityFilter === sev.id ? "active" : ""}`;
        btn.textContent = `${sev.label} (${sev.count})`;
        btn.onclick = () => {
          activeSeverityFilter = sev.id;
          render();
        };
        sevTabs.appendChild(btn);
      });
      filterBar.appendChild(catTabs);
      filterBar.appendChild(sevTabs);
      panel.appendChild(filterBar);
      const issuesContainer = document.createElement("div");
      issuesContainer.className = "issues-container";
      if (aiStatus !== "readily") {
        const guide = document.createElement("div");
        guide.className = "nano-guide";
        guide.innerHTML = `
          <strong>\uD83D\uDCA1 Enable Gemini Nano On-Device AI:</strong>
          <span>Enable Chrome Flags for instant AI fixes: <code>chrome://flags/#prompt-api-for-gemini-nano</code> and <code>chrome://flags/#optimization-guide-on-device-model</code></span>
        `;
        issuesContainer.appendChild(guide);
      }
      const filteredIssues = currentResult.issues.filter((issue) => {
        if (activeCategoryFilter !== "all" && issue.category !== activeCategoryFilter)
          return false;
        if (activeSeverityFilter !== "all" && issue.severity !== activeSeverityFilter)
          return false;
        return true;
      });
      if (filteredIssues.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.innerHTML = `
          <div class="empty-icon">\uD83C\uDF89</div>
          <h4 class="empty-title">All checks passed!</h4>
          <p class="empty-subtitle">No ${activeSeverityFilter !== "all" ? activeSeverityFilter : ""} issues detected in this category.</p>
        `;
        issuesContainer.appendChild(empty);
      } else {
        filteredIssues.forEach((issue) => {
          const card = document.createElement("div");
          card.className = `issue-card severity-${issue.severity}`;
          const cardTop = document.createElement("div");
          cardTop.className = "card-top";
          const badgeGroup = document.createElement("div");
          badgeGroup.className = "badge-group";
          badgeGroup.innerHTML = `
            <span class="severity-badge ${issue.severity}">${issue.severity}</span>
            <span class="category-badge">${issue.category}</span>
          `;
          cardTop.appendChild(badgeGroup);
          const title = document.createElement("h4");
          title.className = "issue-title";
          title.textContent = issue.title;
          const desc = document.createElement("p");
          desc.className = "issue-desc";
          desc.textContent = issue.description;
          card.appendChild(cardTop);
          card.appendChild(title);
          card.appendChild(desc);
          if (issue.wcagCriterion) {
            const wcag = document.createElement("div");
            wcag.className = "issue-wcag";
            wcag.innerHTML = `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>${issue.wcagCriterion}</span>
            `;
            card.appendChild(wcag);
          }
          if (issue.htmlSnippet) {
            const snippet = document.createElement("div");
            snippet.className = "code-snippet";
            snippet.textContent = issue.htmlSnippet;
            card.appendChild(snippet);
          }
          const actions = document.createElement("div");
          actions.className = "card-actions";
          if (issue.element) {
            const inspectBtn = document.createElement("button");
            inspectBtn.className = "btn btn-secondary";
            inspectBtn.innerHTML = `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              Inspect
            `;
            inspectBtn.onclick = () => {
              if (activeHighlightEl === issue.element) {
                updateHighlight(null);
              } else {
                updateHighlight(issue.element);
              }
            };
            actions.appendChild(inspectBtn);
          }
          const aiBtn = document.createElement("button");
          aiBtn.className = "btn btn-primary";
          const isImageAltIssue = issue.ruleId === "img-alt-missing" || issue.ruleId === "img-alt-generic";
          aiBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/></svg>
            ${isImageAltIssue ? "AI Draft Alt" : "AI Remediate"}
          `;
          let fixBox = null;
          aiBtn.onclick = async () => {
            if (fixBox) {
              fixBox.remove();
              fixBox = null;
              return;
            }
            fixBox = document.createElement("div");
            fixBox.className = "ai-fix-box";
            fixBox.innerHTML = `
              <div class="ai-fix-header">
                <span>✨ Chrome AI Suggestion</span>
                <span class="generating-text">Generating...</span>
              </div>
              <div class="ai-fix-content">Analyzing context with Gemini Nano...</div>
            `;
            card.appendChild(fixBox);
            const contentEl = fixBox.querySelector(".ai-fix-content");
            const headerRight = fixBox.querySelector(".generating-text");
            try {
              let resultText = "";
              if (isImageAltIssue && issue.context) {
                resultText = await generateNanoAltText(issue.context, (chunk) => {
                  contentEl.textContent = chunk;
                });
              } else {
                resultText = await generateNanoRemedy(issue, (chunk) => {
                  contentEl.textContent = chunk;
                });
              }
              contentEl.textContent = resultText;
              headerRight.innerHTML = `
                <button class="btn btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.65rem;">Copy Fix</button>
              `;
              const copyBtn = headerRight.querySelector("button");
              if (copyBtn) {
                copyBtn.onclick = () => {
                  navigator.clipboard.writeText(resultText);
                  copyBtn.textContent = "Copied!";
                  setTimeout(() => {
                    copyBtn.textContent = "Copy Fix";
                  }, 2000);
                };
              }
            } catch (err) {
              contentEl.textContent = `Error: ${err?.message || String(err)}`;
            }
          };
          actions.appendChild(aiBtn);
          card.appendChild(actions);
          issuesContainer.appendChild(card);
        });
      }
      panel.appendChild(issuesContainer);
    }
    checkAI();
    render();
    if (typeof document !== "undefined") {
      document.addEventListener("astro:page-load", () => {
        runNewAudit();
      });
    }
    app.onToggled?.(({ state }) => {
      panel.style.display = state ? "flex" : "none";
      if (!state) {
        updateHighlight(null);
      } else {
        runNewAudit();
      }
    });
  }
});
export {
  app_default as default
};
