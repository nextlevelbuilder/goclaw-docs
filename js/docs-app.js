/**
 * docs-app.js — SPA for GoClaw documentation with EN/VI i18n support
 * Loads and renders markdown docs with marked.js + mermaid + highlight.js
 */

/* ============================================================
   I18N — UI string translations
   ============================================================ */
const UI_STRINGS = {
  en: {
    'search.placeholder': 'Search docs...',
    'toc.title': 'On this page',
    'loading': 'Loading...',
    'footer.text': 'GoClaw — Enterprise AI Agent Platform',
    'notfound': 'Document not found.',
    'loadfailed': 'Failed to load document',
  },
  vi: {
    'search.placeholder': 'Tìm kiếm tài liệu...',
    'toc.title': 'Trên trang này',
    'loading': 'Đang tải...',
    'footer.text': 'GoClaw — Nền Tảng AI Agent Doanh Nghiệp',
    'notfound': 'Không tìm thấy tài liệu.',
    'loadfailed': 'Không thể tải tài liệu',
  }
};

/* ============================================================
   LANGUAGE STATE
   ============================================================ */
let currentLang = localStorage.getItem('goclaw-docs-lang') || 'en';

function t(key) {
  return (UI_STRINGS[currentLang] && UI_STRINGS[currentLang][key]) || UI_STRINGS.en[key] || key;
}

/* ============================================================
   DOCUMENT MAP — hash -> file paths per language
   ============================================================ */
/* Helper: generate EN/VI file paths from section + filename */
function docEntry(section, file, titleEn, titleVi) {
  return {
    file: { en: `${section}/${file}.md`, vi: `vi/${section}/${file}.md` },
    title: { en: titleEn, vi: titleVi || titleEn },
  };
}

