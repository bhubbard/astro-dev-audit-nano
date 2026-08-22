import type { AuditIssue } from './auditors/types.js';
import type { ImageContext } from './auditors/images.js';
import type { AICapabilityAvailability, AILanguageModel } from './chrome-ai.js';

export function buildRemedyPrompt(issue: AuditIssue): string {
  const contextStr = issue.context ? JSON.stringify(issue.context, null, 2) : 'None';
  return `You are an expert web accessibility (WCAG 2.1 AA/AAA) and SEO specialist.
Analyze this audit issue detected on a web page and provide:
1. A concise explanation of why this is an issue and its impact on users or search engines.
2. The exact fixed HTML or CSS code snippet that resolves it.

--- Issue Details ---
Rule ID: ${issue.ruleId}
Title: ${issue.title}
Severity: ${issue.severity}
WCAG Criterion: ${issue.wcagCriterion || 'N/A'}
HTML Snippet: ${issue.htmlSnippet || 'N/A'}
Selector: ${issue.selector || 'N/A'}
Context: ${contextStr}

Respond in concise markdown with a code block containing the recommended fix.`;
}

export function buildAltTextPrompt(context: ImageContext): string {
  const surrounding = context.surroundingText ? `Surrounding page text: "${context.surroundingText}"` : '';
  const heading = context.precedingHeading ? `Preceding section heading: "${context.precedingHeading}"` : '';
  const caption = context.caption ? `Caption / figcaption: "${context.caption}"` : '';
  const link = context.parentLinkHref ? `Contained inside link target: "${context.parentLinkHref}" (Link text: "${context.parentLinkText || ''}")` : '';
  const currentAlt = context.currentAlt ? `Current placeholder/generic alt: "${context.currentAlt}"` : '';
  const src = context.src ? `Image source filename: "${context.src.split('/').pop() || context.src}"` : '';

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

export async function checkChromeAIAvailability(): Promise<AICapabilityAvailability | 'unsupported'> {
  if (typeof window === 'undefined' || !window.ai || !window.ai.languageModel) {
    return 'unsupported';
  }

  try {
    const capabilities = await window.ai.languageModel.capabilities();
    return capabilities.available;
  } catch (err) {
    console.warn('[astro-dev-audit-nano] Failed to query Chrome AI capabilities:', err);
    return 'unsupported';
  }
}

export async function createNanoModel(systemPrompt?: string): Promise<AILanguageModel | null> {
  if (typeof window === 'undefined' || !window.ai || !window.ai.languageModel) {
    return null;
  }

  try {
    const capabilities = await window.ai.languageModel.capabilities();
    if (capabilities.available === 'no') {
      return null;
    }

    const defaultSystemPrompt = 'You are an on-device AI auditor assisting web developers with real-time WCAG accessibility and SEO fixes.';
    return await window.ai.languageModel.create({
      systemPrompt: systemPrompt || defaultSystemPrompt,
      temperature: 0.2,
      topK: 3,
    });
  } catch (err) {
    console.error('[astro-dev-audit-nano] Failed to create Chrome AI session:', err);
    return null;
  }
}

export async function generateNanoRemedy(
  issue: AuditIssue,
  onChunk?: (text: string) => void
): Promise<string> {
  const model = await createNanoModel();
  if (!model) {
    return `Chrome Built-in AI (Gemini Nano) is not currently available in this browser.\n\n` +
      `Suggested Quick Fix:\n${issue.remedyHint || 'Review element markup against WCAG guidelines.'}\n\n` +
      `To enable on-device Gemini Nano:\n` +
      `1. Open chrome://flags/#prompt-api-for-gemini-nano -> Set to 'Enabled'\n` +
      `2. Open chrome://flags/#optimization-guide-on-device-model -> Set to 'Enabled BypassPerfRequirement'\n` +
      `3. Open chrome://components -> Click 'Check for update' under 'Optimization Guide On Device Model'.`;
  }

  const prompt = buildRemedyPrompt(issue);
  let fullText = '';

  try {
    if (typeof model.promptStreaming === 'function' && onChunk) {
      const stream = model.promptStreaming(prompt);
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          fullText = value; // promptStreaming yields cumulative or delta depending on implementation
          onChunk(fullText);
        }
      }
    } else {
      fullText = await model.prompt(prompt);
      if (onChunk) onChunk(fullText);
    }
  } catch (err: any) {
    fullText = `AI Generation error: ${err?.message || String(err)}\n\nFallback suggestion: ${issue.remedyHint || 'None'}`;
  } finally {
    try {
      model.destroy();
    } catch (_) {}
  }

  return fullText;
}

export async function generateNanoAltText(
  context: ImageContext,
  onChunk?: (text: string) => void
): Promise<string> {
  const model = await createNanoModel('You are an expert accessibility consultant drafting WCAG-compliant image alternative text.');
  if (!model) {
    const fallbackAlt = context.caption || context.precedingHeading || 'Descriptive image';
    return `Chrome AI unavailable. Suggested alt draft based on context: alt="${fallbackAlt}"`;
  }

  const prompt = buildAltTextPrompt(context);
  let fullText = '';

  try {
    if (typeof model.promptStreaming === 'function' && onChunk) {
      const stream = model.promptStreaming(prompt);
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          fullText = value;
          onChunk(fullText);
        }
      }
    } else {
      fullText = await model.prompt(prompt);
      if (onChunk) onChunk(fullText);
    }
  } catch (err: any) {
    fullText = `AI Alt-text generation error: ${err?.message || String(err)}`;
  } finally {
    try {
      model.destroy();
    } catch (_) {}
  }

  return fullText;
}
