const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
app.use(express.json({ limit: "10mb" }));

const IA_NOME = "Ana";
const IA_TOM = "acolhedor, gentil, feminino e empoderador";

const IA_INSTRUCOES = `
# IDENTIDADE E PAPEL
Você é Ana, assistente virtual da Escola de Amor-Próprio, um Centro Integral de Cuidado com a Mulher fundado em 2010 em Belém, Pará, pela terapeuta e professora Ludmilla Raissuli. Seu papel é acolher cada mulher com calor, clareza e cuidado — como uma amiga que cuida, nunca como uma vendedora. Você representa os valores da Escola: acolhimento sem julgamento, presença, delicadeza e amor-próprio.

# SOBRE LUDMILLA RAISSULI
Ludmilla NÃO é psicóloga registrada no CRP. Tem pós-graduação em Psicologia Positiva e Experiências Pós-Traumáticas + Terapia Junguiana, Hipnoterapia, Método Heal Your Life de Louise Hay (Lisboa) e Constelações Familiares. Quase 20 anos de prática clínica com mulheres. Nunca afirme que ela é psicóloga. Se perguntarem, explique com clareza e valorize sua formação abrangente.

# SERVIÇOS E PREÇOS
DANÇA EM GRUPO:
  - Turma Iniciante: Sábados 9h-10h30
  - Turma Intermediária: Sábados manhã (confirmar horário com a escola)
  - Aula avulsa: R$ 97 (vira crédito se a aluna se matricular)
  - Plano Mensal: R$ 300/mês
  - Plano Semestral: R$ 250/mês

AULA PARTICULAR DE DANÇA:
  - Segunda a sexta, horário livre conforme agenda
  - Duração: 1h a 1h15
  - Avulsa: R$ 300 | Pacote 4 aulas: 4x R$ 250 | Parcelável no cartão

TERAPIA DO AMOR-PRÓPRIO:
  - 1ª sessão: R$ 250 | Pacote 4 sessões: R$ 200 cada | Parcelável no cartão
  - Atendimentos durante a semana

WORKSHOP MENSAL:
  - R$ 100 | Vagas limitadas | Consultar data do mês

CONSULTORIA JURÍDICA:
  - Direito de Família e da Mulher, incluindo violência doméstica

CURSO ONLINE:
  - Método Ludmilla Raissuli | Iniciante, Intermediário, Avançado + bônus

FORMAÇÃO DO FEMININO:
  - Processo terapêutico e vivencial (consultar disponibilidade)

# ENDEREÇO E CONTATO
Tv. Dom Romualdo Coelho, 1072 (entre Diogo Móia e Bernal do Couto), Belém-PA
WhatsApp: (91) 98134-7134
E-mail: escoladeamorproprio@gmail.com
Instagram: @escoladeamorproprio

# VOCABULÁRIO — O QUE EVITAR
NUNCA use: gostoso, delícia, ardente, sedutora, provocante, quente, sensual, irresistível, excitante, voluptuosa, experimental.
Tom acolhedor, feminino e empoderador — nunca sugestivo.
Use: florescer, reconectar, despertar, essência, presença, leveza, cuidado, acolhimento, amor-próprio, potência feminina.

# VOCATIVOS
Use o NOME da pessoa sempre que souber. Varie — não repita "querida" ou "linda" mais de uma vez por conversa. Use o nome ou nada.

# COMO SE COMUNICAR
- Mensagens CURTAS — máximo 3 linhas.
- Use negrito para preços e chamadas para ação.
- Sempre conduza para um próximo passo claro.
- Sempre direcione para algum serviço — nunca encerre sem indicar um caminho.

# CAPTURA DE LEAD
Só registre depois de identificar nome E intenção da pessoa.
Inclua ao final da resposta (invisível para a usuária):
[LEAD: nome=X | contato=Y | interesse=Z | status=CURIOSA ou AQUECIDA ou PRONTA]

# AULA AVULSA DE SÁBADO — AGENDE E COBRE DIRETO
Quando demonstrar interesse:
1. "Ótimo! Vou reservar sua vaga para o sábado 🌸"
2. Envie o PIX assim:

Escola de Amor-Proprio Amor-Proprio
CNPJ: 21.172.163/0001-21

_Após o pagamento, envie o comprovante aqui para garantir sua vaga_ 🤍

3. Ao receber comprovante: "**Vaga confirmada! Te esperamos sábado** 🌸" + inclua [PAGO]

# EQUIPE HUMANA
Para terapia, jurídico, particular, formação ou curso: "Nossa equipe vai te ajudar 🤍 **WhatsApp: (91) 98134-7134**"

# SITUAÇÕES SENSÍVEIS
DEPRESSÃO: Acolha. A Escola complementa o tratamento médico.
CORPO/AUTOESTIMA: Todos os corpos são bem-vindos.
SEM DINHEIRO: Aula avulsa **R$ 97**, parcelamento, plano semestral **R$ 250/mês**.
É PSICÓLOGA?: Não é CRP, mas quase 20 anos de experiência clínica.

# OBJEÇÕES
- "Caro": "**R$ 97** para uma aula avulsa — e vira crédito se decidir continuar 🌸"
- "Pensar": "Sem pressa. **Posso reservar sua vaga enquanto decide?**"
- "Sem tempo": "É só **1h30 de manhã no sábado** — um momento só seu 💜"
- "Não sei se é pra mim": "Se chegou até aqui, alguma parte de você já sabe. O que está sentindo?"
`;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "meu_token_secreto";
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const LEADS_PASSWORD = process.env.LEADS_PASSWORD || "escola2024";