const DOC_MAP = {
  // Getting Started
  'what-is-goclaw': docEntry('getting-started', 'what-is-goclaw', 'What is GoClaw?', 'GoClaw là gì?'),
  'installation': docEntry('getting-started', 'installation', 'Installation', 'Cài đặt'),
  'quick-start': docEntry('getting-started', 'quick-start', 'Quick Start', 'Bắt đầu nhanh'),
  'configuration': docEntry('getting-started', 'configuration', 'Configuration', 'Cấu hình'),
  'dashboard-tour': docEntry('getting-started', 'web-dashboard-tour', 'Dashboard Tour', 'Tham quan Dashboard'),
  'migrating-from-openclaw': docEntry('getting-started', 'migrating-from-openclaw', 'Migrating from OpenClaw', 'Chuyển từ OpenClaw'),

  // Core Concepts
  'how-goclaw-works': docEntry('core-concepts', 'how-goclaw-works', 'How GoClaw Works', 'GoClaw hoạt động thế nào'),
  'agents-explained': docEntry('core-concepts', 'agents-explained', 'Agents Explained', 'Giải thích Agent'),
  'sessions-and-history': docEntry('core-concepts', 'sessions-and-history', 'Sessions & History', 'Phiên & Lịch sử'),
  'tools-overview': docEntry('core-concepts', 'tools-overview', 'Tools Overview', 'Tổng quan công cụ'),
  'memory-system': docEntry('core-concepts', 'memory-system', 'Memory System', 'Hệ thống bộ nhớ'),
  'multi-tenancy': docEntry('core-concepts', 'multi-tenancy', 'Multi-Tenancy', 'Đa thuê bao'),

  // Agents
  'creating-agents': docEntry('agents', 'creating-agents', 'Creating Agents', 'Tạo Agent'),
  'open-vs-predefined': docEntry('agents', 'open-vs-predefined', 'Open vs Predefined', 'Open vs Predefined'),
  'context-files': docEntry('agents', 'context-files', 'Context Files', 'File ngữ cảnh'),
  'summoning-bootstrap': docEntry('agents', 'summoning-bootstrap', 'Summoning & Bootstrap', 'Triệu hồi & Bootstrap'),
  'editing-personality': docEntry('agents', 'editing-personality', 'Editing Personality', 'Chỉnh sửa tính cách'),
  'sharing-and-access': docEntry('agents', 'sharing-and-access', 'Sharing & Access Control', 'Chia sẻ & Kiểm soát truy cập'),
  'user-overrides': docEntry('agents', 'user-overrides', 'User Overrides', 'Ghi đè người dùng'),
  'system-prompt-anatomy': docEntry('agents', 'system-prompt-anatomy', 'System Prompt Anatomy', 'Cấu trúc System Prompt'),

  // Providers
  'providers-overview': docEntry('providers', 'overview', 'Provider Overview', 'Tổng quan Provider'),
  'provider-anthropic': docEntry('providers', 'anthropic', 'Anthropic (Claude)'),
  'provider-openai': docEntry('providers', 'openai', 'OpenAI / Azure OpenAI'),
  'provider-openrouter': docEntry('providers', 'openrouter', 'OpenRouter'),
  'provider-gemini': docEntry('providers', 'gemini', 'Google Gemini'),
  'provider-deepseek': docEntry('providers', 'deepseek', 'DeepSeek'),
  'provider-groq': docEntry('providers', 'groq', 'Groq'),
  'provider-mistral': docEntry('providers', 'mistral', 'Mistral'),
  'provider-xai': docEntry('providers', 'xai', 'xAI (Grok)'),
  'provider-minimax': docEntry('providers', 'minimax', 'MiniMax'),
  'provider-cohere': docEntry('providers', 'cohere', 'Cohere'),
  'provider-perplexity': docEntry('providers', 'perplexity', 'Perplexity'),
  'provider-dashscope': docEntry('providers', 'dashscope', 'DashScope (Qwen)'),
  'provider-claude-cli': docEntry('providers', 'claude-cli', 'Claude CLI'),
  'provider-codex': docEntry('providers', 'codex-chatgpt', 'Codex / ChatGPT'),
  'provider-custom': docEntry('providers', 'custom-provider', 'Custom / OpenAI-Compatible', 'Tùy chỉnh / OpenAI-Compatible'),

  // Channels
  'channels-overview': docEntry('channels', 'overview', 'Channel Overview', 'Tổng quan kênh'),
  'channel-telegram': docEntry('channels', 'telegram', 'Telegram'),
  'channel-discord': docEntry('channels', 'discord', 'Discord'),
  'channel-feishu': docEntry('channels', 'feishu', 'Feishu / Lark'),
  'channel-zalo-oa': docEntry('channels', 'zalo-oa', 'Zalo OA'),
  'channel-zalo-personal': docEntry('channels', 'zalo-personal', 'Zalo Personal', 'Zalo Cá nhân'),
  'channel-whatsapp': docEntry('channels', 'whatsapp', 'WhatsApp'),
  'channel-websocket': docEntry('channels', 'websocket', 'WebSocket'),
  'channel-browser-pairing': docEntry('channels', 'browser-pairing', 'Browser Pairing', 'Ghép nối trình duyệt'),

  // Agent Teams
  'teams-what-are-teams': docEntry('agent-teams', 'what-are-teams', 'What Are Teams?', 'Team là gì?'),
  'teams-creating': docEntry('agent-teams', 'creating-managing-teams', 'Creating & Managing Teams', 'Tạo & Quản lý Team'),
  'teams-task-board': docEntry('agent-teams', 'task-board', 'Task Board', 'Bảng công việc'),
  'teams-messaging': docEntry('agent-teams', 'team-messaging', 'Team Messaging', 'Nhắn tin Team'),
  'teams-delegation': docEntry('agent-teams', 'delegation-and-handoff', 'Delegation & Handoff', 'Ủy quyền & Chuyển giao'),

  // Advanced
  'custom-tools': docEntry('advanced', 'custom-tools', 'Custom Tools', 'Công cụ tùy chỉnh'),
  'mcp-integration': docEntry('advanced', 'mcp-integration', 'MCP Integration', 'Tích hợp MCP'),
  'skills': docEntry('advanced', 'skills', 'Skills', 'Kỹ năng'),
  'scheduling-cron': docEntry('advanced', 'scheduling-cron', 'Scheduling & Cron', 'Lập lịch & Cron'),
  'sandbox': docEntry('advanced', 'sandbox', 'Sandbox', 'Hộp cát'),
  'media-generation': docEntry('advanced', 'media-generation', 'Media Generation', 'Tạo Media'),
  'tts-voice': docEntry('advanced', 'tts-voice', 'TTS & Voice', 'Chuyển văn bản thành giọng nói'),
  'knowledge-graph': docEntry('advanced', 'knowledge-graph', 'Knowledge Graph', 'Đồ thị tri thức'),
  'caching': docEntry('advanced', 'caching', 'Caching', 'Bộ nhớ đệm'),
  'browser-automation': docEntry('advanced', 'browser-automation', 'Browser Automation', 'Tự động hóa trình duyệt'),
  'extended-thinking': docEntry('advanced', 'extended-thinking', 'Extended Thinking', 'Suy nghĩ mở rộng'),
  'hooks-quality-gates': docEntry('advanced', 'hooks-quality-gates', 'Hooks & Quality Gates', 'Hook & Cổng chất lượng'),
  'authentication': docEntry('advanced', 'authentication', 'Authentication & OAuth', 'Xác thực & OAuth'),
  'exec-approval': docEntry('advanced', 'exec-approval', 'Exec Approval', 'Phê duyệt thực thi'),
  'usage-quota': docEntry('advanced', 'usage-quota', 'Usage & Quota', 'Sử dụng & Hạn mức'),

  // Deployment
  'deploy-docker-compose': docEntry('deployment', 'docker-compose', 'Docker Compose', 'Docker Compose'),
  'deploy-database': docEntry('deployment', 'database-setup', 'Database Setup', 'Thiết lập cơ sở dữ liệu'),
  'deploy-security': docEntry('deployment', 'security-hardening', 'Security Hardening', 'Tăng cường bảo mật'),
  'deploy-observability': docEntry('deployment', 'observability', 'Observability', 'Quan sát hệ thống'),
  'deploy-tailscale': docEntry('deployment', 'tailscale', 'Tailscale'),
  'deploy-checklist': docEntry('deployment', 'production-checklist', 'Production Checklist', 'Danh sách production'),
  'deploy-upgrading': docEntry('deployment', 'upgrading', 'Upgrading', 'Nâng cấp'),

  // Recipes
  'recipe-personal-assistant': docEntry('recipes', 'personal-assistant', 'Personal Assistant', 'Trợ lý cá nhân'),
  'recipe-team-chatbot': docEntry('recipes', 'team-chatbot', 'Team Chatbot', 'Chatbot nhóm'),
  'recipe-customer-support': docEntry('recipes', 'customer-support', 'Customer Support', 'Hỗ trợ khách hàng'),
  'recipe-code-review': docEntry('recipes', 'code-review-agent', 'Code Review Agent', 'Agent Review Code'),
  'recipe-multi-channel': docEntry('recipes', 'multi-channel-setup', 'Multi-Channel Setup', 'Thiết lập đa kênh'),

  // Showcases
  'gallery': docEntry('showcases', 'gallery', 'Gallery', 'Bộ sưu tập'),

  // Reference
  'cli-commands': docEntry('reference', 'cli-commands', 'CLI Commands', 'Lệnh CLI'),
  'websocket-protocol': docEntry('reference', 'websocket-protocol', 'WebSocket Protocol', 'Giao thức WebSocket'),
  'rest-api': docEntry('reference', 'rest-api', 'REST API', 'REST API'),
  'config-reference': docEntry('reference', 'config-reference', 'Configuration Reference', 'Tham khảo cấu hình'),
  'env-vars': docEntry('reference', 'environment-variables', 'Environment Variables', 'Biến môi trường'),
  'database-schema': docEntry('reference', 'database-schema', 'Database Schema', 'Lược đồ cơ sở dữ liệu'),
  'glossary': docEntry('reference', 'glossary', 'Glossary', 'Thuật ngữ'),
  'template-agents': docEntry('reference/templates', 'agents', 'AGENTS.md Template'),
  'template-soul': docEntry('reference/templates', 'soul', 'SOUL.md Template'),
  'template-identity': docEntry('reference/templates', 'identity', 'IDENTITY.md Template'),
  'template-tools': docEntry('reference/templates', 'tools', 'TOOLS.md Template'),
  'template-user': docEntry('reference/templates', 'user', 'USER.md Template'),
  'template-bootstrap': docEntry('reference/templates', 'bootstrap', 'BOOTSTRAP.md Template'),

  // Troubleshooting
  'troubleshoot-common': docEntry('troubleshooting', 'common-issues', 'Common Issues', 'Vấn đề thường gặp'),
  'troubleshoot-channels': docEntry('troubleshooting', 'channels', 'Channels', 'Kênh'),
  'troubleshoot-providers': docEntry('troubleshooting', 'providers', 'Providers', 'Provider'),
  'troubleshoot-database': docEntry('troubleshooting', 'database', 'Database', 'Cơ sở dữ liệu'),
};

