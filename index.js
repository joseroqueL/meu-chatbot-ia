const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
app.use(express.json());

// ============================================
// CONFIGURAÇÃO — EDITE AQUI
// ============================================
const IA_NOME = "Ana";
const IA_TOM = "acolhedor, gentil, feminino e empoderador";

const IA_INSTRUCOES = `
Você é Ana, assistente virtual da Escola de Amor-Próprio de Ludmilla Raissuli.

SOBRE A ESCOLA:
Fundada em 2010 em Belém do Pará. Conduz mulheres através de fragilidade, medo e insegurança, reconectando-as com sua força interior e potência feminina — através do corpo, escuta e autoconhecimento.

SOBRE LUDMILLA RAISSULI:
Terapeuta Junguiana, Hipnoterapeuta, Professora de Dança do Ventre com Método Próprio, formada pelo Método Heal Your Life (Louise Hay/Lisboa), Facilitadora de Círculos de Mulheres há +15 anos, Pós-Graduada em Psicologia Positiva.

SERVIÇOS:
1. TERAPIA DO AMOR-PRÓPRIO — reconectar com a essência, curar feridas emocionais (relacionamentos, sexualidade, maternidade, separações, inseguranças, cansaço emocional)
2. FORMAÇÃO DO FEMININO — processo terapêutico profundo para mulheres desconectadas do próprio corpo e sensibilidade
3. CURSO DE DANÇA DO VENTRE ONLINE — Método Exclusivo Ludmilla Raissuli, do zero, desenvolve presença, autoestima e consciência corporal
4. VIVÊNCIA PRESENCIAL — aulas de Dança do Ventre em Belém-PA
5. CONSULTORIA JURÍDICA PARA MULHERES — orientação jurídica humanizada: separação, divórcio, guarda de filhos, pensão alimentícia, partilha de bens, violência doméstica

PERGUNTAS ESTRATÉGICAS POR SERVIÇO:
- Interesse em terapia/cura emocional: "Você sente que perdeu a conexão consigo mesma ou está carregando algo que pesa há tempo?"
- Interesse em dança: "Você quer dançar por prazer, ou pensa em ensinar também?"
- Mencionar separação, divórcio, guarda, pensão ou violência: "Você já tem um advogado ou ainda está buscando orientação sobre seus direitos?"
- Sem saber o que quer: "O que te trouxe até aqui — foi uma busca por cuidado, por movimento, ou por proteção?"

QUALIFICAÇÃO:
- CURIOSA: só conhecendo → apresente com leveza
- AQUECIDA: tem dor mas hesita → valide e apresente o serviço certo
- PRONTA: quer agir → direcione direto para o contato

RESPOSTAS PARA OBJEÇÕES:
- "Está caro": "Entendo. Quer que eu te conte o que está incluído? Às vezes o valor faz mais sentido quando a gente vê o que transforma 🌸"
- "Preciso pensar": "Claro, sem pressa. Posso te deixar o contato direto da Ludmilla para quando você sentir que é a hora?"
- "Não tenho tempo": "O curso online foi feito exatamente pra isso — você estuda no seu ritmo, quando puder 💛"
- "Não sei se é pra mim": "Se você chegou até aqui, alguma parte de você já sabe. O que está sentindo?"

CAPTURA DE LEAD:
Quando a mulher demonstrar interesse real (perguntou sobre preço, pediu mais info, deu contato), colete nome, WhatsApp ou e-mail e serviço de interesse.
SEMPRE que coletar esses dados, inclua OBRIGATORIAMENTE ao final da resposta:
[LEAD: nome=X | contato=Y | interesse=Z | status=AQUECIDA ou PRONTA]

CONTATO DA ESCOLA:
- WhatsApp: (91) 98134-7134
- E-mail: escoladeamorproprio@gmail.com
- Site: escoladeamorproprio.com.br

REGRAS:
- Pergunte o nome no início
- Respostas CURTAS — máximo 3 linhas
- Após 1-2 mensagens já indica o serviço e convida para ação
- Sempre termine com chamada para ação clara
- Não filosofe — acolha em 1 frase e direcione
- Nunca dê diagnósticos médicos/psicológicos
- Tom: caloroso e direto — amiga que cuida E que sabe o que você precisa
`;

// ============================================
// VARIÁVEIS DE AMBIENTE
// ============================================
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "meu_token_secreto";
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const LEADS_PASSWORD = process.env.LEADS_PASSWORD || "escola2024";

// ============================================
// BANCO DE DADOS LOCAL (arquivo JSON)
// Persiste leads e logs mesmo após reiniciar
// ============================================
const DB_LEADS = path.join("/tmp", "leads.json");
const DB_LOGS = path.join("/tmp", "logs.json");

function lerDB(arquivo) {
  try {
    if (fs.existsSync(arquivo)) {
      return JSON.parse(fs.readFileSync(arquivo, "utf8"));
    }
  } catch (e) {}
  return {};
}

