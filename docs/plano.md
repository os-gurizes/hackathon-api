# Batch 2: API REST

API em TypeScript que serve os dados calculados pelo ETL (Batch 1) e gerencia contas, papéis e estratégias do coach para o front (Batch 3).

## Regras do batch

- TypeScript em modo `strict`, com `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` e `noImplicitOverride`.
- Sem ESLint. A formatação usa só Prettier, com config mínima e sem plugins. A verificação estática é feita pelo `tsc --noEmit` no CI.
- Tipos bem definidos: proibido `any`; `unknown` apenas na fronteira de entrada, validada por schema; IDs com branded types.
- Sem comentários desnecessários. Só entra comentário que explique uma decisão que o código não explica sozinho.
- Código limpo: funções pequenas, nomes explícitos, sem camadas que não agregam e sem abstração prematura.
- A API não calcula métricas pesadas. Tudo vem pronto do schema `analytics`, e a API filtra, pagina e formata.

## 1. Stack

| Camada | Escolha |
|---|---|
| Runtime | Node.js 22 LTS |
| Framework | Fastify 5 |
| Validação e tipos | TypeBox com `@fastify/type-provider-typebox`. O schema é a fonte única de validação, tipagem e OpenAPI |
| Banco | Postgres 16 |
| ORM e query builder | Drizzle ORM |
| Auth | `@fastify/jwt` com cookie httpOnly, `@fastify/cookie` e senhas com `argon2` |
| Documentação | `@fastify/swagger` com `@fastify/swagger-ui` |
| Testes | Vitest com `fastify.inject` e Postgres de teste via Docker |
| Execução local | `tsx` em dev e `tsc` para build |

## 2. Estrutura

```
api/
  package.json
  tsconfig.json
  drizzle.config.ts
  src/
    server.ts
    app.ts                     monta plugins e módulos e exporta buildApp() para os testes
    config.ts                  env validado com TypeBox
    db/
      client.ts
      analytics.ts             gerado por drizzle-kit pull, somente leitura
      app.ts                   schema próprio: users e strategies
      migrations/
    shared/
      ids.ts                   branded types: PlayerId, TeamId, MatchId...
      filters.ts               schema e parser dos filtros comuns
      pagination.ts
      errors.ts                AppError, NotFound, Forbidden e o mapeamento HTTP
    plugins/
      auth.ts                  decorators authenticate e requireRole
      access.ts                regras de escopo: o que cada papel pode ver
    modules/
      auth/
      tournaments/
      matches/
      players/
      teams/
      maps/
      weapons/
      agents/
      economy/
      strategies/              clusters do ETL (leitura)
      playbook/                estratégias desenhadas pelo coach (CRUD)
      insights/
  test/
```

Cada módulo tem `routes.ts` (rotas com schemas), `schemas.ts` (TypeBox), `repository.ts` (queries Drizzle) e, só quando houver regra de negócio, `service.ts`.

## 3. Tipos e convenções

```ts
type Brand<T, B extends string> = T & { readonly __brand: B }
export type PlayerId = Brand<number, 'PlayerId'>
export type TeamId = Brand<number, 'TeamId'>
```

- Os schemas de resposta são declarados explicitamente. O Fastify serializa com `fast-json-stringify`, o que também impede o vazamento de campos não declarados, como o `puuid_hash`.
- Datas em ISO 8601 UTC. Porcentagens em número de 0 a 1. O front formata.
- Valores estimados (proxies de habilidade, rotações) sempre trazem `isEstimate: true` no payload.
- Toda métrica agregada traz `sampleSize`. As que vêm de modelo trazem também `confidence`.
- Nomes em camelCase no JSON. O mapeamento de snake_case é feito no repository.

### Filtros comuns

Aceitos por todo endpoint analítico: `tournament`, `stage`, `map`, `side` (`attack` | `defense`), `team`, `player` e `agent`. Eles são validados por um schema único em `shared/filters.ts` e traduzidos para as colunas de filtro do ETL, onde `NULL` significa "todos".

### Erros

