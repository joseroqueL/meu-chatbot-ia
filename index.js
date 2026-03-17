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
async function addLog(uid, role, texto, plataforma, extras) {
  try {
    const entry = { role, texto, plataforma, timestamp: new Date().toISOString() };
    if (extras) Object.assign(entry, extras);
    await logsCol.updateOne({ userId: uid }, { $push: { msgs: { $each: [entry], $slice: -100 } } }, { upsert: true });
  } catch (e) { }
}
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
function fmtFone(n) {
  if (!n) return "?";
  const d = n.replace(/[^0-9]/g, "");
  if (d.length === 13) return "(" + d.slice(2,4) + ") " + d.slice(4,9) + "-" + d.slice(9);
  if (d.length === 12) return "(" + d.slice(2,4) + ") " + d.slice(4,8) + "-" + d.slice(8);
  return n;
}
function waUrl(n) {
  if (!n) return "";
  const d = n.replace(/[^0-9]/g, "");
  return d.length >= 10 ? "https://wa.me/" + d : "";
}

async function tg(texto) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try { await fetch("https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/sendMessage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: texto, parse_mode: "Markdown", disable_web_page_preview: true }) }); } catch (e) { }
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
  } catch (e) { await tg(caption + "\n_(imagem nao encaminhada)_"); }
}

const agora = () => new Date().toLocaleString("pt-BR", { timeZone: "America/Belem" });

async function alertaNovo(l) {
  const link = waUrl(l.contato);
  await tg(
    "🌸 *NOVO CONTATO NO WHATSAPP*\n" +
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    "👤 *Nome:* " + (l.nome || "_Aguardando..._") + "\n" +
    "📱 *Telefone:* " + fmtFone(l.contato) + "\n" +
    "🕐 *Horario:* " + agora() + "\n" +
    (link ? "💬 [Abrir WhatsApp](" + link + ")\n" : "") +
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    "_Ana esta atendendo automaticamente_"
  );
}

async function alertaAquecida(l) {
  const link = waUrl(l.contato);
  await tg(
    "🔥 *LEAD AQUECIDA!*\n" +
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    "👤 *Nome:* " + (l.nome || "?") + "\n" +
    "📱 *Telefone:* " + fmtFone(l.contato) + "\n" +
    "💜 *Interesse:* " + (l.interesse || "?") + "\n" +
    "📊 *Status:* AQUECIDA\n" +
    "🕐 " + agora() + "\n" +
    (link ? "💬 [Abrir WhatsApp](" + link + ")\n" : "") +
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    "_Demonstrou interesse real!_"
  );
}

async function alertaPronta(l) {
  const link = waUrl(l.contato);
  await tg(
    "🚀 *LEAD PRONTA PRA FECHAR!*\n" +
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    "👤 *Nome:* " + (l.nome || "?") + "\n" +
    "📱 *Telefone:* " + fmtFone(l.contato) + "\n" +
    "💜 *Interesse:* " + (l.interesse || "?") + "\n" +
    "📊 *Status:* PRONTA\n" +
    "🕐 " + agora() + "\n" +
    (link ? "💬 [Abrir WhatsApp](" + link + ")\n" : "") +
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    "_Quer pagar/agendar! Ana enviou PIX._"
  );
}

async function alertaPago(l) {
  const link = waUrl(l.contato);
  await tg(
    "💰 *PAGAMENTO CONFIRMADO!*\n" +
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    "👤 *Nome:* " + (l.nome || "?") + "\n" +
    "📱 *Telefone:* " + fmtFone(l.contato) + "\n" +
    "💜 *Interesse:* " + (l.interesse || "?") + "\n" +
    "📊 *Status:* PAGO ✅\n" +
    "🕐 " + agora() + "\n" +
    (link ? "💬 [Abrir WhatsApp](" + link + ")\n" : "") +
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    "_Vaga confirmada!_"
  );
}

async function alertaMensagem(l, msgTexto, tipo) {
  // Alerta a cada mensagem do usuario para acompanhar em tempo real
  const link = waUrl(l.contato);
  const tipoLabel = tipo === "text" ? "" : " [" + tipo.toUpperCase() + "]";
  await tg(
    "💬 *MSG RECEBIDA" + tipoLabel + "*\n" +
    "👤 " + (l.nome || fmtFone(l.contato)) + "\n" +
    "📱 " + fmtFone(l.contato) + "\n" +
    "📊 " + (l.status || "CURIOSA") + "\n" +
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    (msgTexto || "_[" + tipo + "]_") + "\n" +
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    (link ? "💬 [Abrir WhatsApp](" + link + ")" : "")
  );
}

// ============ MIDIA WHATSAPP ============
async function getMediaUrl(mediaId) {
  try {
    const r = await fetch("https://graph.facebook.com/v18.0/" + mediaId, { headers: { "Authorization": "Bearer " + process.env.WHATSAPP_TOKEN } });
    const d = await r.json();
    return d.url || null;
  } catch (e) { return null; }
}

async function processarImagem(uid, imageId) {
  try {
    const mediaUrl = await getMediaUrl(imageId);
    const lead = await getLead(uid) || {};
    const caption = "📎 *COMPROVANTE RECEBIDO*\n━━━━━━━━━━━━━━━━━━━━━\n👤 " + (lead.nome || "?") + "\n📱 " + fmtFone(lead.contato || uid) + "\n🕐 " + agora();
    if (mediaUrl) await tgFoto(mediaUrl, caption);
    else await tg(caption + "\n_(imagem nao encaminhada)_");
    // Salvar no log com referencia de midia
    await addLog(uid, "user", "[Imagem enviada]", "whatsapp", { tipo: "image", mediaId: imageId });
    await saveLead({ ...lead, userId: uid, status: "COMPROVANTE_ENVIADO", comprovante: new Date().toISOString() });
    await alertaPago(lead);
    return "Recebi seu comprovante! ✅\n\n*Vaga confirmada!* 🌸\n\nTe esperamos no sábado com muito carinho!\nQualquer dúvida, é só falar 💜";
  } catch (e) { return "Recebi sua imagem 🤍\n\nVou confirmar com a equipe e já te aviso!"; }
}