const DEFAULT_DOC = 'what-is-goclaw';

/* Cached markdown content: key = `${lang}:${docKey}` */
const docCache = {};

function cacheKey(docKey, lang) {
  return `${lang}:${docKey}`;
}

/* ============================================================
   MARKDOWN RENDERER SETUP
   ============================================================ */
function initMarked() {
  const renderer = new marked.Renderer();

  renderer.link = function ({ href, title, text }) {
    if (href && href.endsWith('.md') && !href.startsWith('http')) {
      const name = href.replace(/^\.?\/?(?:docs\/)?(vi\/)?/, '').replace(/\.md$/, '');
      const hashKey = Object.keys(DOC_MAP).find(
        k => DOC_MAP[k].file.en.includes(name)
      );
      if (hashKey) href = '#' + hashKey;
    }
    const titleAttr = title ? ` title="${title}"` : '';
    const external = href && href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${href}"${titleAttr}${external}>${text}</a>`;
  };

  renderer.code = function ({ text, lang }) {
    if (lang === 'mermaid') {
      return `<div class="mermaid">${text}</div>`;
    }
    const highlighted = hljs.getLanguage(lang)
      ? hljs.highlight(text, { language: lang }).value
      : hljs.highlightAuto(text).value;
    return `<pre><code class="hljs language-${lang || 'text'}">${highlighted}</code></pre>`;
  };

  marked.setOptions({ renderer, gfm: true, breaks: false });
}

