const express = require("express");
const { MongoClient } = require("mongodb");
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ============ CONFIG ============
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "meu_token_secreto";
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const LEADS_PASSWORD = process.env.LEADS_PASSWORD || "escola2024";
const PAINEL_SENHA = process.env.PAINEL_SENHA || "painel2024";
const MONGODB_URI = process.env.MONGODB_URI;
const IG_ACCOUNT_ID = "17841401948747652";
const IG_PAGE_ID = "223210454453170";

// ============ MONGODB ============
let db = null, leadsCol = null, logsCol = null;

async function conectarMongo() {
  if (db) return;
  try {
    const isInternal = MONGODB_URI && MONGODB_URI.includes(".railway.internal");
    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      tls: !isInternal,
    });
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    db = client.db("escolabot");
    leadsCol = db.collection("leads");
    logsCol = db.collection("logs");
    await leadsCol.createIndex({ userId: 1 }, { unique: true });
    await logsCol.createIndex({ userId: 1 });
    console.log("MongoDB conectado");
  } catch (e) {
    console.error("MongoDB erro:", e.message);
    setTimeout(conectarMongo, 10000);
  }
}

async function getLead(uid) { try { return await leadsCol.findOne({ userId: uid }); } catch (e) { return null; } }
async function saveLead(l) { try { await leadsCol.updateOne({ userId: l.userId }, { $set: l }, { upsert: true }); } catch (e) { console.error("saveLead:", e.message); } }
async function getLogs(uid) { try { const d = await logsCol.findOne({ userId: uid }); return d ? d.msgs : []; } catch (e) { return []; } }
async function addLog(uid, role, texto, plataforma) { try { await logsCol.updateOne({ userId: uid }, { $push: { msgs: { $each: [{ role, texto, plataforma, timestamp: new Date().toISOString() }], $slice: -100 } } }, { upsert: true }); } catch (e) { } }
async function getAllLeads() { try { return await leadsCol.find({}).sort({ timestamp: -1 }).toArray(); } catch (e) { return []; } }
async function getAllLogsResumo() { try { const docs = await logsCol.find({}, { projection: { userId: 1, msgs: 1 } }).toArray(); return docs.map(d => ({ userId: d.userId, ultima: d.msgs && d.msgs.length ? d.msgs[d.msgs.length - 1].timestamp : null })); } catch (e) { return []; } }

// ============ RATE LIMIT ============
const rateLimits = {};
function checarRate(uid) {
  const now = Date.now();
  if (!rateLimits[uid]) rateLimits[uid] = { n: 0, t: now };
  if (now - rateLimits[uid].t > 60000) rateLimits[uid] = { n: 0, t: now };
  return ++rateLimits[uid].n <= 10;
}

// ============ HISTÓRICO EM MEMÓRIA ============
const conversas = {}, timers = {};
function getHist(id) { if (!conversas[id]) conversas[id] = []; return conversas[id]; }
function addMsg(id, role, content) { const h = getHist(id); h.push({ role, content }); if (h.length > 30) h.splice(0, h.length - 30); }

