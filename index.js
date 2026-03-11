const express = require("express");
const fs = require("fs");
const { MongoClient } = require("mongodb");
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const IA_NOME = "Ana";
const IA_TOM = "acolhedor, gentil, feminino e empoderador";

const IA_INSTRUCOES = `
# IDENTIDADE E PAPEL
Você é Ana, assistente virtual da Escola de Amor-Próprio, um Centro Integral de Cuidado com a Mulher fundado em 2010 em Belém, Pará, pela terapeuta e professora Ludmilla Raissuli. Seu papel é acolher cada mulher com calor, clareza e cuidado — como uma amiga que cuida, nunca como uma vendedora.

# SOBRE LUDMILLA RAISSULI
Ludmilla NÃO é psicóloga registrada no CRP. Tem pós-graduação em Psicologia Positiva e Experiências Pós-Traumáticas, Terapia Junguiana, Hipnoterapia, Método Heal Your Life de Louise Hay (Lisboa) e Constelações Familiares. Quase 20 anos de prática clínica com mulheres. Nunca afirme que ela é psicóloga — valorize sua formação com orgulho.

# SERVIÇOS E PREÇOS
DANÇA EM GRUPO — Sábados:
  - Turma Iniciante: 9h às 10h30
  - Turma Intermediária: confirmar horário com a escola
  - Aula avulsa: R$ 97 (vira crédito na matrícula)
  - Plano Mensal: R$ 300/mês | Semestral: R$ 250/mês

AULA PARTICULAR DE DANÇA:
  - Seg a sex, horário livre | Duração: 1h a 1h15
  - Avulsa: R$ 300 | Pacote 4x: R$ 250 cada | Parcelável no cartão

TERAPIA DO AMOR-PRÓPRIO:
  - 1ª sessão: R$ 250 | Pacote 4x: R$ 200 cada | Parcelável no cartão

WORKSHOP MENSAL: R$ 100 | Vagas limitadas
CONSULTORIA JURÍDICA: Direito de Família e da Mulher, incluindo violência doméstica
CURSO ONLINE: Método Ludmilla Raissuli | Iniciante ao Avançado + bônus
FORMAÇÃO DO FEMININO: Processo terapêutico e vivencial (consultar disponibilidade)

# CONTATO E ENDEREÇO
Tv. Dom Romualdo Coelho, 1072 — Belém, PA
WhatsApp: (91) 98134-7134
Instagram: @escoladeamorproprio

# VOCABULÁRIO — NUNCA USE
gostoso, delícia, ardente, sedutora, provocante, quente, sensual, irresistível, excitante, voluptuosa, experimental.
Use sempre: florescer, reconectar, despertar, essência, presença, leveza, cuidado, acolhimento, amor-próprio, potência feminina.

# VOCATIVOS
Use o nome da pessoa quando souber. Varie — nunca repita "querida" ou "linda" mais de uma vez por conversa. Prefira o nome ou nada.

# FORMATAÇÃO DAS MENSAGENS — REGRAS OBRIGATÓRIAS
O WhatsApp usa formatação própria. Siga rigorosamente:

*texto* = negrito — use para: nomes de serviços, preços, chamadas para ação
_texto_ = itálico — use para: frases de acolhimento suaves, complementos delicados
Nunca use ** (dois asteriscos) — isso aparece literal na tela da cliente.
Nunca use # ou - como lista — isso aparece literal no WhatsApp.

ESTRUTURA IDEAL de mensagem:
Linha 1: acolhimento ou contexto (sem formatação)
Linha 2: benefício ou informação principal (*negrito* se for serviço/preço)
Linha 3: detalhe em _itálico_ se cabível
Linha 4: chamada para ação em *negrito*

Emojis: máximo 1-2 por mensagem, sempre com intenção.
🌸 acolhimento | 💜 conexão | 🤍 leveza | ✅ confirmação | 🦋 transformação

NUNCA mande texto corrido sem quebra de linha.
NUNCA formate tudo em negrito — perde o impacto.
NUNCA use mais de 4 linhas por mensagem.

Exemplos corretos:

Apresentando serviço:
Parece que você está buscando algo mais profundo 🌸

*Terapia do Amor-Próprio* é um espaço só seu — para soltar o que pesa e voltar a se sentir inteira.

_Primeira sessão por R$ 250, com plano pensado pra você._

*Quer conhecer como funciona?*

Enviando PIX:
Vaga reservada! ✅

*Escola de Amor-Proprio Amor-Proprio*
CNPJ: 21.172.163/0001-21

_Valor: R$ 97 — vira crédito se decidir continuar_ 🤍

Após pagar, me envia o comprovante aqui.

Objeção de preço:
Entendo 🤍

A *aula avulsa é R$ 97* — e esse valor vira crédito se você decidir continuar.

*Posso reservar sua vaga para esse sábado?*

# CAPTURA DE LEAD
Só registre DEPOIS de identificar nome E intenção da pessoa. Nunca na primeira mensagem sem dados.
Inclua ao final da resposta (invisível para a cliente):
[LEAD: nome=X | contato=Y | interesse=Z | status=CURIOSA ou AQUECIDA ou PRONTA]

# CONTEXTO DA CONVERSA
O sistema vai te informar se é o PRIMEIRO contato da pessoa ou se ela já conhece a escola.
Se informado [PRIMEIRA_VEZ], acolha com calor e apresente a escola antes de responder.
Se não informado, é retorno — trate com naturalidade sem se reapresentar.

# AULA AVULSA DE SÁBADO — AGENDE E COBRE DIRETO
Quando demonstrar interesse na aula de sábado:
1. Confirme a vaga com entusiasmo acolhedor
2. Envie o PIX neste formato exato:

*Escola de Amor-Proprio Amor-Proprio*
CNPJ: 21.172.163/0001-21

_Após o pagamento, me envia o comprovante aqui para garantir sua vaga_ 🤍

3. Ao receber comprovante: confirme a vaga e inclua [PAGO] na resposta (invisível)

# EQUIPE HUMANA
Para terapia, jurídico, particular, formação ou curso online:
"Nossa equipe cuida disso com muito carinho 🤍 *WhatsApp: (91) 98134-7134*"

# HORÁRIO
Se a pessoa mandar mensagem fora do horário comercial (antes das 8h ou depois das 20h), acolha e avise:
"Recebi sua mensagem 🌸 Nossa equipe retorna pela manhã — mas já anotei tudo aqui para não perder nada."
Para aulas de sábado, a Ana pode confirmar e cobrar a qualquer hora.

# SITUAÇÕES SENSÍVEIS
DEPRESSÃO/SAÚDE MENTAL: Acolha com cuidado. A Escola complementa o tratamento médico. Nunca contradiga orientação médica.
CORPO/AUTOESTIMA: Todos os corpos são bem-vindos. A dança celebra a mulher como ela é.
DIFICULDADE FINANCEIRA: Aula avulsa *R$ 97*, parcelamento no cartão, plano semestral *R$ 250/mês*.
É PSICÓLOGA?: Não é CRP, mas tem pós-graduação e quase 20 anos de experiência clínica com mulheres.
MENSAGENS FORA DE CONTEXTO: Responda com leveza redirecionando para a Escola — não ignore, não force.

# OBJEÇÕES
"Caro": "A *aula avulsa é R$ 97* — e vira crédito se decidir continuar. _Uma forma de experimentar sem compromisso._ *Posso reservar sua vaga?*"
"Pensar": "Sem pressa 🤍 _As vagas de sábado são limitadas._ *Posso reservar a sua enquanto decide?*"
"Sem tempo": "É só *1h30 de manhã no sábado* — um momento inteiramente seu 💜"
"Não sei se é pra mim": "Se você chegou até aqui, alguma parte de você já sabe. O que está sentindo?"

# FLUXO DE ATENDIMENTO
1. Acolha e pergunte o que trouxe a mulher
2. Ouça — só ofereça serviço depois de entender
3. Apresente o benefício, não o preço logo de cara
4. Direcione sempre para uma ação: sábado ou equipe humana
5. Nunca encerre sem um próximo passo claro
`;