const DB_LEADS = "/tmp/leads.json";
const DB_LOGS = "/tmp/logs.json";

function lerDB(a) {
  try { if (fs.existsSync(a)) return JSON.parse(fs.readFileSync(a, "utf8")); } catch(e) {}
  return {};
}
function salvarDB(a, d) {
  try { fs.writeFileSync(a, JSON.stringify(d, null, 2)); } catch(e) { console.error("DB erro:", e.message); }
}

let leadsDB = lerDB(DB_LEADS);
let logsDB = lerDB(DB_LOGS);

const rateLimits = {};
function checarRate(userId) {
  const now = Date.now();
  if (!rateLimits[userId]) rateLimits[userId] = { n: 0, t: now };
  if (now - rateLimits[userId].t > 60000) rateLimits[userId] = { n: 0, t: now };
  return ++rateLimits[userId].n <= 10;
}

const conversas = {};
const timers = {};
function getHist(id) { if (!conversas[id]) conversas[id] = []; return conversas[id]; }
function addMsg(id, role, content) {
  const h = getHist(id);
  h.push({ role, content });
  if (h.length > 30) h.splice(0, h.length - 30);
}

function log(userId, role, texto, plataforma) {
  if (!logsDB[userId]) logsDB[userId] = [];
  logsDB[userId].push({ role, texto, plataforma, timestamp: new Date().toISOString() });
  if (logsDB[userId].length > 100) logsDB[userId].splice(0, logsDB[userId].length - 100);
  salvarDB(DB_LOGS, logsDB);
}

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
    await telegram(caption + "\n\n_(imagem não encaminhada)_");
  }
}

async function alertaNovo(lead) {
  await telegram(
    "🌸 *NOVO CONTATO*\n\n" +
    "👤 Nome: " + (lead.nome || "Não informado") + "\n" +
    "📱 Telefone: " + (lead.contato || "Não informado") + "\n" +
    "💜 Interesse: " + (lead.interesse || "Não informado") + "\n" +
    "📲 Canal: " + (lead.plataforma || "Desconhecido") + "\n" +
    "🕐 " + new Date().toLocaleString("pt-BR") + "\n\n_Acompanhe!_ 💛"
  );
}

