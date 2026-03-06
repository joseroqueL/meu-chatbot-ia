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


// PAINEL ADMIN
app.get("/painel", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send("<!DOCTYPE html>\n<html lang=\"pt-BR\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>Painel Ana \u2014 Escola de Amor-Pr\u00f3prio</title>\n<link href=\"https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap\" rel=\"stylesheet\">\n<style>\n  :root {\n    --rose: #c9748a;\n    --rose-light: #f0d5dc;\n    --rose-dark: #8a3f52;\n    --cream: #fdf6f0;\n    --dark: #1a1218;\n    --muted: #7a6570;\n    --gold: #c9a87c;\n    --green: #5a8a6a;\n    --surface: #fff9f5;\n  }\n\n  * { margin: 0; padding: 0; box-sizing: border-box; }\n\n  body {\n    font-family: 'DM Sans', sans-serif;\n    background: var(--cream);\n    color: var(--dark);\n    min-height: 100vh;\n  }\n\n  /* HEADER */\n  header {\n    background: var(--dark);\n    padding: 20px 32px;\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    position: sticky;\n    top: 0;\n    z-index: 100;\n    border-bottom: 1px solid rgba(201,116,138,0.3);\n  }\n\n  .logo {\n    font-family: 'Playfair Display', serif;\n    font-size: 18px;\n    color: var(--rose-light);\n    letter-spacing: 0.5px;\n  }\n\n  .logo span { color: var(--gold); font-style: italic; }\n\n  .header-status {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    font-size: 13px;\n    color: var(--muted);\n  }\n\n  .dot {\n    width: 8px; height: 8px;\n    border-radius: 50%;\n    background: #5a8a6a;\n    animation: pulse 2s infinite;\n  }\n\n  @keyframes pulse {\n    0%, 100% { opacity: 1; }\n    50% { opacity: 0.4; }\n  }\n\n  /* LAYOUT */\n  .container {\n    display: grid;\n    grid-template-columns: 320px 1fr;\n    height: calc(100vh - 65px);\n  }\n\n  /* SIDEBAR */\n  .sidebar {\n    background: var(--surface);\n    border-right: 1px solid var(--rose-light);\n    display: flex;\n    flex-direction: column;\n    overflow: hidden;\n  }\n\n  .sidebar-header {\n    padding: 20px;\n    border-bottom: 1px solid var(--rose-light);\n  }\n\n  .sidebar-title {\n    font-family: 'Playfair Display', serif;\n    font-size: 15px;\n    color: var(--rose-dark);\n    margin-bottom: 12px;\n  }\n\n  .search-box {\n    width: 100%;\n    padding: 9px 14px;\n    border: 1px solid var(--rose-light);\n    border-radius: 8px;\n    font-size: 13px;\n    font-family: 'DM Sans', sans-serif;\n    background: white;\n    color: var(--dark);\n    outline: none;\n    transition: border-color 0.2s;\n  }\n\n  .search-box:focus { border-color: var(--rose); }\n\n  .filter-tabs {\n    display: flex;\n    gap: 6px;\n    margin-top: 10px;\n  }\n\n  .tab {\n    padding: 5px 12px;\n    border-radius: 20px;\n    font-size: 12px;\n    font-weight: 500;\n    cursor: pointer;\n    border: 1px solid var(--rose-light);\n    background: white;\n    color: var(--muted);\n    transition: all 0.2s;\n  }\n\n  .tab.active, .tab:hover {\n    background: var(--rose);\n    color: white;\n    border-color: var(--rose);\n  }\n\n  .contacts-list {\n    overflow-y: auto;\n    flex: 1;\n  }\n\n  .contact-item {\n    padding: 14px 20px;\n    border-bottom: 1px solid rgba(201,116,138,0.1);\n    cursor: pointer;\n    transition: background 0.15s;\n    position: relative;\n  }\n\n  .contact-item:hover { background: var(--rose-light); }\n  .contact-item.active { background: rgba(201,116,138,0.15); border-left: 3px solid var(--rose); }\n\n  .contact-name {\n    font-weight: 500;\n    font-size: 14px;\n    color: var(--dark);\n    margin-bottom: 3px;\n  }\n\n  .contact-phone {\n    font-size: 12px;\n    color: var(--muted);\n    margin-bottom: 4px;\n  }\n\n  .contact-preview {\n    font-size: 12px;\n    color: var(--muted);\n    white-space: nowrap;\n    overflow: hidden;\n    text-overflow: ellipsis;\n  }\n\n  .contact-meta {\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n    margin-top: 6px;\n  }\n\n  .status-badge {\n    font-size: 10px;\n    font-weight: 600;\n    padding: 2px 8px;\n    border-radius: 10px;\n    text-transform: uppercase;\n    letter-spacing: 0.5px;\n  }\n\n  .status-CURIOSA { background: #e8f4e8; color: #3a6e4a; }\n  .status-AQUECIDA { background: #fff3e0; color: #b07020; }\n  .status-PRONTA { background: #fce4ec; color: #c62828; }\n  .status-PAGO { background: #e3f2fd; color: #1565c0; }\n  .status-COMPROVANTE_ENVIADO { background: #ede7f6; color: #4527a0; }\n\n  .contact-time {\n    font-size: 11px;\n    color: var(--muted);\n  }\n\n  /* MAIN CHAT */\n  .chat-area {\n    display: flex;\n    flex-direction: column;\n    background: var(--cream);\n  }\n\n  .chat-header {\n    padding: 16px 24px;\n    background: var(--surface);\n    border-bottom: 1px solid var(--rose-light);\n    display: flex;\n    align-items: center;\n    gap: 16px;\n  }\n\n  .chat-avatar {\n    width: 44px; height: 44px;\n    border-radius: 50%;\n    background: linear-gradient(135deg, var(--rose), var(--rose-dark));\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    color: white;\n    font-family: 'Playfair Display', serif;\n    font-size: 18px;\n    font-weight: 600;\n    flex-shrink: 0;\n  }\n\n  .chat-info { flex: 1; }\n\n  .chat-name {\n    font-weight: 600;\n    font-size: 15px;\n    color: var(--dark);\n  }\n\n  .chat-phone {\n    font-size: 12px;\n    color: var(--muted);\n    margin-top: 2px;\n  }\n\n  .chat-tags {\n    display: flex;\n    gap: 8px;\n    align-items: center;\n  }\n\n  .tag {\n    font-size: 11px;\n    padding: 3px 10px;\n    border-radius: 10px;\n    font-weight: 500;\n  }\n\n  .tag-interesse { background: var(--rose-light); color: var(--rose-dark); }\n  .tag-canal { background: #e8f4e8; color: #3a6e4a; }\n\n  /* MESSAGES */\n  .messages {\n    flex: 1;\n    overflow-y: auto;\n    padding: 24px;\n    display: flex;\n    flex-direction: column;\n    gap: 12px;\n  }\n\n  .msg-group { display: flex; flex-direction: column; gap: 4px; }\n\n  .msg-row {\n    display: flex;\n    align-items: flex-end;\n    gap: 8px;\n  }\n\n  .msg-row.user { justify-content: flex-end; }\n  .msg-row.assistant { justify-content: flex-start; }\n\n  .msg-bubble {\n    max-width: 68%;\n    padding: 10px 14px;\n    border-radius: 16px;\n    font-size: 14px;\n    line-height: 1.5;\n    position: relative;\n    white-space: pre-wrap;\n    word-break: break-word;\n  }\n\n  .msg-row.user .msg-bubble {\n    background: var(--rose);\n    color: white;\n    border-bottom-right-radius: 4px;\n  }\n\n  .msg-row.assistant .msg-bubble {\n    background: white;\n    color: var(--dark);\n    border-bottom-left-radius: 4px;\n    box-shadow: 0 1px 4px rgba(0,0,0,0.08);\n  }\n\n  .msg-time {\n    font-size: 11px;\n    color: var(--muted);\n    margin: 0 4px 2px;\n  }\n\n  .msg-row.user .msg-time { text-align: right; }\n\n  .ana-label {\n    font-size: 11px;\n    color: var(--rose);\n    font-weight: 600;\n    margin-bottom: 2px;\n    margin-left: 4px;\n  }\n\n  /* EMPTY STATE */\n  .empty-state {\n    flex: 1;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;\n    color: var(--muted);\n    text-align: center;\n    padding: 40px;\n  }\n\n  .empty-icon {\n    font-size: 48px;\n    margin-bottom: 16px;\n    opacity: 0.5;\n  }\n\n  .empty-title {\n    font-family: 'Playfair Display', serif;\n    font-size: 20px;\n    color: var(--rose-dark);\n    margin-bottom: 8px;\n  }\n\n  .empty-subtitle { font-size: 14px; }\n\n  /* STATS BAR */\n  .stats-bar {\n    padding: 12px 24px;\n    background: var(--surface);\n    border-top: 1px solid var(--rose-light);\n    display: flex;\n    gap: 24px;\n    font-size: 12px;\n    color: var(--muted);\n  }\n\n  .stat { display: flex; gap: 6px; align-items: center; }\n  .stat strong { color: var(--dark); font-weight: 600; }\n\n  /* LOADING */\n  .loading {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    padding: 40px;\n    color: var(--muted);\n    font-size: 14px;\n    gap: 8px;\n  }\n\n  .spinner {\n    width: 16px; height: 16px;\n    border: 2px solid var(--rose-light);\n    border-top-color: var(--rose);\n    border-radius: 50%;\n    animation: spin 0.8s linear infinite;\n  }\n\n  @keyframes spin { to { transform: rotate(360deg); } }\n\n  .refresh-btn {\n    padding: 7px 16px;\n    background: var(--rose);\n    color: white;\n    border: none;\n    border-radius: 8px;\n    font-size: 13px;\n    font-family: 'DM Sans', sans-serif;\n    cursor: pointer;\n    transition: background 0.2s;\n  }\n\n  .refresh-btn:hover { background: var(--rose-dark); }\n\n  .no-contacts {\n    padding: 40px 20px;\n    text-align: center;\n    color: var(--muted);\n    font-size: 13px;\n  }\n</style>\n</head>\n<body>\n\n<header>\n  <div class=\"logo\">Escola de Amor-Pr\u00f3prio \u00b7 <span>Painel Ana</span></div>\n  <div class=\"header-status\">\n    <div class=\"dot\"></div>\n    <span id=\"status-text\">Carregando...</span>\n    <button class=\"refresh-btn\" onclick=\"recarregar()\">\u21bb Atualizar</button>\n  </div>\n</header>\n\n<div class=\"container\">\n  <!-- SIDEBAR -->\n  <div class=\"sidebar\">\n    <div class=\"sidebar-header\">\n      <div class=\"sidebar-title\">Conversas</div>\n      <input class=\"search-box\" id=\"search\" placeholder=\"Buscar por nome ou n\u00famero...\" oninput=\"filtrar()\">\n      <div class=\"filter-tabs\">\n        <div class=\"tab active\" onclick=\"setFiltro('todos', this)\">Todos</div>\n        <div class=\"tab\" onclick=\"setFiltro('PRONTA', this)\">\ud83d\udd25 Prontas</div>\n        <div class=\"tab\" onclick=\"setFiltro('PAGO', this)\">\ud83d\udcb0 Pagos</div>\n        <div class=\"tab\" onclick=\"setFiltro('AQUECIDA', this)\">\u26a1 Quentes</div>\n      </div>\n    </div>\n    <div class=\"contacts-list\" id=\"contacts-list\">\n      <div class=\"loading\"><div class=\"spinner\"></div> Carregando...</div>\n    </div>\n  </div>\n\n  <!-- CHAT -->\n  <div class=\"chat-area\">\n    <div id=\"chat-header\" class=\"chat-header\" style=\"display:none\">\n      <div class=\"chat-avatar\" id=\"chat-avatar\">A</div>\n      <div class=\"chat-info\">\n        <div class=\"chat-name\" id=\"chat-name\">-</div>\n        <div class=\"chat-phone\" id=\"chat-phone\">-</div>\n      </div>\n      <div class=\"chat-tags\">\n        <span class=\"tag tag-interesse\" id=\"chat-interesse\"></span>\n        <span class=\"tag tag-canal\" id=\"chat-canal\"></span>\n        <span class=\"status-badge\" id=\"chat-status\"></span>\n      </div>\n    </div>\n\n    <div id=\"messages-area\" class=\"messages\">\n      <div class=\"empty-state\">\n        <div class=\"empty-icon\">\ud83c\udf38</div>\n        <div class=\"empty-title\">Selecione uma conversa</div>\n        <div class=\"empty-subtitle\">Escolha um contato ao lado para ver o hist\u00f3rico completo</div>\n      </div>\n    </div>\n\n    <div class=\"stats-bar\" id=\"stats-bar\">\n      <div class=\"stat\">Total: <strong id=\"stat-total\">-</strong></div>\n      <div class=\"stat\">Prontas: <strong id=\"stat-pronta\">-</strong></div>\n      <div class=\"stat\">Pagas: <strong id=\"stat-pago\">-</strong></div>\n      <div class=\"stat\">Hoje: <strong id=\"stat-hoje\">-</strong></div>\n    </div>\n  </div>\n</div>\n\n<script>\nconst BASE = \"https://meu-chatbot-ia-production.up.railway.app\";\nconst SENHA = \"escola2024\";\n\nlet todosLeads = [];\nlet todosLogs = {};\nlet filtroAtivo = \"todos\";\nlet contatoAtivo = null;\n\nfunction formatarTelefone(num) {\n  if (!num) return \"-\";\n  const n = num.replace(/\\D/g, \"\");\n  if (n.length === 13) return `+${n.slice(0,2)} (${n.slice(2,4)}) ${n.slice(4,9)}-${n.slice(9)}`;\n  if (n.length === 12) return `+${n.slice(0,2)} (${n.slice(2,4)}) ${n.slice(4,8)}-${n.slice(8)}`;\n  return num;\n}\n\nfunction formatarHora(ts) {\n  if (!ts) return \"\";\n  const d = new Date(ts);\n  return d.toLocaleString(\"pt-BR\", { day:\"2-digit\", month:\"2-digit\", hour:\"2-digit\", minute:\"2-digit\" });\n}\n\nfunction inicialDe(nome) {\n  if (!nome || nome === \"N\u00e3o informado\") return \"?\";\n  return nome.trim()[0].toUpperCase();\n}\n\nasync function carregarDados() {\n  try {\n    const [leadsRes, logsRes] = await Promise.all([\n      fetch(`${BASE}/leads?senha=${SENHA}`),\n      fetch(`${BASE}/logs?senha=${SENHA}`)\n    ]);\n    const leadsData = await leadsRes.json();\n    const logsData = await logsRes.json();\n\n    todosLeads = leadsData.leads || [];\n    todosLogs = {};\n    (logsData.usuarios || []).forEach(u => { todosLogs[u.userId] = u; });\n\n    atualizarStats();\n    renderContatos();\n    document.getElementById(\"status-text\").textContent = `${todosLeads.length} contatos \u00b7 ${new Date().toLocaleTimeString(\"pt-BR\")}`;\n  } catch (e) {\n    document.getElementById(\"status-text\").textContent = \"Erro ao carregar \u2014 verifique a URL\";\n    document.getElementById(\"contacts-list\").innerHTML = `<div class=\"no-contacts\">\u274c N\u00e3o foi poss\u00edvel conectar ao servidor</div>`;\n  }\n}\n\nfunction atualizarStats() {\n  const hoje = new Date().toDateString();\n  document.getElementById(\"stat-total\").textContent = todosLeads.length;\n  document.getElementById(\"stat-pronta\").textContent = todosLeads.filter(l => l.status === \"PRONTA\").length;\n  document.getElementById(\"stat-pago\").textContent = todosLeads.filter(l => l.status === \"PAGO\" || l.status === \"COMPROVANTE_ENVIADO\").length;\n  document.getElementById(\"stat-hoje\").textContent = todosLeads.filter(l => new Date(l.timestamp).toDateString() === hoje).length;\n}\n\nfunction setFiltro(f, el) {\n  filtroAtivo = f;\n  document.querySelectorAll(\".tab\").forEach(t => t.classList.remove(\"active\"));\n  el.classList.add(\"active\");\n  renderContatos();\n}\n\nfunction filtrar() { renderContatos(); }\n\nfunction renderContatos() {\n  const busca = document.getElementById(\"search\").value.toLowerCase();\n  let lista = todosLeads;\n\n  if (filtroAtivo !== \"todos\") lista = lista.filter(l => l.status === filtroAtivo);\n  if (busca) lista = lista.filter(l =>\n    (l.nome || \"\").toLowerCase().includes(busca) ||\n    (l.contato || \"\").includes(busca)\n  );\n\n  const el = document.getElementById(\"contacts-list\");\n  if (lista.length === 0) {\n    el.innerHTML = `<div class=\"no-contacts\">Nenhum contato encontrado</div>`;\n    return;\n  }\n\n  el.innerHTML = lista.map(lead => {\n    const logInfo = todosLogs[lead.userId] || {};\n    const preview = logInfo.ultima ? `\u00daltima msg: ${formatarHora(logInfo.ultima)}` : \"Sem mensagens registradas\";\n    const isActive = contatoAtivo === lead.userId ? \"active\" : \"\";\n    return `\n      <div class=\"contact-item ${isActive}\" onclick=\"abrirConversa('${lead.userId}')\">\n        <div class=\"contact-name\">${lead.nome || \"Sem nome\"}</div>\n        <div class=\"contact-phone\">${formatarTelefone(lead.contato)}</div>\n        <div class=\"contact-preview\">${preview}</div>\n        <div class=\"contact-meta\">\n          <span class=\"status-badge status-${lead.status || 'CURIOSA'}\">${lead.status || \"CURIOSA\"}</span>\n          <span class=\"contact-time\">${formatarHora(lead.timestamp)}</span>\n        </div>\n      </div>\n    `;\n  }).join(\"\");\n}\n\nasync function abrirConversa(userId) {\n  contatoAtivo = userId;\n  renderContatos();\n\n  const lead = todosLeads.find(l => l.userId === userId) || {};\n\n  // Header\n  document.getElementById(\"chat-header\").style.display = \"flex\";\n  document.getElementById(\"chat-avatar\").textContent = inicialDe(lead.nome);\n  document.getElementById(\"chat-name\").textContent = lead.nome || \"Sem nome\";\n  document.getElementById(\"chat-phone\").textContent = formatarTelefone(lead.contato);\n  document.getElementById(\"chat-interesse\").textContent = lead.interesse || \"Interesse n\u00e3o identificado\";\n  document.getElementById(\"chat-canal\").textContent = lead.plataforma || \"desconhecido\";\n  const statusEl = document.getElementById(\"chat-status\");\n  statusEl.textContent = lead.status || \"CURIOSA\";\n  statusEl.className = `status-badge status-${lead.status || \"CURIOSA\"}`;\n\n  // Mensagens\n  const area = document.getElementById(\"messages-area\");\n  area.innerHTML = `<div class=\"loading\"><div class=\"spinner\"></div> Carregando conversa...</div>`;\n\n  try {\n    const res = await fetch(`${BASE}/logs?senha=${SENHA}&userId=${userId}`);\n    const data = await res.json();\n    const logs = data.logs || [];\n\n    if (logs.length === 0) {\n      area.innerHTML = `<div class=\"empty-state\"><div class=\"empty-icon\">\ud83d\udcac</div><div class=\"empty-title\">Sem mensagens registradas</div><div class=\"empty-subtitle\">As mensagens aparecem aqui em tempo real</div></div>`;\n      return;\n    }\n\n    area.innerHTML = logs.map(msg => {\n      const isAna = msg.role === \"assistant\";\n      const label = isAna ? `<div class=\"ana-label\">Ana</div>` : \"\";\n      return `\n        <div class=\"msg-group\">\n          ${label}\n          <div class=\"msg-row ${msg.role}\">\n            <div class=\"msg-bubble\">${msg.texto}</div>\n          </div>\n          <div class=\"msg-time\">${formatarHora(msg.timestamp)}</div>\n        </div>\n      `;\n    }).join(\"\");\n\n    area.scrollTop = area.scrollHeight;\n  } catch (e) {\n    area.innerHTML = `<div class=\"empty-state\"><div class=\"empty-icon\">\u274c</div><div class=\"empty-title\">Erro ao carregar</div></div>`;\n  }\n}\n\nfunction recarregar() {\n  document.getElementById(\"status-text\").textContent = \"Atualizando...\";\n  carregarDados();\n  if (contatoAtivo) setTimeout(() => abrirConversa(contatoAtivo), 800);\n}\n\n// Auto-atualiza a cada 30s\ncarregarDados();\nsetInterval(recarregar, 30000);\n</script>\n</body>\n</html>\n");
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