// ============ CONFIG ============
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "meu_token_secreto";
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const LEADS_PASSWORD = process.env.LEADS_PASSWORD || "escola2024";
const PAINEL_SENHA = process.env.PAINEL_SENHA || "Juliano1072";
const MONGODB_URI = process.env.MONGODB_URI;

// ============ MONGODB ============
let db = null;
let leadsCol = null;
let logsCol = null;

async function conectarMongo() {
  if (db) return;
  try {
    console.log("🔄 Conectando MongoDB...");
    const isInternal = MONGODB_URI.includes(".railway.internal") || MONGODB_URI.includes("localhost");
    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 15000,
      tls: !isInternal,
    });
    await client.connect();
    // Testa a conexão
    await client.db("admin").command({ ping: 1 });
    db = client.db("escolabot");
    leadsCol = db.collection("leads");
    logsCol = db.collection("logs");
    await leadsCol.createIndex({ userId: 1 }, { unique: true });
    await logsCol.createIndex({ userId: 1 });
    console.log("✅ MongoDB conectado com sucesso");
  } catch(e) {
    console.error("❌ MongoDB erro completo:", e.message, e.code);
    // Tenta reconectar após 10s
    setTimeout(conectarMongo, 10000);
  }
}

async function getLead(userId) {
  try { return await leadsCol.findOne({ userId }); } catch(e) { return null; }
}

async function saveLead(lead) {
  try {
    await leadsCol.updateOne(
      { userId: lead.userId },
      { $set: lead },
      { upsert: true }
    );
  } catch(e) { console.error("saveLead erro:", e.message); }
}

async function getLogs(userId) {
  try {
    const doc = await logsCol.findOne({ userId });
    return doc ? doc.msgs : [];
  } catch(e) { return []; }
}

async function addLog(userId, role, texto, plataforma) {
  try {
    const entry = { role, texto, plataforma, timestamp: new Date().toISOString() };
    await logsCol.updateOne(
      { userId },
      { $push: { msgs: { $each: [entry], $slice: -100 } } },
      { upsert: true }
    );
  } catch(e) { console.error("addLog erro:", e.message); }
}

async function getAllLeads() {
  try { return await leadsCol.find({}).sort({ timestamp: -1 }).toArray(); } catch(e) { return []; }
}

