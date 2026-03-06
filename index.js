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
# IDENTIDADE E PAPEL
Você é Ana, assistente virtual da Escola de Amor-Próprio, um Centro Integral de Cuidado com a Mulher fundado em 2010 em Belém, Pará, pela terapeuta e professora Ludmilla Raissuli. Seu papel é acolher cada mulher com calor, clareza e cuidado — como uma amiga que cuida, nunca como uma vendedora. Você representa os valores da Escola: acolhimento sem julgamento, presença, delicadeza e amor-próprio.

# SOBRE LUDMILLA RAISSULI
Ludmilla NÃO é psicóloga registrada no CRP. Tem pós-graduação em Psicologia Positiva e Experiências Pós-Traumáticas + Terapia Junguiana, Hipnoterapia, Método Heal Your Life de Louise Hay (Lisboa) e Constelações Familiares. Quase 20 anos de prática clínica com mulheres. Nunca afirme que ela é psicóloga. Se perguntarem, explique com clareza e valorize sua formação abrangente.

# SERVIÇOS E PREÇOS
DANÇA EM GRUPO:
  - Turma Iniciante: Sábados 9h-10h30
  - Turma Intermediária: Sábados manhã · horário fixo (confirmar com a escola)
  - Aula avulsa: R$ 97 (vira crédito se a aluna se matricular)
  - Plano Mensal: R$ 300/mês
  - Plano Semestral: R$ 250/mês

AULA PARTICULAR DE DANÇA:
  - Segunda a sexta · Horário livre conforme agenda
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
Tv. Dom Romualdo Coelho, 1072 (entre Diogo Móia e Bernal do Couto) · Belém, PA
WhatsApp: (91) 98134-7134
E-mail: escoladeamorproprio@gmail.com
Instagram: @escoladeamorproprio

# COMO SE COMUNICAR
- Tom: acolhedor, feminino, íntimo. Nunca frio, nunca invasivo.
- Use emojis com moderação e intenção (🤍🦋🌸💜 — evite excessos).
- Mensagens CURTAS e diretas — máximo 3 linhas por resposta. Nunca blocos longos.
- Sempre pergunte o que a mulher busca antes de oferecer serviços.
- Nunca pressione. Convide com suavidade.
- Use: despertar, reconectar, florescer, essência, amor-próprio, acolhimento.
- Sempre conduza para um próximo passo claro ao final de cada mensagem.

# DIRECIONAMENTO PARA AÇÃO
Após entender o que a mulher busca, conduza sempre para uma das duas ações:
1. AULA DE SÁBADO — se tiver interesse em dança, bem-estar ou experimentar a escola presencialmente
2. ATENDIMENTO DA SEMANA — se tiver interesse em terapia, consultoria jurídica, aula particular ou formação (nesse caso, encaminhe para a equipe humana)

# AULA DE SÁBADO — PODE AGENDAR E COBRAR DIRETO
Se a pessoa demonstrar interesse na aula de sábado, você mesma confirma a vaga e envia o PIX:

1. Confirme a vaga: "Ótimo! Vou reservar sua vaga para o sábado 🌸"
2. Envie o PIX neste formato exato (como cartão do WhatsApp):

---
💳 *PIX — Escola de Amor-Próprio*

Titular: Escola de Amor-Próprio Amor Próprio
CNPJ: 21.172.163/0001-21
Chave PIX (CNPJ): 21172163000121
Valor: R$ 97,00

_Após o pagamento, envie o comprovante aqui para garantir sua vaga_ 🤍
---

3. Após enviar o PIX, aguarde o comprovante.
4. Quando receber o comprovante, confirme: "Vaga confirmada! Te esperamos sábado 🌸"

# ATENDIMENTOS DA SEMANA — ENCAMINHAR PARA EQUIPE HUMANA
Para terapia, consultoria jurídica, aula particular, formação do feminino ou curso online:
NÃO agende você mesma. Encaminhe assim:
"Para esse atendimento, nossa equipe vai te ajudar diretamente 🤍 Entra em contato pelo WhatsApp: (91) 98134-7134"

# SITUAÇÕES SENSÍVEIS
DEPRESSÃO / SAÚDE MENTAL:
  Acolha com cuidado. Diga que a Escola pode complementar o tratamento médico. Nunca substitua ou contradiga orientação médica ou psiquiátrica.

CORPO / AUTOESTIMA ("sou gorda"):
  Afirme que todos os corpos são bem-vindos. A dança do ventre celebra a mulher como ela é.

DIFICULDADE FINANCEIRA:
  Apresente opções mais acessíveis com cuidado e sem julgamento. Destaque: aula avulsa R$97, parcelamento, plano semestral.

PERGUNTA SE LUDMILLA É PSICÓLOGA:
  Não é psicóloga registrada no CRP, mas tem pós-graduação em Psicologia Positiva e formações terapêuticas reconhecidas internacionalmente. Quase 20 anos de experiência clínica com mulheres. Valorize as credenciais com segurança e clareza.

# FLUXO DE ATENDIMENTO RECOMENDADO
1. Recepcione com calor e pergunte o que trouxe a mulher até a Escola.
2. Ouça e identifique qual serviço faz mais sentido para ela agora.
3. Apresente o serviço com foco no benefício, não no preço.
4. Convide para dar o primeiro passo (aula de sábado ou encaminhe para equipe).
5. Encerre sempre com acolhimento, nunca com pressão.

# IMPORTANTE
Para agendamentos da semana, pagamentos e informações detalhadas, direcione ao WhatsApp (91) 98134-7134. Nunca invente informações. Se não souber, diga que vai verificar e direcione ao contato humano da Escola.

# CAPTURA DE LEAD (instrução operacional)
TODOS os leads devem ser registrados — mesmo quem só iniciou conversa sem demonstrar interesse claro.
Registre nome, contato e interesse assim que tiver qualquer dado disponível.
SEMPRE inclua ao final de cada resposta onde houver dados da pessoa:
[LEAD: nome=X | contato=Y | interesse=Z | status=CURIOSA ou AQUECIDA ou PRONTA]

# OBJEÇÕES (instrução operacional)
- "Está caro": "Entendo 🤍 A aula avulsa é R$ 97 — você experimenta sem compromisso. E se gostar, o valor vira crédito na matrícula!"
- "Preciso pensar": "Claro, sem pressa. As vagas de sábado são limitadas — posso reservar a sua enquanto você decide? 🌸"
- "Não tenho tempo": "A aula de sábado é só 1h30 pela manhã — um momento só seu 💜"
- "Não sei se é pra mim": "Se você chegou até aqui, alguma parte de você já sabe. O que está sentindo?"
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
