/**
 * Ana v3.0 — Chatbot da Escola de Amor-Próprio
 * Melhorias: segurança, resiliência, limpeza, organização, painel seguro
 */

const express = require("express");
const crypto = require("crypto");
const { MongoClient } = require("mongodb");

const app = express();
app.use(express.json({ limit: "10mb" }));

// ─── CORS ───────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ─── CONFIG ─────────────────────────────────────────────
const CONFIG = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  VERIFY_TOKEN: process.env.VERIFY_TOKEN || "meu_token_secreto",
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN,
  PAINEL_SENHA: process.env.PAINEL_SENHA || process.env.LEADS_PASSWORD || "painel2024",
  MONGODB_URI: process.env.MONGODB_URI,
  PORT: process.env.PORT || 3000,
  MODEL: "claude-sonnet-4-20250514",
  MAX_TOKENS: 800,
  MAX_HISTORY: 30,
  MAX_LOGS: 100,
  RATE_LIMIT: 10,           // msgs por minuto
  RATE_WINDOW: 60_000,
  RETOMADA_MS: 10 * 60_000, // 10 min follow-up
  CLEANUP_INTERVAL: 30 * 60_000, // limpar memória a cada 30 min
  CONVERSA_TTL: 2 * 60 * 60_000, // conversas expiram em 2h sem atividade
  MAX_MEDIA_SIZE: 2 * 1024 * 1024,
  ANTHROPIC_TIMEOUT: 15_000,
  ANTHROPIC_RETRIES: 2,
};

// ─── DATABASE ───────────────────────────────────────────
let db = null, leadsCol = null, logsCol = null;

async function conectarMongo() {
  if (db) return;
  try {
    const uri = CONFIG.MONGODB_URI;
    if (!uri) { console.error("MONGODB_URI não definida"); return; }
    const isInternal = uri.includes(".railway.internal");
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 15_000,
      connectTimeoutMS: 15_000,
      tls: !isInternal,
    });
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    db = client.db("escolabot");
    leadsCol = db.collection("leads");
    logsCol = db.collection("logs");
    await Promise.all([
      leadsCol.createIndex({ userId: 1 }, { unique: true }),
      leadsCol.createIndex({ status: 1 }),
      leadsCol.createIndex({ timestamp: -1 }),
      logsCol.createIndex({ userId: 1 }),
    ]);
    console.log("MongoDB conectado");
  } catch (e) {
    console.error("MongoDB erro:", e.message);
    db = null;
    setTimeout(conectarMongo, 10_000);
  }
}

// ─── HELPERS DB ─────────────────────────────────────────
async function getLead(uid) {
  try { return await leadsCol.findOne({ userId: uid }); }
  catch { return null; }
}

async function saveLead(data) {
  try {
    data.updatedAt = new Date().toISOString();
    await leadsCol.updateOne({ userId: data.userId }, { $set: data }, { upsert: true });
  } catch (e) { console.error("saveLead:", e.message); }
}

async function getLogs(uid) {
  try {
    const doc = await logsCol.findOne({ userId: uid });
    return doc?.msgs || [];
  } catch { return []; }
}

async function addLog(uid, role, texto, plataforma, extras) {
  try {
    const entry = { role, texto, plataforma, timestamp: new Date().toISOString() };
    if (extras) Object.assign(entry, extras);
    await logsCol.updateOne(
      { userId: uid },
      { $push: { msgs: { $each: [entry], $slice: -CONFIG.MAX_LOGS } } },
      { upsert: true }
    );
  } catch {}
}

async function getAllLeads() {
  try { return await leadsCol.find({}).sort({ timestamp: -1 }).toArray(); }
  catch { return []; }
}

async function getAllLogsResumo() {
  try {
    const docs = await logsCol.find({}, { projection: { userId: 1, "msgs": { $slice: -1 } } }).toArray();
    return docs.map(d => ({
      userId: d.userId,
      ultima: d.msgs?.[0]?.timestamp || null,
    }));
  } catch { return []; }
}

// ─── RATE LIMITER ───────────────────────────────────────
const rateLimits = new Map();

function checarRate(uid) {
  const now = Date.now();
  let entry = rateLimits.get(uid);
  if (!entry || now - entry.t > CONFIG.RATE_WINDOW) {
    entry = { n: 0, t: now };
    rateLimits.set(uid, entry);
  }
  return ++entry.n <= CONFIG.RATE_LIMIT;
}

// ─── CONVERSAS EM MEMÓRIA ───────────────────────────────
const conversas = new Map();
const timers = new Map();

function getHist(id) {
  let entry = conversas.get(id);
  if (!entry) { entry = { msgs: [], lastActivity: Date.now() }; conversas.set(id, entry); }
  entry.lastActivity = Date.now();
  return entry.msgs;
}

function addMsg(id, role, content) {
  const h = getHist(id);
  h.push({ role, content });
  if (h.length > CONFIG.MAX_HISTORY) h.splice(0, h.length - CONFIG.MAX_HISTORY);
}

// Limpar conversas e rate limits antigos periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [uid, entry] of conversas) {
    if (now - entry.lastActivity > CONFIG.CONVERSA_TTL) {
      conversas.delete(uid);
    }
  }
  for (const [uid, entry] of rateLimits) {
    if (now - entry.t > CONFIG.RATE_WINDOW * 2) rateLimits.delete(uid);
  }
}, CONFIG.CLEANUP_INTERVAL);

// ─── UTILIDADES ─────────────────────────────────────────
function fmtFone(n) {
  if (!n) return "?";
  const d = n.replace(/\D/g, "");
  if (d.length === 13) return `(${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`;
  if (d.length === 12) return `(${d.slice(2,4)}) ${d.slice(4,8)}-${d.slice(8)}`;
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return n;
}

function waUrl(n) {
  if (!n) return "";
  const d = n.replace(/\D/g, "");
  return d.length >= 10 ? `https://wa.me/${d}` : "";
}

const agora = () => new Date().toLocaleString("pt-BR", { timeZone: "America/Belem" });

function escapeMarkdown(s) {
  return (s || "").replace(/([*_`\[\]])/g, "\\$1");
}

function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ─── TELEGRAM ───────────────────────────────────────────
async function tg(texto) {
  if (!CONFIG.TELEGRAM_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CONFIG.TELEGRAM_CHAT_ID,
        text: texto,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
  } catch (e) { console.error("Telegram erro:", e.message); }
}

async function tgFoto(caption, buffer, contentType) {
  if (!CONFIG.TELEGRAM_TOKEN || !CONFIG.TELEGRAM_CHAT_ID || !buffer) return;
  try {
    const boundary = `B${Date.now()}${Math.random().toString(36).slice(2)}`;
    const parts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${CONFIG.TELEGRAM_CHAT_ID}`,
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}`,
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="parse_mode"\r\n\r\nMarkdown`,
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="foto.jpg"\r\nContent-Type: ${contentType}\r\n\r\n`,
    ];
    const header = Buffer.from(parts.join(""));
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body: Buffer.concat([header, buffer, footer]),
    });
  } catch (e) {
    console.error("Telegram foto erro:", e.message);
    await tg(caption);
  }
}

// ─── ALERTAS ────────────────────────────────────────────
async function alertaNovo(l) {
  const link = waUrl(l.contato);
  await tg(`🌸 *Novo contato*\n👤 ${l.nome || "Aguardando nome"}\n📱 ${fmtFone(l.contato)}${link ? "\n" + link : ""}`);
}

async function alertaStatus(l, emoji, titulo) {
  const link = waUrl(l.contato);
  await tg(`${emoji} *${titulo}*\n👤 ${l.nome || "?"}\n📱 ${fmtFone(l.contato)}\n💜 ${l.interesse || "?"}${link ? "\n" + link : ""}`);
}

async function alertaMensagem(l, msgTexto, tipo) {
  const link = waUrl(l.contato);
  if (tipo !== "text") {
    await tg(`📎 *${tipo.toUpperCase()}*\n👤 ${l.nome || fmtFone(l.contato)}\n📱 ${fmtFone(l.contato)}${link ? "\n" + link : ""}`);
    return;
  }
  const textoSafe = escapeMarkdown(msgTexto).slice(0, 200);
  await tg(`💬 ${l.nome || fmtFone(l.contato)}:\n${textoSafe}${link ? "\n" + link : ""}`);
}

// ─── MEDIA WHATSAPP ─────────────────────────────────────
async function getMediaUrl(mediaId) {
  try {
    const r = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${CONFIG.WHATSAPP_TOKEN}` },
    });
    const d = await r.json();
    return d.url || null;
  } catch { return null; }
}