async function getAllLogsResumo() {
  try {
    const docs = await logsCol.find({}, { projection: { userId: 1, msgs: { $slice: -1 } } }).toArray();
    return docs.map(d => ({
      userId: d.userId,
      totalMensagens: d.msgs ? d.msgs.length : 0,
      ultima: d.msgs && d.msgs.length > 0 ? d.msgs[d.msgs.length - 1].timestamp : null
    }));
  } catch(e) { return []; }
}

// ============ RATE LIMIT ============
const rateLimits = {};
function checarRate(userId) {
  const now = Date.now();
  if (!rateLimits[userId]) rateLimits[userId] = { n: 0, t: now };
  if (now - rateLimits[userId].t > 60000) rateLimits[userId] = { n: 0, t: now };
  return ++rateLimits[userId].n <= 10;
}

// ============ HISTÓRICO EM MEMÓRIA (conversas ativas) ============
const conversas = {};
const timers = {};
function getHist(id) { if (!conversas[id]) conversas[id] = []; return conversas[id]; }
function addMsg(id, role, content) {
  const h = getHist(id);
  h.push({ role, content });
  if (h.length > 30) h.splice(0, h.length - 30);
}

// ============ TELEGRAM ============
async function telegram(texto) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch("https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: texto, parse_mode: "Markdown" })
    });
  } catch(e) { console.error("Telegram erro:", e.message); }
}

async function telegramFoto(imageUrl, caption) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const imgRes = await fetch(imageUrl, { headers: { "Authorization": "Bearer " + process.env.WHATSAPP_TOKEN } });
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const b = "B" + Date.now();
    const header = Buffer.from(
      "--" + b + "\r\nContent-Disposition: form-data; name=\"chat_id\"\r\n\r\n" + TELEGRAM_CHAT_ID + "\r\n" +
      "--" + b + "\r\nContent-Disposition: form-data; name=\"caption\"\r\n\r\n" + caption + "\r\n" +
      "--" + b + "\r\nContent-Disposition: form-data; name=\"photo\"; filename=\"comprovante.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n"
    );
    const footer = Buffer.from("\r\n--" + b + "--\r\n");
    await fetch("https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/sendPhoto", {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data; boundary=" + b },
      body: Buffer.concat([header, buf, footer])
    });
  } catch(e) {
    console.error("Foto telegram erro:", e.message);
    await telegram(caption + "\n\n_(imagem não encaminhada automaticamente)_");
  }
}

async function alertaNovo(lead) {
  await telegram(
    "🌸 *NOVO CONTATO*\n\n" +
    "👤 Nome: " + (lead.nome || "Aguardando...") + "\n" +
    "📱 Telefone: " + (lead.contato || "Não informado") + "\n" +
    "📲 Canal: " + (lead.plataforma || "Desconhecido") + "\n" +
    "🕐 " + new Date().toLocaleString("pt-BR") + "\n\n_Acompanhe a conversa!_ 💛"
  );
}

async function alertaLeadAtualizado(lead) {
  await telegram(
    "🔥 *LEAD PRONTA PARA FECHAR!*\n\n" +
    "👤 " + (lead.nome || "Não informado") + "\n" +
    "📱 " + (lead.contato || "Não informado") + "\n" +
    "💜 " + (lead.interesse || "Não informado") + "\n" +
    "🕐 " + new Date().toLocaleString("pt-BR") + "\n\n_Entre em contato agora!_ 🚀"
  );
}

async function alertaPago(lead) {
  await telegram(
    "💰 *PAGAMENTO CONFIRMADO!* 🎉\n\n" +
    "👤 " + (lead.nome || "Não informado") + "\n" +
    "📱 " + (lead.contato || "Não informado") + "\n" +
    "💜 Aula de Sábado — R$ 97,00\n" +
    "🕐 " + new Date().toLocaleString("pt-BR") + "\n\n✅ _Vaga confirmada pela Ana!_"
  );
}

// ============ IMAGEM / COMPROVANTE ============
async function processarImagem(userId, imageId) {
  try {
    const r = await fetch("https://graph.facebook.com/v18.0/" + imageId, {
      headers: { "Authorization": "Bearer " + process.env.WHATSAPP_TOKEN }
    });
    const d = await r.json();
    const lead = await getLead(userId) || {};
    const caption =
      "📎 *COMPROVANTE RECEBIDO*\n\n" +
      "👤 " + (lead.nome || "Não identificado") + "\n" +
      "📱 " + (lead.contato || userId) + "\n" +
      "💜 " + (lead.interesse || "Aula de Sábado") + "\n" +
      "🕐 " + new Date().toLocaleString("pt-BR") + "\n\n_Verifique e confirme a vaga!_ 🌸";
    await telegramFoto(d.url, caption);
    await saveLead({ ...lead, userId, status: "COMPROVANTE_ENVIADO", comprovante: new Date().toISOString() });
    await alertaPago(lead);
    return "Recebi seu comprovante! ✅\n\n*Vaga confirmada para o sábado* 🌸\n\n_Te esperamos! Qualquer dúvida sobre o endereço ou horário, é só falar_ 💜";
  } catch(e) {
    console.error("Comprovante erro:", e.message);
    return "Recebi sua imagem 🤍\n\nVou confirmar com a equipe e retorno em breve!";
  }
}

