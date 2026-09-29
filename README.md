# Entrelinhas — Frontend

Frontend React + Vite do clube do livro Entrelinhas.

## Rodar
1. `npm install`
2. Opcional: copie `.env.example` para `.env` para alterar a URL da API.
3. `npm run dev`

Por padrão o frontend procura a API em `http://localhost:3001/api`.

## Proteção contra backend vazio/desligado
Ao abrir, o frontend inicia com listas vazias enquanto consulta a API, sem avisos de carregamento ou conexão. Não há participantes ou encontros de demonstração. Se o carregamento falhar, as listas permanecem vazias; operações feitas nesse modo ficam somente no navegador até recarregar a página.

Quando a API estiver disponível, os dados do MongoDB substituem os dados locais. Um banco vazio é válido e mostrará listas vazias.

## Login
Com backend conectado, o login é validado pela API. Execute `npm run seed` no backend para criar o administrador configurado no `.env` do backend.

Sem backend disponível, o frontend permite o acesso em modo local para que o desenvolvimento da interface não fique bloqueado.

## Novos recursos
- Saldo do clube na Visão Geral, sincronizado por `/api/finance`.
- Página Ideias com cadastro, autor e status Aceito/Não aceito, sincronizada por `/api/ideas`.
- Os novos recursos mantêm fallback local quando a API está indisponível.