Formato único: `{ "error": { "code": "NOT_FOUND", "message": "..." } }`. Códigos: `VALIDATION`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL`.

## 4. Autenticação e papéis

- Papéis: `player`, `coach` e `admin`.
- **`users`**: `id`, `email`, `password_hash`, `role`, `player_id` (opcional, vínculo com o jogador do dataset), `team_id` (o time do coach), `created_at`.
- Login com `POST /auth/login`, que devolve um cookie httpOnly com o JWT (15 min) e um refresh token (7 dias) rotacionado.
- Regras de acesso (`plugins/access.ts`):
  - **player**: vê os próprios dados completos, os agregados do time com que jogou e os dados públicos (rankings, partidas, mapas). Não vê o playbook de outros times nem insights individuais de outros jogadores.
  - **coach**: vê tudo do próprio time (jogadores, insights, economia, pressão) e scouting de qualquer adversário. Faz CRUD do playbook do próprio time.
  - **admin**: gerencia usuários e vínculos.
- O vínculo do player é feito pelo admin, que associa o usuário a um `players.id` buscando por `nick#tag`.
- Seed para o hackathon: 1 admin, 1 coach por time com 5 ou mais partidas e 1 player de exemplo por time.

## 5. Endpoints

### Auth
| Método | Rota | Papel |
|---|---|---|
| POST | `/auth/login` | público |
| POST | `/auth/refresh` | público, com cookie |
| POST | `/auth/logout` | autenticado |
| GET | `/me` | autenticado; devolve o papel, o jogador vinculado e o time |
| GET, POST, PATCH | `/admin/users` | admin |

### Catálogo
| Rota | Conteúdo |
|---|---|
| `GET /tournaments` | campeonatos com etapas |
| `GET /tournaments/:id/standings` | classificação por etapa |
| `GET /series/:id` | série com os mapas |
| `GET /maps` | mapas com a silhueta em SVG, os sites e os polígonos das zonas |
| `GET /agents` | agentes com função e nomes das habilidades |
| `GET /weapons` | armas com categoria e custo |

### Partidas (visão geral e visão do coach)
| Rota | Conteúdo |
|---|---|
| `GET /matches` | lista paginada e filtrável |
| `GET /matches/:id` | placar, times e scoreboard |
| `GET /matches/:id/rounds` | timeline: vencedor, tipo de fim, compra, plant e curva de WP |
| `GET /matches/:id/rounds/:n/replay` | os snapshots de posição do round, em ordem de tempo, com kills. Alimenta o replay 2D da visão de coach |

### Jogadores
| Rota | Conteúdo |
|---|---|
| `GET /players` | ranking com ordenação por `acs`, `kd`, `adr`, `kast`, `hs`, `fk` |
| `GET /players/:id` | perfil e totais |
| `GET /players/:id/stats` | estatísticas por mapa, agente e lado, e K/D médio por partida |
| `GET /players/:id/matches` | histórico |
| `GET /players/:id/agents` | desempenho por agente |
| `GET /players/:id/weapons` | desempenho por arma e faixa de distância |
| `GET /players/:id/patterns` | comportamentos repetitivos com impacto |
| `GET /players/:id/pressure` | desempenho por contexto de pressão |
| `GET /players/:id/abilities` | proxies de habilidade (`isEstimate`) |

### Times
| Rota | Conteúdo |
|---|---|
| `GET /teams` e `GET /teams/:id` | perfil, elenco por campeonato e win rate por mapa |
| `GET /teams/:id/economy` | economia média, matriz de vitória por compra e flags prejudiciais |
| `GET /teams/:id/strategies` | clusters do ETL, os de maior e menor sucesso, por mapa e lado |
| `GET /teams/:id/rotations` | rotações e rotações sem informação, com o custo |
| `GET /teams/:id/combos` | combos de habilidade entre aliados (`isEstimate`) |
| `GET /teams/:id/pressure` | tendências sob pressão |

### Mapas e heatmap
| Rota | Conteúdo |
|---|---|
| `GET /maps/:id/heatmap?metric=presence\|kills\|deaths\|kd\|first_kills&resolution=cells\|zones` com os filtros comuns | células esparsas `[{ x, y, value, sampleSize }]` ou zonas `[{ zoneId, value, sampleSize }]` |
| `GET /maps/:id/stats` | pick rate de agentes, win rate por lado e sites mais plantados |