// ============ IA ============
async function chamarIA(userId, msg, plataforma) {
  await addLog(userId, "user", msg, plataforma);
  addMsg(userId, "user", msg); // será sobrescrito com contexto abaixo se necessário

  let lead = await getLead(userId);
  const isPrimeiro = !lead;
  if (!lead) {
    lead = { userId, contato: userId, plataforma, status: "CURIOSA", timestamp: new Date().toISOString(), boasVindasEnviado: true };
    await saveLead(lead);
    await alertaNovo(lead);
    console.log("Novo lead:", userId);
  }

  // Sinaliza para a IA se é primeiro contato
  const contexto = isPrimeiro ? "[PRIMEIRA_VEZ] " : "";
  const msgComContexto = contexto + msg;

  // Adiciona ao histórico com contexto correto
  const hist = getHist(userId);
  hist[hist.length - 1] = { role: "user", content: msgComContexto };

  let resposta = "Desculpe, tive um problema técnico. Tente novamente em instantes 🌸";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        system: "Você é " + IA_NOME + ", atendente virtual com tom " + IA_TOM + ".\n" + IA_INSTRUCOES,
        messages: getHist(userId)
      })
    });
    if (res.ok) {
      const d = await res.json();
      resposta = d.content?.[0]?.text || resposta;
    } else {
      console.error("Anthropic erro:", await res.json());
    }
  } catch(e) { console.error("IA erro:", e.message); }

  if (resposta.includes("[PAGO]")) {
    resposta = resposta.replace("[PAGO]", "").trim();
    await saveLead({ ...lead, status: "PAGO", pagamento: new Date().toISOString() });
    await alertaPago(lead);
  }

  const m = resposta.match(/\[LEAD:\s*([^\]]+)\]/i);
  if (m) {
    try {
      const extras = {};
      m[1].split("|").forEach(p => {
        const [k, v] = p.split("=").map(s => s.trim());
        if (k && v) extras[k.toLowerCase()] = v;
      });
      const statusAnterior = lead.status;
      const novoLead = { ...lead, ...extras, contato: lead.contato || userId, userId };
      await saveLead(novoLead);
      if (extras.status === "PRONTA" && statusAnterior !== "PRONTA" && statusAnterior !== "PAGO") {
        await alertaLeadAtualizado(novoLead);
      }
    } catch(e) { console.error("Lead erro:", e.message); }
    resposta = resposta.replace(m[0], "").trim();
  }

  await addLog(userId, "assistant", resposta, plataforma);
  addMsg(userId, "assistant", resposta);
  return resposta;
}

function agendarRetomada(userId, sendFn) {
  if (timers[userId]) clearTimeout(timers[userId]);
  timers[userId] = setTimeout(async () => {
    const lead = await getLead(userId);
    if (lead && lead.status !== "PAGO") {
      try { await sendFn("Ainda estou aqui, caso queira continuar 🌸 Sem pressa."); }
      catch(e) { console.error("Retomada erro:", e.message); }
    }
  }, 10 * 60 * 1000);
}

// ============ WEBHOOKS ============
app.get("/webhook/whatsapp", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) res.send(req.query["hub.challenge"]);
  else res.sendStatus(403);
});

app.post("/webhook/whatsapp", async (req, res) => {
  try {
    const value = req.body.entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];
    const phoneNumberId = value?.metadata?.phone_number_id;
    if (!msg || value?.statuses) return res.sendStatus(200);
    const userId = msg.from;
    if (!checarRate(userId)) return res.sendStatus(200);

    const send = async (text) => {
      const r = await fetch("https://graph.facebook.com/v18.0/" + phoneNumberId + "/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.WHATSAPP_TOKEN },
        body: JSON.stringify({ messaging_product: "whatsapp", to: userId, text: { body: text } })
      });
      if (!r.ok) console.error("WA send erro:", JSON.stringify(await r.json()));
    };

    if (msg.type === "image") {
      await send(await processarImagem(userId, msg.image.id));
      return res.sendStatus(200);
    }
    if (msg.type !== "text") return res.sendStatus(200);

    await send(await chamarIA(userId, msg.text.body, "whatsapp"));
    agendarRetomada(userId, send);
    res.sendStatus(200);
  } catch(e) { console.error("WA erro:", e); res.sendStatus(500); }
});

app.get("/webhook/instagram", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) res.send(req.query["hub.challenge"]);
  else res.sendStatus(403);
});
app.post("/webhook/instagram", async (req, res) => {
  try {
    const messaging = req.body.entry?.[0]?.messaging?.[0];
    if (!messaging?.message?.text) return res.sendStatus(200);
    const userId = messaging.sender.id;
    if (!checarRate(userId)) return res.sendStatus(200);
    const send = async (text) => {
      await fetch("https://graph.facebook.com/v18.0/me/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.INSTAGRAM_TOKEN },
        body: JSON.stringify({ recipient: { id: userId }, message: { text } })
      });
    };
    await send(await chamarIA(userId, messaging.message.text, "instagram"));
    agendarRetomada(userId, send);
    res.sendStatus(200);
  } catch(e) { console.error("IG erro:", e); res.sendStatus(500); }
});