// ============ TELEGRAM ============
async function tg(texto) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try { await fetch("https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/sendMessage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: texto, parse_mode: "Markdown" }) }); } catch (e) { }
}
async function tgFoto(url, caption) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const img = await fetch(url, { headers: { "Authorization": "Bearer " + process.env.WHATSAPP_TOKEN } });
    const buf = Buffer.from(await img.arrayBuffer());
    const b = "B" + Date.now();
    const hdr = Buffer.from("--" + b + "\r\nContent-Disposition: form-data; name=\"chat_id\"\r\n\r\n" + TELEGRAM_CHAT_ID + "\r\n--" + b + "\r\nContent-Disposition: form-data; name=\"caption\"\r\n\r\n" + caption + "\r\n--" + b + "\r\nContent-Disposition: form-data; name=\"photo\"; filename=\"comprovante.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n");
    const ftr = Buffer.from("\r\n--" + b + "--\r\n");
    await fetch("https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/sendPhoto", { method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=" + b }, body: Buffer.concat([hdr, buf, ftr]) });
  } catch (e) { await tg(caption + "\n_(imagem não encaminhada)_"); }
}

const agora = () => new Date().toLocaleString("pt-BR");
async function alertaNovo(l) { await tg("🌸 *NOVO CONTATO*\n\n👤 " + (l.nome || "Aguardando...") + "\n📱 " + (l.contato || "?") + "\n📲 " + (l.plataforma || "?") + "\n🕐 " + agora()); }
async function alertaPronta(l) { await tg("🔥 *LEAD PRONTA!*\n\n👤 " + (l.nome || "?") + "\n📱 " + (l.contato || "?") + "\n💜 " + (l.interesse || "?") + "\n🕐 " + agora()); }
async function alertaPago(l) { await tg("💰 *PAGAMENTO CONFIRMADO!*\n\n👤 " + (l.nome || "?") + "\n📱 " + (l.contato || "?") + "\n🕐 " + agora()); }

// ============ IMAGEM ============
async function processarImagem(uid, imageId) {
  try {
    const r = await fetch("https://graph.facebook.com/v18.0/" + imageId, { headers: { "Authorization": "Bearer " + process.env.WHATSAPP_TOKEN } });
    const d = await r.json();
    const lead = await getLead(uid) || {};
    const caption = "📎 *COMPROVANTE*\n👤 " + (lead.nome || "?") + "\n📱 " + (lead.contato || uid) + "\n🕐 " + agora();
    await tgFoto(d.url, caption);
    await saveLead({ ...lead, userId: uid, status: "COMPROVANTE_ENVIADO", comprovante: new Date().toISOString() });
    await alertaPago(lead);
    return "Recebi seu comprovante! ✅\n\n*Vaga confirmada!* 🌸\n\nTe esperamos no sábado com muito carinho!\nQualquer dúvida, é só falar 💜";
  } catch (e) { return "Recebi sua imagem 🤍\n\nVou confirmar com a equipe e já te aviso!"; }
}

// ============ PROMPT ============
const PROMPT = `Voce e a Ana, atendente da Escola de Amor-Proprio em Belem-PA, fundada pela terapeuta Ludmilla Raissuli.

═══════════════════════════════════════
PERSONALIDADE E TOM
═══════════════════════════════════════
- Voce e acolhedora, carinhosa e ENTUSIASMADA
- Fala como uma amiga animada que quer ajudar
- Usa expressoes como "Que legal!", "Que lindo!", "Amei!", "Maravilha!"
- E proativa: sempre oferece o proximo passo
- Nunca e fria, generica ou robotica
- Nunca diz que e IA, assistente virtual ou chatbot
- Voce E a Ana, uma pessoa real da equipe

═══════════════════════════════════════
FORMATACAO OBRIGATORIA (WhatsApp/Instagram)
═══════════════════════════════════════
- Use *negrito* para destacar valores e informacoes importantes
- Use _italico_ para detalhes complementares
- Use bullet points com • para listas de precos/opcoes
- Quebre linhas para facilitar leitura (nao envie blocos de texto)
- Maximo 2 emojis por mensagem, bem posicionados
- Respostas podem ter ate 8-10 linhas quando precisar passar informacoes completas
- NAO use # ou ## ou ### (nao e markdown de titulo)
- NAO use ** duplo, use *simples* para negrito do WhatsApp

═══════════════════════════════════════
REGRA DE OURO: INFORMACAO COMPLETA
═══════════════════════════════════════
Quando alguem perguntar sobre qualquer servico, SEMPRE envie TODAS as opcoes e valores daquele servico na PRIMEIRA resposta. Nunca diga "a partir de" ou "entre em contato para saber". MOSTRE TUDO.

═══════════════════════════════════════
SERVICOS E VALORES (sempre informe completo)
═══════════════════════════════════════

DANCA DO VENTRE EM GRUPO (Sabados):
Quando alguem perguntar de danca, responda EXATAMENTE neste formato:
---
Que legal que voce se interessou! Temos aulas de danca do ventre em grupo aos sabados! 🌸

Voce pode vir numa aula experimental ou ja fechar um plano:

• *Aula avulsa (experimental): R$ 97,00*
• *Mensalidade (aula em grupo): R$ 300,00*
• *Semestralidade (aula em grupo): R$ 250,00/mes*

_Tambem temos aulas particulares em horario flexivel!_

Gostaria de agendar uma aula experimental? 🥰
---

AULA PARTICULAR DE DANCA:
• *Aula avulsa: R$ 300,00*
• *Pacote 4 aulas: R$ 250,00 cada*
_Horarios flexiveis, agendados direto com a professora._

TERAPIA DO AMOR-PROPRIO:
• *1a sessao: R$ 250,00*
• *Pacote 4 sessoes: R$ 200,00 cada*
_Sessoes individuais com a Ludmilla Raissuli._
-> Para agendar terapia, direcionar para WhatsApp (91) 98134-7134

WORKSHOP MENSAL:
• *Valor: R$ 100,00*
_Encontros tematicos mensais sobre autoconhecimento e feminino._

CONSULTORIA JURIDICA:
_Direito de Familia e da Mulher_
-> Direcionar para WhatsApp (91) 98134-7134

CURSO ONLINE - METODO LUDMILLA RAISSULI:
_Formacao completa do metodo._
-> Direcionar para WhatsApp (91) 98134-7134

FORMACAO DO FEMININO:
_Processo terapeutico profundo de reconexao._
-> Direcionar para WhatsApp (91) 98134-7134

═══════════════════════════════════════
REGRAS DE DIRECIONAMENTO
═══════════════════════════════════════
- DANCA EM GRUPO: Resolve tudo AQUI. Envia valores, envia PIX, confirma pagamento. NAO manda para WhatsApp.
- AULA PARTICULAR: Pode iniciar aqui, mas para agendar horario direciona para (91) 98134-7134
- TERAPIA: Apresenta valores aqui, mas para agendar direciona para (91) 98134-7134
- JURIDICO: Direciona para (91) 98134-7134
- CURSO ONLINE / FORMACAO: Direciona para (91) 98134-7134

═══════════════════════════════════════
PIX - ENVIAR QUANDO CLIENTE QUISER PAGAR AULA DE DANCA EM GRUPO
═══════════════════════════════════════
Quando a pessoa demonstrar que quer pagar/agendar aula de danca em grupo, envie:

Maravilha! Segue nosso PIX para garantir sua vaga 🌸

*Escola de Amor-Proprio*
*CNPJ: 21.172.163/0001-21*
*Valor: R$ 97,00* _(aula avulsa)_

Apos o pagamento, e so enviar o comprovante aqui que ja confirmo sua vaga! 💜

(Ajuste o valor se for mensalidade R$ 300 ou semestralidade R$ 250)

═══════════════════════════════════════
SOBRE A LUDMILLA RAISSULI
═══════════════════════════════════════
Pos-graduacao em Psicologia Positiva, Terapia Junguiana, Hipnoterapia, Metodo Louise Hay e Constelacoes Familiares. Quase 20 anos de experiencia cuidando de mulheres. Fundadora da Escola de Amor-Proprio.

═══════════════════════════════════════
CONTATO E ENDERECO
═══════════════════════════════════════
WhatsApp: (91) 98134-7134
Instagram: @escoladeamorproprio
Endereco: Tv. Dom Romualdo Coelho, 1072 - Belem/PA

═══════════════════════════════════════
PALAVRAS PROIBIDAS (nunca use)
═══════════════════════════════════════
gostoso, delicia, ardente, sedutora, sensual, irresistivel, excitante

═══════════════════════════════════════
CAPTURA DE LEAD (invisivel para o cliente)
═══════════════════════════════════════
Quando conseguir identificar o nome E a intencao da pessoa, inclua NO FINAL da sua resposta (o sistema remove automaticamente):

[LEAD: nome=NOME | contato=CONTATO | interesse=INTERESSE | status=STATUS]

Status possiveis:
- CURIOSA = acabou de chegar, perguntando
- AQUECIDA = demonstrou interesse real, pediu mais detalhes
- PRONTA = quer agendar/pagar, pediu PIX ou confirmou

PAGAMENTO: Quando a pessoa confirmar que pagou ou enviar comprovante, inclua [PAGO] no final.

═══════════════════════════════════════
COMPORTAMENTO ESPECIAL
═══════════════════════════════════════
- [PRIMEIRA_VEZ]: Se a mensagem comecar com isso, apresente a escola brevemente:
  "Oi! Bem-vinda a Escola de Amor-Proprio! 🌸
   Somos um espaco dedicado ao cuidado e empoderamento feminino aqui em Belem.
   Em que posso te ajudar?"
  E depois responda a pergunta normalmente.

- FORA DO HORARIO (antes 8h ou depois 20h):
  Informe que o atendimento e das 8h as 20h e que respondera pela manha.

- Se a pessoa so mandar "oi", "ola", "bom dia" etc:
  Cumprimente com carinho e pergunte como pode ajudar, mencionando brevemente os servicos:
  "Oi, tudo bem? 🌸 Aqui e a Ana, da Escola de Amor-Proprio!
   Posso te ajudar com informacoes sobre nossas aulas de danca, terapia, workshops e muito mais!
   O que te trouxe ate aqui?"

- DUVIDAS/OBJECOES sobre preco:
  Seja acolhedora, destaque o valor da experiencia, mencione a aula avulsa como opcao acessivel.

- PERGUNTAS SOBRE LOCAL/HORARIO:
  Endereco: Tv. Dom Romualdo Coelho, 1072 - Belem/PA
  Aulas de danca em grupo: sabados (confirmar horario com a equipe)

═══════════════════════════════════════
ESTRATEGIA DE VENDA
═══════════════════════════════════════
1. ACOLHER - Receba com entusiasmo
2. INFORMAR - Passe TODOS os valores e opcoes
3. CONDUZIR - Sempre sugira o proximo passo ("Quer agendar?", "Posso enviar o PIX?")
4. FECHAR - Quando demonstrar interesse, envie o PIX imediatamente
5. CONFIRMAR - Peca o comprovante e confirme a vaga

Nunca termine uma mensagem sem uma pergunta ou convite para acao.`;

// ============ IA ============
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

  const msgIA = isPrimeiro ? "[PRIMEIRA_VEZ] " + msg : msg;
  const hist = getHist(uid);
  hist[hist.length - 1] = { role: "user", content: msgIA };

  // Adicionar contexto de horário
  const horaAtual = new Date().toLocaleString("pt-BR", { timeZone: "America/Belem" });
  const horaNum = new Date().toLocaleString("pt-BR", { timeZone: "America/Belem", hour: "2-digit", hour12: false });

  let resposta = "Desculpe, tive um probleminha tecnico. Tente novamente em instantes 🌸";
  try {
    const systemWithTime = PROMPT + "\n\nHORARIO ATUAL EM BELEM: " + horaAtual + " (use para verificar se esta dentro do horario de atendimento 8h-20h)";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 600, system: systemWithTime, messages: getHist(uid) })
    });
    if (res.ok) { const d = await res.json(); resposta = d.content?.[0]?.text || resposta; }
    else { console.error("Anthropic erro:", res.status); }
  } catch (e) { console.error("IA erro:", e.message); }

  // Processar tag [PAGO]
  if (resposta.includes("[PAGO]")) {
    resposta = resposta.replace(/\[PAGO\]/g, "").trim();
    await saveLead({ ...lead, status: "PAGO", pagamento: new Date().toISOString() });
    await alertaPago(lead);
  }

  // Processar tag [LEAD: ...]
  const m = resposta.match(/\[LEAD:\s*([^\]]+)\]/i);
  if (m) {
    const extras = {};
    m[1].split("|").forEach(p => { const [k, v] = p.split("=").map(s => s.trim()); if (k && v) extras[k.toLowerCase()] = v; });
    const statusAnterior = lead.status;
    await saveLead({ ...lead, ...extras, userId: uid });
    if (extras.status === "PRONTA" && statusAnterior !== "PRONTA" && statusAnterior !== "PAGO") await alertaPronta({ ...lead, ...extras });
    resposta = resposta.replace(m[0], "").trim();
  }

  await addLog(uid, "assistant", resposta, plataforma);
  addMsg(uid, "assistant", resposta);
  return resposta;
}