/* ============================================================
   LOAD AND RENDER A DOC
   ============================================================ */
async function loadDoc(key) {
  const entry = DOC_MAP[key];
  if (!entry) {
    document.getElementById('doc-content').innerHTML =
      `<p style="color:var(--color-text-dim)">${t('notfound')}</p>`;
    return;
  }

  document.getElementById('doc-content').innerHTML =
    `<div id="content-loading"><div class="spinner"></div>${t('loading')}</div>`;

  const ck = cacheKey(key, currentLang);
  try {
    let md;
    if (docCache[ck]) {
      md = docCache[ck];
    } else {
      /* Try current language first, fallback to English */
      const filePath = entry.file[currentLang] || entry.file.en;
      let res = await fetch(filePath);
      if (!res.ok && currentLang !== 'en') {
        res = await fetch(entry.file.en);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      md = await res.text();
      docCache[ck] = md;
    }

    const html = marked.parse(md);
    document.getElementById('doc-content').innerHTML =
      `<article class="markdown-body">${html}</article>`;

    if (window.mermaid) {
      await mermaid.run({ nodes: document.querySelectorAll('.mermaid') });
      initMermaidZoom();
    }

    buildTOC();
    updateActiveSidebarLink(key);

    const title = entry.title[currentLang] || entry.title.en;
    document.title = `${title} — GoClaw Docs`;

    window.scrollTo(0, 0);
  } catch (err) {
    document.getElementById('doc-content').innerHTML =
      `<p style="color:var(--color-primary)">${t('loadfailed')}: ${err.message}</p>`;
  }
}

/* ============================================================
   TABLE OF CONTENTS
   ============================================================ */
function buildTOC() {
  const toc = document.getElementById('toc');
  const headings = document.querySelectorAll('.markdown-body h2, .markdown-body h3');

  if (headings.length < 3) {
    toc.classList.remove('visible');
    return;
  }

  let html = `<div class="toc-title">${t('toc.title')}</div>`;
  headings.forEach((h, i) => {
    const id = 'heading-' + i;
    h.id = id;
    const depth = h.tagName === 'H3' ? ' depth-3' : '';
    html += `<a class="toc-link${depth}" href="#${id}">${h.textContent}</a>`;
  });

  toc.innerHTML = html;
  toc.classList.add('visible');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          toc.querySelectorAll('.toc-link').forEach(l => l.classList.remove('active'));
          const link = toc.querySelector(`a[href="#${entry.target.id}"]`);
          if (link) link.classList.add('active');
        }
      });
    },
    { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
  );

  headings.forEach(h => observer.observe(h));
}