async function alertaPronto(lead) {
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

async function processarImagem(userId, imageId) {
  try {
    const r = await fetch("https://graph.facebook.com/v18.0/" + imageId, {
      headers: { "Authorization": "Bearer " + process.env.WHATSAPP_TOKEN }
    });
    const d = await r.json();
    const lead = leadsDB[userId] || {};
    const caption =
      "📎 *COMPROVANTE RECEBIDO*\n\n" +
      "👤 " + (lead.nome || "Não identificado") + "\n" +
      "📱 " + (lead.contato || userId) + "\n" +
      "💜 " + (lead.interesse || "Aula de Sábado") + "\n" +
      "🕐 " + new Date().toLocaleString("pt-BR") + "\n\n_Verifique e confirme a vaga!_ 🌸";
    await telegramFoto(d.url, caption);
    if (leadsDB[userId]) {
      leadsDB[userId].status = "COMPROVANTE_ENVIADO";
      leadsDB[userId].comprovante = new Date().toISOString();
      salvarDB(DB_LEADS, leadsDB);
    }
    return "Recebi seu comprovante! ✅ **Vaga confirmada para o sábado** 🌸 Te esperamos! Qualquer dúvida sobre endereço ou horário, é só falar 💜";
  } catch(e) {
    console.error("Comprovante erro:", e.message);
    return "Recebi sua imagem 🤍 Vou confirmar com a equipe e retorno em breve!";
  }
}

async function chamarIA(userId, msg, plataforma) {
  log(userId, "user", msg, plataforma);
  addMsg(userId, "user", msg);

  if (!leadsDB[userId]) {
    leadsDB[userId] = { userId, contato: userId, plataforma, status: "CURIOSA", timestamp: new Date().toISOString() };
    salvarDB(DB_LEADS, leadsDB);
    await alertaNovo(leadsDB[userId]);
    console.log("Novo lead:", userId);
  }

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
        max_tokens: 1000,
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
    leadsDB[userId].status = "PAGO";
    leadsDB[userId].pagamento = new Date().toISOString();
    salvarDB(DB_LEADS, leadsDB);
    await alertaPago(leadsDB[userId]);
  }

  const m = resposta.match(/\[LEAD:\s*([^\]]+)\]/i);
  if (m) {
    try {
      const extras = {};
      m[1].split("|").forEach(p => {
        const [k, v] = p.split("=").map(s => s.trim());
        if (k && v) extras[k.toLowerCase()] = v;
      });
      const statusAnterior = leadsDB[userId]?.status;
      leadsDB[userId] = { ...leadsDB[userId], ...extras, contato: leadsDB[userId]?.contato || userId, userId };
      salvarDB(DB_LEADS, leadsDB);
      if (extras.status === "PRONTA" && statusAnterior !== "PRONTA" && statusAnterior !== "PAGO") {
        await alertaPronto(leadsDB[userId]);
      }
    } catch(e) { console.error("Lead erro:", e.message); }
    resposta = resposta.replace(m[0], "").trim();
  }

  log(userId, "assistant", resposta, plataforma);
  addMsg(userId, "assistant", resposta);
  return resposta;
}

function agendarRetomada(userId, sendFn) {
  if (timers[userId]) clearTimeout(timers[userId]);
  timers[userId] = setTimeout(async () => {
    if (leadsDB[userId]) {
      try { await sendFn("Ainda estou aqui, caso queira continuar 🌸 Sem pressa."); }
      catch(e) { console.error("Retomada erro:", e.message); }
    }
  }, 10 * 60 * 1000);
}

// WHATSAPP
app.get("/webhook/whatsapp", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) res.send(req.query["hub.challenge"]);
  else res.sendStatus(403);
});

app.post("/webhook/whatsapp", async (req, res) => {
  try {
    const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const phoneNumberId = req.body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    if (!msg) return res.sendStatus(200);
    const userId = msg.from;
    if (!checarRate(userId)) return res.sendStatus(200);

    const send = async (text) => {
      const r = await fetch("https://graph.facebook.com/v18.0/" + phoneNumberId + "/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.WHATSAPP_TOKEN },
        body: JSON.stringify({ messaging_product: "whatsapp", to: userId, text: { body: text } })
      });
      if (!r.ok) console.error("WA send erro:", await r.json());
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

// INSTAGRAM
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

// FACEBOOK
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

// PAINEL
app.get("/painel", (req, res) => {
  res.sendFile(path.join(__dirname, "painel.html"));
});

// LEADS
app.get("/leads", (req, res) => {
  if (req.query.senha !== LEADS_PASSWORD) return res.status(401).json({ erro: "Senha incorreta." });
  leadsDB = lerDB(DB_LEADS);
  const lista = Object.values(leadsDB).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({ total: lista.length, leads: lista });
});

// LOGS
app.get("/logs", (req, res) => {
  if (req.query.senha !== LEADS_PASSWORD) return res.status(401).json({ erro: "Senha incorreta." });
  logsDB = lerDB(DB_LOGS);
  if (req.query.userId) return res.json({ logs: logsDB[req.query.userId] || [] });
  const resumo = Object.entries(logsDB).map(([userId, msgs]) => ({
    userId, totalMensagens: msgs.length, ultima: msgs[msgs.length - 1]?.timestamp
  }));
  res.json({ totalUsuarios: resumo.length, usuarios: resumo });
});

// STATUS
app.get("/", (req, res) => {
  res.json({ status: "Ana no ar ✅", escola: "Escola de Amor-Próprio", leads: Object.keys(leadsDB).length, conversas: Object.keys(conversas).length });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ Ana rodando na porta " + PORT));
