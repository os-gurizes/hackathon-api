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