/* ============================================================
   SIDEBAR
   ============================================================ */
function updateActiveSidebarLink(key) {
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.toggle('active', link.dataset.doc === key);
  });
}

function initSidebar() {
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.hash = link.dataset.doc;
      closeMobileSidebar();
    });
  });
}

/* ============================================================
   MOBILE SIDEBAR
   ============================================================ */
function initMobileSidebar() {
  const toggle = document.getElementById('mobile-sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (toggle) {
    toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
  if (overlay) {
    overlay.addEventListener('click', closeMobileSidebar);
  }
}

function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
}

/* ============================================================
   SEARCH
   ============================================================ */
function initSearch() {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  if (!input || !results) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) {
      results.classList.remove('active');
      return;
    }

    const matches = [];
    for (const [key, entry] of Object.entries(DOC_MAP)) {
      const ck = cacheKey(key, currentLang);
      const ckEn = cacheKey(key, 'en');
      const content = (docCache[ck] || docCache[ckEn] || '').toLowerCase();
      const title = (entry.title[currentLang] || entry.title.en).toLowerCase();
      if (content.indexOf(q) !== -1 || title.includes(q)) {
        const snippet = (docCache[ck] || docCache[ckEn])
          ? getSnippet(docCache[ck] || docCache[ckEn], q)
          : '';
        matches.push({ key, title: entry.title[currentLang] || entry.title.en, snippet });
      }
      if (matches.length >= 8) break;
    }

    if (matches.length === 0) {
      results.classList.remove('active');
      return;
    }

    results.innerHTML = matches.map(m =>
      `<div class="search-result-item" data-doc="${m.key}">
        <div class="search-result-title">${m.title}</div>
        ${m.snippet ? `<div class="search-result-snippet">${m.snippet}</div>` : ''}
      </div>`
    ).join('');

    results.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        window.location.hash = item.dataset.doc;
        input.value = '';
        results.classList.remove('active');
      });
    });

    results.classList.add('active');
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !results.contains(e.target)) {
      results.classList.remove('active');
    }
  });
}

function getSnippet(content, query) {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx === -1) return '';
  const start = Math.max(0, idx - 40);
  const end = Math.min(content.length, idx + query.length + 80);
  let snippet = content.slice(start, end).replace(/\n/g, ' ').replace(/[#*`]/g, '');
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  return snippet;
}

/* Preload all docs for search */
async function preloadDocs() {
  const promises = Object.entries(DOC_MAP).map(async ([key, entry]) => {
    const ck = cacheKey(key, currentLang);
    if (docCache[ck]) return;
    try {
      const filePath = entry.file[currentLang] || entry.file.en;
      let res = await fetch(filePath);
      if (!res.ok && currentLang !== 'en') {
        res = await fetch(entry.file.en);
      }
      if (res.ok) docCache[ck] = await res.text();
    } catch { /* ignore */ }
  });
  await Promise.all(promises);
}

/* ============================================================
   I18N — Apply translations to UI elements
   ============================================================ */
function applyUITranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val) el.textContent = val;
  });

  /* Update search placeholder */
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.placeholder = t('search.placeholder');

  /* Update footer */
  const footer = document.getElementById('footer');
  if (footer) {
    const span = footer.querySelector('span:first-child');
    if (span) span.innerHTML = t('footer.text');
  }

  document.documentElement.setAttribute('lang', currentLang);
}