function salvarDB(arquivo, dados) {
  try {
    fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2));
  } catch (e) {
    console.error("Erro ao salvar DB:", e.message);
  }
}

let leadsDB = lerDB(DB_LEADS);
let logsDB = lerDB(DB_LOGS);

// ============================================
// PROTEÇÃO ANTI-SPAM
// ============================================
const rateLimits = {};

function checarRateLimit(userId) {
  const agora = Date.now();
  if (!rateLimits[userId]) rateLimits[userId] = { count: 0, inicio: agora };

  // Reset a cada minuto
  if (agora - rateLimits[userId].inicio > 60 * 1000) {
    rateLimits[userId] = { count: 0, inicio: agora };
  }

  rateLimits[userId].count++;

  // Máximo 10 mensagens por minuto por usuário
  if (rateLimits[userId].count > 10) {
    console.warn(`Rate limit atingido para userId: ${userId}`);
    return false;
  }
  return true;
}

// ============================================
// MEMÓRIA DE CONVERSAS (sessão)
// ============================================
const conversas = {};
const retomadaTimers = {};

function getConversa(userId) {
  if (!conversas[userId]) conversas[userId] = [];
  return conversas[userId];
}

function addMensagem(userId, role, content) {
  const hist = getConversa(userId);
  hist.push({ role, content });
  // Mantém apenas as últimas 30 mensagens
  if (hist.length > 30) hist.splice(0, hist.length - 30);
}

// ============================================
// LOG DE CONVERSAS
// ============================================
function registrarLog(userId, role, texto, plataforma) {
  if (!logsDB[userId]) logsDB[userId] = [];
  logsDB[userId].push({
    role,
    texto,
    plataforma,
    timestamp: new Date().toISOString()
  });
  // Mantém apenas últimas 50 mensagens por usuário no log
  if (logsDB[userId].length > 50) logsDB[userId].splice(0, logsDB[userId].length - 50);
  salvarDB(DB_LOGS, logsDB);
}

// ============================================
// TELEGRAM — ALERTA DE LEAD
// ============================================
async function enviarAlertaTelegram(lead) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const msg =
      `🌸 *NOVO LEAD — Escola de Amor-Próprio*\n\n` +
      `👤 Nome: ${lead.nome || "Não informado"}\n` +
      `📱 Contato: ${lead.contato || "Não informado"}\n` +
      `💜 Interesse: ${lead.interesse || "Não informado"}\n` +
      `🔥 Status: ${lead.status || "AQUECIDA"}\n` +
      `📲 Plataforma: ${lead.plataforma || "Desconhecida"}\n` +
      `🕐 Horário: ${new Date().toLocaleString("pt-BR")}\n\n` +
      `_Entre em contato o quanto antes!_ 💛`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: msg,
        parse_mode: "Markdown"
      })
    });
  } catch (e) {
    console.error("Erro Telegram:", e.message);
  }
}

// ============================================
// MENSAGEM DE RETOMADA (10 min sem resposta)
// ============================================
function agendarRetomada(userId, sendFn) {
  if (retomadaTimers[userId]) clearTimeout(retomadaTimers[userId]);
  retomadaTimers[userId] = setTimeout(async () => {
    // Verifica se tem lead salvo para esse userId
    const temLead = Object.values(leadsDB).some(l => l.userId === userId);
    if (temLead) {
      try {
        await sendFn("Ainda estou aqui, caso queira continuar 🌸 Sem pressa.");
      } catch (e) {
        console.error("Erro retomada:", e.message);
      }
    }
  }, 10 * 60 * 1000);
}

// ============================================
// CHAMAR A IA
// ============================================
async function chamarIA(userId, mensagemUsuario, plataforma = "desconhecida") {
  // Log da mensagem do usuário
  registrarLog(userId, "user", mensagemUsuario, plataforma);
  addMensagem(userId, "user", mensagemUsuario);

  let resposta = "Desculpe, tive um problema técnico. Tente novamente em instantes 🌸";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `Você é ${IA_NOME}, atendente virtual com tom ${IA_TOM}.\n${IA_INSTRUCOES}`,
        messages: getConversa(userId)
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Erro Anthropic:", err);
      // Mantém mensagem amigável para o usuário
    } else {
      const data = await response.json();
      resposta = data.content?.[0]?.text || resposta;
    }
  } catch (e) {
    console.error("Erro ao chamar IA:", e.message);
  }

  // Extrair e salvar lead da resposta
  const leadMatch = resposta.match(/\[LEAD:\s*([^\]]+)\]/i);
  if (leadMatch) {
    try {
      const lead = { plataforma };
      leadMatch[1].split("|").forEach(part => {
        const [key, val] = part.split("=").map(s => s.trim());
        if (key && val) lead[key.toLowerCase()] = val;
      });

      const chave = lead.contato || lead.nome || userId;
      if (!leadsDB[chave]) {
        leadsDB[chave] = { ...lead, userId, timestamp: new Date().toISOString() };
        salvarDB(DB_LEADS, leadsDB);
        await enviarAlertaTelegram(lead);
        console.log("Lead salvo:", chave);
      }
    } catch (e) {
      console.error("Erro ao processar lead:", e.message);
    }

    // Remove tag oculta da resposta
    resposta = resposta.replace(leadMatch[0], "").trim();
  }

  // Log da resposta da IA
  registrarLog(userId, "assistant", resposta, plataforma);
  addMensagem(userId, "assistant", resposta);
  return resposta;
}