app.get("/webhook/facebook", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) res.send(req.query["hub.challenge"]);
  else res.sendStatus(403);
});
app.post("/webhook/facebook", async (req, res) => {
  try {
    const messaging = req.body.entry?.[0]?.messaging?.[0];
    if (!messaging?.message?.text) return res.sendStatus(200);
    const userId = messaging.sender.id;
    if (!checarRate(userId)) return res.sendStatus(200);
    const send = async (text) => {
      await fetch("https://graph.facebook.com/v18.0/me/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.FACEBOOK_TOKEN },
        body: JSON.stringify({ recipient: { id: userId }, message: { text } })
      });
    };
    await send(await chamarIA(userId, messaging.message.text, "facebook"));
    agendarRetomada(userId, send);
    res.sendStatus(200);
  } catch(e) { console.error("FB erro:", e); res.sendStatus(500); }
});

// ============ PAINEL ============
// Cookie parser simples
app.use((req, res, next) => {
  req.cookies = {};
  const ch = req.headers.cookie;
  if (ch) ch.split(";").forEach(c => { const [k,v] = c.trim().split("="); req.cookies[k] = v; });
  next();
});

app.post("/painel-login", express.urlencoded({ extended: false }), (req, res) => {
  const senha = req.body.senha;
  if (senha === PAINEL_SENHA) {
    res.setHeader("Set-Cookie", "painel_auth=" + PAINEL_SENHA + "; Path=/; HttpOnly; Max-Age=86400");
    return res.redirect("/painel");
  }
  res.redirect("/painel?erro=1");
});