async function downloadMedia(mediaId) {
  try {
    const url = await getMediaUrl(mediaId);
    if (!url) return null;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${CONFIG.WHATSAPP_TOKEN}` },
    });
    const buf = Buffer.from(await r.arrayBuffer());
    const ct = r.headers.get("content-type") || "application/octet-stream";
    if (buf.length > CONFIG.MAX_MEDIA_SIZE) {
      return { base64: null, contentType: ct, buffer: buf, tooLarge: true };
    }
    return { base64: buf.toString("base64"), contentType: ct, buffer: buf };
  } catch { return null; }
}

// ─── WHATSAPP SEND ──────────────────────────────────────
function criarSendFn(phoneId, uid) {
  return async (text) => {
    await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CONFIG.WHATSAPP_TOKEN}`,
      },
      body: JSON.stringify({ messaging_product: "whatsapp", to: uid, text: { body: text } }),
    });
  };
}

// ─── STATUS / LEAD ──────────────────────────────────────
const STATUS_ORDEM = { CURIOSA: 1, AQUECIDA: 2, PRONTA: 3, PAGO: 4, COMPROVANTE_ENVIADO: 5 };

function obterContatoReal(lead, uid) {
  if (lead?.contato && lead.contato !== "user_id" && lead.contato !== "nao informado") {
    return lead.contato;
  }
  return uid;
}

function parsearLeadTag(texto) {
  const match = texto.match(/\[LEAD:\s*([^\]]+)\]/i);
  if (!match) return null;
  const extras = {};
  match[1].split("|").forEach(p => {
    const [k, v] = p.split("=").map(s => s.trim());
    if (k && v) extras[k.toLowerCase()] = v;
  });
  return { extras, raw: match[0] };
}

function limparNome(nome) {
  if (!nome) return null;
  const limpo = nome.replace(/[^a-zA-ZÀ-ÿ\s]/g, "").trim();
  if (limpo.length < 2 || ["x", "nome", "sem nome"].includes(limpo.toLowerCase())) return null;
  return limpo;
}

async function atualizarLead(lead, uid, resposta) {
  const updates = {};
  let respostaLimpa = resposta;

  // [PAGO]
  if (resposta.includes("[PAGO]")) {
    respostaLimpa = respostaLimpa.replace(/\[PAGO\]/g, "").trim();
    updates.status = "COMPROVANTE_ENVIADO";
    updates.comprovante = new Date().toISOString();
  }

  // [LEAD: ...]
  const parsed = parsearLeadTag(respostaLimpa);
  if (parsed) {
    respostaLimpa = respostaLimpa.replace(parsed.raw, "").trim();
    const { extras } = parsed;

    // Nunca sobrescrever contato
    delete extras.contato;

    // Validar nome
    if (extras.nome) {
      const nomeLimpo = limparNome(extras.nome);
      if (nomeLimpo) extras.nome = nomeLimpo;
      else delete extras.nome;
    }

    // Não regredir status
    if (extras.status && (STATUS_ORDEM[extras.status] || 0) < (STATUS_ORDEM[lead.status] || 0)) {
      delete extras.status;
    }

    Object.assign(updates, extras);
  }

  if (Object.keys(updates).length > 0) {
    const contatoReal = obterContatoReal(lead, uid);
    const leadAtualizado = { ...lead, ...updates, userId: uid, contato: contatoReal };
    await saveLead(leadAtualizado);

    // Alertas de mudança de status
    const statusAnterior = lead.status || "CURIOSA";
    const novoStatus = updates.status || statusAnterior;
    if (novoStatus === "AQUECIDA" && statusAnterior === "CURIOSA") {
      await alertaStatus(leadAtualizado, "🔥", "Lead aquecida!");
    } else if (novoStatus === "PRONTA" && statusAnterior !== "PRONTA" && statusAnterior !== "PAGO") {
      await alertaStatus(leadAtualizado, "🚀", "Pronta pra fechar!");
    } else if (updates.comprovante) {
      await alertaStatus(leadAtualizado, "💰", "Comprovante recebido!");
    }
  }

  return respostaLimpa;
}