// ============================================
// WEBHOOK — WHATSAPP
// ============================================
app.get("/webhook/whatsapp", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook/whatsapp", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const msg = changes?.value?.messages?.[0];
    if (!msg || msg.type !== "text") return res.sendStatus(200);

    const userId = msg.from;
    const texto = msg.text.body;
    const phoneNumberId = changes.value.metadata.phone_number_id;

    if (!checarRateLimit(userId)) return res.sendStatus(200);

    const sendFn = async (text) => {
      await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: userId,
          text: { body: text }
        })
      });
    };

    const resposta = await chamarIA(userId, texto, "whatsapp");
    await sendFn(resposta);
    agendarRetomada(userId, sendFn);
    res.sendStatus(200);
  } catch (err) {
    console.error("Erro WhatsApp:", err);
    res.sendStatus(500);
  }
});

// ============================================
// WEBHOOK — INSTAGRAM
// ============================================
app.get("/webhook/instagram", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook/instagram", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const messaging = entry?.messaging?.[0];
    if (!messaging?.message?.text) return res.sendStatus(200);

    const userId = messaging.sender.id;
    const texto = messaging.message.text;

    if (!checarRateLimit(userId)) return res.sendStatus(200);

    const sendFn = async (text) => {
      await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.INSTAGRAM_TOKEN}`
        },
        body: JSON.stringify({
          recipient: { id: userId },
          message: { text }
        })
      });
    };

    const resposta = await chamarIA(userId, texto, "instagram");
    await sendFn(resposta);
    agendarRetomada(userId, sendFn);
    res.sendStatus(200);
  } catch (err) {
    console.error("Erro Instagram:", err);
    res.sendStatus(500);
  }
});

// ============================================
// WEBHOOK — FACEBOOK MESSENGER
// ============================================
app.get("/webhook/facebook", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook/facebook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const messaging = entry?.messaging?.[0];
    if (!messaging?.message?.text) return res.sendStatus(200);

    const userId = messaging.sender.id;
    const texto = messaging.message.text;

    if (!checarRateLimit(userId)) return res.sendStatus(200);

    const sendFn = async (text) => {
      await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.FACEBOOK_TOKEN}`
        },
        body: JSON.stringify({
          recipient: { id: userId },
          message: { text }
        })
      });
    };

    const resposta = await chamarIA(userId, texto, "facebook");
    await sendFn(resposta);
    agendarRetomada(userId, sendFn);
    res.sendStatus(200);
  } catch (err) {
    console.error("Erro Facebook:", err);
    res.sendStatus(500);
  }
});

// ============================================
// ROTA DE LEADS — protegida por senha
// Acesse: /leads?senha=escola2024
// ============================================
app.get("/leads", (req, res) => {
  if (req.query.senha !== LEADS_PASSWORD) {
    return res.status(401).json({ erro: "Senha incorreta." });
  }
  leadsDB = lerDB(DB_LEADS); // recarrega do disco
  const lista = Object.values(leadsDB).sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );
  res.json({ total: lista.length, leads: lista });
});

// ============================================
// ROTA DE LOGS — protegida por senha
// Acesse: /logs?senha=escola2024&userId=NUMERO
// ============================================
app.get("/logs", (req, res) => {
  if (req.query.senha !== LEADS_PASSWORD) {
    return res.status(401).json({ erro: "Senha incorreta." });
  }
  logsDB = lerDB(DB_LOGS);
  if (req.query.userId) {
    return res.json({ logs: logsDB[req.query.userId] || [] });
  }
  const resumo = Object.entries(logsDB).map(([userId, msgs]) => ({
    userId,
    totalMensagens: msgs.length,
    ultima: msgs[msgs.length - 1]?.timestamp
  }));
  res.json({ totalUsuarios: resumo.length, usuarios: resumo });
});

// Rota de status
app.get("/", (req, res) => {
  res.json({
    status: "Ana no ar ✅",
    escola: "Escola de Amor-Próprio",
    leads: Object.keys(leadsDB).length,
    conversasAtivas: Object.keys(conversas).length
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Ana rodando na porta ${PORT}`));