function agendarRetomada(uid, sendFn) {
  if (timers[uid]) clearTimeout(timers[uid]);
  timers[uid] = setTimeout(async () => {
    const lead = await getLead(uid);
    if (lead && lead.status !== "PAGO" && lead.status !== "COMPROVANTE_ENVIADO") {
      try {
        const msgs = [
          "Oi! Ainda estou por aqui caso queira tirar alguma duvida 🌸",
          "Ei! Se precisar de ajuda com alguma informacao, e so me chamar 💜",
          "Ola! Vi que ficou interessada... posso te ajudar com algo mais? 🥰"
        ];
        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        await sendFn(msg);
      } catch (e) { }
    }
  }, 10 * 60 * 1000);
}

// ============ WEBHOOKS WHATSAPP ============
app.get("/webhook/whatsapp", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) res.send(req.query["hub.challenge"]);
  else res.sendStatus(403);
});
app.post("/webhook/whatsapp", async (req, res) => {
  try {
    const value = req.body.entry?.[0]?.changes?.[0]?.value;
    if (value?.statuses) return res.sendStatus(200);
    const msg = value?.messages?.[0];
    const phoneId = value?.metadata?.phone_number_id;
    if (!msg) return res.sendStatus(200);
    const uid = msg.from;
    if (!checarRate(uid)) return res.sendStatus(200);
    const send = async (text) => {
      await fetch("https://graph.facebook.com/v18.0/" + phoneId + "/messages", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.WHATSAPP_TOKEN }, body: JSON.stringify({ messaging_product: "whatsapp", to: uid, text: { body: text } }) });
    };
    if (msg.type === "image") { await send(await processarImagem(uid, msg.image.id)); return res.sendStatus(200); }
    if (msg.type !== "text") return res.sendStatus(200);
    await send(await chamarIA(uid, msg.text.body, "whatsapp"));
    agendarRetomada(uid, send);
    res.sendStatus(200);
  } catch (e) { console.error("WA erro:", e.message); res.sendStatus(500); }
});