async function processarAudio(uid, audioId) {
  const lead = await getLead(uid) || {};
  await addLog(uid, "user", "[Audio enviado]", "whatsapp", { tipo: "audio", mediaId: audioId });
  await alertaMensagem(lead, "_[Audio recebido]_", "audio");
  return "Recebi seu audio! 🎙️\n\nPor aqui consigo te ajudar melhor por texto, pode mandar sua duvida escrita? 🌸";
}

async function processarVideo(uid, videoId) {
  const lead = await getLead(uid) || {};
  await addLog(uid, "user", "[Video enviado]", "whatsapp", { tipo: "video", mediaId: videoId });
  await alertaMensagem(lead, "_[Video recebido]_", "video");
  return "Recebi seu video! 🎬\n\nSe for um comprovante de pagamento, pode enviar como foto que fica mais facil pra eu confirmar! 🌸";
}

async function processarDocumento(uid, docId, filename) {
  const lead = await getLead(uid) || {};
  await addLog(uid, "user", "[Documento: " + (filename || "arquivo") + "]", "whatsapp", { tipo: "document", mediaId: docId, filename });
  await alertaMensagem(lead, "_[Documento: " + (filename || "arquivo") + "]_", "documento");
  return "Recebi seu documento! 📄\n\nVou encaminhar pra equipe. Qualquer coisa, e so falar! 🌸";
}

async function processarSticker(uid, stickerId) {
  const lead = await getLead(uid) || {};
  await addLog(uid, "user", "[Sticker]", "whatsapp", { tipo: "sticker", mediaId: stickerId });
  return null; // Nao responde sticker, so registra
}

async function processarLocalizacao(uid, lat, lng, name) {
  const lead = await getLead(uid) || {};
  const label = name || (lat + "," + lng);
  await addLog(uid, "user", "[Localizacao: " + label + "]", "whatsapp", { tipo: "location", lat, lng });
  await alertaMensagem(lead, "_[Localizacao compartilhada: " + label + "]_", "localizacao");
  return "Recebi sua localizacao! 📍\n\nNossa escola fica na Tv. Dom Romualdo Coelho, 1072 - Belem/PA 🌸";
}

