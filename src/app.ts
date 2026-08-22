import { defineToolbarApp } from 'astro/toolbar';
import { runAudit, type AuditIssue, type AuditResult, type AuditSeverity, type AuditCategory } from './auditors/index.js';
import { checkChromeAIAvailability, generateNanoRemedy, generateNanoAltText } from './prompts.js';
import type { ImageContext } from './auditors/images.js';

const STYLES = `
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

export default defineToolbarApp({
  init(canvas, app) {
    let currentResult: AuditResult = runAudit(document);
    let activeCategoryFilter: 'all' | AuditCategory = 'all';
    let activeSeverityFilter: 'all' | AuditSeverity = 'all';
    let activeHighlightEl: Element | null = null;
    let aiStatus: 'readily' | 'after-download' | 'no' | 'unsupported' = 'unsupported';

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = STYLES;
    canvas.appendChild(styleEl);

    // Root wrapper
    const panel = document.createElement('div');
    panel.className = 'audit-panel';
    canvas.appendChild(panel);

    // Highlight overlay element on page
    const highlightOverlay = document.createElement('div');
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

    function updateHighlight(el: Element | null) {
      if (!el || !document.body.contains(el)) {
        highlightOverlay.style.display = 'none';
        activeHighlightEl = null;
        return;
      }

      activeHighlightEl = el;
      const rect = el.getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;

      highlightOverlay.style.display = 'block';
      highlightOverlay.style.top = `${rect.top + scrollY - 2}px`;
      highlightOverlay.style.left = `${rect.left + scrollX - 2}px`;
      highlightOverlay.style.width = `${rect.width + 4}px`;
      highlightOverlay.style.height = `${rect.height + 4}px`;

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      panel.innerHTML = '';

      // 1. Header
      const header = document.createElement('div');
      header.className = 'panel-header';

      const titleGroup = document.createElement('div');
      titleGroup.className = 'header-title-group';
      titleGroup.innerHTML = `
        <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
        <div>
          <h3 class="header-title">AI a11y & SEO Auditor</h3>
        </div>
      `;

      // AI Badge
      const aiBadge = document.createElement('span');
      if (aiStatus === 'readily') {
        aiBadge.className = 'ai-badge ai-ready';
        aiBadge.innerHTML = '<span class="pulse-dot"></span> Gemini Nano Ready';
      } else if (aiStatus === 'after-download') {
        aiBadge.className = 'ai-badge ai-downloading';
        aiBadge.innerHTML = '<span class="pulse-dot"></span> Nano Downloading...';
      } else {
        aiBadge.className = 'ai-badge ai-disabled';
        aiBadge.innerHTML = '<span class="pulse-dot"></span> Chrome AI Offline';
      }
      titleGroup.appendChild(aiBadge);
      header.appendChild(titleGroup);

      // Header Actions
      const headerActions = document.createElement('div');
      headerActions.className = 'header-actions';

      const reauditBtn = document.createElement('button');
      reauditBtn.className = 'btn btn-primary';
      reauditBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        Re-Audit
      `;
      reauditBtn.onclick = () => runNewAudit();
      headerActions.appendChild(reauditBtn);

      header.appendChild(headerActions);
      panel.appendChild(header);

      // 2. Filter Bar
      const filterBar = document.createElement('div');
      filterBar.className = 'filter-bar';

      const catTabs = document.createElement('div');
      catTabs.className = 'filter-tabs';
      const categories: Array<{ id: 'all' | AuditCategory; label: string }> = [
        { id: 'all', label: 'All' },
        { id: 'a11y', label: 'A11y' },
        { id: 'seo', label: 'SEO' },
      ];
      categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${activeCategoryFilter === cat.id ? 'active' : ''}`;
        btn.textContent = cat.label;
        btn.onclick = () => {
          activeCategoryFilter = cat.id;
          render();
        };
        catTabs.appendChild(btn);
      });

      const sevTabs = document.createElement('div');
      sevTabs.className = 'filter-tabs';
      const severities: Array<{ id: 'all' | AuditSeverity; label: string; count: number }> = [
        { id: 'all', label: 'All', count: currentResult.summary.total },
        { id: 'error', label: 'Errors', count: currentResult.summary.errors },
        { id: 'warning', label: 'Warn', count: currentResult.summary.warnings },
      ];
      severities.forEach(sev => {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${activeSeverityFilter === sev.id ? 'active' : ''}`;
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

      // 3. Issues Container
      const issuesContainer = document.createElement('div');
      issuesContainer.className = 'issues-container';

      // Nano setup helper if AI offline
      if (aiStatus !== 'readily') {
        const guide = document.createElement('div');
        guide.className = 'nano-guide';
        guide.innerHTML = `
          <strong>💡 Enable Gemini Nano On-Device AI:</strong>
          <span>Enable Chrome Flags for instant AI fixes: <code>chrome://flags/#prompt-api-for-gemini-nano</code> and <code>chrome://flags/#optimization-guide-on-device-model</code></span>
        `;
        issuesContainer.appendChild(guide);
      }

      // Filtered issues
      const filteredIssues = currentResult.issues.filter(issue => {
        if (activeCategoryFilter !== 'all' && issue.category !== activeCategoryFilter) return false;
        if (activeSeverityFilter !== 'all' && issue.severity !== activeSeverityFilter) return false;
        return true;
      });

      if (filteredIssues.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `
          <div class="empty-icon">🎉</div>
          <h4 class="empty-title">All checks passed!</h4>
          <p class="empty-subtitle">No ${activeSeverityFilter !== 'all' ? activeSeverityFilter : ''} issues detected in this category.</p>
        `;
        issuesContainer.appendChild(empty);
      } else {
        filteredIssues.forEach(issue => {
          const card = document.createElement('div');
          card.className = `issue-card severity-${issue.severity}`;

          // Top Header
          const cardTop = document.createElement('div');
          cardTop.className = 'card-top';

          const badgeGroup = document.createElement('div');
          badgeGroup.className = 'badge-group';
          badgeGroup.innerHTML = `
            <span class="severity-badge ${issue.severity}">${issue.severity}</span>
            <span class="category-badge">${issue.category}</span>
          `;

          cardTop.appendChild(badgeGroup);

          const title = document.createElement('h4');
          title.className = 'issue-title';
          title.textContent = issue.title;

          const desc = document.createElement('p');
          desc.className = 'issue-desc';
          desc.textContent = issue.description;

          card.appendChild(cardTop);
          card.appendChild(title);
          card.appendChild(desc);

          if (issue.wcagCriterion) {
            const wcag = document.createElement('div');
            wcag.className = 'issue-wcag';
            wcag.innerHTML = `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>${issue.wcagCriterion}</span>
            `;
            card.appendChild(wcag);
          }

          if (issue.htmlSnippet) {
            const snippet = document.createElement('div');
            snippet.className = 'code-snippet';
            snippet.textContent = issue.htmlSnippet;
            card.appendChild(snippet);
          }

          // Card Action Buttons
          const actions = document.createElement('div');
          actions.className = 'card-actions';

          if (issue.element) {
            const inspectBtn = document.createElement('button');
            inspectBtn.className = 'btn btn-secondary';
            inspectBtn.innerHTML = `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              Inspect
            `;
            inspectBtn.onclick = () => {
              if (activeHighlightEl === issue.element) {
                updateHighlight(null);
              } else {
                updateHighlight(issue.element!);
              }
            };
            actions.appendChild(inspectBtn);
          }

          // AI Action Button
          const aiBtn = document.createElement('button');
          aiBtn.className = 'btn btn-primary';
          const isImageAltIssue = issue.ruleId === 'img-alt-missing' || issue.ruleId === 'img-alt-generic';
          aiBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/></svg>
            ${isImageAltIssue ? 'AI Draft Alt' : 'AI Remediate'}
          `;

          let fixBox: HTMLElement | null = null;

          aiBtn.onclick = async () => {
            if (fixBox) {
              fixBox.remove();
              fixBox = null;
              return;
            }

            fixBox = document.createElement('div');
            fixBox.className = 'ai-fix-box';
            fixBox.innerHTML = `
              <div class="ai-fix-header">
                <span>✨ Chrome AI Suggestion</span>
                <span class="generating-text">Generating...</span>
              </div>
              <div class="ai-fix-content">Analyzing context with Gemini Nano...</div>
            `;
            card.appendChild(fixBox);

            const contentEl = fixBox.querySelector('.ai-fix-content') as HTMLElement;
            const headerRight = fixBox.querySelector('.generating-text') as HTMLElement;

            try {
              let resultText = '';
              if (isImageAltIssue && issue.context) {
                resultText = await generateNanoAltText(issue.context as unknown as ImageContext, (chunk) => {
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
              const copyBtn = headerRight.querySelector('button');
              if (copyBtn) {
                copyBtn.onclick = () => {
                  navigator.clipboard.writeText(resultText);
                  copyBtn.textContent = 'Copied!';
                  setTimeout(() => {
                    copyBtn.textContent = 'Copy Fix';
                  }, 2000);
                };
              }
            } catch (err: any) {
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

    // Initialize AI status check and initial render
    checkAI();
    render();

    // Re-audit on page mutations or view transitions
    if (typeof document !== 'undefined') {
      document.addEventListener('astro:page-load', () => {
        runNewAudit();
      });
    }

    // Cleanup when toolbar app is destroyed/toggled off
    app.onToggled?.(({ state }) => {
      panel.style.display = state ? 'flex' : 'none';
      if (!state) {
        updateHighlight(null);
      } else {
        runNewAudit();
      }
    });
  },
});