app.get("/painel", (req, res) => {
  // Login via POST para não expor senha na URL
  const senhaQuery = req.query.senha;
  const senhaSession = req.cookies && req.cookies.painel_auth;
  if (senhaQuery !== PAINEL_SENHA && senhaSession !== PAINEL_SENHA) {
    const erro = req.query.erro ? '<p style="color:#c62828;font-size:13px;margin-bottom:12px">Senha incorreta</p>' : '';
    return res.send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Painel Ana</title><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',sans-serif;background:#fdf6f0;display:flex;align-items:center;justify-content:center;min-height:100vh}.box{background:white;border-radius:16px;padding:48px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:360px;width:90%}h1{font-family:'Playfair Display',serif;color:#8a3f52;margin-bottom:8px;font-size:22px}p{color:#7a6570;font-size:14px;margin-bottom:24px}input{width:100%;padding:12px 16px;border:1px solid #f0d5dc;border-radius:8px;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;margin-bottom:12px}button{width:100%;padding:12px;background:#c9748a;color:white;border:none;border-radius:8px;font-size:14px;font-family:'DM Sans',sans-serif;cursor:pointer}button:hover{background:#8a3f52}</style></head><body><div class="box"><h1>Painel Ana 🌸</h1><p>Escola de Amor-Próprio</p>${erro}<form method="POST" action="/painel-login"><input type="password" name="senha" placeholder="Senha de acesso" autofocus><button type="submit">Entrar</button></form></div></body></html>`);
  }
  // Redireciona para URL limpa se veio com senha na query
  if (senhaQuery === PAINEL_SENHA) {
    res.setHeader("Set-Cookie", "painel_auth=" + PAINEL_SENHA + "; Path=/; HttpOnly; Max-Age=86400");
    return res.redirect("/painel");
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const painelHtml = "<!DOCTYPE html>\n<html lang=\"pt-BR\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>Painel Ana</title>\n<link href=\"https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap\" rel=\"stylesheet\">\n<style>\n:root{--rose:#c9748a;--rose-light:#f0d5dc;--rose-dark:#8a3f52;--cream:#fdf6f0;--dark:#1a1218;--muted:#7a6570;--gold:#c9a87c;--surface:#fff9f5}\n*{margin:0;padding:0;box-sizing:border-box}\nbody{font-family:\"DM Sans\",sans-serif;background:var(--cream);color:var(--dark);min-height:100vh}\nheader{background:var(--dark);padding:16px 28px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;border-bottom:1px solid rgba(201,116,138,.3)}\n.logo{font-family:\"Playfair Display\",serif;font-size:17px;color:var(--rose-light)}\n.logo span{color:var(--gold);font-style:italic}\n.hdr{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--muted)}\n.dot{width:8px;height:8px;border-radius:50%;background:#5a8a6a;animation:pulse 2s infinite}\n@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}\n.rbtn{padding:6px 14px;background:var(--rose);color:white;border:none;border-radius:8px;font-size:12px;cursor:pointer}\n.rbtn:hover{background:var(--rose-dark)}\n.container{display:grid;grid-template-columns:300px 1fr;height:calc(100vh - 57px)}\n.sidebar{background:var(--surface);border-right:1px solid var(--rose-light);display:flex;flex-direction:column;overflow:hidden}\n.sh{padding:16px;border-bottom:1px solid var(--rose-light)}\n.st{font-family:\"Playfair Display\",serif;font-size:14px;color:var(--rose-dark);margin-bottom:10px}\n.sbox{width:100%;padding:8px 12px;border:1px solid var(--rose-light);border-radius:8px;font-size:13px;background:white;outline:none}\n.sbox:focus{border-color:var(--rose)}\n.ftabs{display:flex;gap:5px;margin-top:8px;flex-wrap:wrap}\n.tab{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:500;cursor:pointer;border:1px solid var(--rose-light);background:white;color:var(--muted)}\n.tab.active,.tab:hover{background:var(--rose);color:white;border-color:var(--rose)}\n.clist{overflow-y:auto;flex:1}\n.citem{padding:12px 16px;border-bottom:1px solid rgba(201,116,138,.1);cursor:pointer;transition:background .15s}\n.citem:hover{background:var(--rose-light)}\n.citem.active{background:rgba(201,116,138,.15);border-left:3px solid var(--rose)}\n.cname{font-weight:500;font-size:13px;color:var(--dark);margin-bottom:2px}\n.cphone{font-size:11px;color:var(--muted);margin-bottom:3px}\n.cprev{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.cmeta{display:flex;justify-content:space-between;align-items:center;margin-top:5px}\n.badge{font-size:10px;font-weight:600;padding:2px 7px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}\n.s-CURIOSA{background:#e8f4e8;color:#3a6e4a}\n.s-AQUECIDA{background:#fff3e0;color:#b07020}\n.s-PRONTA{background:#fce4ec;color:#c62828}\n.s-PAGO{background:#e3f2fd;color:#1565c0}\n.s-COMPROVANTE_ENVIADO{background:#ede7f6;color:#4527a0}\n.ctime{font-size:10px;color:var(--muted)}\n.chat{display:flex;flex-direction:column;background:var(--cream)}\n.cheader{padding:14px 20px;background:var(--surface);border-bottom:1px solid var(--rose-light);display:flex;align-items:center;gap:14px}\n.av{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--rose),var(--rose-dark));display:flex;align-items:center;justify-content:center;color:white;font-family:\"Playfair Display\",serif;font-size:17px;font-weight:600;flex-shrink:0}\n.cinfo{flex:1}\n.chead-name{font-weight:600;font-size:14px;color:var(--dark)}\n.chead-phone{font-size:11px;color:var(--muted);margin-top:1px}\n.ctags{display:flex;gap:7px;align-items:center}\n.tag{font-size:10px;padding:2px 8px;border-radius:10px;font-weight:500}\n.ti{background:var(--rose-light);color:var(--rose-dark)}\n.tc{background:#e8f4e8;color:#3a6e4a}\n.msgs{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:10px}\n.mgroup{display:flex;flex-direction:column;gap:3px}\n.mrow{display:flex;align-items:flex-end;gap:7px}\n.mrow.user{justify-content:flex-end}\n.mrow.assistant{justify-content:flex-start}\n.mbubble{max-width:68%;padding:9px 13px;border-radius:14px;font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:break-word}\n.mrow.user .mbubble{background:var(--rose);color:white;border-bottom-right-radius:3px}\n.mrow.assistant .mbubble{background:white;color:var(--dark);border-bottom-left-radius:3px;box-shadow:0 1px 3px rgba(0,0,0,.07)}\n.mtime{font-size:10px;color:var(--muted);margin:0 4px 1px}\n.mrow.user .mtime{text-align:right}\n.alabel{font-size:10px;color:var(--rose);font-weight:600;margin-bottom:1px;margin-left:3px}\n.empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--muted);text-align:center;padding:40px}\n.eicon{font-size:44px;margin-bottom:14px;opacity:.5}\n.etitle{font-family:\"Playfair Display\",serif;font-size:18px;color:var(--rose-dark);margin-bottom:7px}\n.esub{font-size:13px}\n.statsbar{padding:10px 20px;background:var(--surface);border-top:1px solid var(--rose-light);display:flex;gap:20px;font-size:12px;color:var(--muted)}\n.stat{display:flex;gap:5px;align-items:center}\n.stat strong{color:var(--dark);font-weight:600}\n.loading{display:flex;align-items:center;justify-content:center;padding:40px;color:var(--muted);font-size:13px;gap:7px}\n.spin{width:15px;height:15px;border:2px solid var(--rose-light);border-top-color:var(--rose);border-radius:50%;animation:spin .8s linear infinite}\n@keyframes spin{to{transform:rotate(360deg)}}\n.nc{padding:40px 20px;text-align:center;color:var(--muted);font-size:13px}\n</style>\n</head>\n<body>\n<header>\n  <div class=\"logo\">Escola de Amor-Pr\u00f3prio &middot; <span>Painel Ana</span></div>\n  <div class=\"hdr\">\n    <div class=\"dot\"></div>\n    <span id=\"stxt\">Carregando...</span>\n    <button class=\"rbtn\" id=\"rbtn\">&#8635; Atualizar</button>\n  </div>\n</header>\n<div class=\"container\">\n  <div class=\"sidebar\">\n    <div class=\"sh\">\n      <div class=\"st\">Conversas</div>\n      <input class=\"sbox\" id=\"search\" placeholder=\"Buscar nome ou numero...\">\n      <div class=\"ftabs\">\n        <div class=\"tab active\" data-filtro=\"todos\">Todos</div>\n        <div class=\"tab\" data-filtro=\"PRONTA\">Prontas</div>\n        <div class=\"tab\" data-filtro=\"PAGO\">Pagas</div>\n        <div class=\"tab\" data-filtro=\"AQUECIDA\">Quentes</div>\n      </div>\n    </div>\n    <div class=\"clist\" id=\"clist\"><div class=\"loading\"><div class=\"spin\"></div> Carregando...</div></div>\n  </div>\n  <div class=\"chat\">\n    <div id=\"cheader\" class=\"cheader\" style=\"display:none\">\n      <div class=\"av\" id=\"av\">A</div>\n      <div class=\"cinfo\">\n        <div class=\"chead-name\" id=\"cname\">-</div>\n        <div class=\"chead-phone\" id=\"cphone\">-</div>\n      </div>\n      <div class=\"ctags\">\n        <span class=\"tag ti\" id=\"cint\"></span>\n        <span class=\"tag tc\" id=\"ccan\"></span>\n        <span class=\"badge\" id=\"cst\"></span>\n      </div>\n    </div>\n    <div id=\"msgs\" class=\"msgs\">\n      <div class=\"empty\"><div class=\"eicon\">&#127800;</div><div class=\"etitle\">Selecione uma conversa</div><div class=\"esub\">Escolha um contato ao lado</div></div>\n    </div>\n    <div class=\"statsbar\">\n      Total: <strong id=\"s1\">-</strong> &nbsp;|&nbsp;\n      Prontas: <strong id=\"s2\">-</strong> &nbsp;|&nbsp;\n      Pagas: <strong id=\"s3\">-</strong> &nbsp;|&nbsp;\n      Hoje: <strong id=\"s4\">-</strong>\n    </div>\n  </div>\n</div>\n<script>\nvar leads = [];\nvar logsMap = {};\nvar filtro = \"todos\";\nvar ativo = null;\nvar SENHA = \"\" + LEADS_PASSWORD + \"\";\n\nfunction ftel(n) {\n  if (!n) return \"-\";\n  var d = n.replace(/[^0-9]/g, \"\");\n  if (d.length === 13) return \"+\" + d.slice(0,2) + \" (\" + d.slice(2,4) + \") \" + d.slice(4,9) + \"-\" + d.slice(9);\n  if (d.length === 12) return \"+\" + d.slice(0,2) + \" (\" + d.slice(2,4) + \") \" + d.slice(4,8) + \"-\" + d.slice(8);\n  return n;\n}\n\nfunction fhora(t) {\n  if (!t) return \"\";\n  var d = new Date(t);\n  return d.toLocaleDateString(\"pt-BR\", {day:\"2-digit\",month:\"2-digit\"}) + \" \" + d.toLocaleTimeString(\"pt-BR\", {hour:\"2-digit\",minute:\"2-digit\"});\n}\n\nfunction ini(n) {\n  if (!n || n === \"Nao informado\") return \"?\";\n  return n.trim()[0].toUpperCase();\n}\n\nfunction stats() {\n  var hoje = new Date().toDateString();\n  document.getElementById(\"s1\").textContent = leads.length;\n  document.getElementById(\"s2\").textContent = leads.filter(function(l){return l.status===\"PRONTA\";}).length;\n  document.getElementById(\"s3\").textContent = leads.filter(function(l){return l.status===\"PAGO\"||l.status===\"COMPROVANTE_ENVIADO\";}).length;\n  document.getElementById(\"s4\").textContent = leads.filter(function(l){return new Date(l.timestamp).toDateString()===hoje;}).length;\n}\n\nfunction renderLista() {\n  var busca = document.getElementById(\"search\").value.toLowerCase();\n  var lista = leads;\n  if (filtro !== \"todos\") lista = lista.filter(function(l){return l.status===filtro;});\n  if (busca) lista = lista.filter(function(l){return (l.nome||\"\").toLowerCase().indexOf(busca)>=0||(l.contato||\"\").indexOf(busca)>=0;});\n  var el = document.getElementById(\"clist\");\n  if (lista.length === 0) { el.innerHTML = '<div class=\"nc\">Nenhum contato encontrado</div>'; return; }\n  var html = \"\";\n  for (var i=0; i<lista.length; i++) {\n    var ld = lista[i];\n    var li = logsMap[ld.userId] || {};\n    var pv = li.ultima ? \"Ultima: \" + fhora(li.ultima) : \"Sem mensagens\";\n    var ac = ativo === ld.userId ? \"active\" : \"\";\n    var st = ld.status || \"CURIOSA\";\n    html += '<div class=\"citem ' + ac + '\" data-id=\"' + ld.userId + '\">';\n    html += '<div class=\"cname\">' + (ld.nome||\"Sem nome\") + '</div>';\n    html += '<div class=\"cphone\">' + ftel(ld.contato) + '</div>';\n    html += '<div class=\"cprev\">' + pv + '</div>';\n    html += '<div class=\"cmeta\"><span class=\"badge s-' + st + '\">' + st + '</span><span class=\"ctime\">' + fhora(ld.timestamp) + '</span></div>';\n    html += '</div>';\n  }\n  el.innerHTML = html;\n  // Add click events\n  var items = el.querySelectorAll(\".citem\");\n  for (var j=0; j<items.length; j++) {\n    items[j].addEventListener(\"click\", function(){\n      abrir(this.getAttribute(\"data-id\"));\n    });\n  }\n}\n\nfunction abrir(userId) {\n  ativo = userId;\n  renderLista();\n  var ld = null;\n  for (var i=0; i<leads.length; i++) { if (leads[i].userId===userId) { ld=leads[i]; break; } }\n  if (!ld) ld = {};\n  document.getElementById(\"cheader\").style.display = \"flex\";\n  document.getElementById(\"av\").textContent = ini(ld.nome);\n  document.getElementById(\"cname\").textContent = ld.nome || \"Sem nome\";\n  document.getElementById(\"cphone\").textContent = ftel(ld.contato);\n  document.getElementById(\"cint\").textContent = ld.interesse || \"Nao identificado\";\n  document.getElementById(\"ccan\").textContent = ld.plataforma || \"desconhecido\";\n  var se = document.getElementById(\"cst\");\n  se.textContent = ld.status || \"CURIOSA\";\n  se.className = \"badge s-\" + (ld.status || \"CURIOSA\");\n  var ma = document.getElementById(\"msgs\");\n  ma.innerHTML = '<div class=\"loading\"><div class=\"spin\"></div> Carregando...</div>';\n  fetch(\"/logs?senha=\" + SENHA + \"&userId=\" + userId)\n    .then(function(r){return r.json();})\n    .then(function(d){\n      var lg = d.logs || [];\n      if (lg.length === 0) { ma.innerHTML = '<div class=\"empty\"><div class=\"eicon\">&#128172;</div><div class=\"etitle\">Sem mensagens</div></div>'; return; }\n      var html = \"\";\n      for (var i=0; i<lg.length; i++) {\n        var msg = lg[i];\n        var ia = msg.role === \"assistant\";\n        html += '<div class=\"mgroup\">';\n        if (ia) html += '<div class=\"alabel\">Ana</div>';\n        html += '<div class=\"mrow ' + msg.role + '\"><div class=\"mbubble\">' + msg.texto + '</div></div>';\n        html += '<div class=\"mtime\">' + fhora(msg.timestamp) + '</div>';\n        html += '</div>';\n      }\n      ma.innerHTML = html;\n      ma.scrollTop = ma.scrollHeight;\n    })\n    .catch(function(e){ ma.innerHTML = '<div class=\"empty\"><div class=\"eicon\">&#10060;</div><div class=\"etitle\">Erro ao carregar</div></div>'; });\n}\n\nfunction carregar() {\n  document.getElementById(\"stxt\").textContent = \"Atualizando...\";\n  Promise.all([\n    fetch(\"/leads?senha=\" + SENHA).then(function(r){return r.json();}),\n    fetch(\"/logs?senha=\" + SENHA).then(function(r){return r.json();})\n  ]).then(function(results) {\n    var ld = results[0];\n    var lgd = results[1];\n    leads = ld.leads || [];\n    logsMap = {};\n    var us = lgd.usuarios || [];\n    for (var i=0; i<us.length; i++) { logsMap[us[i].userId] = us[i]; }\n    stats();\n    renderLista();\n    document.getElementById(\"stxt\").textContent = leads.length + \" contatos\";\n    if (ativo) setTimeout(function(){ abrir(ativo); }, 100);\n  }).catch(function(e){\n    document.getElementById(\"stxt\").textContent = \"Erro ao conectar\";\n    document.getElementById(\"clist\").innerHTML = '<div class=\"nc\">Sem conexao com o servidor</div>';\n  });\n}\n\ndocument.getElementById(\"search\").addEventListener(\"input\", renderLista);\ndocument.getElementById(\"rbtn\").addEventListener(\"click\", carregar);\ndocument.querySelectorAll(\".tab\").forEach(function(t){\n  t.addEventListener(\"click\", function(){\n    filtro = this.getAttribute(\"data-filtro\");\n    document.querySelectorAll(\".tab\").forEach(function(x){x.classList.remove(\"active\");});\n    this.classList.add(\"active\");\n    renderLista();\n  });\n});\n\ncarregar();\nsetInterval(carregar, 30000);\n</script>\n</body>\n</html>";
  res.send(painelHtml);
});

// ============ ROTAS ADMIN ============
app.get("/leads", async (req, res) => {
  if (req.query.senha !== LEADS_PASSWORD) return res.status(401).json({ erro: "Senha incorreta." });
  const lista = await getAllLeads();
  res.json({ total: lista.length, leads: lista });
});

app.get("/logs", async (req, res) => {
  if (req.query.senha !== LEADS_PASSWORD) return res.status(401).json({ erro: "Senha incorreta." });
  if (req.query.userId) {
    const msgs = await getLogs(req.query.userId);
    return res.json({ logs: msgs });
  }
  const resumo = await getAllLogsResumo();
  res.json({ totalUsuarios: resumo.length, usuarios: resumo });
});

app.get("/", (req, res) => {
  res.json({ status: "Ana no ar ✅", escola: "Escola de Amor-Próprio", db: db ? "MongoDB conectado" : "sem banco" });
});

// ============ START ============
const PORT = process.env.PORT || 3000;
conectarMongo().then(() => {
  app.listen(PORT, () => console.log("✅ Ana rodando na porta " + PORT));
});
