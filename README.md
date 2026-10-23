# Valorant Analytics API

API REST que serve os dados calculados pelo ETL ([hackathon-etl](https://github.com/os-gurizes/hackathon-etl)) e gerencia contas e estratégias dos coaches. O planejamento está em `docs/plano.md`.

## Setup

```
npm install
cp .env.example .env    # ajuste os segredos
npm run db:migrate      # cria o schema app (usuários e sessões)
SEED_PASSWORD=... npm run seed
npm run dev
```

A API lê o schema `analytics`, que o ETL preenche (`vstats all <dataset.zip>`). A documentação interativa fica em `http://localhost:3333/docs`.

## Scripts

| Script                        | O que faz                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `npm run dev`                 | servidor com reload                                                               |
| `npm run build` / `npm start` | build e execução                                                                  |
| `npm run typecheck`           | `tsc --noEmit`                                                                    |
| `npm test`                    | testes (cria o banco `vstats_api_test` a partir de `test/fixtures/analytics.sql`) |
| `npm run format`              | Prettier                                                                          |
| `npm run db:pull`             | regenera os tipos do schema `analytics` a partir do banco                         |
| `npm run openapi`             | exporta `openapi.json` para o front gerar o cliente                               |

## Fixture de testes

`test/fixtures/analytics.sql` é o schema `analytics` de 9 partidas reais (Azure Bears Golden no Ascent e no Lotus), gerado com o ETL. Para regenerar: rodar `vstats all` numa pasta com as partidas e `pg_dump --schema=analytics --no-owner --no-privileges --inserts --rows-per-insert=500 | grep -v '^\\'`.

## Rotas

Todas as rotas, exceto login, refresh e `/health`, exigem login. A referência completa fica em `/docs` e no `openapi.json`.

| Grupo             | Rotas                                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth              | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /me`                                                                      |
| Admin             | `GET`, `POST /admin/users`, `PATCH /admin/users/:id`                                                                                          |
| Catálogo          | `GET /tournaments`, `/tournaments/:id/standings`, `/series/:id`, `/maps`, `/maps/:id`, `/agents`, `/weapons`                                  |
| Partidas          | `GET /matches`, `/matches/:id`, `/matches/:id/rounds`, `/matches/:id/rounds/:n/replay`                                                        |
| Jogadores         | `GET /players`, `/players/:id`, `/players/:id/stats`, `/players/:id/matches`, `/players/:id/agents`, `/players/:id/weapons`                   |
| Jogador (privado) | `GET /players/:id/patterns`, `/players/:id/pressure`, `/players/:id/abilities`                                                                |
| Times             | `GET /teams`, `/teams/:id`, `/teams/:id/economy`, `/teams/:id/strategies`, `/teams/:id/rotations`, `/teams/:id/combos`, `/teams/:id/pressure` |
| Mapas             | `GET /maps/:id/heatmap`, `/maps/:id/stats`                                                                                                    |
| Gerais            | `GET /weapons/stats`, `/agents/stats`, `/insights`                                                                                            |
| Playbook          | `GET`, `POST /teams/:id/playbook`, `GET`, `PUT`, `DELETE /playbook/:id`                                                                       |

## Acesso

| Papel  | Vê                                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| player | dados públicos, os próprios dados privados, a análise dos times pelos quais jogou e o playbook compartilhado desses times |
| coach  | dados públicos, a análise de qualquer time, os dados privados de quem jogou pelo time dele e o playbook do time (edita)   |
| admin  | tudo                                                                                                                      |

## Desempenho

Respostas `GET` e `HEAD` com status 200 levam `ETag` fraco, `Vary: Cookie` e `Cache-Control: private, no-cache`. Erros e escritas não recebem ETag. Com o dado igual, o front recebe `304`. No benchmark com o banco completo (10 conexões), a rota mais pesada tem p99 de 57 ms.