function initLangSwitcher() {
  document.querySelectorAll('[data-lang-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang-btn');
      if (lang === currentLang) return;

      currentLang = lang;
      localStorage.setItem('goclaw-docs-lang', lang);

      /* Update button active states */
      document.querySelectorAll('[data-lang-btn]').forEach(b => {
        const isActive = b.getAttribute('data-lang-btn') === lang;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      applyUITranslations();

      /* Reload current doc in new language */
      loadDoc(getDocFromHash());
    });
  });

  /* Set initial state from localStorage */
  document.querySelectorAll('[data-lang-btn]').forEach(btn => {
    const isActive = btn.getAttribute('data-lang-btn') === currentLang;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

/* ============================================================
   MERMAID ZOOM — pan & zoom for diagrams
   ============================================================ */
function initMermaidZoom() {
  document.querySelectorAll('.mermaid').forEach(el => {
    if (el.closest('.mermaid-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'mermaid-wrapper';
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);

    /* Controls */
    const controls = document.createElement('div');
    controls.className = 'mermaid-controls';
    controls.innerHTML = '<button data-zoom="in" title="Zoom in">+</button><button data-zoom="out" title="Zoom out">−</button><button data-zoom="reset" title="Reset">⟲</button>';
    wrapper.appendChild(controls);

    /* State */
    let scale = 1, panX = 0, panY = 0, dragging = false, startX, startY;

    function applyTransform() {
      el.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    }

    /* Zoom controls */
    controls.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.dataset.zoom;
      if (action === 'in') scale = Math.min(scale * 1.3, 5);
      else if (action === 'out') scale = Math.max(scale / 1.3, 0.3);
      else { scale = 1; panX = 0; panY = 0; }
      applyTransform();
    });

    /* Mouse wheel zoom */
    wrapper.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      scale = Math.min(Math.max(scale * delta, 0.3), 5);
      applyTransform();
    }, { passive: false });

    /* Pan with mouse drag */
    wrapper.addEventListener('mousedown', (e) => {
      if (e.target.closest('.mermaid-controls')) return;
      dragging = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      applyTransform();
    });
    window.addEventListener('mouseup', () => { dragging = false; });
  });
}

/* ============================================================
   COPY FOR AI
   ============================================================ */
function initCopyForAI() {
  const toggle = document.getElementById('copy-ai-toggle');
  const dropdown = toggle?.closest('.copy-ai-dropdown');
  if (!toggle || !dropdown) return;

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
  });

  dropdown.querySelectorAll('[data-action]').forEach(item => {
    item.addEventListener('click', async (e) => {
      e.preventDefault();
      dropdown.classList.remove('open');
      const action = item.dataset.action;
      const docKey = getDocFromHash();
      const ck = cacheKey(docKey, currentLang);
      const md = docCache[ck] || docCache[cacheKey(docKey, 'en')] || '';

      if (action === 'copy-page') {
        await navigator.clipboard.writeText(md);
        showToast('Copied to clipboard');
      } else if (action === 'view-markdown') {
        const entry = DOC_MAP[docKey];
        const filePath = entry.file[currentLang] || entry.file.en;
        window.open(filePath, '_blank');
        return;
      } else if (action === 'open-chatgpt') {
        const text = encodeURIComponent(md.slice(0, 8000));
        window.open('https://chatgpt.com/?q=' + text, '_blank');
      } else if (action === 'open-claude') {
        await navigator.clipboard.writeText(md);
        showToast('Copied! Opening Claude...');
        setTimeout(() => window.open('https://claude.ai/new', '_blank'), 500);
      } else if (action === 'open-perplexity') {
        const entry = DOC_MAP[docKey];
        const title = entry?.title[currentLang] || entry?.title.en || 'GoClaw';
        window.open('https://www.perplexity.ai/search?q=' + encodeURIComponent('GoClaw ' + title), '_blank');
      } else if (action === 'open-grok') {
        await navigator.clipboard.writeText(md);
        showToast('Copied! Opening Grok...');
        setTimeout(() => window.open('https://grok.com/', '_blank'), 500);
      }
    });
  });
}

function showToast(msg) {
  const existing = document.querySelector('.copy-ai-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'copy-ai-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

/* ============================================================
   ROUTING
   ============================================================ */
function getDocFromHash() {
  const hash = window.location.hash.slice(1);
  return DOC_MAP[hash] ? hash : DEFAULT_DOC;
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initMarked();
  initSidebar();
  initMobileSidebar();
  initSearch();
  initLangSwitcher();
  initCopyForAI();
  applyUITranslations();

  if (window.mermaid) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#E63946',
        primaryTextColor: '#F8FAFC',
        primaryBorderColor: '#E63946',
        lineColor: '#94A3B8',
        secondaryColor: '#1A1A2E',
        tertiaryColor: '#20203A',
        fontFamily: 'Source Sans 3, sans-serif',
        fontSize: '13px',
      },
    });
  }

  loadDoc(getDocFromHash());
  setTimeout(preloadDocs, 1500);
});

window.addEventListener('hashchange', () => {
  loadDoc(getDocFromHash());
});