// ============ WEBHOOKS INSTAGRAM (@escoladeamorproprio) ============
app.get("/webhook/instagram", (req, res) => {
  console.log("IG verificacao:", req.query);
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) res.send(req.query["hub.challenge"]);
  else res.sendStatus(403);
});
app.post("/webhook/instagram", async (req, res) => {
  try {
    console.log("IG webhook recebido:", JSON.stringify(req.body));
    const entry = req.body.entry?.[0];
    let uid, texto;
    if (entry?.changes) {
      const change = entry.changes[0];
      const msg = change?.value?.messages?.[0];
      if (!msg || msg.type !== "text") return res.sendStatus(200);
      uid = msg.from;
      texto = msg.text?.body;
    } else if (entry?.messaging) {
      const messaging = entry.messaging[0];
      if (!messaging?.message?.text) return res.sendStatus(200);
      uid = messaging.sender.id;
      texto = messaging.message.text;
    } else {
      return res.sendStatus(200);
    }
    if (!uid || !texto) return res.sendStatus(200);
    if (!checarRate(uid)) return res.sendStatus(200);
    const token = process.env.INSTAGRAM_TOKEN;
    const send = async (text) => {
      const r = await fetch("https://graph.facebook.com/v21.0/" + IG_PAGE_ID + "/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ recipient: { id: uid }, message: { text }, messaging_type: "RESPONSE" })
      });
      const d = await r.json();
      console.log("IG send result:", JSON.stringify(d));
    };
    await send(await chamarIA(uid, texto, "instagram"));
    agendarRetomada(uid, send);
    res.sendStatus(200);
  } catch (e) { console.error("IG erro:", e.message); res.sendStatus(500); }
});

