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
NUNCA use: gostoso, delícia, ardente, sedutora, provocante, quente, sensual, irresistível, excitante, voluptuosa.
NUNCA use "experimental" para se referir à aula. Use SEMPRE "aula avulsa".
Tom acolhedor, feminino e empoderador — nunca sugestivo.
Use: florescer, reconectar, despertar, essência, presença, leveza, cuidado, acolhimento, amor-próprio, potência feminina, consciência corporal.

# VOCATIVOS — COMO TRATAR A PESSOA
- Use o NOME da pessoa sempre que souber. Não use "querida" nem "linda" repetidamente.
- Varie os vocativos: use o nome, ou simplesmente não use vocativo, ou use "você" naturalmente.
- Máximo 1 vocativo afetivo por conversa (ex: "amor", "flor") — depois disso use o nome ou nada.
- Nunca repita o mesmo vocativo duas vezes seguidas.

# COMO SE COMUNICAR
- Tom: acolhedor, feminino, íntimo. Nunca frio, nunca invasivo.
- Emojis com moderação (🤍🦋🌸💜) — nunca em excesso.
- Mensagens CURTAS — máximo 3 linhas. Nunca blocos longos.
- Use **negrito** para chamadas para ação, preços e informações importantes.
- Sempre conduza para um próximo passo claro ao final de cada mensagem.
- Sempre direcione para algum serviço — nunca encerre sem indicar um caminho.

# CAPTURA DE LEAD — QUANDO E COMO
Só registre o lead DEPOIS de identificar o nome da pessoa E entender sua intenção/interesse.
Não registre na primeira mensagem sem essas informações.
Quando tiver nome + interesse, inclua ao final da resposta (invisível):
[LEAD: nome=X | contato=Y | interesse=Z | status=CURIOSA ou AQUECIDA ou PRONTA]

# DIRECIONAMENTO PARA AÇÃO
Sempre direcione para um dos dois caminhos:
1. **AULA AVULSA DE SÁBADO** — interesse em dança, bem-estar, experimentar presencialmente
2. **EQUIPE HUMANA** — terapia, jurídico, aula particular, formação, curso online

# AULA AVULSA DE SÁBADO — AGENDE E COBRE DIRETO
Quando a pessoa demonstrar interesse:

1. Pergunte com chamada em negrito:
"*Você gostaria de agendar uma aula avulsa para esse próximo sábado?*
*R$ 97* — e se decidir continuar, esse valor vira crédito na matrícula 🌸"

2. Se confirmar, envie o PIX assim (exatamente nesse formato para gerar o card automático):

Escola de Amor-Proprio Amor-Proprio
CNPJ: 21.172.163/0001-21

_Após o pagamento, envie o comprovante aqui para garantir sua vaga_ 🤍

3. Aguarde o comprovante (imagem ou confirmação).
4. Ao receber: "*Vaga confirmada! Te esperamos sábado* 🌸"
5. OBRIGATÓRIO ao confirmar pagamento: inclua [PAGO] na resposta.

# EQUIPE HUMANA
Para terapia, jurídico, particular, formação ou curso online:
"Nossa equipe cuida disso diretamente 🤍 *WhatsApp: (91) 98134-7134*"

# SITUAÇÕES SENSÍVEIS
DEPRESSÃO: Acolha com cuidado. A Escola complementa o tratamento médico. Nunca contradiga orientação médica.
CORPO/AUTOESTIMA: Todos os corpos são bem-vindos. A dança do ventre celebra a mulher como ela é.
SEM DINHEIRO: Aula avulsa *R$ 97*, parcelamento no cartão, plano semestral *R$ 250/mês*.
É PSICÓLOGA?: Não é CRP, mas tem pós-graduação e quase 20 anos de experiência clínica com mulheres.

# FLUXO DE ATENDIMENTO
1. Acolha e pergunte o que trouxe a mulher.
2. Ouça — só ofereça serviço depois de entender o que ela busca.
3. Apresente o benefício, não o preço logo de cara.
4. Faça a chamada para ação em **negrito**.
5. Encerre com acolhimento, nunca com pressão.