async function processarContato(uid, contactName) {
  const lead = await getLead(uid) || {};
  await addLog(uid, "user", "[Contato compartilhado: " + (contactName || "?") + "]", "whatsapp", { tipo: "contact", contactName });
  await alertaMensagem(lead, "_[Contato compartilhado: " + (contactName || "?") + "]_", "contato");
  return "Recebi o contato! 👤\n\nObrigada por compartilhar! 🌸";
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
IDENTIDADE - MUITO IMPORTANTE
═══════════════════════════════════════
Voce e a Ana, parte da equipe da Escola de Amor-Proprio. Voce e uma PESSOA REAL.
NUNCA diga que e assistente virtual, IA, chatbot, bot, inteligencia artificial ou qualquer coisa parecida.
Se perguntarem "voce e um robo?", responda algo como "Sou a Ana, da equipe da Escola! Como posso te ajudar? 🌸"
NUNCA use frases como "como assistente", "sou um chatbot", "sou uma inteligencia artificial".

═══════════════════════════════════════
SERVICOS E VALORES (sempre informe completo)
═══════════════════════════════════════

DANCA DO VENTRE EM GRUPO (Sabados) — SERVICO PRINCIPAL:
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

WORKSHOP MENSAL:
• *Valor: R$ 100,00*
_Encontros tematicos mensais sobre autoconhecimento e feminino._

CONSULTORIA JURIDICA:
_Direito de Familia e da Mulher_

CURSO ONLINE - METODO LUDMILLA RAISSULI:
_Formacao completa do metodo._

FORMACAO DO FEMININO:
_Processo terapeutico profundo de reconexao._

═══════════════════════════════════════
REGRAS DE DIRECIONAMENTO — CRITICO
═══════════════════════════════════════

REGRA 1 - DANCA EM GRUPO (sabado):
-> Resolve TUDO aqui. NUNCA manda para WhatsApp.
-> Envia valores, envia PIX, recebe comprovante, confirma vaga.
-> Fluxo: informar valores > perguntar qual opcao > enviar PIX > pedir comprovante > confirmar vaga
-> Se a pessoa quiser, FECHE A VENDA aqui mesmo.

REGRA 2 - TODOS OS OUTROS SERVICOS (aula particular, terapia, juridico, curso online, formacao, workshop):
-> Apresente os valores e informacoes completas normalmente.
-> Quando a pessoa demonstrar interesse em agendar/contratar, diga:
   "Maravilha! Vou registrar seu interesse e nossa equipe vai entrar em contato com voce para agendar! 🌸"
   ou variacao natural similar.
-> NUNCA diga "ligue para", "mande mensagem para", "entre em contato pelo WhatsApp (91)..."
-> NUNCA direcione a pessoa para outro numero ou canal.
-> A EQUIPE entra em contato com ELA, nao o contrario.
-> Pergunte o nome dela (se ainda nao souber) para facilitar o contato da equipe.

REGRA 3 - NUNCA JAMAIS:
-> Nunca diga "entre em contato pelo WhatsApp (91) 98134-7134"
-> Nunca diga "mande mensagem para nosso WhatsApp"
-> Nunca direcione para outro canal/numero/link
-> A unica excecao e se a pessoa PEDIR explicitamente um numero de telefone

═══════════════════════════════════════
PIX - SOMENTE PARA AULA DE DANCA EM GRUPO
═══════════════════════════════════════
Quando a pessoa demonstrar que quer pagar/agendar aula de danca em grupo, envie:

Maravilha! Segue nosso PIX para garantir sua vaga 🌸

*Escola de Amor-Proprio*
*CNPJ: 21.172.163/0001-21*
*Valor: R$ 97,00* _(aula avulsa)_

Apos o pagamento, e so enviar o comprovante aqui que ja confirmo sua vaga! 💜

(Se for mensalidade envie valor R$ 300,00, se for semestralidade envie R$ 250,00)

Para os DEMAIS servicos, NAO envie PIX. Diga que a equipe vai entrar em contato.

═══════════════════════════════════════
SOBRE A LUDMILLA RAISSULI
═══════════════════════════════════════
Pos-graduacao em Psicologia Positiva, Terapia Junguiana, Hipnoterapia, Metodo Louise Hay e Constelacoes Familiares. Quase 20 anos de experiencia cuidando de mulheres. Fundadora da Escola de Amor-Proprio.

═══════════════════════════════════════
CONTATO E ENDERECO (so informe se a pessoa perguntar)
═══════════════════════════════════════
Instagram: @escoladeamorproprio
Endereco: Tv. Dom Romualdo Coelho, 1072 - Belem/PA
(O WhatsApp (91) 98134-7134 so informe se a pessoa PEDIR explicitamente um telefone)

═══════════════════════════════════════
PALAVRAS PROIBIDAS (nunca use)
═══════════════════════════════════════
gostoso, delicia, ardente, sedutora, sensual, irresistivel, excitante, assistente virtual, chatbot, inteligencia artificial, IA, bot

═══════════════════════════════════════
CAPTURA DE LEAD — MUITO IMPORTANTE
═══════════════════════════════════════
Voce PRECISA capturar o nome da pessoa o mais rapido possivel. Se ela nao disse o nome, pergunte de forma natural:
"A proposito, qual seu nome? Assim fica mais facil pra gente 🌸"

Sempre que tiver nome OU interesse identificado, inclua NO FINAL da resposta (o sistema remove automaticamente):

[LEAD: nome=NOME | contato=CONTATO | interesse=INTERESSE | status=STATUS]

Regras da tag:
- nome: nome real da pessoa (nao invente, so inclua se ela disser)
- contato: o identificador dela (numero ou id, use o que tiver)
- interesse: o servico que ela quer (ex: "danca em grupo", "terapia", "aula particular", "workshop")
- status: CURIOSA, AQUECIDA ou PRONTA

Status:
- CURIOSA = acabou de chegar, fez pergunta generica
- AQUECIDA = demonstrou interesse real, perguntou valores, detalhes
- PRONTA = quer agendar/pagar, pediu PIX, confirmou interesse firme, disse "quero"

ATUALIZE a tag sempre que o status mudar (ex: de CURIOSA para AQUECIDA quando pedir valores).
Inclua a tag em TODA resposta onde houver informacao nova sobre a lead.

PAGAMENTO: Quando a pessoa confirmar que pagou ou enviar comprovante, inclua [PAGO] no final.

═══════════════════════════════════════
COMPORTAMENTO ESPECIAL
═══════════════════════════════════════
- [PRIMEIRA_VEZ]: Se a mensagem comecar com isso, apresente-se brevemente:
  "Oi! Que bom te ver por aqui! 🌸
   Aqui e a Ana, da Escola de Amor-Proprio!
   Somos um espaco dedicado ao cuidado e empoderamento feminino aqui em Belem.
   Como posso te ajudar?"
  Se a pessoa ja mandou uma pergunta junto (ex: "[PRIMEIRA_VEZ] quero saber sobre danca"), responda a pergunta tambem.

- Se a pessoa so mandar "oi", "ola", "bom dia" etc:
  Cumprimente com carinho e pergunte como pode ajudar:
  "Oi, tudo bem? 🌸 Aqui e a Ana, da Escola de Amor-Proprio!
   Posso te ajudar com informacoes sobre nossas aulas de danca, terapia, workshops e muito mais!
   O que te trouxe ate aqui?"

- DUVIDAS/OBJECOES sobre preco:
  Seja acolhedora, destaque o valor da experiencia, mencione a aula avulsa de R$ 97 como opcao acessivel para experimentar.

- PERGUNTAS SOBRE LOCAL/HORARIO:
  Endereco: Tv. Dom Romualdo Coelho, 1072 - Belem/PA
  Aulas de danca em grupo: sabados (confirmar horario exato com a equipe)

- PESSOA QUER OUTRO SERVICO (nao danca em grupo):
  Informe tudo sobre o servico, e quando ela quiser agendar:
  "Perfeito! Vou anotar seu interesse e nossa equipe vai entrar em contato pra agendar com voce, tudo bem? 🌸
   Qual seu nome completo pra eu registrar?"

═══════════════════════════════════════
ESTRATEGIA DE VENDA
═══════════════════════════════════════
1. ACOLHER - Receba com entusiasmo genuino
2. INFORMAR - Passe TODOS os valores e opcoes do servico
3. PERGUNTAR NOME - Se ainda nao sabe, pergunte o nome
4. CONDUZIR - Sempre sugira o proximo passo ("Quer agendar?", "Posso enviar o PIX?")
5. FECHAR - Danca em grupo: envie PIX aqui / Outros servicos: diga que a equipe entra em contato
6. CONFIRMAR - Danca: peca comprovante e confirme vaga / Outros: confirme que a equipe vai ligar

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

  let resposta = "Desculpe, tive um probleminha tecnico. Tente novamente em instantes 🌸";
  try {
    const systemWithTime = PROMPT;

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

    // Proteger contra downgrade de status
    const statusOrdem = { "CURIOSA": 1, "AQUECIDA": 2, "PRONTA": 3, "PAGO": 4, "COMPROVANTE_ENVIADO": 5 };
    const nivelAtual = statusOrdem[statusAnterior] || 0;
    const nivelNovo = statusOrdem[extras.status] || 0;
    if (nivelNovo < nivelAtual) {
      delete extras.status; // Nao permite downgrade
    }

    // Limpar nome se veio com placeholder
    if (extras.nome) {
      const nomeLimpo = extras.nome.replace(/[^a-zA-ZÀ-ÿ\s]/g, "").trim();
      if (nomeLimpo.length < 2 || nomeLimpo.toLowerCase() === "x" || nomeLimpo.toLowerCase() === "nome") {
        delete extras.nome;
      } else {
        extras.nome = nomeLimpo;
      }
    }

    await saveLead({ ...lead, ...extras, userId: uid });
    if (extras.status === "PRONTA" && statusAnterior !== "PRONTA" && statusAnterior !== "PAGO") await alertaPronta({ ...lead, ...extras });
    if (extras.status === "AQUECIDA" && statusAnterior === "CURIOSA") await alertaAquecida({ ...lead, ...extras });
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

    let resposta = null;

    switch (msg.type) {
      case "text":
        // Alerta no Telegram com a mensagem
        const leadAtual = await getLead(uid);
        if (leadAtual) await alertaMensagem(leadAtual, msg.text.body, "text");
        resposta = await chamarIA(uid, msg.text.body, "whatsapp");
        break;

      case "image":
        resposta = await processarImagem(uid, msg.image.id);
        break;

      case "audio":
        resposta = await processarAudio(uid, msg.audio.id);
        break;

      case "video":
        resposta = await processarVideo(uid, msg.video.id);
        break;

      case "document":
        resposta = await processarDocumento(uid, msg.document.id, msg.document.filename);
        break;

      case "sticker":
        resposta = await processarSticker(uid, msg.sticker.id);
        break;

      case "location":
        resposta = await processarLocalizacao(uid, msg.location.latitude, msg.location.longitude, msg.location.name);
        break;

      case "contacts":
        const cName = msg.contacts?.[0]?.name?.formatted_name || "?";
        resposta = await processarContato(uid, cName);
        break;

      case "reaction":
        // So registra, nao responde
        await addLog(uid, "user", "[Reacao: " + (msg.reaction?.emoji || "?") + "]", "whatsapp", { tipo: "reaction", emoji: msg.reaction?.emoji });
        break;

      default:
        // Tipo desconhecido - registra e ignora
        await addLog(uid, "user", "[Mensagem tipo: " + msg.type + "]", "whatsapp", { tipo: msg.type });
        break;
    }

    if (resposta) {
      await send(resposta);
      // Registrar resposta da Ana no log (se nao for texto - texto ja registra no chamarIA)
      if (msg.type !== "text") {
        await addLog(uid, "assistant", resposta, "whatsapp");
      }
      agendarRetomada(uid, send);
    }

    res.sendStatus(200);
  } catch (e) { console.error("WA erro:", e.message); res.sendStatus(500); }
});

