# Central de Atendimento (React + Vite)
1. `npm install`
2. `cp .env.example .env` e preencha URL e chave pública (anon) do projeto novo. Sem isso, roda em modo demo.
3. `npm run dev`
Todas as chamadas ao banco ficam em `src/api.js`. Regra: a tela só chama funções do schema `suporte`.
