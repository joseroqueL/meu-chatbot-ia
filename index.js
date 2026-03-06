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
NUNCA use palavras com conotação sensual: gostoso, delícia, ardente, sedutora, provocante, quente, sensual, irresistível, excitante, voluptuosa.
O tom é sempre acolhedor, feminino e empoderador — nunca sugestivo.
Use: florescer, reconectar, despertar, essência, presença, leveza, cuidado, acolhimento, amor-próprio, potência feminina, consciência corporal.

# COMO SE COMUNICAR
- Tom: acolhedor, feminino, íntimo. Nunca frio, nunca invasivo.
- Emojis com moderação (🤍🦋🌸💜)
- Mensagens CURTAS — máximo 3 linhas. Nunca blocos longos.
- Sempre pergunte o que a mulher busca antes de oferecer serviços.
- Nunca pressione. Convide com suavidade.
- Sempre termine com um próximo passo claro.

# DIRECIONAMENTO PARA AÇÃO
1. AULA DE SÁBADO — interesse em dança, bem-estar ou experimentar presencialmente
2. EQUIPE HUMANA — terapia, jurídico, aula particular, formação, curso online

# AULA DE SÁBADO — AGENDE E COBRE DIRETO
Se demonstrar interesse:
1. "Ótimo! Vou reservar sua vaga para o sábado 🌸"
2. Envie o PIX assim:

💳 *PIX — Escola de Amor-Próprio*

Titular: Escola de Amor-Próprio Amor Próprio
CNPJ: 21.172.163/0001-21
*Chave PIX:* 21172163000121
Valor: R$ 97,00

_Após o pagamento, envie o comprovante aqui para garantir sua vaga_ 🤍

3. Aguarde o comprovante.
4. Ao receber: "Vaga confirmada! Te esperamos sábado 🌸"
5. OBRIGATÓRIO ao confirmar: inclua [PAGO] na resposta.

# EQUIPE HUMANA
Para terapia, jurídico, particular, formação ou curso online:
"Nossa equipe vai te ajudar 🤍 WhatsApp: (91) 98134-7134"

# SITUAÇÕES SENSÍVEIS
DEPRESSÃO: Acolha. A Escola complementa o tratamento médico. Nunca contradiga médico.
CORPO/AUTOESTIMA: Todos os corpos são bem-vindos. A dança celebra a mulher como ela é.
SEM DINHEIRO: Aula avulsa R$97, parcelamento no cartão, plano semestral R$250.
É PSICÓLOGA?: Não é CRP, mas tem pós-graduação e quase 20 anos de experiência clínica.

# FLUXO
1. Acolha e pergunte o que trouxe a mulher.
2. Identifique o serviço mais adequado.
3. Apresente o benefício, não o preço.
4. Direcione para ação (sábado ou equipe).
5. Encerre com acolhimento, nunca com pressão.

# CAPTURA DE LEAD
Inclua ao final de cada resposta quando tiver dados da pessoa:
[LEAD: nome=X | contato=Y | interesse=Z | status=CURIOSA ou AQUECIDA ou PRONTA]

# OBJEÇÕES
- "Caro": R$ 97 experimenta sem compromisso. Vira crédito na matrícula!
- "Pensar": Sem pressa. Posso reservar sua vaga enquanto decide? 🌸
- "Sem tempo": 1h30 de manhã — um momento só seu 💜
- "Não sei se é pra mim": Se chegou até aqui, parte de você já sabe. O que está sentindo?
`;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "meu_token_secreto";
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const LEADS_PASSWORD = process.env.LEADS_PASSWORD || "escola2024";

const DB_LEADS = path.join("/tmp", "leads.json");
const DB_LOGS = path.join("/tmp", "logs.json");

function lerDB(arquivo) {
  try { if (fs.existsSync(arquivo)) return JSON.parse(fs.readFileSync(arquivo, "utf8")); }
  catch (e) {}
  return {};
}

function salvarDB(arquivo, dados) {
  try { fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2)); }
  catch (e) { console.error("Erro salvar DB:", e.message); }
}

let leadsDB = lerDB(DB_LEADS);
let logsDB = lerDB(DB_LOGS);

const rateLimits = {};
function checarRateLimit(userId) {
  const agora = Date.now();
  if (!rateLimits[userId]) rateLimits[userId] = { count: 0, inicio: agora };
  if (agora - rateLimits[userId].inicio > 60000) rateLimits[userId] = { count: 0, inicio: agora };
  rateLimits[userId].count++;
  if (rateLimits[userId].count > 10) return false;
  return true;
}

const conversas = {};
const retomadaTimers = {};

function getConversa(userId) {
  if (!conversas[userId]) conversas[userId] = [];
  return conversas[userId];
}

function addMensagem(userId, role, content) {
  const hist = getConversa(userId);
  hist.push({ role, content });
  if (hist.length > 30) hist.splice(0, hist.length - 30);
}

function registrarLog(userId, role, texto, plataforma) {
  if (!logsDB[userId]) logsDB[userId] = [];
  logsDB[userId].push({ role, texto, plataforma, timestamp: new Date().toISOString() });
  if (logsDB[userId].length > 50) logsDB[userId].splice(0, logsDB[userId].length - 50);
  salvarDB(DB_LOGS, logsDB);
}

async function enviarMensagemTelegram(texto) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: texto, parse_mode: "Markdown" })
    });
  } catch (e) { console.error("Erro Telegram:", e.message); }
}

async function enviarFotoTelegram(imageUrl, caption) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const imgRes = await fetch(imageUrl, {
      headers: { "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}` }
    });
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const boundary = "Boundary" + Date.now();
    const header = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${TELEGRAM_CHAT_ID}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="comprovante.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body: Buffer.concat([header, buffer, footer])
    });
    console.log("Comprovante enviado ao Telegram");
  } catch (e) {
    console.error("Erro foto Telegram:", e.message);
    await enviarMensagemTelegram(caption + "\n\n_(imagem não pôde ser encaminhada)_");
  }
}

