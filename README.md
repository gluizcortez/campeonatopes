# Campeonato PES ⚽

Site para organizar o campeonato de PES entre amigos. Funciona 100% no navegador: os dados ficam salvos no `localStorage`, então nada se perde ao recarregar a página ou desligar o computador. Não precisa de banco de dados nem backend.

## Funcionalidades

- Cadastro em etapas: formato (9, 10 ou 12 participantes), jogadores e seleções, cabeças de chave e montagem dos grupos.
- Início com partida atual, próximas partidas, últimos resultados, grupos, chave, artilharia e briga do pato.
- Abas: Partidas, Grupos, Chaves, Artilharia, Pato, Jogadores e Ajustes.
- Placar com autores dos gols (alimenta a artilharia), gol contra e pênaltis no mata-mata.
- Confrontos do mata-mata calculados automaticamente, com opção de ajustar manualmente.
- Backup: exportar/importar o campeonato em arquivo `.json`.

## Rodando localmente

```bash
npm install
npm run dev
```

Testes das regras: `npm test`.

## Deploy

Na Vercel, importe o repositório. O preset **Vite** é detectado automaticamente (build `npm run build`, saída `dist`).

Bandeiras: [flagcdn.com](https://flagcdn.com), salvas em `public/flags`.
