# astro-dev-audit-nano 🧠⚡

[![npm version](https://img.shields.io/npm/v/astro-dev-audit-nano.svg?style=flat-square&color=6366f1)](https://www.npmjs.com/package/astro-dev-audit-nano)
[![Astro 5+](https://img.shields.io/badge/Astro-5.0%2B-FF5D01.svg?style=flat-square&logo=astro)](https://astro.build)
[![Chrome Built-in AI](https://img.shields.io/badge/Chrome%20AI-Gemini%20Nano-4285F4.svg?style=flat-square&logo=googlechrome)](https://developer.chrome.com/docs/ai/built-in)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8%2B-3178C6.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

An **Astro Dev Toolbar app** (`addDevToolbarApp`) that analyzes your rendered local dev page for **WCAG 2.1 AA/AAA accessibility** and **SEO** issues in real time, powered by **Chrome Built-in AI (`window.ai.languageModel` / Gemini Nano)** to generate context-aware remediation code and alt-text drafts on-device with zero API keys or cloud latency.

---

```
  +-----------------------------------------------------------------------+
  |  Astro Dev Toolbar > AI a11y & SEO Auditor         [Gemini Nano Ready] |
  +-----------------------------------------------------------------------+
  |  Filters: [ All (4) ] [ Errors (2) ] [ Warn (2) ]  | Category: [A11y]  |
  +-----------------------------------------------------------------------+
  |  [ERROR] [A11Y] Skipped heading level: <h1> to <h3>                   |
  |  WCAG 1.3.1 Info and Relationships (Level A)                           |
  |  <section><h3>Our Services</h3></section>                             |
  |  [ Inspect Element ] [ ✨ AI Remediate ]                              |
  |  +-----------------------------------------------------------------+  |
  |  | ✨ Chrome AI Suggestion                              [Copy Fix] |  |
  |  | Change `<h3>` to `<h2>` to preserve sequential heading order.   |  |
  |  | ```html                                                         |  |
  |  | <section><h2>Our Services</h2></section>                        |  |
  |  | ```                                                             |  |
  |  +-----------------------------------------------------------------+  |
  +-----------------------------------------------------------------------+
  |  [ERROR] [A11Y] Missing image alt attribute                           |
  |  WCAG 1.1.1 Non-text Content (Level A)                                |
  |  <img src="/team-retreat.jpg" />                                      |
  |  [ Inspect Element ] [ ✨ AI Draft Alt ]                              |
  +-----------------------------------------------------------------------+
```

---

## ✨ Features

- 🔍 **Live Page Audit**: Continuously evaluates rendered DOM trees for structural accessibility and SEO best practices.
- 🧠 **On-Device Gemini Nano AI**: Leverages Chrome's Built-in Prompt API (`window.ai.languageModel`) to stream immediate, context-aware WCAG remediation suggestions and code snippets.
- 🖼️ **Contextual Alt-Text Generator**: Extracts surrounding DOM context (captions, parent paragraphs, headings, image src, and links) to synthesize concise, descriptive alt-text drafts.
- 🎨 **WCAG Color Contrast Engine**: Calculates precise relative luminance ratios for normal and large text against computed background colors according to WCAG 2.1 AA/AAA guidelines.
- 📑 **Heading Hierarchy Validator**: Checks for missing `<h1>`, multiple `<h1>`s, skipped heading levels (e.g. `<h1>` to `<h3>`), and empty headings.
- 🌐 **SEO & Link Quality**: Verifies `<html lang>`, `<title>`, `<meta name="description">`, responsive viewport, and generic anchor text ("click here", "read more").
- 🎯 **Visual DOM Highlighting**: Smoothly scrolls and highlights offending elements directly in the live browser preview.
- ⚡ **Zero Cloud Costs & Privacy Preserving**: Runs 100% locally on your machine via Gemini Nano.

---

## 📦 Installation

```bash
# Using bun
bun add astro-dev-audit-nano

# Using npm
npm install astro-dev-audit-nano

# Using pnpm
pnpm add astro-dev-audit-nano
```

---

## 🚀 Quick Start

Add `devAuditNano` to your `astro.config.mjs`:

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import devAuditNano from 'astro-dev-audit-nano';

export default defineConfig({
  integrations: [
    devAuditNano()
  ]
});
```

Start your dev server:

```bash
bun astro dev
# or: npx astro dev
```

Open the Astro Dev Toolbar at the bottom of your screen and click on **AI a11y & SEO Auditor**!

---

## 🛠️ Enabling Chrome Built-in AI (Gemini Nano)

To utilize on-device AI remediation and alt-text drafting in Google Chrome / Chromium (version 128+):

1. **Enable Prompt API in flags**:
   - Open `chrome://flags/#prompt-api-for-gemini-nano`
   - Select **Enabled**
2. **Enable On-Device Model**:
   - Open `chrome://flags/#optimization-guide-on-device-model`
   - Select **Enabled BypassPerfRequirement**
3. **Verify / Download Model**:
   - Open `chrome://components`
   - Find **Optimization Guide On Device Model**
   - Click **Check for update** (Model size is ~1.5 GB and downloads in the background).
4. Restart Chrome. When active, the toolbar badge will display `🟢 Gemini Nano Ready`.

> **Note**: Even if Chrome AI is disabled or unsupported in a browser, `astro-dev-audit-nano` continues to provide comprehensive heuristic rule auditing and static WCAG remediation guidance.

---

## 🧩 Audit Rules Reference

| Rule ID | Category | Severity | Description | WCAG Criterion |
|---|---|---|---|---|
| `headings-missing-h1` | SEO / A11y | Error | No `<h1>` heading found on the page | WCAG 1.3.1 (A) |
| `headings-skip-level` | A11y | Error | Heading levels jump unexpectedly (e.g. `<h1>` to `<h3>`) | WCAG 1.3.1 (A) |
| `headings-empty` | A11y | Error | Heading contains no accessible text content | WCAG 1.3.1 (A) |
| `headings-multiple-h1` | SEO | Warning | Multiple `<h1>` headings present | WCAG 1.3.1 (A) |
| `headings-invalid-start` | A11y | Warning | First heading on page is not `<h1>` | WCAG 1.3.1 (A) |
| `img-alt-missing` | A11y | Error | Image element lacks an `alt` attribute | WCAG 1.1.1 (A) |
| `img-alt-generic` | A11y | Warning | Image uses placeholder alt text ("image", "photo", file name) | WCAG 1.1.1 (A) |
| `img-link-empty-alt` | A11y | Error | Linked image has `alt=""` and no other link text | WCAG 2.4.4 (A) |
| `contrast-ratio-low` | A11y | Error | Text color contrast below 4.5:1 (normal) or 3:1 (large text) | WCAG 1.4.3 (AA) |
| `html-lang-missing` | A11y / SEO | Error | `<html>` element missing `lang` attribute | WCAG 3.1.1 (A) |
| `meta-title-missing` | SEO | Error | Document missing or has empty `<title>` | WCAG 2.4.2 (A) |
| `meta-title-short` | SEO | Warning | Title is too short (< 10 characters) | WCAG 2.4.2 (A) |
| `meta-description-missing` | SEO | Warning | Missing `<meta name="description">` | SEO Best Practice |
| `link-text-generic` | A11y / SEO | Warning | Anchor text is uninformative ("click here", "read more") | WCAG 2.4.4 (A) |

---

## 🧪 Programmatic Usage

You can also import auditors directly for custom testing or CI checks:

```typescript
import { runAudit, auditHeadings, auditImages, auditContrast, auditSeo } from 'astro-dev-audit-nano';

const results = runAudit(document);
console.log(`Found ${results.summary.errors} errors, ${results.summary.warnings} warnings`);

for (const issue of results.issues) {
  console.log(`[${issue.severity.toUpperCase()}] ${issue.title} (${issue.wcagCriterion})`);
}
```

---

## 🧪 Development & Testing

```bash
# Clone and install dependencies
bun install

# Run unit tests (Bun test runner)
bun test

# Run TypeScript typechecks
bun run typecheck

# Build bundle and type declarations
bun run build
```

---

## 📄 License

MIT © [bhubbard](LICENSE)
