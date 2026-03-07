#!/usr/bin/env node
/**
 * build-llms.js — Concatenates all markdown docs into llms-full.txt
 * Scans section directories for .md files in defined order.
 * Run: node build-llms.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUTPUT = path.join(ROOT, 'llms-full.txt');

// Sections in reading order (EN only)
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

let output = `# GoClaw — Complete Documentation\n\n`;
output += `> GoClaw is a multi-agent AI gateway written in Go. It connects LLMs to tools, channels, and data via WebSocket RPC and OpenAI-compatible HTTP API.\n\n`;
output += `---\n\n`;

let fileCount = 0;

for (const section of SECTIONS) {
  const dir = path.join(ROOT, section);
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

fs.writeFileSync(OUTPUT, output.trim() + '\n');
console.log(`Generated ${OUTPUT} (${(output.length / 1024).toFixed(1)} KB, ${fileCount} files)`);
