#!/usr/bin/env node
/**
 * build-api-catalog.js — Generates REST API endpoint catalog from goclaw source code.
 * Greps internal/http/*.go + internal/gateway/server.go for mux.Handle/HandleFunc patterns.
 * Outputs trilingual markdown catalog pages: EN, VI, ZH.
 *
 * Run: node scripts/build-api-catalog.js
 * Env: GOCLAW_SOURCE_PATH (default: ../goclaw)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const GOCLAW_SRC = process.env.GOCLAW_SOURCE_PATH || path.resolve(ROOT, '../goclaw');

// ---------------------------------------------------------------------------
// Source scanning
// ---------------------------------------------------------------------------

/** Extract commit SHA from goclaw source repo */
function getCommitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: GOCLAW_SRC, encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

/** Parse "METHOD /path" from mux.Handle/HandleFunc call strings */
function parseEndpoint(line) {
  // Match: "GET /v1/some/path" or 'GET /v1/some/path' inside Handle/HandleFunc calls
  const match = line.match(/"(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) ([^"]+)"/);
  if (!match) return null;
  return { method: match[1], path: match[2] };
}

/** Friendly group name from source file basename */
function fileToGroup(basename) {
  const map = {
    'activity': 'Activity',
    'agents': 'Agents',
    'api_keys': 'API Keys',
    'audit': 'Audit',
    'auth': 'Auth',
    'backup_handler': 'Backup',
    'backup_s3_handler': 'Backup (S3)',
    'builtin_tools': 'Builtin Tools',
    'channel_instances': 'Channels',
    'chat_completions': 'Chat Completions',
    'edition': 'Edition',
    'episodic_handlers': 'Episodic Memory',
    'evolution_handlers': 'Evolution',
    'files': 'Files',
    'knowledge_graph': 'Knowledge Graph',
    'knowledge_graph_handlers': 'Knowledge Graph',
    'mcp': 'MCP Servers',
    'mcp_export': 'MCP Servers',
    'mcp_grants': 'MCP Servers',
    'mcp_import': 'MCP Servers',
    'mcp_requests': 'MCP Servers',
    'mcp_tools': 'MCP Tools',
    'mcp_user_credentials': 'MCP User Credentials',
    'media_serve': 'Media',
    'media_upload': 'Media',
    'memory': 'Memory',
    'memory_handlers': 'Memory',
    'oauth': 'OAuth',
    'openapi': 'OpenAPI',
    'orchestration_handlers': 'Orchestration',
    'packages': 'Packages',
    'pending_messages': 'Pending Messages',
    'providers': 'Providers',
    'provider_models': 'Provider Models',
    'provider_models_catalog': 'Provider Models',
    'provider_models_fetch': 'Provider Models',
    'provider_verify': 'Providers',
    'provider_verify_embedding': 'Providers',
    'restore_handler': 'Restore',
    'responses': 'Responses',
    'secure_cli': 'Secure CLI',
    'secure_cli_agent_grants': 'Secure CLI',
    'server': 'Core',
    'skills': 'Skills',
    'skills_export': 'Skills',
    'skills_grants': 'Skills',
    'skills_import': 'Skills',
    'skills_upload': 'Skills',
    'skills_versions': 'Skills',
    'storage': 'Storage',
    'summoner': 'Summoner',
    'system_configs': 'System Config',
    'team_attachments': 'Teams',
    'team_events': 'Teams',
    'teams_export': 'Teams',
    'teams_import': 'Teams',
    'tenant_backup_handler': 'Tenant Backup',
    'tenants': 'Tenants',
    'tools_invoke': 'Tools',
    'traces': 'Traces',
    'tts': 'TTS',
    'tts_capabilities': 'TTS',
    'tts_config': 'TTS',
    'tts_test_connection': 'TTS',
    'usage': 'Usage',
    'user_search': 'Users',
    'v3_flags_handlers': 'Feature Flags',
    'validate': 'Validation',
    'vault_graph_handler': 'Vault',
    'vault_handler_documents': 'Vault',
    'vault_handler_links': 'Vault',
    'vault_handler_tree': 'Vault',
    'vault_handler_upload': 'Vault',
    'vault_handlers': 'Vault',
    'voices': 'TTS',
    'wake': 'Wake',
    'workspace_upload': 'Workspace',
  };
  return map[basename] || basename.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Scan source files and return grouped endpoints */
function scanEndpoints() {
  const sourceFiles = [
    path.join(GOCLAW_SRC, 'internal', 'gateway', 'server.go'),
    ...fs.readdirSync(path.join(GOCLAW_SRC, 'internal', 'http'))
      .filter(f => f.endsWith('.go') && !f.endsWith('_test.go'))
      .map(f => path.join(GOCLAW_SRC, 'internal', 'http', f)),
  ];

  // group name -> Set of "METHOD PATH" to deduplicate
  const groupEndpoints = new Map();
  // group name -> source file basename (for section header)
  const groupSource = new Map();

  for (const filePath of sourceFiles) {
    if (!fs.existsSync(filePath)) continue;
    const basename = path.basename(filePath, '.go');
    const group = fileToGroup(basename);
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

    for (const line of lines) {
      if (!line.includes('mux.Handle(') && !line.includes('mux.HandleFunc(')) continue;
      const ep = parseEndpoint(line);
      if (!ep) continue;

      const key = `${ep.method} ${ep.path}`;
      if (!groupEndpoints.has(group)) {
        groupEndpoints.set(group, new Map());
        groupSource.set(group, basename);
      }
      // Store endpoint keyed by "METHOD PATH" to deduplicate across files in same group
      groupEndpoints.get(group).set(key, ep);
    }
  }

  // Sort groups alphabetically, sort endpoints within each group
  const sorted = [...groupEndpoints.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, epMap]) => ({
      group,
      source: groupSource.get(group),
      endpoints: [...epMap.values()].sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method)),
    }));

  return sorted;
}