### Armas e agentes (o padrão)
| Rota | Conteúdo |
|---|---|
| `GET /weapons/stats` | mais usadas e melhor desempenho (kills por round, HS%, win rate e custo por kill) |
| `GET /agents/stats` | agentes com melhor desempenho (média bayesiana), por mapa |

### Insights
| Rota | Conteúdo |
|---|---|
| `GET /insights?scope=player\|team&id=...&kind=...` | cartões de insight ordenados por severidade, com `evidenceRoundIds` |

### Playbook do coach (escrita)
| Método | Rota |
|---|---|
| GET | `/teams/:id/playbook?map=` |
| POST | `/teams/:id/playbook` |
| GET, PUT, DELETE | `/playbook/:strategyId` |

Payload da estratégia:
```ts
type PlaybookStrategy = {
  id: StrategyId
  teamId: TeamId
  mapId: MapId
  side: 'attack' | 'defense'
  title: string
  notes: string
  layers: DrawingLayer[]
  linkedClusterId: number | null
  sharedWithPlayers: boolean
  updatedAt: string
}

type DrawingLayer = {
  id: string
  name: string
  phase: 'setup' | 'execute' | 'post_plant' | 'retake'
  shapes: Shape[]
}

type Shape =
  | { kind: 'path'; points: Point[]; color: string; width: number }
  | { kind: 'arrow'; from: Point; to: Point; color: string }
  | { kind: 'marker'; at: Point; agentId: AgentId | null; label: string }
  | { kind: 'area'; points: Point[]; color: string; opacity: number }
  | { kind: 'text'; at: Point; text: string }

type Point = { x: number; y: number }
```
As coordenadas ficam no espaço normalizado 0..1 do mapa, o mesmo do ETL, para que os desenhos se sobreponham ao heatmap e ao replay. O conteúdo é salvo em `jsonb` e validado por um schema TypeBox na entrada. Limites: no máximo 2.000 shapes e 256 KB por estratégia.

## 6. Desempenho

- Índices nas colunas de filtro de todas as tabelas derivadas. A criação fica no ETL, e a API documenta as queries que precisam deles.
- Cache em memória (LRU) para catálogo e heatmaps, invalidado quando `pipeline_version` muda.
- `ETag` nas respostas de leitura analítica.
- Paginação por cursor em `/matches` e `/players`.
- Meta: p95 abaixo de 150 ms nos endpoints analíticos, medido com `autocannon` sobre o dataset completo.

## 7. Qualidade

- `tsc --noEmit` e `vitest run` no CI. Não há lint.
- Testes por módulo, com `inject`:
  - a validação de filtros rejeita valores inválidos;
  - o player não acessa insights de outro jogador (403);
  - o coach não edita o playbook de outro time (403);
  - o heatmap respeita os filtros e retorna `sampleSize`;
  - as respostas não contêm `puuid` nem `puuid_hash`.
- O OpenAPI é exportado em `openapi.json` a cada build. O front gera o cliente tipado a partir dele.

## 8. Entregáveis e critérios de aceite

| # | Entrega | Aceite |
|---|---|---|
| 1 | Base: Fastify, config, Drizzle, erros e OpenAPI | `GET /health` funcionando e Swagger acessível |
| 2 | Auth e papéis com seed | testes de acesso por papel passando |
| 3 | Catálogo e partidas | o replay de um round retorna os snapshots ordenados |
| 4 | Jogadores, times, armas e agentes | os números batem com as tabelas do ETL |
| 5 | Heatmap e mapas | células e zonas com todos os filtros |
| 6 | Economia, estratégias, pressão, combos e insights | o payload traz `isEstimate`, `sampleSize` e `confidence` |
| 7 | Playbook do coach | CRUD completo com validação e limites |
| 8 | Desempenho | p95 abaixo de 150 ms |

## 9. Dependências

- Do Batch 1: o schema `analytics` publicado. As entregas 1 e 2 deste batch podem começar antes, com um banco de fixture.
- Para o Batch 3: o `openapi.json` publicado ao fim da entrega 3, para o front gerar o cliente e trabalhar com mocks enquanto o resto fica pronto.
