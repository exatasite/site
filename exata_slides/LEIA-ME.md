# Exata Slides — como ligar a inteligência artificial

A página (`index.html`) já está no ar em modo demonstração. Para ligar a IA:

1. Crie uma chave em console.anthropic.com → API Keys (e coloque alguns dólares de crédito).
2. O Firebase precisa estar no plano Blaze (pague só o que usar) para rodar funções.
3. No terminal, na pasta do projeto Firebase (`exata-quiz`):
   - `firebase functions:secrets:set ANTHROPIC_API_KEY`  (cole a chave)
   - copie a pasta `functions/` desta pasta para o projeto
   - `firebase deploy --only functions`
4. Copie o endereço de `gerarPlanejamento` e cole em `URL_FUNCAO` no `index.html`.

Limite por professor: `LIMITE_MENSAL` em `functions/index.js` (padrão 20 por mês).
Visual dos slides: cores em `pptx-builder.js`.
