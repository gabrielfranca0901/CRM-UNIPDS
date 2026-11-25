# Central de Atendimento (React + Vite)

1. `npm install`
2. Crie o `.env` a partir do `.env.example` com a URL e a chave pública (anon) do Supabase do suporte. Sem ele, o app roda em modo demo, com dados falsos.
3. `npm run dev` e abra http://localhost:5173

O `.env` não vai para o GitHub (está no `.gitignore`). Na Vercel, cadastre as mesmas duas variáveis em Settings → Environment Variables.

## Como o app fala com o banco

- Tudo passa por `src/api.js`, só por funções (RPC) do schema `suporte`. Não há leitura direta de tabelas.
- `src/normalizar.js` converte o que o banco devolve no formato das telas. Se algum campo aparecer vazio, ajuste ali.
- `src/demo.js` tem os dados do modo demo, no mesmo formato do banco.
- Referência: passagem do banco de 24/11/2026 (`suporte-passagem-crm`).

## Regras do banco que a tela respeita

- `buscar_aluno` só aceita CPF (11) ou CNPJ (14) completo.
- Cancelamento e Reembolso exigem a compra para abrir o ticket.
- Ticket não se apaga; toda mudança vira evento no histórico.
- `listar_alunos` é paginado (50 por página) e registra o acesso.
