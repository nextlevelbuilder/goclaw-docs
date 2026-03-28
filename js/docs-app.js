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
    'sidebar.llms': 'All docs available as',
    'nav.getting-started': 'Getting started',
    'nav.core-concepts': 'Core concepts',
    'nav.agents': 'Agent',
    'nav.providers': 'Provider',
    'nav.channels': 'Channel',
    'nav.agent-teams': 'Agent Team',
    'nav.advanced': 'Advanced',
    'nav.deployment': 'Deployment',
    'nav.recipes': 'Recipes',
    'nav.showcases': 'Showcases',
    'nav.reference': 'References',
    'nav.troubleshooting': 'Troubleshooting',
    'nav.templates': 'Templates',
  },
  vi: {
    'search.placeholder': 'Tìm kiếm tài liệu...',
    'toc.title': 'Trên trang này',
    'loading': 'Đang tải...',
    'footer.text': 'GoClaw — Nền Tảng AI Agent Doanh Nghiệp',
    'notfound': 'Không tìm thấy tài liệu.',
    'loadfailed': 'Không thể tải tài liệu',
    'sidebar.llms': 'Tất cả tài liệu có sẵn dạng',
    'nav.getting-started': 'Bắt đầu',
    'nav.core-concepts': 'Khái niệm cốt lõi',
    'nav.agents': 'Agent',
    'nav.providers': 'Provider',
    'nav.channels': 'Channel',
    'nav.agent-teams': 'Agent Team',
    'nav.advanced': 'Nâng cao',
    'nav.deployment': 'Triển khai',
    'nav.recipes': 'Recipes',
    'nav.showcases': 'Showcases',
    'nav.reference': 'Tham khảo',
    'nav.troubleshooting': 'Xử lý sự cố',
    'nav.templates': 'Template',
  },
  zh: {
    'search.placeholder': '搜索文档...',
    'toc.title': '本页目录',
    'loading': '加载中...',
    'footer.text': 'GoClaw — 企业级 AI Agent 平台',
    'notfound': '未找到文档。',
    'loadfailed': '加载文档失败',
    'sidebar.llms': '所有文档可用格式',
    'nav.getting-started': '快速入门',
    'nav.core-concepts': '核心概念',
    'nav.agents': 'Agent',
    'nav.providers': 'Provider',
    'nav.channels': 'Channel',
    'nav.agent-teams': 'Agent Team',
    'nav.advanced': '高级功能',
    'nav.deployment': '部署',
    'nav.recipes': '实战方案',
    'nav.showcases': '展示',
    'nav.reference': '参考',
    'nav.troubleshooting': '故障排除',
    'nav.templates': 'Template',
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
/* Helper: generate EN/VI/ZH file paths from section + filename */
function docEntry(section, file, titleEn, titleVi, titleZh) {
  return {
    file: { en: `${section}/${file}.md`, vi: `vi/${section}/${file}.md`, zh: `zh/${section}/${file}.md` },
    title: { en: titleEn, vi: titleVi || titleEn, zh: titleZh || titleEn },
  };
}

const DOC_MAP = {
  // Getting Started
  'what-is-goclaw': docEntry('getting-started', 'what-is-goclaw', 'What is GoClaw?', 'GoClaw là gì?', '什么是 GoClaw？'),
  'installation': docEntry('getting-started', 'installation', 'Installation', 'Cài đặt', '安装'),
  'quick-start': docEntry('getting-started', 'quick-start', 'Quick Start', 'Bắt đầu nhanh', '快速开始'),
  'configuration': docEntry('getting-started', 'configuration', 'Configuration', 'Cấu hình', '配置'),
  'dashboard-tour': docEntry('getting-started', 'web-dashboard-tour', 'Dashboard Tour', 'Web Dashboard Tour', 'Web Dashboard 导览'),
  'migrating-from-openclaw': docEntry('getting-started', 'migrating-from-openclaw', 'Migrating from OpenClaw', 'Chuyển từ OpenClaw sang GoClaw', '从 OpenClaw 迁移'),

  // Core Concepts
  'how-goclaw-works': docEntry('core-concepts', 'how-goclaw-works', 'How GoClaw Works', 'GoClaw hoạt động như thế nào', 'GoClaw 工作原理'),
  'agents-explained': docEntry('core-concepts', 'agents-explained', 'Agents Explained', 'Agents Explained', 'Agent 详解'),
  'sessions-and-history': docEntry('core-concepts', 'sessions-and-history', 'Sessions & History', 'Sessions và History', 'Session 与历史记录'),
  'tools-overview': docEntry('core-concepts', 'tools-overview', 'Tools Overview', 'Tools Overview', 'Tools 概览'),
  'memory-system': docEntry('core-concepts', 'memory-system', 'Memory System', 'Memory System', 'Memory 系统'),
  'multi-tenancy': docEntry('core-concepts', 'multi-tenancy', 'Multi-Tenancy', 'Multi-Tenancy', '多租户'),

  // Agents
  'creating-agents': docEntry('agents', 'creating-agents', 'Creating Agents', 'Tạo Agent', '创建 Agent'),
  'open-vs-predefined': docEntry('agents', 'open-vs-predefined', 'Open vs Predefined', 'Open vs. Predefined Agent', 'Open vs. Predefined Agent'),
  'context-files': docEntry('agents', 'context-files', 'Context Files', 'Context Files', 'Context 文件'),
  'summoning-bootstrap': docEntry('agents', 'summoning-bootstrap', 'Summoning & Bootstrap', 'Summoning & Bootstrap', 'Summoning 与 Bootstrap'),
  'editing-personality': docEntry('agents', 'editing-personality', 'Editing Personality', 'Chỉnh sửa Personality của Agent', '编辑 Agent Personality'),
  'sharing-and-access': docEntry('agents', 'sharing-and-access', 'Sharing & Access Control', 'Chia sẻ và Kiểm soát Truy cập', '共享与访问控制'),
  'user-overrides': docEntry('agents', 'user-overrides', 'User Overrides', 'User Overrides', '用户覆盖'),
  'system-prompt-anatomy': docEntry('agents', 'system-prompt-anatomy', 'System Prompt Anatomy', 'Cấu trúc System Prompt', 'System Prompt 结构'),

  // Providers
  'providers-overview': docEntry('providers', 'overview', 'Provider Overview', 'Tổng quan về Providers', 'Provider 概览'),
  'provider-anthropic': docEntry('providers', 'anthropic', 'Anthropic (Claude)', 'Anthropic', 'Anthropic (Claude)'),
  'provider-openai': docEntry('providers', 'openai', 'OpenAI / Azure OpenAI', 'OpenAI', 'OpenAI / Azure OpenAI'),
  'provider-openrouter': docEntry('providers', 'openrouter', 'OpenRouter'),
  'provider-gemini': docEntry('providers', 'gemini', 'Google Gemini', 'Gemini', 'Google Gemini'),
  'provider-deepseek': docEntry('providers', 'deepseek', 'DeepSeek'),
  'provider-groq': docEntry('providers', 'groq', 'Groq'),
  'provider-mistral': docEntry('providers', 'mistral', 'Mistral'),
  'provider-xai': docEntry('providers', 'xai', 'xAI (Grok)'),
  'provider-minimax': docEntry('providers', 'minimax', 'MiniMax'),
  'provider-cohere': docEntry('providers', 'cohere', 'Cohere'),
  'provider-perplexity': docEntry('providers', 'perplexity', 'Perplexity'),
  'provider-dashscope': docEntry('providers', 'dashscope', 'DashScope (Qwen)', 'DashScope (Alibaba Qwen)', 'DashScope (阿里通义千问)'),
  'provider-bailian': docEntry('providers', 'bailian', 'Bailian', 'Bailian', '百炼'),
  'provider-zai': docEntry('providers', 'zai', 'Zai'),
  'provider-claude-cli': docEntry('providers', 'claude-cli', 'Claude CLI'),
  'provider-codex': docEntry('providers', 'codex-chatgpt', 'Codex / ChatGPT', 'Codex / ChatGPT (OAuth)', 'Codex / ChatGPT (OAuth)'),
  'provider-acp': docEntry('providers', 'acp', 'ACP (Agent Client Protocol)', 'ACP (Agent Client Protocol)', 'ACP (Agent Client Protocol)'),
  'provider-ollama': docEntry('providers', 'ollama', 'Ollama'),
  'provider-ollama-cloud': docEntry('providers', 'ollama-cloud', 'Ollama Cloud'),
  'provider-suno': docEntry('providers', 'suno', 'Suno'),
  'provider-yescale': docEntry('providers', 'yescale', 'YesScale'),
  'provider-custom': docEntry('providers', 'custom-provider', 'Custom / OpenAI-Compatible', 'Custom Provider', '自定义 Provider'),

  // Channels
  'channels-overview': docEntry('channels', 'overview', 'Channel Overview', 'Tổng quan về Channel', 'Channel 概览'),
  'channel-telegram': docEntry('channels', 'telegram', 'Telegram', 'Channel Telegram', 'Telegram 频道'),
  'channel-discord': docEntry('channels', 'discord', 'Discord', 'Channel Discord', 'Discord 频道'),
  'channel-feishu': docEntry('channels', 'feishu', 'Feishu / Lark', 'Channel Feishu', '飞书 / Lark'),
  'channel-larksuite': docEntry('channels', 'larksuite', 'Larksuite', 'Channel Larksuite', 'Larksuite 频道'),
  'channel-zalo-oa': docEntry('channels', 'zalo-oa', 'Zalo OA', 'Channel Zalo OA', 'Zalo OA 频道'),
  'channel-zalo-personal': docEntry('channels', 'zalo-personal', 'Zalo Personal', 'Channel Zalo Personal', 'Zalo Personal 频道'),
  'channel-slack': docEntry('channels', 'slack', 'Slack', 'Channel Slack', 'Slack 频道'),
  'channel-whatsapp': docEntry('channels', 'whatsapp', 'WhatsApp', 'Channel WhatsApp', 'WhatsApp 频道'),
  'channel-websocket': docEntry('channels', 'websocket', 'WebSocket', 'Channel WebSocket', 'WebSocket 频道'),
  'channel-browser-pairing': docEntry('channels', 'browser-pairing', 'Browser Pairing', 'Browser Pairing', '浏览器配对'),

  // Agent Teams
  'teams-what-are-teams': docEntry('agent-teams', 'what-are-teams', 'What Are Teams?', 'Agent Team là gì?', '什么是 Agent Team？'),
  'teams-creating': docEntry('agent-teams', 'creating-managing-teams', 'Creating & Managing Teams', 'Tạo & Quản lý Team', '创建与管理 Team'),
  'teams-task-board': docEntry('agent-teams', 'task-board', 'Task Board', 'Task Board', '任务看板'),
  'teams-messaging': docEntry('agent-teams', 'team-messaging', 'Team Messaging', 'Team Messaging', 'Team 消息'),
  'teams-delegation': docEntry('agent-teams', 'delegation-and-handoff', 'Delegation & Handoff', 'Delegation & Handoff', '委派与交接'),

  // Advanced
  'custom-tools': docEntry('advanced', 'custom-tools', 'Custom Tools', 'Custom Tools', '自定义 Tools'),
  'mcp-integration': docEntry('advanced', 'mcp-integration', 'MCP Integration', 'MCP Integration', 'MCP 集成'),
  'skills': docEntry('advanced', 'skills', 'Skills', 'Skills', 'Skills 系统'),
  'scheduling-cron': docEntry('advanced', 'scheduling-cron', 'Scheduling & Cron', 'Scheduling & Cron', '定时任务与 Cron'),
  'heartbeat': docEntry('advanced', 'heartbeat', 'Heartbeat', 'Heartbeat', '心跳检测'),
  'sandbox': docEntry('advanced', 'sandbox', 'Sandbox', 'Sandbox', '沙箱'),
  'media-generation': docEntry('advanced', 'media-generation', 'Media Generation', 'Tạo Media', '媒体生成'),
  'tts-voice': docEntry('advanced', 'tts-voice', 'TTS & Voice', 'Chuyển văn bản thành giọng nói', 'TTS 与语音'),
  'knowledge-graph': docEntry('advanced', 'knowledge-graph', 'Knowledge Graph', 'Knowledge Graph', '知识图谱'),
  'caching': docEntry('advanced', 'caching', 'Caching', 'Caching', '缓存'),
  'browser-automation': docEntry('advanced', 'browser-automation', 'Browser Automation', 'Browser Automation', '浏览器自动化'),
  'extended-thinking': docEntry('advanced', 'extended-thinking', 'Extended Thinking', 'Extended Thinking', '扩展思考'),
  'hooks-quality-gates': docEntry('advanced', 'hooks-quality-gates', 'Hooks & Quality Gates', 'Hooks & Quality Gates', 'Hooks 与质量门控'),
  'authentication': docEntry('advanced', 'authentication', 'Authentication & OAuth', 'Authentication', '认证与 OAuth'),
  'api-keys-rbac': docEntry('advanced', 'api-keys-rbac', 'API Keys & RBAC', 'API Keys & RBAC', 'API Keys 与 RBAC'),
  'cli-credentials': docEntry('advanced', 'cli-credentials', 'CLI Credentials', 'CLI Credentials', 'CLI 凭证'),
  'exec-approval': docEntry('advanced', 'exec-approval', 'Exec Approval', 'Exec Approval (Human-in-the-Loop)', '执行审批 (Human-in-the-Loop)'),
  'context-pruning': docEntry('advanced', 'context-pruning', 'Context Pruning', 'Context Pruning', 'Context 裁剪'),
  'channel-instances': docEntry('advanced', 'channel-instances', 'Channel Instances', 'Channel Instances', 'Channel 实例'),
  'usage-quota': docEntry('advanced', 'usage-quota', 'Usage & Quota', 'Usage & Quota', '用量与配额'),
  'cost-tracking': docEntry('advanced', 'cost-tracking', 'Cost Tracking', 'Theo Dõi Chi Phí', '成本追踪'),
  'model-steering': docEntry('advanced', 'model-steering', 'Model Steering', 'Điều hướng mô hình', '模型引导'),
  'agent-evolution': docEntry('advanced', 'agent-evolution', 'Agent Evolution', 'Tiến Hóa Agent', 'Agent 进化'),

  // Deployment
  'deploy-docker-compose': docEntry('deployment', 'docker-compose', 'Docker Compose', 'Docker Compose Deployment', 'Docker Compose 部署'),
  'deploy-database': docEntry('deployment', 'database-setup', 'Database Setup', 'Thiết lập Database', '数据库设置'),
  'deploy-security': docEntry('deployment', 'security-hardening', 'Security Hardening', 'Tăng cường bảo mật', '安全加固'),
  'deploy-observability': docEntry('deployment', 'observability', 'Observability', 'Observability', '可观测性'),
  'deploy-tailscale': docEntry('deployment', 'tailscale', 'Tailscale', 'Tailscale Integration', 'Tailscale 集成'),
  'deploy-checklist': docEntry('deployment', 'production-checklist', 'Production Checklist', 'Production Checklist', '生产环境清单'),
  'deploy-upgrading': docEntry('deployment', 'upgrading', 'Upgrading', 'Upgrading', '升级'),

  // Recipes
  'recipe-personal-assistant': docEntry('recipes', 'personal-assistant', 'Personal Assistant', 'Trợ lý Cá nhân', '个人助手'),
  'recipe-team-chatbot': docEntry('recipes', 'team-chatbot', 'Team Chatbot', 'Team Chatbot', '团队聊天机器人'),
  'recipe-customer-support': docEntry('recipes', 'customer-support', 'Customer Support', 'Customer Support', '客户支持'),
  'recipe-code-review': docEntry('recipes', 'code-review-agent', 'Code Review Agent', 'Agent Review Code', '代码审查 Agent'),
  'recipe-multi-channel': docEntry('recipes', 'multi-channel-setup', 'Multi-Channel Setup', 'Multi-Channel Setup', '多频道设置'),

  // Showcases
  'gallery': docEntry('showcases', 'gallery', 'Gallery', 'Thư viện', '展示'),

  // Reference
  'cli-commands': docEntry('reference', 'cli-commands', 'CLI Commands', 'CLI Commands', 'CLI 命令'),
  'websocket-protocol': docEntry('reference', 'websocket-protocol', 'WebSocket Protocol', 'WebSocket Protocol', 'WebSocket 协议'),
  'rest-api': docEntry('reference', 'rest-api', 'REST API', 'REST API', 'REST API'),
  'config-reference': docEntry('reference', 'config-reference', 'Configuration Reference', 'Config Reference', '配置参考'),
  'env-vars': docEntry('reference', 'environment-variables', 'Environment Variables', 'Environment Variables', '环境变量'),
  'database-schema': docEntry('reference', 'database-schema', 'Database Schema', 'Database Schema', '数据库 Schema'),
  'glossary': docEntry('reference', 'glossary', 'Glossary', 'Glossary', '术语表'),
  'template-agents': docEntry('reference/templates', 'agents', 'AGENTS.md Template'),
  'template-soul': docEntry('reference/templates', 'soul', 'SOUL.md Template'),
  'template-identity': docEntry('reference/templates', 'identity', 'IDENTITY.md Template'),
  'template-tools': docEntry('reference/templates', 'tools', 'TOOLS.md Template'),
  'template-user': docEntry('reference/templates', 'user', 'USER.md Template'),
  'template-user-predefined': docEntry('reference/templates', 'user-predefined', 'USER_PREDEFINED.md Template'),
  'template-bootstrap': docEntry('reference/templates', 'bootstrap', 'BOOTSTRAP.md Template'),
  'template-team': docEntry('reference/templates', 'team', 'TEAM.md Template', 'TEAM.md (System-Generated)', 'TEAM.md (系统生成)'),

  // Troubleshooting
  'troubleshoot-common': docEntry('troubleshooting', 'common-issues', 'Common Issues', 'Các vấn đề thường gặp', '常见问题'),
  'troubleshoot-channels': docEntry('troubleshooting', 'channels', 'Channels', 'Vấn đề Channel', 'Channel 问题'),
  'troubleshoot-providers': docEntry('troubleshooting', 'providers', 'Providers', 'Vấn đề Provider', 'Provider 问题'),
  'troubleshoot-websocket': docEntry('troubleshooting', 'websocket', 'WebSocket', 'Vấn Đề WebSocket', 'WebSocket 问题'),
  'troubleshoot-mcp': docEntry('troubleshooting', 'mcp', 'MCP', 'Sự cố MCP', 'MCP 问题'),
  'troubleshoot-database': docEntry('troubleshooting', 'database', 'Database', 'Vấn đề Database', '数据库问题'),
  'troubleshoot-agent-teams': docEntry('troubleshooting', 'agent-teams', 'Agent Teams', 'Sự Cố Agent Team', 'Agent Team 问题'),
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
    /* "English version" / "Phiên bản tiếng Việt" links should switch language */
    const langSwitch = /English version/i.test(text) ? ' data-switch-lang="en"'
      : /ti[ếe]ng Vi[ệe]t/i.test(text) ? ' data-switch-lang="vi"'
      : /中文版/i.test(text) ? ' data-switch-lang="zh"' : '';
    return `<a href="${href}"${titleAttr}${external}${langSwitch}>${text}</a>`;
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

    /* Extract source metadata from HTML comment */
    const metaMatch = md.match(/<!--\s*goclaw-source:\s*(\S+)\s*\|\s*(?:updated|cập nhật|更新):\s*(\S+)\s*-->/);
    const html = marked.parse(md);
    const lastUpdatedLabel = { en: 'Last updated at', vi: 'Cập nhật lần cuối', zh: '最后更新于' };
    const metaBadge = metaMatch
      ? `<div class="doc-source-meta">
           <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg>
           <a href="https://github.com/nextlevelbuilder/goclaw/commit/${metaMatch[1]}" target="_blank" rel="noopener" title="View source commit on GitHub"><code>${metaMatch[1]}</code></a>
           <span class="doc-source-sep">·</span>
           <span>${lastUpdatedLabel[currentLang] || lastUpdatedLabel.en} ${metaMatch[2]}</span>
         </div>`
      : '';
    document.getElementById('doc-content').innerHTML =
      `<article class="markdown-body">${html}</article>${metaBadge}`;

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

  /* Update sidebar link texts from DOC_MAP titles */
  document.querySelectorAll('.sidebar-link[data-doc]').forEach(link => {
    const key = link.dataset.doc;
    const entry = DOC_MAP[key];
    if (entry) {
      link.textContent = entry.title[currentLang] || entry.title.en;
    }
  });

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

/* Language-switch links inside doc content (e.g. "English version") */
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-switch-lang]');
  if (!link) return;
  e.preventDefault();
  const lang = link.getAttribute('data-switch-lang');
  if (lang === currentLang) return;

  currentLang = lang;
  localStorage.setItem('goclaw-docs-lang', lang);
  document.querySelectorAll('[data-lang-btn]').forEach(b => {
    const isActive = b.getAttribute('data-lang-btn') === lang;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
  applyUITranslations();
  loadDoc(getDocFromHash());
});