// ============ WEBHOOKS INSTAGRAM2 (@ludmillaraissuli) ============
app.get("/webhook/instagram2", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) res.send(req.query["hub.challenge"]);
  else res.sendStatus(403);
});
app.post("/webhook/instagram2", async (req, res) => {
  try {
    console.log("IG2 webhook recebido:", JSON.stringify(req.body));
    const entry = req.body.entry?.[0];
    let uid, texto;
    if (entry?.changes) {
      const change = entry.changes[0];
      const msg = change?.value?.messages?.[0];
      if (!msg || msg.type !== "text") return res.sendStatus(200);
      uid = msg.from;
      texto = msg.text?.body;
    } else if (entry?.messaging) {
      const messaging = entry.messaging[0];
      if (!messaging?.message?.text) return res.sendStatus(200);
      uid = messaging.sender.id;
      texto = messaging.message.text;
    } else {
      return res.sendStatus(200);
    }
    if (!uid || !texto) return res.sendStatus(200);
    if (!checarRate(uid)) return res.sendStatus(200);
    const token = process.env.INSTAGRAM_TOKEN_2;
    const send = async (text) => {
      await fetch("https://graph.facebook.com/v21.0/" + IG_PAGE_ID + "/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ recipient: { id: uid }, message: { text }, messaging_type: "RESPONSE" })
      });
    };
    await send(await chamarIA(uid, texto, "instagram2"));
    agendarRetomada(uid, send);
    res.sendStatus(200);
  } catch (e) { console.error("IG2 erro:", e.message); res.sendStatus(500); }
});

// ============ ROTAS ADMIN ============
app.get("/leads", async (req, res) => {
  if (req.query.senha !== LEADS_PASSWORD) return res.status(401).json({ erro: "Senha incorreta" });
  const lista = await getAllLeads();
  res.json({ total: lista.length, leads: lista });
});
app.get("/logs", async (req, res) => {
  if (req.query.senha !== LEADS_PASSWORD) return res.status(401).json({ erro: "Senha incorreta" });
  if (req.query.userId) { const msgs = await getLogs(req.query.userId); return res.json({ logs: msgs }); }
  const resumo = await getAllLogsResumo();
  res.json({ totalUsuarios: resumo.length, usuarios: resumo });
});
app.get("/", (req, res) => {
  res.json({ status: "Ana no ar", db: db ? "MongoDB conectado" : "sem banco", versao: "2.0" });
});