async function alertaNovoLead(lead) {
  await enviarMensagemTelegram(
    `🌸 *NOVO CONTATO*\n\n` +
    `👤 Nome: ${lead.nome || "Não informado"}\n` +
    `📱 Telefone: ${lead.contato || "Não informado"}\n` +
    `💜 Interesse: ${lead.interesse || "Não informado"}\n` +
    `📲 Canal: ${lead.plataforma || "Desconhecido"}\n` +
    `🕐 ${new Date().toLocaleString("pt-BR")}\n\n_Acompanhe!_ 💛`
  );
}

async function alertaLeadPronto(lead) {
  await enviarMensagemTelegram(
    `🔥 *LEAD PRONTO PARA FECHAR!*\n\n` +
    `👤 Nome: ${lead.nome || "Não informado"}\n` +
    `📱 Telefone: ${lead.contato || "Não informado"}\n` +
    `💜 Interesse: ${lead.interesse || "Não informado"}\n` +
    `🕐 ${new Date().toLocaleString("pt-BR")}\n\n_Entre em contato agora!_ 🚀`
  );
}

async function alertaPagamento(lead) {
  await enviarMensagemTelegram(
    `💰 *PAGAMENTO CONFIRMADO!* 🎉\n\n` +
    `👤 Nome: ${lead.nome || "Não informado"}\n` +
    `📱 Telefone: ${lead.contato || "Não informado"}\n` +
    `💜 Serviço: Aula de Sábado — R$ 97,00\n` +
    `🕐 ${new Date().toLocaleString("pt-BR")}\n\n✅ _Vaga confirmada pela Ana!_`
  );
}

async function processarImagem(userId, imageId) {
  try {
    const mediaRes = await fetch(`https://graph.facebook.com/v18.0/${imageId}`, {
      headers: { "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}` }
    });
    const mediaData = await mediaRes.json();

    const lead = leadsDB[userId] || {};
    const caption =
      `📎 *COMPROVANTE RECEBIDO*\n\n` +
      `👤 ${lead.nome || "Não identificado"}\n` +
      `📱 ${lead.contato || userId}\n` +
      `💜 ${lead.interesse || "Aula de Sábado"}\n` +
      `🕐 ${new Date().toLocaleString("pt-BR")}\n\n_Verifique e confirme a vaga!_ 🌸`;

    await enviarFotoTelegram(mediaData.url, caption);

    if (leadsDB[userId]) {
      leadsDB[userId].status = "COMPROVANTE_ENVIADO";
      leadsDB[userId].comprovante = new Date().toISOString();
      salvarDB(DB_LEADS, leadsDB);
    }

    return "Recebi seu comprovante! ✅ Vaga confirmada para o sábado 🌸 Te esperamos! Qualquer dúvida sobre endereço ou horário, é só falar 💜";
  } catch (e) {
    console.error("Erro comprovante:", e.message);
    return "Recebi sua imagem 🤍 Vou confirmar com a equipe e retorno em breve!";
  }
}

async function chamarIA(userId, mensagemUsuario, plataforma = "desconhecida") {
  registrarLog(userId, "user", mensagemUsuario, plataforma);
  addMensagem(userId, "user", mensagemUsuario);

  if (!leadsDB[userId]) {
    leadsDB[userId] = { userId, contato: userId, plataforma, status: "CURIOSA", timestamp: new Date().toISOString() };
    salvarDB(DB_LEADS, leadsDB);
    await alertaNovoLead(leadsDB[userId]);
    console.log("Novo lead:", userId);
  }

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
      console.error("Erro Anthropic:", await response.json());
    } else {
      const data = await response.json();
      resposta = data.content?.[0]?.text || resposta;
    }
  } catch (e) { console.error("Erro IA:", e.message); }

  if (resposta.includes("[PAGO]")) {
    resposta = resposta.replace("[PAGO]", "").trim();
    leadsDB[userId].status = "PAGO";
    leadsDB[userId].pagamento = new Date().toISOString();
    salvarDB(DB_LEADS, leadsDB);
    await alertaPagamento(leadsDB[userId]);
  }

  const leadMatch = resposta.match(/\[LEAD:\s*([^\]]+)\]/i);
  if (leadMatch) {
    try {
      const extras = {};
      leadMatch[1].split("|").forEach(part => {
        const [k, v] = part.split("=").map(s => s.trim());
        if (k && v) extras[k.toLowerCase()] = v;
      });
      const statusAnterior = leadsDB[userId]?.status;
      leadsDB[userId] = { ...leadsDB[userId], ...extras, contato: leadsDB[userId]?.contato || userId, userId };
      salvarDB(DB_LEADS, leadsDB);
      if (extras.status === "PRONTA" && statusAnterior !== "PRONTA" && statusAnterior !== "PAGO") {
        await alertaLeadPronto(leadsDB[userId]);
      }
    } catch (e) { console.error("Erro lead:", e.message); }
    resposta = resposta.replace(leadMatch[0], "").trim();
  }

  registrarLog(userId, "assistant", resposta, plataforma);
  addMensagem(userId, "assistant", resposta);
  return resposta;
}

