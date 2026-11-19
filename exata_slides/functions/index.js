// Cloud Function do Firebase: recebe o formulário do professor, chama o Claude
// e devolve o planejamento + slides em JSON. A chave da API fica guardada
// como "secret" do Firebase (nunca aparece no site).
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp({ databaseURL: "https://exata-quiz-default-rtdb.firebaseio.com" });
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const MODELO = "claude-sonnet-5-5";
const LIMITE_MENSAL = 20; // planejamentos por professor por mês (ajuste à vontade)

// Formato que o Claude é obrigado a devolver
const ESQUEMA = {
  type: "object",
  required: ["titulo", "objetivos", "aulas", "avaliacao", "slides"],
  properties: {
    titulo: { type: "string" },
    objetivos: { type: "array", items: { type: "string" } },
    habilidades_bncc: {
      type: "array",
      items: { type: "string" },
      description: "Códigos e descrições de habilidades da BNCC, só quando você tiver certeza de que existem.",
    },
    aulas: {
      type: "array",
      items: {
        type: "object",
        required: ["numero", "titulo", "etapas"],
        properties: {
          numero: { type: "integer" },
          titulo: { type: "string" },
          etapas: {
            type: "array",
            items: {
              type: "object",
              required: ["nome", "minutos", "descricao"],
              properties: {
                nome: { type: "string" },
                minutos: { type: "integer" },
                descricao: { type: "string" },
              },
            },
          },
          recursos: { type: "array", items: { type: "string" } },
        },
      },
    },
    avaliacao: {
      type: "object",
      required: ["instrumentos", "criterios"],
      properties: {
        instrumentos: { type: "array", items: { type: "string" } },
        criterios: { type: "array", items: { type: "string" } },
      },
    },
    slides: {
      type: "array",
      items: {
        type: "object",
        required: ["titulo", "topicos"],
        properties: {
          titulo: { type: "string" },
          topicos: { type: "array", items: { type: "string" } },
          notas: { type: "string", description: "Fala sugerida para o professor neste slide." },
        },
      },
    },
  },
};

const SISTEMA = `Você é um coordenador pedagógico brasileiro experiente. Crie planejamentos de aula claros, realistas e prontos para usar.
Regras:
- Escreva em português do Brasil.
- Respeite a duração da aula informada: a soma dos minutos das etapas de cada aula deve bater com ela.
- Use a metodologia pedida.
- Cite habilidades da BNCC apenas se tiver certeza do código; se não tiver, deixe a lista vazia.
- Em Matemática e Física, escreva expressões de forma simples em texto (ex.: x^2, v = d/t), sem LaTeX.
- Os slides devem ter 3 a 5 tópicos curtos cada, e a sequência: abertura, objetivos, desenvolvimento, exemplo resolvido, atividade, fechamento.`;

exports.gerarPlanejamento = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: true, timeoutSeconds: 120, memory: "256MiB" },
  async (req, res) => {
    try {
      if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });

      // 1) Só professores logados
      const token = (req.headers.authorization || "").replace("Bearer ", "");
      if (!token) return res.status(401).json({ erro: "Faça login para usar o planejador." });
      const usuario = await admin.auth().verifyIdToken(token);

      // 2) Controle de créditos do mês (Realtime Database, o mesmo banco do site)
      const mes = new Date().toISOString().slice(0, 7);
      const ref = admin.database().ref(`creditos_slides/${usuario.uid}/${mes}`);
      const usados = (await ref.once("value")).val() || 0;
      if (usados >= LIMITE_MENSAL) {
        return res.status(429).json({ erro: `Você usou os ${LIMITE_MENSAL} planejamentos deste mês.` });
      }

      // 3) Valida o formulário
      const f = req.body || {};
      const campos = {
        disciplina: String(f.disciplina || "").slice(0, 80),
        serie: String(f.serie || "").slice(0, 80),
        tema: String(f.tema || "").slice(0, 200),
        aulas: Math.min(Math.max(parseInt(f.aulas) || 1, 1), 10),
        duracao: Math.min(Math.max(parseInt(f.duracao) || 50, 20), 120),
        metodologia: String(f.metodologia || "Expositiva").slice(0, 60),
        observacoes: String(f.observacoes || "").slice(0, 600),
      };
      if (!campos.disciplina || !campos.tema) {
        return res.status(400).json({ erro: "Preencha disciplina e tema." });
      }

      const pedido = `Crie o planejamento:
Disciplina: ${campos.disciplina}
Série/ano: ${campos.serie}
Tema: ${campos.tema}
Número de aulas: ${campos.aulas}
Duração de cada aula: ${campos.duracao} minutos
Metodologia: ${campos.metodologia}
Observações do professor: ${campos.observacoes || "nenhuma"}`;

      // 4) Chama o Claude, forçando a resposta no formato do ESQUEMA
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY.value(),
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODELO,
          max_tokens: 6000,
          system: SISTEMA,
          messages: [{ role: "user", content: pedido }],
          tools: [{ name: "entregar_planejamento", description: "Entrega o planejamento final.", input_schema: ESQUEMA }],
          tool_choice: { type: "tool", name: "entregar_planejamento" },
        }),
      });
      if (!r.ok) {
        console.error("Erro da API:", r.status, await r.text());
        return res.status(502).json({ erro: "A IA não respondeu. Tente de novo em instantes." });
      }
      const dados = await r.json();
      const bloco = (dados.content || []).find((b) => b.type === "tool_use");
      if (!bloco) return res.status(502).json({ erro: "Resposta inesperada da IA." });

      // 5) Só desconta o crédito depois de dar certo
      await ref.transaction((n) => (n || 0) + 1);

      return res.json({ plano: bloco.input, restantes: LIMITE_MENSAL - usados - 1 });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ erro: "Erro interno. Tente novamente." });
    }
  }
);