// ============ PAINEL ============
app.get("/painel", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (req.query.senha !== PAINEL_SENHA) {
    return res.end(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Painel Ana</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#fdf6f0;display:flex;align-items:center;justify-content:center;min-height:100vh}.box{background:#fff;border-radius:16px;padding:40px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.08);max-width:340px;width:90%}h1{color:#8a3f52;margin-bottom:6px;font-size:20px}p{color:#7a6570;font-size:13px;margin-bottom:20px}input{width:100%;padding:11px 14px;border:1px solid #f0d5dc;border-radius:8px;font-size:14px;outline:none;margin-bottom:10px}button{width:100%;padding:11px;background:#c9748a;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer}</style></head><body><div class="box"><h1>Painel Ana 🌸</h1><p>Escola de Amor-Proprio</p><input type="password" id="s" placeholder="Senha"><button onclick="(function(){var s=document.getElementById('s').value;if(s)window.location.href='/painel?senha='+s;})()">Entrar</button></div></body></html>`);
  }

  const pwd = LEADS_PASSWORD;
  res.end(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Painel Ana</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:sans-serif;background:#fdf6f0;color:#1a1218}
header{background:#1a1218;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
.logo{color:#f0d5dc;font-size:15px}.logo b{color:#c9a87c}
.hd{display:flex;align-items:center;gap:8px;font-size:12px;color:#7a6570}
.dot{width:7px;height:7px;border-radius:50%;background:#5a8a6a;animation:p 2s infinite}
@keyframes p{0%,100%{opacity:1}50%{opacity:.3}}
button{padding:5px 12px;background:#c9748a;color:#fff;border:none;border-radius:6px;font-size:11px;cursor:pointer}
.wrap{display:grid;grid-template-columns:280px 1fr;height:calc(100vh - 49px)}
.side{background:#fff9f5;border-right:1px solid #f0d5dc;display:flex;flex-direction:column}
.sh{padding:14px;border-bottom:1px solid #f0d5dc}
.sh h3{font-size:13px;color:#8a3f52;margin-bottom:8px}
input[type=text]{width:100%;padding:7px 10px;border:1px solid #f0d5dc;border-radius:6px;font-size:12px;outline:none}
.tabs{display:flex;gap:4px;margin-top:7px;flex-wrap:wrap}
.tab{padding:3px 9px;border-radius:12px;font-size:10px;cursor:pointer;border:1px solid #f0d5dc;background:#fff;color:#7a6570}
.tab.on{background:#c9748a;color:#fff;border-color:#c9748a}
.lista{overflow-y:auto;flex:1}
.ci{padding:11px 14px;border-bottom:1px solid rgba(201,116,138,.1);cursor:pointer}
.ci:hover{background:#f0d5dc}.ci.on{background:rgba(201,116,138,.12);border-left:3px solid #c9748a}
.cn{font-weight:600;font-size:12px;margin-bottom:1px}
.cp{font-size:10px;color:#7a6570;margin-bottom:2px}
.cv{font-size:10px;color:#7a6570;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cm{display:flex;justify-content:space-between;margin-top:3px}
.bx{font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;text-transform:uppercase}
.b-CURIOSA{background:#e8f4e8;color:#3a6e4a}.b-AQUECIDA{background:#fff3e0;color:#b07020}
.b-PRONTA{background:#fce4ec;color:#c62828}.b-PAGO{background:#e3f2fd;color:#1565c0}
.b-COMPROVANTE_ENVIADO{background:#ede7f6;color:#4527a0}
.ct{font-size:9px;color:#7a6570}
.chat{display:flex;flex-direction:column}
.ch{padding:12px 18px;background:#fff9f5;border-bottom:1px solid #f0d5dc;display:flex;align-items:center;gap:12px}
.av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#c9748a,#8a3f52);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px;flex-shrink:0}
.ci2{flex:1}.cn2{font-weight:600;font-size:13px}.cp2{font-size:10px;color:#7a6570}
.tgs{display:flex;gap:5px}.tg{font-size:9px;padding:2px 7px;border-radius:8px;font-weight:500}
.ti{background:#f0d5dc;color:#8a3f52}.tc{background:#e8f4e8;color:#3a6e4a}
.msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;background:#fdf6f0}
.mg{display:flex;flex-direction:column;gap:2px}
.mr{display:flex;align-items:flex-end;gap:5px}
.mr.user{justify-content:flex-end}.mr.assistant{justify-content:flex-start}
.mb{max-width:65%;padding:8px 11px;border-radius:12px;font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-word}
.mr.user .mb{background:#c9748a;color:#fff;border-bottom-right-radius:2px}
.mr.assistant .mb{background:#fff;color:#1a1218;border-bottom-left-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.mt{font-size:9px;color:#7a6570;margin:0 3px 1px}.mr.user .mt{text-align:right}
.al{font-size:9px;color:#c9748a;font-weight:700;margin-bottom:1px;margin-left:2px}
.emp{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#7a6570;text-align:center;padding:30px}
.ei{font-size:36px;margin-bottom:10px;opacity:.4}.et{font-size:16px;color:#8a3f52;margin-bottom:5px}.es{font-size:12px}
.sb{padding:9px 18px;background:#fff9f5;border-top:1px solid #f0d5dc;font-size:11px;color:#7a6570;display:flex;gap:14px}
.sb strong{color:#1a1218}
.ld{display:flex;align-items:center;justify-content:center;padding:30px;color:#7a6570;font-size:12px;gap:6px}
.sp{width:13px;height:13px;border:2px solid #f0d5dc;border-top-color:#c9748a;border-radius:50%;animation:r .7s linear infinite}
@keyframes r{to{transform:rotate(360deg)}}
.nc{padding:30px;text-align:center;color:#7a6570;font-size:12px}
</style>
</head>
<body>
<header>
  <div class="logo">Escola de Amor-Proprio &middot; <b>Painel Ana</b></div>
  <div class="hd"><div class="dot"></div><span id="st">...</span><button id="rb">Atualizar</button></div>
</header>
<div class="wrap">
  <div class="side">
    <div class="sh">
      <h3>Conversas</h3>
      <input type="text" id="bx" placeholder="Buscar...">
      <div class="tabs">
        <div class="tab on" data-f="todos">Todos</div>
        <div class="tab" data-f="PRONTA">Prontas</div>
        <div class="tab" data-f="PAGO">Pagas</div>
        <div class="tab" data-f="AQUECIDA">Quentes</div>
      </div>
    </div>
    <div class="lista" id="lista"><div class="ld"><div class="sp"></div> Carregando...</div></div>
  </div>
  <div class="chat">
    <div id="ch" class="ch" style="display:none">
      <div class="av" id="av">A</div>
      <div class="ci2"><div class="cn2" id="nn">-</div><div class="cp2" id="ph">-</div></div>
      <div class="tgs"><span class="tg ti" id="it"></span><span class="tg tc" id="ca"></span><span class="bx" id="st2"></span></div>
    </div>
    <div id="msgs" class="msgs">
      <div class="emp"><div class="ei">🌸</div><div class="et">Selecione uma conversa</div><div class="es">Escolha um contato ao lado</div></div>
    </div>
    <div class="sb">Total:<strong id="s1">-</strong> Prontas:<strong id="s2">-</strong> Pagas:<strong id="s3">-</strong> Hoje:<strong id="s4">-</strong></div>
  </div>
</div>
<script>
var lds=[],lmap={},fil="todos",ati=null,PWD="${pwd}";
function ft(n){if(!n)return"-";var d=n.replace(/[^0-9]/g,"");if(d.length===13)return"("+d.slice(2,4)+") "+d.slice(4,9)+"-"+d.slice(9);if(d.length===12)return"("+d.slice(2,4)+") "+d.slice(4,8)+"-"+d.slice(8);return n;}
function fh(t){if(!t)return"";var d=new Date(t);return d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})+" "+d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});}
function ini(n){return(n&&n.trim())?n.trim()[0].toUpperCase():"?";}
function stats(){var h=new Date().toDateString();document.getElementById("s1").textContent=lds.length;document.getElementById("s2").textContent=lds.filter(function(l){return l.status==="PRONTA";}).length;document.getElementById("s3").textContent=lds.filter(function(l){return l.status==="PAGO"||l.status==="COMPROVANTE_ENVIADO";}).length;document.getElementById("s4").textContent=lds.filter(function(l){return new Date(l.timestamp).toDateString()===h;}).length;}
function rl(){
  var b=document.getElementById("bx").value.toLowerCase();
  var l=lds;
  if(fil!=="todos")l=l.filter(function(x){return x.status===fil;});
  if(b)l=l.filter(function(x){return(x.nome||"").toLowerCase().indexOf(b)>=0||(x.contato||"").indexOf(b)>=0;});
  var el=document.getElementById("lista");
  if(!l.length){el.innerHTML='<div class="nc">Nenhum contato</div>';return;}
  var h="";
  for(var i=0;i<l.length;i++){
    var ld=l[i],li=lmap[ld.userId]||{},st=ld.status||"CURIOSA";
    var pv=li.ultima?"Ultima: "+fh(li.ultima):"Sem msgs";
    h+='<div class="ci'+(ati===ld.userId?" on":"")+'" data-id="'+ld.userId+'">';
    h+='<div class="cn">'+(ld.nome||"Sem nome")+'</div>';
    h+='<div class="cp">'+ft(ld.contato)+'</div>';
    h+='<div class="cv">'+pv+'</div>';
    h+='<div class="cm"><span class="bx b-'+st+'">'+st+'</span><span class="ct">'+fh(ld.timestamp)+'</span></div>';
    h+='</div>';
  }
  el.innerHTML=h;
  el.querySelectorAll(".ci").forEach(function(x){x.addEventListener("click",function(){abrir(this.getAttribute("data-id"));});});
}
function abrir(uid){
  ati=uid;rl();
  var ld=lds.find(function(x){return x.userId===uid;})||{};
  document.getElementById("ch").style.display="flex";
  document.getElementById("av").textContent=ini(ld.nome);
  document.getElementById("nn").textContent=ld.nome||"Sem nome";
  document.getElementById("ph").textContent=ft(ld.contato);
  document.getElementById("it").textContent=ld.interesse||"";
  document.getElementById("ca").textContent=ld.plataforma||"";
  var s=document.getElementById("st2");s.textContent=ld.status||"CURIOSA";s.className="bx b-"+(ld.status||"CURIOSA");
  var ma=document.getElementById("msgs");
  ma.innerHTML='<div class="ld"><div class="sp"></div> Carregando...</div>';
  fetch("/logs?senha="+PWD+"&userId="+uid)
    .then(function(r){return r.json();})
    .then(function(d){
      var lg=d.logs||[];
      if(!lg.length){ma.innerHTML='<div class="emp"><div class="ei">💬</div><div class="et">Sem mensagens</div></div>';return;}
      var h="";
      for(var i=0;i<lg.length;i++){
        var m=lg[i],ia=m.role==="assistant";
        h+='<div class="mg">'+(ia?'<div class="al">Ana</div>':'')+
           '<div class="mr '+m.role+'"><div class="mb">'+m.texto+'</div></div>'+
           '<div class="mt">'+fh(m.timestamp)+'</div></div>';
      }
      ma.innerHTML=h;ma.scrollTop=ma.scrollHeight;
    })
    .catch(function(){ma.innerHTML='<div class="emp"><div class="ei">❌</div><div class="et">Erro</div></div>';});
}
function carregar(){
  document.getElementById("st").textContent="Atualizando...";
  Promise.all([
    fetch("/leads?senha="+PWD).then(function(r){return r.json();}),
    fetch("/logs?senha="+PWD).then(function(r){return r.json();})
  ]).then(function(res){
    lds=res[0].leads||[];lmap={};
    (res[1].usuarios||[]).forEach(function(u){lmap[u.userId]=u;});
    stats();rl();
    document.getElementById("st").textContent=lds.length+" contatos";
    if(ati)setTimeout(function(){abrir(ati);},100);
  }).catch(function(){
    document.getElementById("st").textContent="Erro";
    document.getElementById("lista").innerHTML='<div class="nc">Sem conexao</div>';
  });
}
document.getElementById("bx").addEventListener("input",rl);
document.getElementById("rb").addEventListener("click",carregar);
document.querySelectorAll(".tab").forEach(function(t){
  t.addEventListener("click",function(){
    fil=this.getAttribute("data-f");
    document.querySelectorAll(".tab").forEach(function(x){x.classList.remove("on");});
    this.classList.add("on");rl();
  });
});
carregar();setInterval(carregar,30000);
</script>
</body>
</html>`);
});

// ============ TERMOS ============
app.get("/termos", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const d = new Date().toLocaleDateString("pt-BR");
  const parts = [
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>Termos de Servico - Escola de Amor-Proprio</title>',
    '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;background:#fdf6f0;color:#1a1218;line-height:1.8}.wrap{max-width:680px;margin:0 auto;padding:48px 24px}h1{font-size:26px;color:#8a3f52;margin-bottom:8px}h2{font-size:17px;color:#8a3f52;margin:28px 0 8px}p{font-size:15px;color:#3a2a30;margin-bottom:12px}.sub{font-size:13px;color:#7a6570;margin-bottom:32px}footer{margin-top:48px;font-size:12px;color:#7a6570;border-top:1px solid #f0d5dc;padding-top:16px}</style>',
    '</head><body><div class="wrap">',
    '<h1>Termos de Servico</h1>',
    '<p class="sub">Escola de Amor-Proprio &mdash; Ultima atualizacao: ' + d + '</p>',
    '<h2>1. Aceitacao dos Termos</h2>',
    '<p>Ao utilizar o assistente virtual Ana da Escola de Amor-Proprio, voce concorda com estes Termos de Servico.</p>',
    '<h2>2. Sobre o servico</h2>',
    '<p>O assistente virtual Ana e um chatbot de atendimento disponivel via WhatsApp e Instagram, com o objetivo de fornecer informacoes sobre nossos servicos e facilitar o agendamento.</p>',
    '<h2>3. Uso adequado</h2>',
    '<p>O servico deve ser utilizado apenas para fins legitimos relacionados aos servicos da Escola de Amor-Proprio. E proibido o uso para fins ilicitos ou abusivos.</p>',
    '<h2>4. Limitacao de responsabilidade</h2>',
    '<p>O assistente virtual fornece informacoes de carater geral. Para decisoes de saude fisica ou mental, recomendamos consultar profissionais habilitados.</p>',
    '<h2>5. Contato</h2>',
    '<p>Escola de Amor-Proprio<br>Tv. Dom Romualdo Coelho, 1072 &mdash; Belem, PA<br>WhatsApp: (91) 98134-7134<br>E-mail: escoladeamorproprio@gmail.com</p>',
    '<footer>Em conformidade com o Codigo de Defesa do Consumidor e a legislacao brasileira vigente.</footer>',
    '</div></body></html>'
  ];
  res.end(parts.join(""));
});

// ============ PRIVACIDADE ============
app.get("/privacidade", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Politica de Privacidade - Escola de Amor-Proprio</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Georgia,serif;background:#fdf6f0;color:#1a1218;line-height:1.8}
.wrap{max-width:680px;margin:0 auto;padding:48px 24px}
h1{font-size:26px;color:#8a3f52;margin-bottom:8px}
h2{font-size:17px;color:#8a3f52;margin:28px 0 8px}
p{font-size:15px;color:#3a2a30;margin-bottom:12px}
.sub{font-size:13px;color:#7a6570;margin-bottom:32px}
footer{margin-top:48px;font-size:12px;color:#7a6570;border-top:1px solid #f0d5dc;padding-top:16px}
</style>
</head>
<body>
<div class="wrap">
  <h1>Politica de Privacidade</h1>
  <p class="sub">Escola de Amor-Proprio - Ultima atualizacao: ${new Date().toLocaleDateString("pt-BR")}</p>
  <h2>1. Quem somos</h2>
  <p>A Escola de Amor-Proprio e um Centro Integral de Cuidado com a Mulher, fundado em Belem-PA pela terapeuta Ludmilla Raissuli.</p>
  <h2>2. Quais dados coletamos</h2>
  <p>Coletamos apenas as informacoes fornecidas voluntariamente durante a conversa: nome, numero de telefone ou identificador da plataforma, e o conteudo das mensagens trocadas com o assistente virtual Ana.</p>
  <h2>3. Como usamos os dados</h2>
  <p>Os dados sao usados exclusivamente para melhorar o atendimento, responder duvidas sobre nossos servicos e entrar em contato quando solicitado. Nao vendemos nem compartilhamos seus dados com terceiros.</p>
  <h2>4. Armazenamento e seguranca</h2>
  <p>As informacoes sao armazenadas em servidores seguros e acessadas apenas pela equipe da Escola de Amor-Proprio. Voce pode solicitar a exclusao dos seus dados a qualquer momento.</p>
  <h2>5. Seus direitos</h2>
  <p>Voce tem direito de acessar, corrigir ou solicitar a exclusao de seus dados. Para exercer esses direitos, entre em contato pelo WhatsApp (91) 98134-7134 ou pelo e-mail escoladeamorproprio@gmail.com.</p>
  <h2>6. Contato</h2>
  <p>Escola de Amor-Proprio<br>Tv. Dom Romualdo Coelho, 1072 - Belem, PA<br>WhatsApp: (91) 98134-7134<br>E-mail: escoladeamorproprio@gmail.com<br>Instagram: @escoladeamorproprio</p>
  <footer>Esta politica esta em conformidade com a Lei Geral de Protecao de Dados (LGPD - Lei 13.709/2018).</footer>
</div>
</body>
</html>`);
});

// ============ START ============
const PORT = process.env.PORT || 3000;
conectarMongo().then(() => {
  app.listen(PORT, () => console.log("Ana v2.0 rodando na porta " + PORT));
});