function agendarRetomada(userId, sendFn) {
  if (retomadaTimers[userId]) clearTimeout(retomadaTimers[userId]);
  retomadaTimers[userId] = setTimeout(async () => {
    if (leadsDB[userId]) {
      try { await sendFn("Ainda estou aqui, caso queira continuar 🌸 Sem pressa."); }
      catch (e) { console.error("Erro retomada:", e.message); }
    }
  }, 10 * 60 * 1000);
}

app.get("/webhook/whatsapp", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) res.send(req.query["hub.challenge"]);
  else res.sendStatus(403);
});

app.post("/webhook/whatsapp", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const msg = changes?.value?.messages?.[0];
    if (!msg) return res.sendStatus(200);

    const userId = msg.from;
    const phoneNumberId = changes.value.metadata.phone_number_id;
    if (!checarRateLimit(userId)) return res.sendStatus(200);

    const sendFn = async (text) => {
      const r = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}` },
        body: JSON.stringify({ messaging_product: "whatsapp", to: userId, text: { body: text } })
      });
      const json = await r.json();
      if (r.status !== 200) console.error("[WA] Erro:", JSON.stringify(json));
    };

    if (msg.type === "image") {
      const resposta = await processarImagem(userId, msg.image.id);
      await sendFn(resposta);
      return res.sendStatus(200);
    }

    if (msg.type !== "text") return res.sendStatus(200);

    const resposta = await chamarIA(userId, msg.text.body, "whatsapp");
    await sendFn(resposta);
    agendarRetomada(userId, sendFn);
    res.sendStatus(200);
  } catch (err) { console.error("Erro WhatsApp:", err); res.sendStatus(500); }
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
    if (!checarRateLimit(userId)) return res.sendStatus(200);
    const sendFn = async (text) => {
      await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.INSTAGRAM_TOKEN}` },
        body: JSON.stringify({ recipient: { id: userId }, message: { text } })
      });
    };
    const resposta = await chamarIA(userId, messaging.message.text, "instagram");
    await sendFn(resposta);
    agendarRetomada(userId, sendFn);
    res.sendStatus(200);
  } catch (err) { console.error("Erro Instagram:", err); res.sendStatus(500); }
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
    if (!checarRateLimit(userId)) return res.sendStatus(200);
    const sendFn = async (text) => {
      await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.FACEBOOK_TOKEN}` },
        body: JSON.stringify({ recipient: { id: userId }, message: { text } })
      });
    };
    const resposta = await chamarIA(userId, messaging.message.text, "facebook");
    await sendFn(resposta);
    agendarRetomada(userId, sendFn);
    res.sendStatus(200);
  } catch (err) { console.error("Erro Facebook:", err); res.sendStatus(500); }
});

app.get("/leads", (req, res) => {
  if (req.query.senha !== LEADS_PASSWORD) return res.status(401).json({ erro: "Senha incorreta." });
  leadsDB = lerDB(DB_LEADS);
  const lista = Object.values(leadsDB).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({ total: lista.length, leads: lista });
});

app.get("/logs", (req, res) => {
  if (req.query.senha !== LEADS_PASSWORD) return res.status(401).json({ erro: "Senha incorreta." });
  logsDB = lerDB(DB_LOGS);
  if (req.query.userId) return res.json({ logs: logsDB[req.query.userId] || [] });
  const resumo = Object.entries(logsDB).map(([userId, msgs]) => ({
    userId, totalMensagens: msgs.length, ultima: msgs[msgs.length - 1]?.timestamp
  }));
  res.json({ totalUsuarios: resumo.length, usuarios: resumo });
});

app.get("/", (req, res) => {
  res.json({ status: "Ana no ar ✅", escola: "Escola de Amor-Próprio", leads: Object.keys(leadsDB).length, conversasAtivas: Object.keys(conversas).length });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Ana rodando na porta ${PORT}`));