// ============ WEBHOOKS INSTAGRAM — STANDBY (desativado, so verificacao) ============
app.get("/webhook/instagram", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) res.send(req.query["hub.challenge"]);
  else res.sendStatus(403);
});
app.post("/webhook/instagram", (req, res) => {
  // STANDBY — Instagram desativado por enquanto
  res.sendStatus(200);
});

app.get("/webhook/instagram2", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) res.send(req.query["hub.challenge"]);
  else res.sendStatus(403);
});
app.post("/webhook/instagram2", (req, res) => {
  // STANDBY — Instagram2 desativado por enquanto
  res.sendStatus(200);
});

// ============ ROTAS ADMIN ============
app.get("/leads", async (req, res) => {
  if (req.query.senha !== LEADS_PASSWORD) return res.status(401).json({ erro: "Senha incorreta" });
  const lista = await getAllLeads();
  res.json({ total: lista.length, leads: lista });
});
app.delete("/leads", async (req, res) => {
  if (req.query.senha !== LEADS_PASSWORD) return res.status(401).json({ erro: "Senha incorreta" });
  const uid = req.query.userId;
  if (!uid) return res.status(400).json({ erro: "userId obrigatorio" });
  try {
    await leadsCol.deleteOne({ userId: uid });
    await logsCol.deleteOne({ userId: uid });
    // Limpar memoria
    delete conversas[uid];
    delete timers[uid];
    delete rateLimits[uid];
    res.json({ ok: true, msg: "Lead e logs apagados" });
  } catch (e) { res.status(500).json({ erro: e.message }); }
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
    return res.end(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Painel Ana</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#fdf6f0;display:flex;align-items:center;justify-content:center;min-height:100vh}.box{background:#fff;border-radius:16px;padding:40px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.08);max-width:340px;width:90%}h1{color:#8a3f52;margin-bottom:6px;font-size:20px}p{color:#7a6570;font-size:13px;margin-bottom:20px}input{width:100%;padding:11px 14px;border:1px solid #f0d5dc;border-radius:8px;font-size:14px;outline:none;margin-bottom:10px}button{width:100%;padding:11px;background:#c9748a;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer}input:focus{border-color:#c9748a}</style></head><body><div class="box"><h1>Painel Ana 🌸</h1><p>Escola de Amor-Proprio</p><input type="password" id="s" placeholder="Senha" onkeydown="if(event.key==='Enter')document.getElementById('btn').click()"><button id="btn" onclick="(function(){var s=document.getElementById('s').value;if(s)window.location.href='/painel?senha='+s;})()">Entrar</button></div></body></html>`);
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
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fdf6f0;color:#1a1218}
header{background:#1a1218;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
.logo{color:#f0d5dc;font-size:15px}.logo b{color:#c9a87c}
.hd{display:flex;align-items:center;gap:8px;font-size:12px;color:#7a6570}
.dot{width:7px;height:7px;border-radius:50%;background:#5a8a6a;animation:p 2s infinite}
@keyframes p{0%,100%{opacity:1}50%{opacity:.3}}
button{padding:5px 12px;background:#c9748a;color:#fff;border:none;border-radius:6px;font-size:11px;cursor:pointer;transition:background .2s}
button:hover{background:#b5607a}
.wrap{display:grid;grid-template-columns:320px 1fr;height:calc(100vh - 49px)}
@media(max-width:768px){.wrap{grid-template-columns:1fr;height:auto}.chat{min-height:60vh}}
.side{background:#fff9f5;border-right:1px solid #f0d5dc;display:flex;flex-direction:column}
.sh{padding:14px;border-bottom:1px solid #f0d5dc}
.sh h3{font-size:13px;color:#8a3f52;margin-bottom:8px}
input[type=text]{width:100%;padding:8px 10px;border:1px solid #f0d5dc;border-radius:6px;font-size:12px;outline:none;transition:border .2s}
input[type=text]:focus{border-color:#c9748a}
.tabs{display:flex;gap:4px;margin-top:7px;flex-wrap:wrap}
.tab{padding:4px 10px;border-radius:12px;font-size:10px;cursor:pointer;border:1px solid #f0d5dc;background:#fff;color:#7a6570;transition:all .2s;white-space:nowrap}
.tab:hover{background:#f0d5dc}
.tab.on{background:#c9748a;color:#fff;border-color:#c9748a}
.tab .cnt{font-weight:700;margin-left:2px}
.export-row{display:flex;gap:6px;margin-top:8px}
.export-btn{padding:4px 10px;border-radius:6px;font-size:10px;cursor:pointer;border:1px solid #f0d5dc;background:#fff;color:#7a6570;transition:all .2s}
.export-btn:hover{background:#c9748a;color:#fff}
.sort-select{width:100%;padding:5px 8px;border:1px solid #f0d5dc;border-radius:6px;font-size:10px;color:#7a6570;background:#fff;outline:none;cursor:pointer}
.sort-select:focus{border-color:#c9748a}
.del-btn{padding:4px 10px;border-radius:6px;font-size:10px;cursor:pointer;border:1px solid #e57373;background:#fff;color:#e57373;transition:all .2s;margin-left:auto}
.del-btn:hover{background:#e57373;color:#fff}
.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:100}
.modal-box{background:#fff;border-radius:14px;padding:28px;max-width:360px;width:90%;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.15)}
.modal-box h3{color:#8a3f52;font-size:15px;margin-bottom:8px}
.modal-box p{color:#7a6570;font-size:12px;margin-bottom:18px}
.modal-btns{display:flex;gap:10px;justify-content:center}
.modal-cancel{padding:8px 20px;border-radius:8px;border:1px solid #f0d5dc;background:#fff;color:#7a6570;font-size:12px;cursor:pointer}
.modal-confirm{padding:8px 20px;border-radius:8px;border:none;background:#e57373;color:#fff;font-size:12px;cursor:pointer}
.modal-confirm:hover{background:#c62828}
.lista{overflow-y:auto;flex:1}
.ci{padding:12px 14px;border-bottom:1px solid rgba(201,116,138,.08);cursor:pointer;transition:background .15s}
.ci:hover{background:rgba(240,213,220,.4)}.ci.on{background:rgba(201,116,138,.12);border-left:3px solid #c9748a}
.ci-top{display:flex;align-items:center;gap:8px;margin-bottom:3px}
.ci-av{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:11px;flex-shrink:0}
.ci-av.wa{background:linear-gradient(135deg,#25d366,#128c7e)}.ci-av.ig{background:linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)}.ci-av.ig2{background:linear-gradient(135deg,#833ab4,#c13584,#e1306c)}
.cn{font-weight:600;font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cp{font-size:10px;color:#7a6570;margin-bottom:2px}
.cv{font-size:10px;color:#7a6570;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cm{display:flex;align-items:center;justify-content:space-between;margin-top:3px}
.bx{font-size:9px;font-weight:700;padding:2px 7px;border-radius:8px;text-transform:uppercase;letter-spacing:.3px}
.b-CURIOSA{background:#e8f4e8;color:#3a6e4a}.b-AQUECIDA{background:#fff3e0;color:#b07020}
.b-PRONTA{background:#fce4ec;color:#c62828}.b-PAGO{background:#e3f2fd;color:#1565c0}
.b-COMPROVANTE_ENVIADO{background:#ede7f6;color:#4527a0}
.ct{font-size:9px;color:#7a6570}
.ci-int{font-size:9px;color:#8a3f52;margin-top:2px;font-style:italic}
.chat{display:flex;flex-direction:column}
.ch{padding:12px 18px;background:#fff9f5;border-bottom:1px solid #f0d5dc;display:flex;align-items:center;gap:12px}
.av{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;flex-shrink:0}
.av.wa{background:linear-gradient(135deg,#25d366,#128c7e)}.av.ig{background:linear-gradient(135deg,#f09433,#e6683c,#dc2743)}.av.ig2{background:linear-gradient(135deg,#833ab4,#c13584)}
.ci2{flex:1;min-width:0}.cn2{font-weight:600;font-size:14px}.cp2{font-size:11px;color:#7a6570}
.ch-details{display:flex;flex-direction:column;gap:3px;align-items:flex-end}
.tgs{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.tg{font-size:9px;padding:2px 7px;border-radius:8px;font-weight:500}
.ti{background:#f0d5dc;color:#8a3f52}.tc{background:#e8f4e8;color:#3a6e4a}
.ch-link{font-size:10px;color:#c9748a;text-decoration:none;cursor:pointer}
.ch-link:hover{text-decoration:underline}
.msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;background:#fdf6f0}
.mg{display:flex;flex-direction:column;gap:2px}
.mr{display:flex;align-items:flex-end;gap:5px}
.mr.user{justify-content:flex-end}.mr.assistant{justify-content:flex-start}
.mb{max-width:65%;padding:9px 12px;border-radius:14px;font-size:12.5px;line-height:1.55;white-space:pre-wrap;word-break:break-word}
.mr.user .mb{background:#c9748a;color:#fff;border-bottom-right-radius:3px}
.mr.assistant .mb{background:#fff;color:#1a1218;border-bottom-left-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.media-tag{font-size:10px;font-weight:600;padding:3px 8px;border-radius:6px;background:rgba(201,116,138,.12);color:#8a3f52;margin-bottom:4px;display:inline-block}
.mt{font-size:9px;color:#7a6570;margin:0 3px 1px}.mr.user .mt{text-align:right}
.al{font-size:9px;color:#c9748a;font-weight:700;margin-bottom:1px;margin-left:2px}
.emp{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#7a6570;text-align:center;padding:30px}
.ei{font-size:36px;margin-bottom:10px;opacity:.4}.et{font-size:16px;color:#8a3f52;margin-bottom:5px}.es{font-size:12px}
.sb{padding:10px 18px;background:#fff9f5;border-top:1px solid #f0d5dc;font-size:11px;color:#7a6570;display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.sb strong{color:#1a1218}
.sb-sep{color:#f0d5dc}
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
      <input type="text" id="bx" placeholder="Buscar nome, telefone, interesse...">
      <div class="tabs" id="tabs">
        <div class="tab on" data-f="todos">Todos <span class="cnt" id="cnt-todos"></span></div>
        <div class="tab" data-f="PRONTA">Prontas <span class="cnt" id="cnt-PRONTA"></span></div>
        <div class="tab" data-f="PAGO">Pagas <span class="cnt" id="cnt-PAGO"></span></div>
        <div class="tab" data-f="AQUECIDA">Quentes <span class="cnt" id="cnt-AQUECIDA"></span></div>
        <div class="tab" data-f="COMPROVANTE_ENVIADO">Comprovante <span class="cnt" id="cnt-COMPROVANTE_ENVIADO"></span></div>
        <div class="tab" data-f="CURIOSA">Curiosas <span class="cnt" id="cnt-CURIOSA"></span></div>
      </div>
      <div class="export-row">
        <select id="sortBy" class="sort-select">
          <option value="recente">Mais recentes</option>
          <option value="antigo">Mais antigos</option>
          <option value="ultima_msg">Ultima mensagem</option>
          <option value="nome">Nome A-Z</option>
        </select>
      </div>
      <div class="export-row">
        <div class="export-btn" onclick="exportCSV()">Exportar CSV</div>
        <div class="export-btn" onclick="exportWA()">Copiar WhatsApps</div>
      </div>
    </div>
    <div class="lista" id="lista"><div class="ld"><div class="sp"></div> Carregando...</div></div>
  </div>
  <div class="chat">
    <div id="ch" class="ch" style="display:none">
      <div class="av" id="av">A</div>
      <div class="ci2"><div class="cn2" id="nn">-</div><div class="cp2" id="ph">-</div></div>
      <div class="ch-details">
        <div class="tgs"><span class="tg ti" id="it"></span><span class="tg tc" id="ca"></span><span class="bx" id="st2"></span></div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="ch-link" id="wa-link" style="display:none" target="_blank">Abrir WhatsApp</span>
          <div class="del-btn" id="del-btn" onclick="confirmarApagar()">Apagar</div>
        </div>
      </div>
    </div>
    <div id="msgs" class="msgs">
      <div class="emp"><div class="ei">🌸</div><div class="et">Selecione uma conversa</div><div class="es">Escolha um contato ao lado para ver as mensagens</div></div>
    </div>
    <div class="sb">
      Total: <strong id="s1">-</strong> <span class="sb-sep">|</span>
      Prontas: <strong id="s2">-</strong> <span class="sb-sep">|</span>
      Pagas: <strong id="s3">-</strong> <span class="sb-sep">|</span>
      Hoje: <strong id="s4">-</strong>
    </div>
  </div>
</div>
<script>
var lds=[],lmap={},fil="todos",ati=null,PWD="${pwd}",sortMode="recente";

// ---- Formatar telefone BR ----
function ft(contato) {
  if (!contato) return "-";
  var d = contato.replace(/[^0-9]/g, "");
  if (d.length === 13) return "(" + d.slice(2,4) + ") " + d.slice(4,9) + "-" + d.slice(9);
  if (d.length === 12) return "(" + d.slice(2,4) + ") " + d.slice(4,8) + "-" + d.slice(8);
  if (d.length === 11) return "(" + d.slice(0,2) + ") " + d.slice(2,7) + "-" + d.slice(7);
  if (d.length === 10) return "(" + d.slice(0,2) + ") " + d.slice(2,6) + "-" + d.slice(6);
  return contato;
}

// ---- Nome de exibicao ----
function displayName(ld) {
  if (ld.nome && ld.nome.trim() && ld.nome.trim().toLowerCase() !== "sem nome") return ld.nome.trim();
  if (ld.plataforma === "whatsapp" || !ld.plataforma) return ft(ld.contato);
  return "Contato " + (ld.userId || "").slice(-6);
}

function fh(t) {
  if (!t) return "";
  var d = new Date(t);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", {day:"2-digit",month:"2-digit"}) + " " + d.toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"});
}

function ini(n) { return (n && n.trim()) ? n.trim()[0].toUpperCase() : "?"; }

function waLink(contato) {
  if (!contato) return null;
  var d = contato.replace(/[^0-9]/g, "");
  if (d.length >= 10) return "https://wa.me/" + d;
  return null;
}

// ---- Stats ----
function stats() {
  var h = new Date().toDateString();
  var counts = {todos:0, CURIOSA:0, AQUECIDA:0, PRONTA:0, PAGO:0, COMPROVANTE_ENVIADO:0};
  for (var i=0; i<lds.length; i++) {
    var s = lds[i].status || "CURIOSA";
    counts.todos++;
    if (counts[s] !== undefined) counts[s]++;
  }
  var totalPagas = counts.PAGO + counts.COMPROVANTE_ENVIADO;
  document.getElementById("s1").textContent = counts.todos;
  document.getElementById("s2").textContent = counts.PRONTA;
  document.getElementById("s3").textContent = totalPagas;
  document.getElementById("s4").textContent = lds.filter(function(l) { return new Date(l.timestamp).toDateString() === h; }).length;
  var el;
  el = document.getElementById("cnt-todos"); if(el) el.textContent = counts.todos || "";
  el = document.getElementById("cnt-PRONTA"); if(el) el.textContent = counts.PRONTA || "";
  el = document.getElementById("cnt-PAGO"); if(el) el.textContent = totalPagas || "";
  el = document.getElementById("cnt-AQUECIDA"); if(el) el.textContent = counts.AQUECIDA || "";
  el = document.getElementById("cnt-COMPROVANTE_ENVIADO"); if(el) el.textContent = counts.COMPROVANTE_ENVIADO || "";
  el = document.getElementById("cnt-CURIOSA"); if(el) el.textContent = counts.CURIOSA || "";
}

// ---- Ordenar lista ----
function sortList(list) {
  var s = sortMode;
  list.sort(function(a, b) {
    if (s === "recente") return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
    if (s === "antigo") return new Date(a.timestamp || 0) - new Date(b.timestamp || 0);
    if (s === "ultima_msg") {
      var la = lmap[a.userId], lb = lmap[b.userId];
      var ta = la && la.ultima ? new Date(la.ultima) : new Date(0);
      var tb = lb && lb.ultima ? new Date(lb.ultima) : new Date(0);
      return tb - ta;
    }
    if (s === "nome") {
      var na = displayName(a).toLowerCase(), nb = displayName(b).toLowerCase();
      return na < nb ? -1 : na > nb ? 1 : 0;
    }
    return 0;
  });
  return list;
}

// ---- Renderizar lista ----
function rl() {
  var b = document.getElementById("bx").value.toLowerCase();
  var l = lds.slice();
  if (fil === "PAGO") {
    l = l.filter(function(x) { return x.status === "PAGO" || x.status === "COMPROVANTE_ENVIADO"; });
  } else if (fil !== "todos") {
    l = l.filter(function(x) { return x.status === fil; });
  }
  if (b) {
    l = l.filter(function(x) {
      return (x.nome || "").toLowerCase().indexOf(b) >= 0 ||
             (x.contato || "").indexOf(b) >= 0 ||
             (x.interesse || "").toLowerCase().indexOf(b) >= 0 ||
             (x.userId || "").indexOf(b) >= 0 ||
             ft(x.contato).indexOf(b) >= 0;
    });
  }
  l = sortList(l);
  var el = document.getElementById("lista");
  if (!l.length) { el.innerHTML = '<div class="nc">Nenhum contato encontrado</div>'; return; }
  var h = "";
  for (var i = 0; i < l.length; i++) {
    var ld = l[i], li = lmap[ld.userId] || {}, st = ld.status || "CURIOSA";
    var pv = li.ultima ? fh(li.ultima) : "";
    var nome = displayName(ld);
    h += '<div class="ci' + (ati === ld.userId ? " on" : "") + '" data-id="' + ld.userId + '">';
    h += '<div class="ci-top"><div class="ci-av wa">' + ini(nome) + '</div>';
    h += '<div class="cn">' + nome + '</div></div>';
    h += '<div class="cp">' + ft(ld.contato) + '</div>';
    if (ld.interesse) h += '<div class="ci-int">' + ld.interesse + '</div>';
    h += '<div class="cm"><span class="bx b-' + st + '">' + st.replace(/_/g," ") + '</span>';
    h += '<span class="ct">' + (pv ? pv : fh(ld.timestamp)) + '</span></div>';
    h += '</div>';
  }
  el.innerHTML = h;
  el.querySelectorAll(".ci").forEach(function(x) { x.addEventListener("click", function() { abrir(this.getAttribute("data-id")); }); });
}

// ---- Abrir conversa ----
function abrir(uid) {
  ati = uid; rl();
  var ld = lds.find(function(x) { return x.userId === uid; }) || {};
  var nome = displayName(ld);
  document.getElementById("ch").style.display = "flex";
  var avEl = document.getElementById("av");
  avEl.textContent = ini(nome);
  avEl.className = "av wa";
  document.getElementById("nn").textContent = nome;
  document.getElementById("ph").textContent = ft(ld.contato);
  document.getElementById("it").textContent = ld.interesse || "";
  document.getElementById("it").style.display = ld.interesse ? "" : "none";
  document.getElementById("ca").textContent = "WhatsApp";
  var s = document.getElementById("st2"); s.textContent = (ld.status || "CURIOSA").replace(/_/g," "); s.className = "bx b-" + (ld.status || "CURIOSA");
  var wl = document.getElementById("wa-link");
  var link = waLink(ld.contato);
  if (link) { wl.style.display = ""; wl.onclick = function() { window.open(link, "_blank"); }; }
  else { wl.style.display = "none"; }

  var ma = document.getElementById("msgs");
  ma.innerHTML = '<div class="ld"><div class="sp"></div> Carregando...</div>';
  fetch("/logs?senha=" + PWD + "&userId=" + uid)
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var lg = d.logs || [];
      if (!lg.length) { ma.innerHTML = '<div class="emp"><div class="ei">💬</div><div class="et">Sem mensagens</div><div class="es">Este contato ainda nao enviou mensagens</div></div>'; return; }
      var h = "";
      for (var i = 0; i < lg.length; i++) {
        var m = lg[i], ia = m.role === "assistant";
        var txt = (m.texto || "").replace(/</g,"&lt;").replace(/>/g,"&gt;");
        // Renderizar tipo de midia com icone
        var mediaTag = "";
        if (m.tipo === "image") mediaTag = '<div class="media-tag">📷 Imagem</div>';
        else if (m.tipo === "audio") mediaTag = '<div class="media-tag">🎙️ Audio</div>';
        else if (m.tipo === "video") mediaTag = '<div class="media-tag">🎬 Video</div>';
        else if (m.tipo === "document") mediaTag = '<div class="media-tag">📄 ' + (m.filename || "Documento") + '</div>';
        else if (m.tipo === "sticker") mediaTag = '<div class="media-tag">🩷 Sticker</div>';
        else if (m.tipo === "location") mediaTag = '<div class="media-tag">📍 Localizacao</div>';
        else if (m.tipo === "contact") mediaTag = '<div class="media-tag">👤 Contato</div>';
        else if (m.tipo === "reaction") mediaTag = '<div class="media-tag">' + (m.emoji || "❤️") + ' Reacao</div>';
        h += '<div class="mg">' + (ia ? '<div class="al">Ana</div>' : '') +
             '<div class="mr ' + m.role + '"><div class="mb">' + mediaTag + txt + '</div></div>' +
             '<div class="mt">' + fh(m.timestamp) + '</div></div>';
      }
      ma.innerHTML = h; ma.scrollTop = ma.scrollHeight;
    })
    .catch(function() { ma.innerHTML = '<div class="emp"><div class="ei">❌</div><div class="et">Erro ao carregar</div></div>'; });
}

// ---- Apagar lead ----
function confirmarApagar() {
  if (!ati) return;
  var ld = lds.find(function(x) { return x.userId === ati; }) || {};
  var nome = displayName(ld);
  var div = document.createElement("div");
  div.className = "modal-overlay";
  div.id = "modal-del";
  div.innerHTML = '<div class="modal-box"><h3>Apagar contato?</h3><p>Tem certeza que quer apagar <b>' + nome + '</b> e todo o historico de mensagens? Essa acao nao pode ser desfeita.</p><div class="modal-btns"><button class="modal-cancel" onclick="fecharModal()">Cancelar</button><button class="modal-confirm" onclick="apagarLead()">Apagar</button></div></div>';
  document.body.appendChild(div);
}
function fecharModal() {
  var m = document.getElementById("modal-del");
  if (m) m.remove();
}
function apagarLead() {
  if (!ati) return;
  fecharModal();
  fetch("/leads?senha=" + PWD + "&userId=" + ati, { method: "DELETE" })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.ok) {
        lds = lds.filter(function(x) { return x.userId !== ati; });
        delete lmap[ati];
        ati = null;
        document.getElementById("ch").style.display = "none";
        document.getElementById("msgs").innerHTML = '<div class="emp"><div class="ei">🌸</div><div class="et">Contato apagado</div><div class="es">Selecione outro contato ao lado</div></div>';
        stats(); rl();
      } else {
        alert("Erro ao apagar: " + (d.erro || "desconhecido"));
      }
    })
    .catch(function() { alert("Erro de conexao ao apagar"); });
}

// ---- Export CSV ----
function exportCSV() {
  var rows = [["Nome","Telefone","Interesse","Status","Data"]];
  var list = fil === "todos" ? lds : lds.filter(function(x) {
    if (fil === "PAGO") return x.status === "PAGO" || x.status === "COMPROVANTE_ENVIADO";
    return x.status === fil;
  });
  for (var i = 0; i < list.length; i++) {
    var l = list[i];
    rows.push([displayName(l), ft(l.contato), l.interesse || "", l.status || "CURIOSA", l.timestamp || ""]);
  }
  var csv = rows.map(function(r) { return r.map(function(c) { return '"' + (c+"").replace(/"/g,'""') + '"'; }).join(","); }).join("\\n");
  var blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "leads_ana_" + new Date().toISOString().slice(0,10) + ".csv"; a.click();
}

// ---- Copiar numeros WhatsApp ----
function exportWA() {
  var nums = lds.filter(function(l) { return l.contato; }).map(function(l) { return l.contato; });
  if (!nums.length) { alert("Nenhum contato encontrado"); return; }
  var txt = nums.join("\\n");
  navigator.clipboard.writeText(txt).then(function() { alert(nums.length + " numeros copiados!"); }).catch(function() {
    prompt("Copie os numeros:", txt);
  });
}

// ---- Carregar dados ----
function carregar() {
  document.getElementById("st").textContent = "Atualizando...";
  Promise.all([
    fetch("/leads?senha=" + PWD).then(function(r) { return r.json(); }),
    fetch("/logs?senha=" + PWD).then(function(r) { return r.json(); })
  ]).then(function(res) {
    lds = res[0].leads || []; lmap = {};
    (res[1].usuarios || []).forEach(function(u) { lmap[u.userId] = u; });
    stats(); rl();
    document.getElementById("st").textContent = lds.length + " contatos";
    if (ati) setTimeout(function() { abrir(ati); }, 100);
  }).catch(function() {
    document.getElementById("st").textContent = "Erro de conexao";
    document.getElementById("lista").innerHTML = '<div class="nc">Sem conexao com o servidor</div>';
  });
}

document.getElementById("bx").addEventListener("input", rl);
document.getElementById("rb").addEventListener("click", carregar);
document.getElementById("sortBy").addEventListener("change", function() { sortMode = this.value; rl(); });
document.querySelectorAll(".tab").forEach(function(t) {
  t.addEventListener("click", function() {
    fil = this.getAttribute("data-f");
    document.querySelectorAll(".tab").forEach(function(x) { x.classList.remove("on"); });
    this.classList.add("on"); rl();
  });
});
carregar(); setInterval(carregar, 30000);
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