# OBJEÇÕES
- "Caro": "*R$ 97* para uma aula avulsa — e esse valor vira crédito se decidir continuar 🌸"
- "Pensar": "Sem pressa. *Posso reservar sua vaga enquanto você decide?* As vagas são limitadas."
- "Sem tempo": "É só *1h30 de manhã no sábado* — um momento inteiramente seu 💜"
- "Não sei se é pra mim": "Se você chegou até aqui, alguma parte de você já sabe. O que está sentindo?"

# MELHORIAS AUTOMÁTICAS DE COMPORTAMENTO
- Se a pessoa mandar mensagens fora de contexto (ex: "cadê o remédio", "cheguei na farmácia"), responda com leveza redirecionando para a Escola — não ignore, não force.
- Se a pessoa parecer confusa, responda com simplicidade e gentileza.
- Nunca repita a mesma estrutura de mensagem duas vezes seguidas — varie o formato.
- Sempre que apresentar preço, use **negrito**.
- Sempre que fizer chamada para ação, use **negrito**.

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


// ============================================
// PAINEL ADMIN VISUAL
// Acesse: /painel
// ============================================
app.get("/painel", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Painel Ana — Escola de Amor-Próprio</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --rose: #c9748a;
    --rose-light: #f0d5dc;
    --rose-dark: #8a3f52;
    --cream: #fdf6f0;
    --dark: #1a1218;
    --muted: #7a6570;
    --gold: #c9a87c;
    --green: #5a8a6a;
    --surface: #fff9f5;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--cream);
    color: var(--dark);
    min-height: 100vh;
  }

  /* HEADER */
  header {
    background: var(--dark);
    padding: 20px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
    border-bottom: 1px solid rgba(201,116,138,0.3);
  }

  .logo {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    color: var(--rose-light);
    letter-spacing: 0.5px;
  }

  .logo span { color: var(--gold); font-style: italic; }

  .header-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--muted);
  }

  .dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #5a8a6a;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* LAYOUT */
  .container {
    display: grid;
    grid-template-columns: 320px 1fr;
    height: calc(100vh - 65px);
  }

  /* SIDEBAR */
  .sidebar {
    background: var(--surface);
    border-right: 1px solid var(--rose-light);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sidebar-header {
    padding: 20px;
    border-bottom: 1px solid var(--rose-light);
  }

  .sidebar-title {
    font-family: 'Playfair Display', serif;
    font-size: 15px;
    color: var(--rose-dark);
    margin-bottom: 12px;
  }

  .search-box {
    width: 100%;
    padding: 9px 14px;
    border: 1px solid var(--rose-light);
    border-radius: 8px;
    font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    background: white;
    color: var(--dark);
    outline: none;
    transition: border-color 0.2s;
  }

  .search-box:focus { border-color: var(--rose); }

  .filter-tabs {
    display: flex;
    gap: 6px;
    margin-top: 10px;
  }

  .tab {
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid var(--rose-light);
    background: white;
    color: var(--muted);
    transition: all 0.2s;
  }

  .tab.active, .tab:hover {
    background: var(--rose);
    color: white;
    border-color: var(--rose);
  }

  .contacts-list {
    overflow-y: auto;
    flex: 1;
  }

  .contact-item {
    padding: 14px 20px;
    border-bottom: 1px solid rgba(201,116,138,0.1);
    cursor: pointer;
    transition: background 0.15s;
    position: relative;
  }

  .contact-item:hover { background: var(--rose-light); }
  .contact-item.active { background: rgba(201,116,138,0.15); border-left: 3px solid var(--rose); }

  .contact-name {
    font-weight: 500;
    font-size: 14px;
    color: var(--dark);
    margin-bottom: 3px;
  }

  .contact-phone {
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 4px;
  }

  .contact-preview {
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .contact-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 6px;
  }

  .status-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .status-CURIOSA { background: #e8f4e8; color: #3a6e4a; }
  .status-AQUECIDA { background: #fff3e0; color: #b07020; }
  .status-PRONTA { background: #fce4ec; color: #c62828; }
  .status-PAGO { background: #e3f2fd; color: #1565c0; }
  .status-COMPROVANTE_ENVIADO { background: #ede7f6; color: #4527a0; }

  .contact-time {
    font-size: 11px;
    color: var(--muted);
  }

  /* MAIN CHAT */
  .chat-area {
    display: flex;
    flex-direction: column;
    background: var(--cream);
  }

  .chat-header {
    padding: 16px 24px;
    background: var(--surface);
    border-bottom: 1px solid var(--rose-light);
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .chat-avatar {
    width: 44px; height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--rose), var(--rose-dark));
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .chat-info { flex: 1; }

  .chat-name {
    font-weight: 600;
    font-size: 15px;
    color: var(--dark);
  }

  .chat-phone {
    font-size: 12px;
    color: var(--muted);
    margin-top: 2px;
  }

  .chat-tags {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .tag {
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 10px;
    font-weight: 500;
  }

  .tag-interesse { background: var(--rose-light); color: var(--rose-dark); }
  .tag-canal { background: #e8f4e8; color: #3a6e4a; }

  /* MESSAGES */
  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .msg-group { display: flex; flex-direction: column; gap: 4px; }

  .msg-row {
    display: flex;
    align-items: flex-end;
    gap: 8px;
  }

  .msg-row.user { justify-content: flex-end; }
  .msg-row.assistant { justify-content: flex-start; }

  .msg-bubble {
    max-width: 68%;
    padding: 10px 14px;
    border-radius: 16px;
    font-size: 14px;
    line-height: 1.5;
    position: relative;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .msg-row.user .msg-bubble {
    background: var(--rose);
    color: white;
    border-bottom-right-radius: 4px;
  }

  .msg-row.assistant .msg-bubble {
    background: white;
    color: var(--dark);
    border-bottom-left-radius: 4px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }

  .msg-time {
    font-size: 11px;
    color: var(--muted);
    margin: 0 4px 2px;
  }

  .msg-row.user .msg-time { text-align: right; }

  .ana-label {
    font-size: 11px;
    color: var(--rose);
    font-weight: 600;
    margin-bottom: 2px;
    margin-left: 4px;
  }

  /* EMPTY STATE */
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    text-align: center;
    padding: 40px;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-title {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    color: var(--rose-dark);
    margin-bottom: 8px;
  }

  .empty-subtitle { font-size: 14px; }

  /* STATS BAR */
  .stats-bar {
    padding: 12px 24px;
    background: var(--surface);
    border-top: 1px solid var(--rose-light);
    display: flex;
    gap: 24px;
    font-size: 12px;
    color: var(--muted);
  }

  .stat { display: flex; gap: 6px; align-items: center; }
  .stat strong { color: var(--dark); font-weight: 600; }

  /* LOADING */
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: var(--muted);
    font-size: 14px;
    gap: 8px;
  }

  .spinner {
    width: 16px; height: 16px;
    border: 2px solid var(--rose-light);
    border-top-color: var(--rose);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .refresh-btn {
    padding: 7px 16px;
    background: var(--rose);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: background 0.2s;
  }

  .refresh-btn:hover { background: var(--rose-dark); }

  .no-contacts {
    padding: 40px 20px;
    text-align: center;
    color: var(--muted);
    font-size: 13px;
  }
</style>
</head>
<body>

<header>
  <div class="logo">Escola de Amor-Próprio · <span>Painel Ana</span></div>
  <div class="header-status">
    <div class="dot"></div>
    <span id="status-text">Carregando...</span>
    <button class="refresh-btn" onclick="recarregar()">↻ Atualizar</button>
  </div>
</header>

<div class="container">
  <!-- SIDEBAR -->
  <div class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-title">Conversas</div>
      <input class="search-box" id="search" placeholder="Buscar por nome ou número..." oninput="filtrar()">
      <div class="filter-tabs">
        <div class="tab active" onclick="setFiltro('todos', this)">Todos</div>
        <div class="tab" onclick="setFiltro('PRONTA', this)">🔥 Prontas</div>
        <div class="tab" onclick="setFiltro('PAGO', this)">💰 Pagos</div>
        <div class="tab" onclick="setFiltro('AQUECIDA', this)">⚡ Quentes</div>
      </div>
    </div>
    <div class="contacts-list" id="contacts-list">
      <div class="loading"><div class="spinner"></div> Carregando...</div>
    </div>
  </div>

  <!-- CHAT -->
  <div class="chat-area">
    <div id="chat-header" class="chat-header" style="display:none">
      <div class="chat-avatar" id="chat-avatar">A</div>
      <div class="chat-info">
        <div class="chat-name" id="chat-name">-</div>
        <div class="chat-phone" id="chat-phone">-</div>
      </div>
      <div class="chat-tags">
        <span class="tag tag-interesse" id="chat-interesse"></span>
        <span class="tag tag-canal" id="chat-canal"></span>
        <span class="status-badge" id="chat-status"></span>
      </div>
    </div>

    <div id="messages-area" class="messages">
      <div class="empty-state">
        <div class="empty-icon">🌸</div>
        <div class="empty-title">Selecione uma conversa</div>
        <div class="empty-subtitle">Escolha um contato ao lado para ver o histórico completo</div>
      </div>
    </div>

    <div class="stats-bar" id="stats-bar">
      <div class="stat">Total: <strong id="stat-total">-</strong></div>
      <div class="stat">Prontas: <strong id="stat-pronta">-</strong></div>
      <div class="stat">Pagas: <strong id="stat-pago">-</strong></div>
      <div class="stat">Hoje: <strong id="stat-hoje">-</strong></div>
    </div>
  </div>
</div>

<script>
const BASE = "https://meu-chatbot-ia-production.up.railway.app";
const SENHA = "escola2024";

let todosLeads = [];
let todosLogs = {};
let filtroAtivo = "todos";
let contatoAtivo = null;

function formatarTelefone(num) {
  if (!num) return "-";
  const n = num.replace(/\D/g, "");
  if (n.length === 13) return \`+\${n.slice(0,2)} (\${n.slice(2,4)}) \${n.slice(4,9)}-\${n.slice(9)}\`;
  if (n.length === 12) return \`+\${n.slice(0,2)} (\${n.slice(2,4)}) \${n.slice(4,8)}-\${n.slice(8)}\`;
  return num;
}

function formatarHora(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
}

function inicialDe(nome) {
  if (!nome || nome === "Não informado") return "?";
  return nome.trim()[0].toUpperCase();
}

async function carregarDados() {
  try {
    const [leadsRes, logsRes] = await Promise.all([
      fetch(\`\${BASE}/leads?senha=\${SENHA}\`),
      fetch(\`\${BASE}/logs?senha=\${SENHA}\`)
    ]);
    const leadsData = await leadsRes.json();
    const logsData = await logsRes.json();

    todosLeads = leadsData.leads || [];
    todosLogs = {};
    (logsData.usuarios || []).forEach(u => { todosLogs[u.userId] = u; });

    atualizarStats();
    renderContatos();
    document.getElementById("status-text").textContent = \`\${todosLeads.length} contatos · \${new Date().toLocaleTimeString("pt-BR")}\`;
  } catch (e) {
    document.getElementById("status-text").textContent = "Erro ao carregar — verifique a URL";
    document.getElementById("contacts-list").innerHTML = \`<div class="no-contacts">❌ Não foi possível conectar ao servidor</div>\`;
  }
}

function atualizarStats() {
  const hoje = new Date().toDateString();
  document.getElementById("stat-total").textContent = todosLeads.length;
  document.getElementById("stat-pronta").textContent = todosLeads.filter(l => l.status === "PRONTA").length;
  document.getElementById("stat-pago").textContent = todosLeads.filter(l => l.status === "PAGO" || l.status === "COMPROVANTE_ENVIADO").length;
  document.getElementById("stat-hoje").textContent = todosLeads.filter(l => new Date(l.timestamp).toDateString() === hoje).length;
}

function setFiltro(f, el) {
  filtroAtivo = f;
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  el.classList.add("active");
  renderContatos();
}

function filtrar() { renderContatos(); }

function renderContatos() {
  const busca = document.getElementById("search").value.toLowerCase();
  let lista = todosLeads;

  if (filtroAtivo !== "todos") lista = lista.filter(l => l.status === filtroAtivo);
  if (busca) lista = lista.filter(l =>
    (l.nome || "").toLowerCase().includes(busca) ||
    (l.contato || "").includes(busca)
  );

  const el = document.getElementById("contacts-list");
  if (lista.length === 0) {
    el.innerHTML = \`<div class="no-contacts">Nenhum contato encontrado</div>\`;
    return;
  }

  el.innerHTML = lista.map(lead => {
    const logInfo = todosLogs[lead.userId] || {};
    const preview = logInfo.ultima ? \`Última msg: \${formatarHora(logInfo.ultima)}\` : "Sem mensagens registradas";
    const isActive = contatoAtivo === lead.userId ? "active" : "";
    return \`
      <div class="contact-item \${isActive}" onclick="abrirConversa('\${lead.userId}')">
        <div class="contact-name">\${lead.nome || "Sem nome"}</div>
        <div class="contact-phone">\${formatarTelefone(lead.contato)}</div>
        <div class="contact-preview">\${preview}</div>
        <div class="contact-meta">
          <span class="status-badge status-\${lead.status || 'CURIOSA'}">\${lead.status || "CURIOSA"}</span>
          <span class="contact-time">\${formatarHora(lead.timestamp)}</span>
        </div>
      </div>
    \`;
  }).join("");
}

async function abrirConversa(userId) {
  contatoAtivo = userId;
  renderContatos();

  const lead = todosLeads.find(l => l.userId === userId) || {};

  // Header
  document.getElementById("chat-header").style.display = "flex";
  document.getElementById("chat-avatar").textContent = inicialDe(lead.nome);
  document.getElementById("chat-name").textContent = lead.nome || "Sem nome";
  document.getElementById("chat-phone").textContent = formatarTelefone(lead.contato);
  document.getElementById("chat-interesse").textContent = lead.interesse || "Interesse não identificado";
  document.getElementById("chat-canal").textContent = lead.plataforma || "desconhecido";
  const statusEl = document.getElementById("chat-status");
  statusEl.textContent = lead.status || "CURIOSA";
  statusEl.className = \`status-badge status-\${lead.status || "CURIOSA"}\`;

  // Mensagens
  const area = document.getElementById("messages-area");
  area.innerHTML = \`<div class="loading"><div class="spinner"></div> Carregando conversa...</div>\`;

  try {
    const res = await fetch(\`\${BASE}/logs?senha=\${SENHA}&userId=\${userId}\`);
    const data = await res.json();
    const logs = data.logs || [];

    if (logs.length === 0) {
      area.innerHTML = \`<div class="empty-state"><div class="empty-icon">💬</div><div class="empty-title">Sem mensagens registradas</div><div class="empty-subtitle">As mensagens aparecem aqui em tempo real</div></div>\`;
      return;
    }

    area.innerHTML = logs.map(msg => {
      const isAna = msg.role === "assistant";
      const label = isAna ? \`<div class="ana-label">Ana</div>\` : "";
      return \`
        <div class="msg-group">
          \${label}
          <div class="msg-row \${msg.role}">
            <div class="msg-bubble">\${msg.texto}</div>
          </div>
          <div class="msg-time">\${formatarHora(msg.timestamp)}</div>
        </div>
      \`;
    }).join("");

    area.scrollTop = area.scrollHeight;
  } catch (e) {
    area.innerHTML = \`<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Erro ao carregar</div></div>\`;
  }
}

function recarregar() {
  document.getElementById("status-text").textContent = "Atualizando...";
  carregarDados();
  if (contatoAtivo) setTimeout(() => abrirConversa(contatoAtivo), 800);
}

// Auto-atualiza a cada 30s
carregarDados();
setInterval(recarregar, 30000);
</script>
</body>
</html>
`);
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