// ---------------------------------------------------------------------------
// Markdown generation
// ---------------------------------------------------------------------------

const METHOD_BADGE = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS',
};

function buildEndpointTable(endpoints) {
  const rows = endpoints.map(ep => `| \`${METHOD_BADGE[ep.method] || ep.method}\` | \`${ep.path}\` |`);
  return ['| Method | Path |', '|---|---|', ...rows].join('\n');
}

function buildGroupSections(groups) {
  return groups.map(({ group, source, endpoints }) => {
    const header = `### ${group} (\`internal/http/${source}.go\`)`;
    return [header, '', buildEndpointTable(endpoints)].join('\n');
  }).join('\n\n');
}

// ---------------------------------------------------------------------------
// Locale-specific content
// ---------------------------------------------------------------------------

const LOCALES = {
  en: {
    title: '# REST API Endpoint Catalog',
    subtitle: '> Auto-generated complete index of all REST endpoints. For request/response details, examples, and authentication, see [REST API Reference](rest-api.md).',
    howToUse: `## How to use this page

- This is a flat catalog — one row per endpoint.
- Endpoints are grouped by handler domain (the source file in \`goclaw/internal/http/\`).
- For full request/response schemas of OpenAI-compatible endpoints (\`/v1/chat/completions\`, \`/v1/responses\`), see [REST API Reference](rest-api.md).
- Authentication: all \`/v1/*\` endpoints require \`Authorization: Bearer <api-key>\` unless noted.`,
    sectionTitle: '## Endpoints by Domain',
  },
  vi: {
    title: '# Danh mục Endpoint REST API',
    subtitle: '> Danh sách auto-gen đầy đủ tất cả REST endpoint. Để xem chi tiết request/response, ví dụ và xác thực, xem [REST API Reference](rest-api.md).',
    howToUse: `## Cách sử dụng trang này

- Đây là danh sách phẳng — mỗi hàng là một endpoint.
- Endpoint được nhóm theo domain handler (file nguồn trong \`goclaw/internal/http/\`).
- Để xem schema request/response đầy đủ của các endpoint tương thích OpenAI (\`/v1/chat/completions\`, \`/v1/responses\`), xem [REST API Reference](rest-api.md).
- Xác thực: tất cả endpoint \`/v1/*\` yêu cầu \`Authorization: Bearer <api-key>\` trừ khi có ghi chú khác.`,
    sectionTitle: '## Endpoint theo Domain',
  },
  zh: {
    title: '# REST API 端点目录',
    subtitle: '> 自动生成的全部 REST 端点完整索引。请求/响应详情、示例和认证说明，请参见 [REST API 参考](rest-api.md)。',
    howToUse: `## 如何使用本页

- 这是一个扁平目录 — 每行对应一个端点。
- 端点按处理器域分组（\`goclaw/internal/http/\` 中的源文件）。
- 有关 OpenAI 兼容端点（\`/v1/chat/completions\`、\`/v1/responses\`）的完整请求/响应 schema，请参见 [REST API 参考](rest-api.md)。
- 认证：所有 \`/v1/*\` 端点均需 \`Authorization: Bearer <api-key>\`，另有说明的除外。`,
    sectionTitle: '## 按领域分组的端点',
  },
};

function buildCatalogFile(locale, groups, sha, date, total) {
  const l = LOCALES[locale];
  const totalLine = `**Total endpoints:** ${total} — generated from goclaw \`${sha}\` on \`${date}\`.`;

  return [
    l.title,
    '',
    l.subtitle,
    '',
    totalLine,
    '',
    l.howToUse,
    '',
    l.sectionTitle,
    '',
    buildGroupSections(groups),
    '',
    '---',
    '',
    `<!-- goclaw-source: ${sha} -->`,
    `<!-- last-updated: ${date} -->`,
    `<!-- total-endpoints: ${total} -->`,
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  if (!fs.existsSync(GOCLAW_SRC)) {
    console.error(`Error: goclaw source not found at ${GOCLAW_SRC}`);
    console.error('Set GOCLAW_SOURCE_PATH env var to the goclaw repository path.');
    process.exit(1);
  }

  const sha = getCommitSha();
  const date = new Date().toISOString().slice(0, 10);
  const groups = scanEndpoints();
  const total = groups.reduce((sum, g) => sum + g.endpoints.length, 0);

  console.log(`Scanned ${groups.length} handler groups, ${total} endpoints (sha: ${sha})`);

  const outputs = [
    { locale: 'en', outPath: path.join(ROOT, 'reference', 'api-endpoints-catalog.md') },
    { locale: 'vi', outPath: path.join(ROOT, 'vi', 'reference', 'api-endpoints-catalog.md') },
    { locale: 'zh', outPath: path.join(ROOT, 'zh', 'reference', 'api-endpoints-catalog.md') },
  ];

  for (const { locale, outPath } of outputs) {
    const content = buildCatalogFile(locale, groups, sha, date, total);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, content, 'utf-8');
    console.log(`Generated ${outPath} (${(content.length / 1024).toFixed(1)} KB)`);
  }

  console.log(`Done. Total endpoints: ${total}`);
}

main();
