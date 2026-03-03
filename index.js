const express = require("express");
const app = express();
app.use(express.json());

// ============================================
// CONFIGURAÇÃO DA SUA IA — EDITE AQUI
// ============================================
const IA_NOME = "Luna";
const IA_TOM = "amigável, direto e persuasivo";
const IA_INSTRUCOES = `
Você é uma atendente virtual.

SOBRE O NEGÓCIO:
(coloque aqui informações do seu negócio, produtos, preços, links)

REGRAS:
- Sempre pergunte o nome do cliente
- Capture e-mail ou telefone antes de enviar links
- Seja concisa (máximo 4 linhas por resposta)
- Guie sempre para fechar uma venda
`;
// ============================================

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "meu_token_secreto";

// Memória de conversas por usuário
const conversas = {};

async function chamarIA(userId, mensagemUsuario) {
  if (!conversas[userId]) conversas[userId] = [];
  conversas[userId].push({ role: "user", content: mensagemUsuario });

  // Limita histórico a 20 mensagens
  if (conversas[userId].length > 20) {
    conversas[userId] = conversas[userId].slice(-20);
  }

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
      messages: conversas[userId]
    })
  });

  const data = await response.json();
  const resposta = data.content?.[0]?.text || "Desculpe, não consegui processar.";
  conversas[userId].push({ role: "assistant", content: resposta });
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

    const resposta = await chamarIA(userId, texto);

    await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: userId,
        text: { body: resposta }
      })
    });

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
    const resposta = await chamarIA(userId, texto);

    await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.INSTAGRAM_TOKEN}`
      },
      body: JSON.stringify({
        recipient: { id: userId },
        message: { text: resposta }
      })
    });

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
    const resposta = await chamarIA(userId, texto);

    await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.FACEBOOK_TOKEN}`
      },
      body: JSON.stringify({
        recipient: { id: userId },
        message: { text: resposta }
      })
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("Erro Facebook:", err);
    res.sendStatus(500);
  }
});

// Rota de teste
app.get("/", (req, res) => {
  res.json({ status: "IA no ar", nome: IA_NOME });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
