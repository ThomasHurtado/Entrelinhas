# Entrelinhas — Frontend

Frontend React + Vite do clube do livro Entrelinhas.

## Rodar
1. `npm install`
2. Opcional: copie `.env.example` para `.env` para alterar a URL da API.
3. `npm run dev`

Por padrão o frontend procura a API em `http://localhost:3001/api`.

## Proteção contra backend vazio/desligado
Após o login, o frontend inicia com listas vazias enquanto consulta a API. Não há participantes ou encontros de demonstração. Se o carregamento falhar, exibe o erro e as listas permanecem vazias; operações feitas nesse modo ficam somente no navegador até recarregar a página.

Quando a API estiver disponível, os dados do MongoDB substituem os dados locais. Um banco vazio é válido e mostrará listas vazias.

## Login
Com backend conectado, o login é validado pela API. Execute `npm run seed` no backend para criar o administrador configurado no `.env` do backend.

O login sempre consulta a API. Se o backend estiver indisponível, a tela exibe o erro e permite tentar novamente, sem liberar acesso local automaticamente.

Configure `VITE_API_URL` no `.env` com a URL completa da API, incluindo `/api`, e reinicie `npm run dev`. Para um backend publicado, use `https://SEU-BACKEND.vercel.app/api`. No backend, configure `FRONTEND_URL` com a origem exata do frontend para permitir CORS. Em produção, alterações de `VITE_API_URL` exigem um novo build/deploy.

## Novos recursos
- Saldo do clube na Visão Geral, sincronizado por `/api/finance`.
- Página Ideias com cadastro, autor e status Aceito/Não aceito, sincronizada por `/api/ideas`.
- Os novos recursos mantêm fallback local quando a API está indisponível.
- Caderno com páginas pautadas, títulos, criação, exclusão e navegação entre páginas, integrado a `/api/notebook/pages`. Salva automaticamente no servidor após uma pausa na digitação. Em caso de falha, preserva o texto aberto e oferece nova tentativa, sem indicar sucesso antes da resposta da API. Contrato das rotas em `BACKEND.md`. As páginas da versão local anterior permanecem no navegador, mas não são importadas automaticamente.