// ─── ANTHROPIC API ──────────────────────────────────────
async function chamarAnthropic(messages, retries = CONFIG.ANTHROPIC_RETRIES) {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CONFIG.ANTHROPIC_TIMEOUT);

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": CONFIG.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: CONFIG.MODEL,
          max_tokens: CONFIG.MAX_TOKENS,
          system: PROMPT,
          messages,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        return data.content?.[0]?.text || null;
      }

      // Rate limit — aguardar e retry
      if (res.status === 429 && i < retries) {
        const wait = Math.min(2000 * (i + 1), 8000);
        console.warn(`Anthropic rate limited, retry em ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      console.error(`Anthropic erro: ${res.status}`);
      return null;
    } catch (e) {
      if (e.name === "AbortError") console.error("Anthropic timeout");
      else console.error("Anthropic erro:", e.message);
      if (i < retries) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return null;
}

// ─── PROMPT ─────────────────────────────────────────────
const PROMPT = `Voce e a Ana, da equipe da Escola de Amor-Proprio em Belem-PA.

IDENTIDADE — INEGOCIAVEL:
Voce e a Ana, pessoa real da equipe. NUNCA diga que e bot, IA, assistente virtual, chatbot ou robo.
Se perguntarem "voce e um robo?": "Haha nao, sou a Ana da equipe! Como posso te ajudar? 🌸"
NUNCA use "como assistente", "sou programada para", "nao tenho capacidade de".

TOM E PERSONALIDADE:
- Calorosa, acolhedora e genuinamente animada com o trabalho
- Fala como alguem que AMA o que faz e quer ajudar de verdade
- Tom natural e leve, como uma conversa entre amigas
- Usa "Que legal!", "Que lindo!", "Maravilha!" com naturalidade
- Quando a pessoa compartilha algo pessoal, acolhe com empatia ANTES de falar de servico
- Proativa: sempre conduz pro proximo passo sem ser insistente
- NUNCA e fria, generica, formal demais ou robotica

PALAVRAS PROIBIDAS (nunca use):
gostoso, delicia, ardente, sensual, irresistivel, excitante

FORMATACAO (WhatsApp):
- *negrito* pra valores e destaques importantes
- _italico_ pra complementos
- • bullet points pra listas de precos
- Quebre linhas pra nao enviar paredes de texto
- Maximo 2 emojis por mensagem
- NAO use ** duplo, apenas *simples*
- NAO use # para titulos
- Mensagens curtas: 3-5 linhas
- Mensagens com valores/informacoes completas: ate 10 linhas (ok ser maior quando precisa informar tudo)

LOCAL:
Tv. Dom Romualdo Coelho, 1072 - Belem/PA

SERVICOS E VALORES COMPLETOS:

*Danca do Ventre em Grupo (Sabados):*
• Turma Iniciante: Sabados, 9h as 10h30
• Turma Intermediaria: Sabados, 10h30 as 12h30
• Aula avulsa: R$ 97 (vira credito na matricula)
• Plano Mensal: R$ 350/mes
• Plano Semestral: R$ 300/mes
Roupa de ginastica, pratica descalca.

*Aula Particular de Danca:*
• Segunda a sexta, horario livre conforme agenda
• Duracao: 1h a 1h15
• Aula avulsa: R$ 350
• Pacote 4 aulas: R$ 250 cada (parcelavel no cartao)

*Terapia do Amor-Proprio:*
• Relacionamentos, autoestima, padroes emocionais, maternidade
• Horario livre, conforme agenda
• Valores sob consulta — equipe entra em contato

*Consultoria Juridica:* Direito de Familia e da Mulher
*Curso Online:* Metodo Ludmilla Raissuli
*Formacao do Feminino:* processo terapeutico

REGRA DE OURO: Perguntou sobre servico? MANDE TODOS os valores e opcoes NA HORA. Nunca diga "a partir de", "depende", "entre em contato pra saber". Mostre tudo, deixe ela escolher.

FLUXO PRINCIPAL — DANCA EM GRUPO:
Quando perguntarem sobre danca, responda EXATAMENTE neste formato:

Que legal que voce se interessou! Temos aulas de danca do ventre em grupo aos sabados! 🌸
Voce pode vir numa aula experimental avulsa, ou ja fechar o mensal. Tambem temos aulas particulares em horario totalmente flexivel.

• *Aula experimental avulsa: _R$ 97_*
• *Turma Iniciante — Sabados, 9h as 10h30*
• *Turma Intermediaria — Sabados, 10h30 as 12h30*
• *Plano Mensal: _R$ 350/mes_*
• *Plano Semestral: _R$ 300/mes_*

Voce gostaria de agendar uma aula experimental ou saber mais sobre aulas particulares? 🌸

Depois disso:
1. Pergunta qual turma prefere (iniciante ou intermediaria)
2. Quando decidir: manda o PIX
3. Aguarda comprovante e confirma vaga

PIX (so danca em grupo):
Quando a pessoa confirmar que quer pagar, mande EXATAMENTE assim:

Otimo! Segue o PIX 🌸

21172163000121

Titular: Escola de Amor-Proprio
Valor: [valor do plano escolhido]
Apos pagar, manda o comprovante aqui que eu confirmo sua vaga!

IMPORTANTE: A chave PIX (21172163000121) deve ficar numa linha separada pra facilitar copiar.

COMPROVANTE — REGRA CRITICA:
Quando receber uma imagem, NUNCA confirme pagamento automaticamente.
Responda: "Recebi! Nossa equipe vai verificar e confirmar sua vaga em instantes 🌸"
NAO inclua [PAGO] ao receber imagem. Somente inclua [PAGO] se a pessoa CONFIRMAR VERBALMENTE que pagou E informar o valor pago em texto.

OUTROS SERVICOS:
Informa valores completos. Quando quiser agendar:
"Maravilha! Vou anotar seu interesse e nossa equipe entra em contato pra agendar com voce, tudo bem? 🌸"

NUNCA redirecione para outro numero ou canal, a menos que a pessoa peca explicitamente.

LUDMILLA RAISSULI:
Pos-graduacao em Psicologia Positiva, Terapia Junguiana, Hipnoterapia, Metodo Louise Hay e Constelacoes Familiares. Quase 20 anos de experiencia transformando vidas.

COMPORTAMENTOS ESPECIAIS:

[PRIMEIRA_VEZ] — primeira mensagem:
Se vier so "oi/ola/bom dia":
"Oi! Que bom te ver por aqui! 🌸
Aqui e a Ana, da Escola de Amor-Proprio! Somos um espaco dedicado ao cuidado e empoderamento feminino aqui em Belem.
O que te trouxe ate aqui?"

Se ja veio com pergunta (ex: "[PRIMEIRA_VEZ] quero saber sobre danca"):
Apresente-se em 1 linha e ja responda a pergunta completa com valores.

Mensagem curta tipo "ok", "entendi", "hm":
NAO responda com textao. Pergunte algo curto: "Ficou alguma duvida?" ou "Quer que eu envie o PIX?"

Pessoa volta depois de horas/dias:
Retome com naturalidade: "Oi de novo! Decidiu sobre a aula? 🌸" (use contexto da conversa)

ESTRATEGIA DE VENDA — FUNIL:
1. ACOLHER - Receba com entusiasmo genuino. Faca ela se sentir especial.
2. INFORMAR - TODOS os valores e opcoes. Completo. Na hora.
3. NOME - Se nao sabe, pergunte naturalmente na segunda troca.
4. CONDUZIR - "Quer experimentar?", "Posso enviar o PIX?", "Qual opcao te interessa?"
5. FECHAR - Danca em grupo = PIX aqui / Outros servicos = equipe entra em contato
6. CONFIRMAR - Danca = comprovante + confirma vaga / Outros = confirma que equipe vai ligar

TECNICAS DE CONVERSAO:
- Turmas de sabado tem VAGAS LIMITADAS (mencione naturalmente, nao force)
- Aula avulsa de R$ 97 e a porta de entrada — destaque como experiencia unica
- Se a pessoa ja disse "quero": PIX imediato, sem mais perguntas
- Se ficou em silencio apos valores: retomada personalizada
- Use prova social: "Nossas alunas amam! A Ludmilla tem quase 20 anos de experiencia"
- Conexao emocional: "A danca do ventre e muito mais que exercicio, e reconexao com voce mesma"

OBJECOES COMUNS:
- "E caro" -> "Entendo! A aula experimental e so R$ 97 pra voce sentir na pele. Nossas alunas dizem que e a melhor coisa que fizeram por elas 🌸"
- "Vou pensar" -> "Claro! Fico por aqui. Lembrando que as vagas do sabado costumam preencher rapido 🌸"
- "Nao sei se e pra mim" -> "A danca do ventre e pra todas! Nao precisa de experiencia nenhuma, a Ludmilla recebe cada aluna no ritmo dela 🌸"
- "E longe" -> "Fica na Tv. Dom Romualdo Coelho, 1072. Nossas alunas dizem que depois da primeira aula, qualquer distancia vale a pena!"
- "Ja fiz danca" -> "Que maravilha! Entao voce vai amar o metodo da Ludmilla, e unico 🌸"
- "Posso ir com amiga?" -> "Claro, traz sim! Vai ser incrivel! As vagas sao individuais, cada uma faz sua inscricao"

NOME:
Se nao souber o nome, PERGUNTE na segunda mensagem de forma natural integrada a resposta.
Exemplo: "A proposito, qual seu nome? Assim fica mais facil pra gente 🌸"
Nao espere mais que 2 trocas sem saber o nome.

CAPTURA DE LEAD:
Sempre incluir NO FINAL (sistema remove automaticamente):
[LEAD: nome=NOME | interesse=INTERESSE | status=STATUS]
- nome: so se a pessoa informar (nao invente)
- interesse: servico que ela quer (ex: "danca em grupo", "terapia", "aula particular")
- status: CURIOSA / AQUECIDA / PRONTA
  CURIOSA = acabou de chegar, pergunta generica
  AQUECIDA = demonstrou interesse real, perguntou valores, detalhes
  PRONTA = quer agendar/pagar, pediu PIX, confirmou interesse firme, disse "quero"
- NUNCA inclua campo contato
- ATUALIZE a tag sempre que o status mudar
- Inclua a tag em TODA resposta onde houver informacao nova
Pagamento confirmado verbalmente: inclua [PAGO] no final.

REGRA FINAL — INEGOCIAVEL:
Toda mensagem DEVE terminar com uma pergunta ou convite pra acao. SEMPRE conduza.
Exemplos:
- "Qual turma te interessa mais, a das 9h ou a das 10h30?"
- "Posso enviar o PIX pra garantir sua vaga?"
- "Qual dia da semana funciona melhor pra voce?"
- "Quer que eu anote seu interesse e nossa equipe entre em contato?"
NUNCA termine uma mensagem sem direcionar para o proximo passo.`;

// ─── PROCESSAMENTO DE MENSAGENS ─────────────────────────
async function chamarIA(uid, msg, plataforma) {
  await addLog(uid, "user", msg, plataforma);
  addMsg(uid, "user", msg);

  let lead = await getLead(uid);
  const isPrimeiro = !lead;

  if (!lead) {
    lead = { userId: uid, contato: uid, plataforma, status: "CURIOSA", timestamp: new Date().toISOString() };
    await saveLead(lead);
    await alertaNovo(lead);
  }

  // Marca primeira vez
  const hist = getHist(uid);
  if (isPrimeiro) {
    hist[hist.length - 1] = { role: "user", content: "[PRIMEIRA_VEZ] " + msg };
  }

  let resposta = await chamarAnthropic(hist);
  if (!resposta) resposta = "Desculpe, tive um probleminha tecnico. Tente novamente em instantes";

  // Restaurar mensagem original no histórico
  if (isPrimeiro) {
    hist[hist.length - 1] = { role: "user", content: msg };
  }

  resposta = await atualizarLead(lead, uid, resposta);

  await addLog(uid, "assistant", resposta, plataforma);
  addMsg(uid, "assistant", resposta);
  return resposta;
}

async function processarImagem(uid, imageId) {
  let lead = await getLead(uid);
  if (!lead) {
    lead = { userId: uid, contato: uid, plataforma: "whatsapp", status: "CURIOSA", timestamp: new Date().toISOString() };
    await saveLead(lead);
    await alertaNovo(lead);
  }

  const media = await downloadMedia(imageId);
  const mediaData = media?.base64 ? `data:${media.contentType};base64,${media.base64}` : null;
  await addLog(uid, "user", "[Imagem]", "whatsapp", { tipo: "image", mediaId: imageId, mediaData });

  // Telegram: enviar foto
  const caption = `📷 *IMAGEM RECEBIDA*\n━━━━━━━━━━━━━━━━━━━━━\n👤 ${lead.nome || "?"}\n📱 ${fmtFone(lead.contato || uid)}\n📊 ${lead.status || "CURIOSA"}\n🕐 ${agora()}`;
  if (media?.buffer) {
    await tgFoto(caption, media.buffer, media.contentType);
  } else {
    await tg(caption + "\n_(imagem nao baixada)_");
  }

  // IA processa imagem
  addMsg(uid, "user", "[Imagem enviada pelo cliente]");
  const msgParaIA = `[CLIENTE ENVIOU UMA IMAGEM] O cliente enviou uma foto. NAO confirme pagamento automaticamente. Pergunte: 'Esse e o comprovante do pagamento? Me confirma o valor pago.' Somente inclua [PAGO] se a pessoa confirmar verbalmente que e comprovante E informar o valor pago. Status atual: ${lead.status || "CURIOSA"}, interesse: ${lead.interesse || "nenhum"}.`;

  const hist = getHist(uid);
  hist[hist.length - 1] = { role: "user", content: msgParaIA };

  let resposta = await chamarAnthropic(hist);
  if (!resposta) resposta = "Recebi sua imagem! Como posso te ajudar?";

  // Restaurar histórico
  hist[hist.length - 1] = { role: "user", content: "[Imagem enviada pelo cliente]" };

  lead = await getLead(uid) || lead;
  resposta = await atualizarLead(lead, uid, resposta);

  await addLog(uid, "assistant", resposta, "whatsapp");
  addMsg(uid, "assistant", resposta);
  return resposta;
}

async function processarMidia(uid, tipo, mediaId, extras = {}) {
  let lead = await getLead(uid);
  if (!lead) {
    lead = { userId: uid, contato: uid, plataforma: "whatsapp", status: "CURIOSA", timestamp: new Date().toISOString() };
    await saveLead(lead);
    await alertaNovo(lead);
  }

  const logExtras = { tipo, mediaId, ...extras };

  // Baixar mídia para áudio (para reproduzir no painel)
  if (tipo === "audio") {
    const media = await downloadMedia(mediaId);
    if (media?.base64) logExtras.mediaData = `data:${media.contentType};base64,${media.base64}`;
  }

  const label = extras.filename || tipo;
  await addLog(uid, "user", `[${label}]`, "whatsapp", logExtras);
  await alertaMensagem(lead, `_[${label} recebido]_`, tipo);

  const respostas = {
    audio: "Recebi seu audio! 🎙️\n\nPor aqui consigo te ajudar melhor por texto. Pode mandar sua duvida escrita que eu respondo rapidinho!",
    video: "Recebi seu video! 🎬\n\nSe for um comprovante de pagamento, pode enviar como foto que fica mais facil pra eu verificar! Posso te ajudar com mais alguma coisa?",
    document: "Recebi seu documento! 📄\n\nVou encaminhar pra equipe. Precisa de mais alguma informacao?",
    location: "Recebi sua localizacao! 📍\n\nNossa escola fica na Tv. Dom Romualdo Coelho, 1072 - Belem/PA. Quer saber mais sobre nossos servicos?",
    contact: "Recebi o contato! 👤\n\nObrigada por compartilhar! Posso te ajudar com mais alguma coisa?",
  };

  return respostas[tipo] || null;
}

// ─── FOLLOW-UP AUTOMÁTICO ───────────────────────────────
function agendarRetomada(uid, sendFn) {
  const existing = timers.get(uid);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(async () => {
    timers.delete(uid);
    const lead = await getLead(uid);
    if (!lead || lead.status === "PAGO" || lead.status === "COMPROVANTE_ENVIADO") return;

    let msg;
    const nome = lead.nome ? lead.nome.split(" ")[0] : null;
    const saudacao = nome ? `Oi, ${nome}!` : "Oi!";

    if (lead.status === "PRONTA") {
      msg = `${saudacao} Conseguiu fazer o pagamento? Se precisar do PIX de novo, e so me pedir 🌸`;
    } else if (lead.status === "AQUECIDA" && lead.interesse?.includes("danca")) {
      msg = `${saudacao} Ainda pensando na aula de sabado? As vagas costumam preencher rapido! Posso te enviar o PIX pra garantir a sua 🌸`;
    } else if (lead.status === "AQUECIDA") {
      msg = `${saudacao} Vi que voce ficou interessada! Nossa equipe pode entrar em contato pra agendar. Quer que eu anote? 🌸`;
    } else {
      msg = `${saudacao} Ainda estou por aqui se quiser saber sobre nossas aulas de danca, terapia ou qualquer outro servico 🌸`;
    }

    try {
      await sendFn(msg);
      await addLog(uid, "assistant", msg, "whatsapp");
    } catch (e) { console.error("Retomada erro:", e.message); }
  }, CONFIG.RETOMADA_MS);

  timers.set(uid, timer);
}

// ─── AUTENTICAÇÃO PAINEL ────────────────────────────────
function autenticarPainel(req, res) {
  // Aceita senha via query param OU header Authorization
  const senha = req.query.senha || req.headers.authorization?.replace("Bearer ", "");
  if (!senha || !timingSafeEqual(senha, CONFIG.PAINEL_SENHA)) {
    res.status(401).json({ erro: "Senha incorreta" });
    return false;
  }
  return true;
}

function timingSafeEqual(a, b) {
  try {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch { return false; }
}

// ─── ROTAS: WEBHOOK WHATSAPP ────────────────────────────
app.get("/webhook/whatsapp", (req, res) => {
  if (req.query["hub.verify_token"] === CONFIG.VERIFY_TOKEN) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook/whatsapp", async (req, res) => {
  res.sendStatus(200); // Responder rápido ao Meta

  try {
    const value = req.body.entry?.[0]?.changes?.[0]?.value;
    if (value?.statuses) return;

    const msg = value?.messages?.[0];
    const phoneId = value?.metadata?.phone_number_id;
    if (!msg || !phoneId) return;

    const uid = msg.from;
    if (!checarRate(uid)) return;

    const send = criarSendFn(phoneId, uid);
    let resposta = null;

    switch (msg.type) {
      case "text": {
        const leadAntes = await getLead(uid);
        if (leadAntes) await alertaMensagem(leadAntes, msg.text.body, "text");
        resposta = await chamarIA(uid, msg.text.body, "whatsapp");
        break;
      }
      case "image":
        resposta = await processarImagem(uid, msg.image.id);
        break;
      case "audio":
        resposta = await processarMidia(uid, "audio", msg.audio.id);
        break;
      case "video":
        resposta = await processarMidia(uid, "video", msg.video.id);
        break;
      case "document":
        resposta = await processarMidia(uid, "document", msg.document.id, { filename: msg.document.filename });
        break;
      case "sticker":
        await addLog(uid, "user", "[Sticker]", "whatsapp", { tipo: "sticker", mediaId: msg.sticker?.id });
        break;
      case "location":
        resposta = await processarMidia(uid, "location", null, { lat: msg.location.latitude, lng: msg.location.longitude });
        break;
      case "contacts": {
        const cName = msg.contacts?.[0]?.name?.formatted_name || "?";
        resposta = await processarMidia(uid, "contact", null, { contactName: cName });
        break;
      }
      case "reaction":
        await addLog(uid, "user", `[Reacao: ${msg.reaction?.emoji || "?"}]`, "whatsapp", { tipo: "reaction", emoji: msg.reaction?.emoji });
        break;
      default:
        await addLog(uid, "user", `[Mensagem tipo: ${msg.type}]`, "whatsapp", { tipo: msg.type });
    }

    if (resposta) {
      await send(resposta);
      // Log de resposta já foi feito em chamarIA/processarImagem; para mídias simples:
      if (!["text", "image"].includes(msg.type)) {
        await addLog(uid, "assistant", resposta, "whatsapp");
      }
      agendarRetomada(uid, send);
    }
  } catch (e) {
    console.error("WA erro:", e.message);
  }
});

// ─── ROTAS: WEBHOOK INSTAGRAM (placeholder) ─────────────
app.get("/webhook/instagram", (req, res) => {
  if (req.query["hub.verify_token"] === CONFIG.VERIFY_TOKEN) res.send(req.query["hub.challenge"]);
  else res.sendStatus(403);
});
app.post("/webhook/instagram", (_, res) => res.sendStatus(200));
app.get("/webhook/instagram2", (req, res) => {
  if (req.query["hub.verify_token"] === CONFIG.VERIFY_TOKEN) res.send(req.query["hub.challenge"]);
  else res.sendStatus(403);
});
app.post("/webhook/instagram2", (_, res) => res.sendStatus(200));

// ─── ROTAS: API ─────────────────────────────────────────
app.get("/leads", async (req, res) => {
  if (!autenticarPainel(req, res)) return;
  const lista = await getAllLeads();
  res.json({ total: lista.length, leads: lista });
});

app.delete("/leads", async (req, res) => {
  if (!autenticarPainel(req, res)) return;
  const uid = req.query.userId;
  if (!uid) return res.status(400).json({ erro: "userId obrigatorio" });

  try {
    await leadsCol.deleteOne({ userId: uid });
    await logsCol.deleteOne({ userId: uid });
    const timer = timers.get(uid);
    if (timer) clearTimeout(timer);
    conversas.delete(uid);
    timers.delete(uid);
    rateLimits.delete(uid);
    res.json({ ok: true, msg: "Lead e logs apagados" });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

app.get("/logs", async (req, res) => {
  if (!autenticarPainel(req, res)) return;
  if (req.query.userId) {
    const msgs = await getLogs(req.query.userId);
    return res.json({ logs: msgs });
  }
  const resumo = await getAllLogsResumo();
  res.json({ totalUsuarios: resumo.length, usuarios: resumo });
});

app.get("/", (_, res) => {
  res.json({ status: "Ana no ar", db: db ? "MongoDB conectado" : "sem banco", versao: "3.1" });
});

// ─── ROTAS: PÁGINAS HTML ────────────────────────────────
app.get("/painel", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const senhaInput = req.query.senha;

  if (!senhaInput || !timingSafeEqual(senhaInput, CONFIG.PAINEL_SENHA)) {
    return res.end(PAINEL_LOGIN_HTML);
  }

  // Usar token de sessão ao invés de expor senha no JS do cliente
  const sessionToken = crypto.createHash("sha256").update(CONFIG.PAINEL_SENHA + "ana-v3").digest("hex").slice(0, 32);
  res.end(gerarPainelHTML(sessionToken));
});

// Rota de validação de sessão
app.get("/session-check", (req, res) => {
  const token = req.query.token;
  const expected = crypto.createHash("sha256").update(CONFIG.PAINEL_SENHA + "ana-v3").digest("hex").slice(0, 32);
  if (token === expected) res.json({ ok: true });
  else res.status(401).json({ ok: false });
});

// Permitir acesso via token de sessão nas rotas de API
app.use((req, res, next) => {
  // Se veio token ao invés de senha, converter
  if (req.query.token && !req.query.senha) {
    const expected = crypto.createHash("sha256").update(CONFIG.PAINEL_SENHA + "ana-v3").digest("hex").slice(0, 32);
    if (req.query.token === expected) {
      req.query.senha = CONFIG.PAINEL_SENHA;
    }
  }
  next();
});

app.get("/termos", (_, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(TERMOS_HTML);
});

app.get("/privacidade", (_, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(PRIVACIDADE_HTML);
});

// ─── HTML TEMPLATES ─────────────────────────────────────
const PAINEL_LOGIN_HTML = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Painel Ana</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#fdf6f0;display:flex;align-items:center;justify-content:center;min-height:100vh}
.box{background:#fff;border-radius:16px;padding:40px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.08);max-width:340px;width:90%}
h1{color:#8a3f52;margin-bottom:6px;font-size:20px}p{color:#7a6570;font-size:13px;margin-bottom:20px}
input{width:100%;padding:11px 14px;border:1px solid #f0d5dc;border-radius:8px;font-size:14px;outline:none;margin-bottom:10px}input:focus{border-color:#c9748a}
button{width:100%;padding:11px;background:#c9748a;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer}button:hover{background:#b5607a}</style></head>
<body><div class="box"><h1>Painel Ana</h1><p>Escola de Amor-Proprio</p>
<input type="password" id="s" placeholder="Senha" onkeydown="if(event.key==='Enter')go()">
<button onclick="go()">Entrar</button></div>
<script>function go(){var s=document.getElementById('s').value;if(s)window.location.href='/painel?senha='+encodeURIComponent(s);}</script></body></html>`;

function gerarPainelHTML(token) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Painel Ana</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fdf6f0;color:#1a1218}
header{background:#1a1218;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
.logo{color:#f0d5dc;font-size:15px}.logo b{color:#c9a87c}
.hd{display:flex;align-items:center;gap:8px;font-size:12px;color:#7a6570}
.dot{width:7px;height:7px;border-radius:50%;background:#5a8a6a;animation:p 2s infinite}
@keyframes p{0%,100%{opacity:1}50%{opacity:.3}}
button{padding:5px 12px;background:#c9748a;color:#fff;border:none;border-radius:6px;font-size:11px;cursor:pointer}
button:hover{background:#b5607a}
.wrap{display:grid;grid-template-columns:320px 1fr;height:calc(100vh - 49px)}
@media(max-width:768px){.wrap{grid-template-columns:1fr;}.chat{display:none}.chat.active{display:flex}.side.hidden{display:none}
.back-btn{display:inline-block!important}}
.back-btn{display:none;padding:4px 10px;font-size:11px;cursor:pointer;background:#f0d5dc;color:#8a3f52;border:none;border-radius:6px;margin-right:8px}
.side{background:#fff9f5;border-right:1px solid #f0d5dc;display:flex;flex-direction:column}
.sh{padding:14px;border-bottom:1px solid #f0d5dc}
.sh h3{font-size:13px;color:#8a3f52;margin-bottom:8px}
input[type=text]{width:100%;padding:8px 10px;border:1px solid #f0d5dc;border-radius:6px;font-size:12px;outline:none}input[type=text]:focus{border-color:#c9748a}
.tabs{display:flex;gap:4px;margin-top:7px;flex-wrap:wrap}
.tab{padding:4px 10px;border-radius:12px;font-size:10px;cursor:pointer;border:1px solid #f0d5dc;background:#fff;color:#7a6570;white-space:nowrap}
.tab:hover{background:#f0d5dc}.tab.on{background:#c9748a;color:#fff;border-color:#c9748a}
.tab .cnt{font-weight:700;margin-left:2px}
.export-row{display:flex;gap:6px;margin-top:8px}
.export-btn{padding:4px 10px;border-radius:6px;font-size:10px;cursor:pointer;border:1px solid #f0d5dc;background:#fff;color:#7a6570}
.export-btn:hover{background:#c9748a;color:#fff}
.sort-select{width:100%;padding:5px 8px;border:1px solid #f0d5dc;border-radius:6px;font-size:10px;color:#7a6570;background:#fff;outline:none;margin-top:6px}
.del-btn{padding:4px 10px;border-radius:6px;font-size:10px;cursor:pointer;border:1px solid #e57373;background:#fff;color:#e57373;margin-left:auto}
.del-btn:hover{background:#e57373;color:#fff}
.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:100}
.modal-box{background:#fff;border-radius:14px;padding:28px;max-width:360px;width:90%;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.15)}
.modal-box h3{color:#8a3f52;font-size:15px;margin-bottom:8px}
.modal-box p{color:#7a6570;font-size:12px;margin-bottom:18px}
.modal-btns{display:flex;gap:10px;justify-content:center}
.modal-cancel,.modal-confirm{padding:8px 20px;border-radius:8px;font-size:12px;cursor:pointer}
.modal-cancel{border:1px solid #f0d5dc;background:#fff;color:#7a6570}
.modal-confirm{border:none;background:#e57373;color:#fff}
.lista{overflow-y:auto;flex:1}
.ci{padding:12px 14px;border-bottom:1px solid rgba(201,116,138,.08);cursor:pointer;transition:background .15s}
.ci:hover{background:rgba(240,213,220,.4)}.ci.on{background:rgba(201,116,138,.12);border-left:3px solid #c9748a}
.ci-top{display:flex;align-items:center;gap:8px;margin-bottom:3px}
.ci-av{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:11px;flex-shrink:0;background:linear-gradient(135deg,#25d366,#128c7e)}
.cn{font-weight:600;font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cp{font-size:10px;color:#7a6570;margin-bottom:2px}
.cm{display:flex;align-items:center;justify-content:space-between;margin-top:3px}
.bx{font-size:9px;font-weight:700;padding:2px 7px;border-radius:8px;text-transform:uppercase}
.b-CURIOSA{background:#e8f4e8;color:#3a6e4a}.b-AQUECIDA{background:#fff3e0;color:#b07020}
.b-PRONTA{background:#fce4ec;color:#c62828}.b-PAGO{background:#e3f2fd;color:#1565c0}
.b-COMPROVANTE_ENVIADO{background:#ede7f6;color:#4527a0}
.ct{font-size:9px;color:#7a6570}
.ci-int{font-size:9px;color:#8a3f52;margin-top:2px;font-style:italic}
.chat{display:flex;flex-direction:column}
.ch{padding:12px 18px;background:#fff9f5;border-bottom:1px solid #f0d5dc;display:flex;align-items:center;gap:12px}
.av{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;flex-shrink:0;background:linear-gradient(135deg,#25d366,#128c7e)}
.ci2{flex:1;min-width:0}.cn2{font-weight:600;font-size:14px}.cp2{font-size:11px;color:#7a6570}
.ch-details{display:flex;flex-direction:column;gap:3px;align-items:flex-end}
.tgs{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
.tg{font-size:9px;padding:2px 7px;border-radius:8px;font-weight:500}
.ti{background:#f0d5dc;color:#8a3f52}.tc{background:#e8f4e8;color:#3a6e4a}
.ch-link{font-size:10px;color:#c9748a;cursor:pointer}.ch-link:hover{text-decoration:underline}
.msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;background:#fdf6f0}
.mg{display:flex;flex-direction:column;gap:2px}
.mr{display:flex;align-items:flex-end;gap:5px}
.mr.user{justify-content:flex-end}.mr.assistant{justify-content:flex-start}
.mb{max-width:65%;padding:9px 12px;border-radius:14px;font-size:12.5px;line-height:1.55;white-space:pre-wrap;word-break:break-word}
.mr.user .mb{background:#c9748a;color:#fff;border-bottom-right-radius:3px}
.mr.assistant .mb{background:#fff;color:#1a1218;border-bottom-left-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.media-tag{font-size:10px;font-weight:600;padding:3px 8px;border-radius:6px;background:rgba(201,116,138,.12);color:#8a3f52;margin-bottom:4px;display:inline-block}
.media-img{max-width:100%;max-height:200px;border-radius:8px;cursor:pointer;display:block;margin-bottom:4px}
.media-img.expanded{max-height:500px}
.media-audio{width:100%;max-width:250px;height:36px;display:block;margin-bottom:4px}
.mt{font-size:9px;color:#7a6570;margin:0 3px 1px}.mr.user .mt{text-align:right}
.al{font-size:9px;color:#c9748a;font-weight:700;margin-bottom:1px;margin-left:2px}
.emp{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#7a6570;text-align:center;padding:30px}
.ei{font-size:36px;margin-bottom:10px;opacity:.4}.et{font-size:16px;color:#8a3f52;margin-bottom:5px}.es{font-size:12px}
.sb{padding:10px 18px;background:#fff9f5;border-top:1px solid #f0d5dc;font-size:11px;color:#7a6570;display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.sb strong{color:#1a1218}
.ld{display:flex;align-items:center;justify-content:center;padding:30px;color:#7a6570;font-size:12px;gap:6px}
.sp{width:13px;height:13px;border:2px solid #f0d5dc;border-top-color:#c9748a;border-radius:50%;animation:r .7s linear infinite}
@keyframes r{to{transform:rotate(360deg)}}
.nc{padding:30px;text-align:center;color:#7a6570;font-size:12px}
</style>
</head>
<body>
<header>
  <div class="logo">Escola de Amor-Proprio &middot; <b>Painel Ana v3.1</b></div>
  <div class="hd"><div class="dot"></div><span id="st">...</span><button id="rb">Atualizar</button></div>
</header>
<div class="wrap">
  <div class="side" id="sidebar">
    <div class="sh">
      <h3>Conversas</h3>
      <input type="text" id="bx" placeholder="Buscar nome, telefone...">
      <div class="tabs">
        <div class="tab on" data-f="todos">Todos <span class="cnt" id="cnt-todos"></span></div>
        <div class="tab" data-f="PRONTA">Prontas <span class="cnt" id="cnt-PRONTA"></span></div>
        <div class="tab" data-f="PAGO">Pagas <span class="cnt" id="cnt-PAGO"></span></div>
        <div class="tab" data-f="AQUECIDA">Quentes <span class="cnt" id="cnt-AQUECIDA"></span></div>
        <div class="tab" data-f="COMPROVANTE_ENVIADO">Comprovante <span class="cnt" id="cnt-COMPROVANTE_ENVIADO"></span></div>
        <div class="tab" data-f="CURIOSA">Curiosas <span class="cnt" id="cnt-CURIOSA"></span></div>
      </div>
      <select id="sortBy" class="sort-select">
        <option value="recente">Mais recentes</option>
        <option value="antigo">Mais antigos</option>
        <option value="ultima_msg">Ultima mensagem</option>
        <option value="nome">Nome A-Z</option>
      </select>
      <div class="export-row">
        <div class="export-btn" onclick="exportCSV()">Exportar CSV</div>
        <div class="export-btn" onclick="exportWA()">Copiar WhatsApps</div>
      </div>
    </div>
    <div class="lista" id="lista"><div class="ld"><div class="sp"></div> Carregando...</div></div>
  </div>
  <div class="chat" id="chatpanel">
    <div id="ch" class="ch" style="display:none">
      <button class="back-btn" onclick="voltarLista()">← Voltar</button>
      <div class="av" id="av">A</div>
      <div class="ci2"><div class="cn2" id="nn">-</div><div class="cp2" id="ph">-</div></div>
      <div class="ch-details">
        <div class="tgs"><span class="tg ti" id="it"></span><span class="tg tc" id="ca"></span><span class="bx" id="st2"></span></div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="ch-link" id="wa-link" style="display:none">Abrir WhatsApp</span>
          <div class="del-btn" onclick="confirmarApagar()">Apagar</div>
        </div>
      </div>
    </div>
    <div id="msgs" class="msgs">
      <div class="emp"><div class="ei">🌸</div><div class="et">Selecione uma conversa</div><div class="es">Escolha um contato ao lado</div></div>
    </div>
    <div class="sb">Total: <strong id="s1">-</strong> | Prontas: <strong id="s2">-</strong> | Pagas: <strong id="s3">-</strong> | Hoje: <strong id="s4">-</strong></div>
  </div>
</div>
<script>
var lds=[],lmap={},fil="todos",ati=null,TK="${token}",sortMode="recente";
function api(path){return path+(path.includes("?")?"&":"?")+"token="+TK;}
function esc(s){if(!s)return"";return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function ft(c){if(!c)return"-";var d=c.replace(/[^0-9]/g,"");if(d.length===13)return"("+d.slice(2,4)+") "+d.slice(4,9)+"-"+d.slice(9);if(d.length===12)return"("+d.slice(2,4)+") "+d.slice(4,8)+"-"+d.slice(8);if(d.length===11)return"("+d.slice(0,2)+") "+d.slice(2,7)+"-"+d.slice(7);if(d.length===10)return"("+d.slice(0,2)+") "+d.slice(2,6)+"-"+d.slice(6);return c;}
function displayName(ld){if(ld.nome&&ld.nome.trim()&&ld.nome.trim().toLowerCase()!=="sem nome")return ld.nome.trim();if(ld.plataforma==="whatsapp"||!ld.plataforma)return ft(ld.contato);return"Contato "+(ld.userId||"").slice(-6);}
function fh(t){if(!t)return"";var d=new Date(t);if(isNaN(d.getTime()))return"";return d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})+" "+d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});}
function ini(n){return(n&&n.trim())?n.trim()[0].toUpperCase():"?";}
function waLink(c){if(!c)return null;var d=c.replace(/[^0-9]/g,"");if(d.length>=10)return"https://wa.me/"+d;return null;}
function voltarLista(){document.getElementById("sidebar").classList.remove("hidden");document.getElementById("chatpanel").classList.remove("active");ati=null;rl();}
function stats(){
  var h=new Date().toDateString();
  var counts={todos:0,CURIOSA:0,AQUECIDA:0,PRONTA:0,PAGO:0,COMPROVANTE_ENVIADO:0};
  for(var i=0;i<lds.length;i++){var s=lds[i].status||"CURIOSA";counts.todos++;if(counts[s]!==undefined)counts[s]++;}
  var tp=counts.PAGO+counts.COMPROVANTE_ENVIADO;
  document.getElementById("s1").textContent=counts.todos;
  document.getElementById("s2").textContent=counts.PRONTA;
  document.getElementById("s3").textContent=tp;
  document.getElementById("s4").textContent=lds.filter(function(l){return new Date(l.timestamp).toDateString()===h;}).length;
  ["todos","PRONTA","PAGO","AQUECIDA","COMPROVANTE_ENVIADO","CURIOSA"].forEach(function(k){
    var el=document.getElementById("cnt-"+k);
    if(el)el.textContent=k==="PAGO"?tp:counts[k]||"";
  });
}
function sortList(list){
  return list.sort(function(a,b){
    if(sortMode==="recente")return new Date(b.timestamp||0)-new Date(a.timestamp||0);
    if(sortMode==="antigo")return new Date(a.timestamp||0)-new Date(b.timestamp||0);
    if(sortMode==="ultima_msg"){var ta=lmap[a.userId]&&lmap[a.userId].ultima?new Date(lmap[a.userId].ultima):new Date(0);var tb=lmap[b.userId]&&lmap[b.userId].ultima?new Date(lmap[b.userId].ultima):new Date(0);return tb-ta;}
    if(sortMode==="nome"){return displayName(a).toLowerCase().localeCompare(displayName(b).toLowerCase());}
    return 0;
  });
}
function rl(){
  var b=document.getElementById("bx").value.toLowerCase();
  var l=lds.slice();
  if(fil==="PAGO")l=l.filter(function(x){return x.status==="PAGO"||x.status==="COMPROVANTE_ENVIADO";});
  else if(fil!=="todos")l=l.filter(function(x){return x.status===fil;});
  if(b)l=l.filter(function(x){return(x.nome||"").toLowerCase().indexOf(b)>=0||(x.contato||"").indexOf(b)>=0||(x.interesse||"").toLowerCase().indexOf(b)>=0||ft(x.contato).indexOf(b)>=0;});
  l=sortList(l);
  var el=document.getElementById("lista");
  if(!l.length){el.innerHTML='<div class="nc">Nenhum contato encontrado</div>';return;}
  var h="";
  for(var i=0;i<l.length;i++){
    var ld=l[i],li=lmap[ld.userId]||{},st=ld.status||"CURIOSA";
    var pv=li.ultima?fh(li.ultima):"";
    var nome=displayName(ld);
    h+='<div class="ci'+(ati===ld.userId?" on":"")+'" data-id="'+esc(ld.userId)+'">';
    h+='<div class="ci-top"><div class="ci-av">'+esc(ini(nome))+'</div>';
    h+='<div class="cn">'+esc(nome)+'</div></div>';
    h+='<div class="cp">'+esc(ft(ld.contato))+'</div>';
    if(ld.interesse)h+='<div class="ci-int">'+esc(ld.interesse)+'</div>';
    h+='<div class="cm"><span class="bx b-'+esc(st)+'">'+esc(st.replace(/_/g," "))+'</span>';
    h+='<span class="ct">'+(pv?pv:fh(ld.timestamp))+'</span></div></div>';
  }
  el.innerHTML=h;
  el.querySelectorAll(".ci").forEach(function(x){x.addEventListener("click",function(){abrir(this.getAttribute("data-id"));});});
}
function abrir(uid){
  ati=uid;rl();
  // Mobile: mostrar chat, esconder sidebar
  document.getElementById("sidebar").classList.add("hidden");
  document.getElementById("chatpanel").classList.add("active");
  var ld=lds.find(function(x){return x.userId===uid;})||{};
  var nome=displayName(ld);
  document.getElementById("ch").style.display="flex";
  document.getElementById("av").textContent=ini(nome);
  document.getElementById("nn").textContent=nome;
  document.getElementById("ph").textContent=ft(ld.contato);
  document.getElementById("it").textContent=ld.interesse||"";
  document.getElementById("it").style.display=ld.interesse?"":"none";
  document.getElementById("ca").textContent="WhatsApp";
  var s=document.getElementById("st2");s.textContent=(ld.status||"CURIOSA").replace(/_/g," ");s.className="bx b-"+(ld.status||"CURIOSA");
  var wl=document.getElementById("wa-link");
  var link=waLink(ld.contato);
  if(link){wl.style.display="";wl.onclick=function(){window.open(link,"_blank");};}else{wl.style.display="none";}
  var ma=document.getElementById("msgs");
  ma.innerHTML='<div class="ld"><div class="sp"></div> Carregando...</div>';
  fetch(api("/logs?userId="+uid))
    .then(function(r){return r.json();})
    .then(function(d){
      var lg=d.logs||[];
      if(!lg.length){ma.innerHTML='<div class="emp"><div class="ei">💬</div><div class="et">Sem mensagens</div></div>';return;}
      var h="";
      for(var i=0;i<lg.length;i++){
        var m=lg[i],ia=m.role==="assistant";
        var txt=esc(m.texto||"");
        var mediaHtml="";
        if(m.tipo==="image"&&m.mediaData)mediaHtml='<img src="'+esc(m.mediaData)+'" class="media-img" onclick="this.classList.toggle(\'expanded\')">';
        else if(m.tipo==="image")mediaHtml='<div class="media-tag">Imagem</div>';
        else if(m.tipo==="audio"&&m.mediaData)mediaHtml='<audio controls class="media-audio"><source src="'+esc(m.mediaData)+'"></audio>';
        else if(m.tipo==="audio")mediaHtml='<div class="media-tag">Audio</div>';
        else if(m.tipo==="video")mediaHtml='<div class="media-tag">Video</div>';
        else if(m.tipo==="document")mediaHtml='<div class="media-tag">'+esc(m.filename||"Documento")+'</div>';
        else if(m.tipo==="sticker")mediaHtml='<div class="media-tag">Sticker</div>';
        else if(m.tipo==="location")mediaHtml='<div class="media-tag">Localizacao</div>';
        else if(m.tipo==="contact")mediaHtml='<div class="media-tag">Contato</div>';
        else if(m.tipo==="reaction")mediaHtml='<div class="media-tag">'+(m.emoji||"reacao")+'</div>';
        var content=mediaHtml+(txt.indexOf("[")===0&&mediaHtml?"":txt);
        h+='<div class="mg">'+(ia?'<div class="al">Ana</div>':'')+
           '<div class="mr '+esc(m.role)+'"><div class="mb">'+content+'</div></div>'+
           '<div class="mt">'+fh(m.timestamp)+'</div></div>';
      }
      ma.innerHTML=h;ma.scrollTop=ma.scrollHeight;
    }).catch(function(){ma.innerHTML='<div class="emp"><div class="ei">Erro ao carregar</div></div>';});
}
function confirmarApagar(){
  if(!ati)return;
  var ld=lds.find(function(x){return x.userId===ati;})||{};
  var div=document.createElement("div");div.className="modal-overlay";div.id="modal-del";
  div.innerHTML='<div class="modal-box"><h3>Apagar contato?</h3><p>Tem certeza que quer apagar <b>'+esc(displayName(ld))+'</b>? Essa acao nao pode ser desfeita.</p><div class="modal-btns"><button class="modal-cancel" onclick="fecharModal()">Cancelar</button><button class="modal-confirm" onclick="apagarLead()">Apagar</button></div></div>';
  document.body.appendChild(div);
}
function fecharModal(){var m=document.getElementById("modal-del");if(m)m.remove();}
function apagarLead(){
  if(!ati)return;fecharModal();
  fetch(api("/leads?userId="+ati),{method:"DELETE"})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.ok){lds=lds.filter(function(x){return x.userId!==ati;});delete lmap[ati];ati=null;document.getElementById("ch").style.display="none";document.getElementById("msgs").innerHTML='<div class="emp"><div class="ei">🌸</div><div class="et">Contato apagado</div></div>';voltarLista();stats();rl();}
      else{alert("Erro: "+(d.erro||"desconhecido"));}
    }).catch(function(){alert("Erro de conexao");});
}
function exportCSV(){
  var rows=[["Nome","Telefone","Interesse","Status","Data"]];
  var list=fil==="todos"?lds:lds.filter(function(x){if(fil==="PAGO")return x.status==="PAGO"||x.status==="COMPROVANTE_ENVIADO";return x.status===fil;});
  for(var i=0;i<list.length;i++){var l=list[i];rows.push([displayName(l),ft(l.contato),l.interesse||"",l.status||"CURIOSA",l.timestamp||""]);}
  var csv=rows.map(function(r){return r.map(function(c){return'"'+(c+"").replace(/"/g,'""')+'"';}).join(",");}).join("\\n");
  var blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="leads_ana_"+new Date().toISOString().slice(0,10)+".csv";a.click();
}
function exportWA(){
  var nums=lds.filter(function(l){return l.contato;}).map(function(l){return l.contato;});
  if(!nums.length){alert("Nenhum contato");return;}
  navigator.clipboard.writeText(nums.join("\\n")).then(function(){alert(nums.length+" numeros copiados!");}).catch(function(){prompt("Copie:",nums.join("\\n"));});
}
function carregar(){
  document.getElementById("st").textContent="Atualizando...";
  Promise.all([
    fetch(api("/leads")).then(function(r){if(!r.ok)throw new Error("Leads: "+r.status);return r.json();}),
    fetch(api("/logs")).then(function(r){if(!r.ok)throw new Error("Logs: "+r.status);return r.json();})
  ]).then(function(res){
    lds=res[0].leads||[];lmap={};
    (res[1].usuarios||[]).forEach(function(u){lmap[u.userId]=u;});
    stats();rl();
    document.getElementById("st").textContent=lds.length+" contatos";
    if(!lds.length)document.getElementById("lista").innerHTML='<div class="nc">Nenhum contato ainda.</div>';
    if(ati)setTimeout(function(){abrir(ati);},100);
  }).catch(function(err){
    document.getElementById("st").textContent="Erro";
    document.getElementById("lista").innerHTML='<div class="nc">Erro: '+esc(err.message)+'</div>';
  });
}
document.getElementById("bx").addEventListener("input",rl);
document.getElementById("rb").addEventListener("click",carregar);
document.getElementById("sortBy").addEventListener("change",function(){sortMode=this.value;rl();});
document.querySelectorAll(".tab").forEach(function(t){t.addEventListener("click",function(){fil=this.getAttribute("data-f");document.querySelectorAll(".tab").forEach(function(x){x.classList.remove("on");});this.classList.add("on");rl();});});
carregar();setInterval(carregar,30000);
</script>
</body></html>`;
}

const TERMOS_HTML = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Termos - Escola de Amor-Proprio</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;background:#fdf6f0;color:#1a1218;line-height:1.8}.wrap{max-width:680px;margin:0 auto;padding:48px 24px}h1{font-size:26px;color:#8a3f52;margin-bottom:8px}h2{font-size:17px;color:#8a3f52;margin:28px 0 8px}p{font-size:15px;color:#3a2a30;margin-bottom:12px}.sub{font-size:13px;color:#7a6570;margin-bottom:32px}footer{margin-top:48px;font-size:12px;color:#7a6570;border-top:1px solid #f0d5dc;padding-top:16px}</style></head>
<body><div class="wrap"><h1>Termos de Servico</h1><p class="sub">Escola de Amor-Proprio</p>
<h2>1. Aceitacao dos Termos</h2><p>Ao utilizar o atendimento Ana da Escola de Amor-Proprio, voce concorda com estes termos.</p>
<h2>2. Sobre o servico</h2><p>Ana e uma atendente digital disponivel via WhatsApp para informacoes sobre nossos servicos.</p>
<h2>3. Uso adequado</h2><p>O servico deve ser utilizado apenas para fins legitimos. E proibido o uso para fins ilicitos.</p>
<h2>4. Contato</h2><p>Escola de Amor-Proprio<br>Tv. Dom Romualdo Coelho, 1072 — Belem, PA<br>WhatsApp: (91) 98134-7134</p>
<footer>Em conformidade com o Codigo de Defesa do Consumidor.</footer></div></body></html>`;

const PRIVACIDADE_HTML = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacidade - Escola de Amor-Proprio</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;background:#fdf6f0;color:#1a1218;line-height:1.8}.wrap{max-width:680px;margin:0 auto;padding:48px 24px}h1{font-size:26px;color:#8a3f52;margin-bottom:8px}h2{font-size:17px;color:#8a3f52;margin:28px 0 8px}p{font-size:15px;color:#3a2a30;margin-bottom:12px}.sub{font-size:13px;color:#7a6570;margin-bottom:32px}footer{margin-top:48px;font-size:12px;color:#7a6570;border-top:1px solid #f0d5dc;padding-top:16px}</style></head>
<body><div class="wrap"><h1>Politica de Privacidade</h1><p class="sub">Escola de Amor-Proprio</p>
<h2>1. Quem somos</h2><p>A Escola de Amor-Proprio e um Centro Integral de Cuidado com a Mulher, fundado em Belem-PA pela terapeuta Ludmilla Raissuli.</p>
<h2>2. Dados coletados</h2><p>Coletamos apenas nome, telefone e mensagens fornecidas voluntariamente durante a conversa.</p>
<h2>3. Uso dos dados</h2><p>Os dados sao usados exclusivamente para atendimento. Nao vendemos nem compartilhamos seus dados.</p>
<h2>4. Seus direitos</h2><p>Voce pode solicitar exclusao dos seus dados pelo WhatsApp (91) 98134-7134 ou escoladeamorproprio@gmail.com.</p>
<h2>5. Contato</h2><p>Escola de Amor-Proprio<br>Tv. Dom Romualdo Coelho, 1072 - Belem, PA<br>Instagram: @escoladeamorproprio</p>
<footer>Em conformidade com a LGPD - Lei 13.709/2018.</footer></div></body></html>`;

// ─── GRACEFUL SHUTDOWN ──────────────────────────────────
function gracefulShutdown(signal) {
  console.log(`${signal} recebido, encerrando...`);
  for (const [uid, timer] of timers) clearTimeout(timer);
  timers.clear();
  process.exit(0);
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ─── START ──────────────────────────────────────────────
conectarMongo().then(() => {
  app.listen(CONFIG.PORT, () => console.log(`Ana v3.1 rodando na porta ${CONFIG.PORT}`));
});
