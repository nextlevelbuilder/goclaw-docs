#!/usr/bin/env node
/**
 * build-llms.js — Concatenates all markdown docs into llms-full.txt
 * Scans section directories for .md files in defined order.
 * Run: node build-llms.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// Sections in reading order
const SECTIONS = [
  'getting-started',
  'core-concepts',
  'agents',
  'providers',
  'channels',
  'agent-teams',
  'advanced',
  'deployment',
  'recipes',
  'showcases',
  'reference',
  'troubleshooting',
];

const LANGUAGES = [
  { base: ROOT, out: path.join(ROOT, 'llms-full.txt'), header: '# GoClaw — Complete Documentation', tagline: '> GoClaw is a multi-agent AI gateway written in Go. It connects LLMs to tools, channels, and data via WebSocket RPC and OpenAI-compatible HTTP API.' },
  { base: path.join(ROOT, 'vi'), out: path.join(ROOT, 'vi', 'llms-full.txt'), header: '# GoClaw — Tài liệu đầy đủ (Tiếng Việt)', tagline: '> GoClaw là AI agent gateway đa tenant viết bằng Go. Kết nối LLM với tool, kênh, và dữ liệu qua WebSocket RPC và HTTP API tương thích OpenAI.' },
  { base: path.join(ROOT, 'zh'), out: path.join(ROOT, 'zh', 'llms-full.txt'), header: '# GoClaw — 完整文档（简体中文）', tagline: '> GoClaw 是用 Go 编写的多 agent AI gateway。通过 WebSocket RPC 和 OpenAI 兼容 HTTP API，将 LLM 连接到工具、渠道和数据。' },
];

for (const lang of LANGUAGES) {
  if (!fs.existsSync(lang.base)) continue;

  let output = `${lang.header}\n\n${lang.tagline}\n\n---\n\n`;
  let fileCount = 0;

  for (const section of SECTIONS) {
    const dir = path.join(lang.base, section);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .sort();

    for (const file of files) {
      const filepath = path.join(dir, file);
      const content = fs.readFileSync(filepath, 'utf-8').trim();
      if (!content) continue;
      output += content + '\n\n---\n\n';
      fileCount++;
    }
  }

  fs.writeFileSync(lang.out, output.trim() + '\n');
  console.log(`Generated ${lang.out} (${(output.length / 1024).toFixed(1)} KB, ${fileCount} files)`);
}
