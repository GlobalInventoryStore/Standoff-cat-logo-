#!/usr/bin/env node
// Gera config.js a partir de variáveis de ambiente (process.env) e/ou de um arquivo .env.
// Uso: node scripts/gerar-config.mjs
// Ordem de prioridade: variável de ambiente > .env. Chaves vazias não entram no config.js
// (o site então usa os valores públicos padrão embutidos no index.html; CODIGO_ADMIN_FIXO fica desligado).
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const CHAVES = [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "EMAILJS_SERVICE_ID",
    "EMAILJS_TEMPLATE_ID",
    "EMAILJS_PUBLIC_KEY",
    "ADMIN_WHATSAPP",
    "CODIGO_ADMIN_FIXO",
    "ADMIN_SENHA_DIRETA"
];

if (existsSync(".env")) {
    for (const linha of readFileSync(".env", "utf8").split(/\r?\n/)) {
        const m = linha.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
        if (m && process.env[m[1]] === undefined) {
            process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
    }
}

const cfg = {};
for (const k of CHAVES) {
    if (process.env[k]) cfg[k] = process.env[k];
}

writeFileSync(
    "config.js",
    "// GERADO AUTOMATICAMENTE por scripts/gerar-config.mjs a partir do .env / ambiente.\n" +
    "// NÃO commitar (consta no .gitignore). Regenerar a cada mudança de chave.\n" +
    "window.CONFIG = " + JSON.stringify(cfg, null, 4) + ";\n"
);

console.log("config.js gerado com " + Object.keys(cfg).length + " chave(s): " + (Object.keys(cfg).join(", ") || "(nenhuma)"));
