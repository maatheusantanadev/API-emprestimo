# API Crédito do Trabalhador — Credifit

API REST que orquestra o fluxo de **crédito consignado** integrado ao e-Consignado (Dataprev): cadastro de empresas e funcionários, autorização de consulta, margem consignável, simulação e solicitação de empréstimos com validação de score, margem, limite de ativos e pagamento via gateway.

Implementa integralmente o contrato [`api-contract.yaml`](./api-contract.yaml).

**Stack:** Node.js 20 · TypeScript · NestJS 11 · Prisma 6 · PostgreSQL 16 · Jest + Supertest · Docker

---

## Sumário

- [Como executar](#como-executar)
- [Testes automatizados](#testes-automatizados)
- [Desenvolvimento local (sem Docker)](#desenvolvimento-local-sem-docker)
- [Endpoints](#endpoints)
- [Arquitetura](#arquitetura)
- [Modelagem do banco](#modelagem-do-banco)
- [Regras de negócio](#regras-de-negócio)
- [Tratamento de erros](#tratamento-de-erros)
- [Integrações externas](#integrações-externas)
- [Decisões e interpretações do contrato](#decisões-e-interpretações-do-contrato)
- [Limitações conhecidas e próximos passos](#limitações-conhecidas-e-próximos-passos)

---

## Como executar

Pré-requisito: **Docker** com Docker Compose.

```bash
docker compose up --build
```

Sobem três serviços:

| Serviço | Porta | Descrição |
| ------- | ----- | --------- |
| `api`   | 3000  | Esta API. Aplica as migrations automaticamente ao iniciar |
| `db`    | 5432  | PostgreSQL 16 |
| `mocks` | 3001  | Simulador do Dataprev e do Gateway de Pagamento |

A API fica disponível em **http://localhost:3000** (healthcheck em `GET /health`).

### Exemplo do fluxo completo

```bash
# 1. Empresa
EMPRESA=$(curl -s -X POST localhost:3000/empresas -H 'Content-Type: application/json' -d '{
  "cnpj": "12345678000100", "razaoSocial": "Tech Solutions Ltda",
  "nomeRepresentante": "João da Silva", "cpfRepresentante": "12345678900",
  "email": "joao@techsolutions.com", "senha": "senhaSegura123"}' | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

# 2. Funcionário (CPF final 99 -> score 900 no mock)
FUNC=$(curl -s -X POST localhost:3000/funcionarios -H 'Content-Type: application/json' -d "{
  \"nomeCompleto\": \"Maria Oliveira\", \"cpf\": \"98765432199\", \"email\": \"maria@email.com\",
  \"senha\": \"senhaSegura123\", \"salario\": 5000, \"empresaId\": \"$EMPRESA\"}" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

# 3. Autorização de consulta (válida por 24h)
curl -s -X POST localhost:3000/funcionarios/$FUNC/autorizacao-consulta

# 4. Margem consignável
curl -s localhost:3000/funcionarios/$FUNC/margem

# 5. Simulação
curl -s -X POST localhost:3000/emprestimos/simular -H 'Content-Type: application/json' \
  -d "{\"funcionarioId\": \"$FUNC\", \"valorSolicitado\": 1000}"

# 6. Solicitação
curl -s -X POST localhost:3000/emprestimos -H 'Content-Type: application/json' \
  -d "{\"funcionarioId\": \"$FUNC\", \"valorSolicitado\": 1000, \"numeroParcelas\": 4}"

# 7. Consulta
curl -s "localhost:3000/emprestimos?funcionarioId=$FUNC"
```

Para simular falhas externas, troque o cenário do mock (`healthy`, `dataprev-down`, `dataprev-slow`, `gateway-down`, `gateway-rejected`):

```bash
curl -X POST localhost:3001/admin/scenario -H 'Content-Type: application/json' -d '{"name": "gateway-down"}'
```

---

## Testes automatizados

A suíte completa (unitários + feature) roda em container, sem precisar de Node na máquina:

```bash
docker compose --profile test run --rm --build tests
```

Com Node 20+ instalado localmente:

| Comando | O que roda | Requer banco? |
| ------- | ---------- | ------------- |
| `npm test` | Testes unitários | Não |
| `npm run test:e2e` | Testes de feature (HTTP → Postgres) | Sim |
| `npm run test:all` | Ambos | Sim |
| `npm run test:cov` | Unitários com cobertura | Não |

**Testes unitários** (`test/unit`) — regras de negócio isoladas e services com repositórios em memória:

- cálculo de margem, tabela de score por faixa salarial (com os valores de borda), parcelamento e datas de vencimento (incluindo os exemplos do enunciado, ano bissexto e virada de ano);
- orquestração da solicitação: os três status possíveis, a ordem das validações, nada salvo quando o Dataprev falha, e concorrência (5 solicitações simultâneas → apenas 3 aprovadas);
- expiração e renovação da autorização de 24h;
- unicidade de CPF/CNPJ/e-mail entre empresas e funcionários;
- filtro global de exceções e clientes HTTP (timeout testado contra um servidor HTTP real).

**Testes de feature** (`test/e2e`) — sobem a aplicação real (módulos, validação, filtro de erros, Prisma e PostgreSQL) num banco isolado (`credifit_test`, criado e migrado automaticamente). Apenas Dataprev, Gateway e relógio são substituídos por fakes controláveis. Verificam status codes, o **conjunto exato de campos** de cada schema do contrato e as regras de negócio ponta a ponta.

---

## Desenvolvimento local (sem Docker)

```bash
docker compose up -d db mocks        # banco e mocks
npm ci
cp .env.example .env
set -a; source .env; set +a          # exporta as variáveis para o processo
npx prisma migrate deploy
npm run start:dev
```

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| -------- | ----------- | --------- |
| `DATABASE_URL` | sim | Conexão com o PostgreSQL |
| `DATAPREV_BASE_URL` | sim | URL base do Dataprev (ex.: `http://mocks:3001/dataprev`) |
| `GATEWAY_BASE_URL` | sim | URL base do Gateway (ex.: `http://mocks:3001/gateway`) |
| `PORT` | não (3000) | Porta HTTP |
| `EXTERNAL_TIMEOUT_MS` | não (3000) | Timeout das chamadas ao Dataprev e ao Gateway |
| `TEST_DATABASE_URL` | não | Banco usado pelos testes de feature (padrão: `credifit_test` em `localhost`) |

As variáveis são validadas na inicialização: se faltar alguma obrigatória, a aplicação não sobe.

---

## Endpoints

| Método | Rota | Sucesso | Erros |
| ------ | ---- | ------- | ----- |
| POST | `/empresas` | 201 | 400, 409 |
| POST | `/funcionarios` | 201 | 400, 404, 409 |
| POST | `/funcionarios/:funcionarioId/autorizacao-consulta` | 200 | 404 |
| GET | `/funcionarios/:funcionarioId/margem` | 200 | 403, 404, 422, 502 |
| POST | `/emprestimos/simular` | 200 | 400, 403, 404 |
| POST | `/emprestimos` | 201 | 400, 403, 404, 422, 502 |
| GET | `/emprestimos?funcionarioId=&status=` | 200 | 400 (filtro inválido) |
| GET | `/emprestimos/:emprestimoId` | 200 | 404 |

Payloads e schemas: ver [`api-contract.yaml`](./api-contract.yaml) (pode ser visualizado em https://editor.swagger.io/).

---

## Arquitetura

Camadas com responsabilidades separadas e dependências apontando para abstrações (DIP):

```
HTTP ─► Controller ─► Service ─► Repository (interface) ─► Prisma ─► PostgreSQL
         │  DTO         │  regras de domínio puras
         │  Presenter   └─► Client (interface) ─► Dataprev / Gateway (HTTP)
         └─ ValidationPipe + GlobalExceptionFilter
```

| Camada | Responsabilidade |
| ------ | ---------------- |
| **DTOs** (`dto/`) | Validação estrita da entrada com class-validator. Nada inválido chega ao service |
| **Controllers** | Recebem a requisição, delegam ao service e formatam a resposta. Sem regra de negócio |
| **Presenters** (`presenters/`) | Montam a resposta exatamente no schema do contrato (nunca expõem senha ou dados internos) |
| **Services** | Orquestram o caso de uso e lançam **erros de domínio**, sem conhecer HTTP |
| **Domínio** (`domain/`, `margem.calculator.ts`) | Funções puras: margem, score, parcelamento, avaliação de crédito |
| **Repositories** | Interface + implementação Prisma, injetadas por token. Os testes trocam por versões em memória |
| **Integrations** | Adaptadores do Dataprev e do Gateway com timeout; isolam a API dos detalhes HTTP externos |

```
src/
├── main.ts / app.module.ts / app.setup.ts
├── config/               variáveis de ambiente validadas
├── prisma/               PrismaService
├── common/               erros de domínio, filtro global, pipes, relógio, mutex, utilitários
├── integrations/         http client, Dataprev, Gateway de pagamento
└── modules/
    ├── empresas/  funcionarios/  identificadores/   cadastros e unicidade global
    ├── autorizacoes/                                autorização de 24h
    ├── e-consignado/                                regras que dependem do Dataprev
    ├── margem/                                      cálculo e consulta de margem
    └── emprestimos/                                 simulação, solicitação, consultas
prisma/                   schema.prisma + migrations
test/                     unit/, e2e/, support/ (fakes e repositórios em memória)
```

Cada módulo segue a mesma organização interna (as pastas presentes variam conforme o módulo):

```
modules/emprestimos/
├── emprestimos.module.ts   composição do módulo (injeção de dependências)
├── controllers/            camada HTTP
├── services/               casos de uso / regras de negócio
├── dto/                    entrada validada
├── presenters/             saída no formato do contrato
├── domain/                 regras puras
├── entities/               modelos de domínio
└── repositories/           interface + implementação Prisma
```

---

## Modelagem do banco

```
empresas 1 ──── N funcionarios 1 ──┬── N autorizacoes_consulta
                                   └── N emprestimos 1 ──── N parcelas_emprestimo

identificadores_unicos (tipo, valor)   — registro global de CPF/CNPJ/e-mail
```

| Tabela | Destaques |
| ------ | --------- |
| `empresas` | CNPJ, CPF do representante e e-mail únicos; `senha_hash` (bcrypt) |
| `funcionarios` | FK para empresa; `salario NUMERIC(12,2)` |
| `autorizacoes_consulta` | Histórico: cada autorização/renovação é uma linha com `expira_em`; ativa = `expira_em > agora` |
| `emprestimos` | Status em enum (`aprovado`, `rejeitado`, `erro_processamento`); `valor_parcela` persistido; `gateway_transacao_id` para rastreio |
| `parcelas_emprestimo` | Uma linha por parcela com `data_vencimento DATE`; único por (`emprestimo_id`, `numero`) |
| `identificadores_unicos` | PK (`tipo`, `valor`) — garante no banco a unicidade **entre** empresas e funcionários |

Valores monetários são `NUMERIC(12,2)` (sem erro de ponto flutuante). Regras de integridade também estão no banco via `CHECK`: formato de CPF/CNPJ, salário > 0, parcelas entre 1 e 4 e `motivo_rejeicao` obrigatório quando o status é `rejeitado`.

A margem **não é armazenada**: é sempre calculada a partir dos empréstimos aprovados, evitando dados inconsistentes.

---

## Regras de negócio

### Ordem das validações

| Operação | Sequência |
| -------- | --------- |
| Cadastro de funcionário | dados (400) → empresa existe (404) → unicidade (409) |
| Consultar margem | funcionário (404) → autorização ativa (403) → empresa habilitada no Dataprev (422 / 502) → cálculo |
| Simular | dados (400) → funcionário (404) → autorização (403) → valor ≤ margem (400). **Não consulta o Dataprev** |
| Solicitar | dados (400) → funcionário (404) → autorização (403) → empresa habilitada (422 / 502) → score no Dataprev (502) → score, margem, limite → gateway |

### Resultado da solicitação (sempre **201** quando chega à avaliação)

| Situação | Status salvo | `motivoRejeicao` |
| -------- | ------------ | ---------------- |
| Score abaixo do mínimo da faixa salarial | `rejeitado` | Score insuficiente para a faixa salarial |
| Valor acima da margem disponível | `rejeitado` | Valor solicitado excede a margem consignável disponível |
| Já possui 3 empréstimos `aprovado` | `rejeitado` | Limite de 3 empréstimos ativos atingido |
| Gateway responde `recusado` | `rejeitado` | Pagamento recusado pelo gateway |
| Gateway responde HTTP 503 ou estoura o timeout | `erro_processamento` | `null` |
| Gateway responde `aprovado` | `aprovado` | `null` |

Se o **Dataprev** estiver indisponível, a resposta é **502** e **nenhum empréstimo é salvo**.

### Cálculos

- **Margem:** total = 35% do salário; utilizada = soma de `valorParcela` dos empréstimos `aprovado`; disponível = total − utilizada. Calculada em centavos inteiros.
- **Score mínimo:** até R$ 2.000 → 400; até R$ 4.000 → 500; até R$ 8.000 → 600; até R$ 12.000 → 700; acima → 800 (limites inclusivos).
- **Parcelas:** valor ÷ número de parcelas, arredondado a 2 casas, igual em todas (sem ajuste na última, sem juros).
- **Vencimentos:** parcela N vence N meses após a solicitação, com a semântica do `addMonths` do date-fns (31/01 + 1 mês = 28/02). O dia de referência é o dia em UTC do `createdAt` do empréstimo.

---

## Tratamento de erros

Um **filtro global de exceções** converte todos os erros para o schema `Erro` do contrato:

```json
{ "message": "CNPJ já cadastrado", "details": { "campos": ["cnpj"] } }
```

| Erro de domínio | HTTP |
| --------------- | ---- |
| `InvalidInputError` (validação, valor acima da margem na simulação) | 400 |
| `ForbiddenOperationError` (autorização ausente/expirada) | 403 |
| `NotFoundError` | 404 |
| `ConflictError` (e violação de UNIQUE no banco, por concorrência) | 409 |
| `BusinessRuleViolationError` (empresa não habilitada) | 422 |
| `ExternalServiceUnavailableError` (Dataprev) | 502 |
| Qualquer erro inesperado | 500 com `"Erro interno do servidor"` |

Erros de validação trazem em `details.campos` a lista de problemas por campo. Erros 500 **nunca expõem** stack trace, SQL ou detalhes de infraestrutura na resposta; eles ficam apenas no log do servidor.

---

## Integrações externas

| Serviço | Chamada | Falha (HTTP ≠ 2xx, timeout de 3s, rede, resposta inválida) |
| ------- | ------- | ---------------------------------------------------------- |
| Dataprev | `GET /empresa/{cnpj}/status`, `GET /funcionario/{cpf}/score` | Interrompe a operação → **502** |
| Gateway | `POST /pagamento` com `{ valor, funcionarioCpf }` | Empréstimo salvo como `erro_processamento` → **201** |

O timeout usa `AbortSignal.timeout` e cobre a requisição inteira, incluindo a leitura do corpo. O cliente do gateway nunca lança exceção para o service: devolve `aprovado`, `recusado` ou `falha`, garantindo que o empréstimo não seja perdido.

---

## Decisões e interpretações do contrato

- **ID inválido na rota → 404.** Para `:funcionarioId` e `:emprestimoId` o contrato prevê apenas 404; um valor que não é UUID certamente não existe. No **body**, um UUID inválido é erro de validação (400).
- **UUIDs de qualquer versão** são aceitos (ex.: `00000000-0000-0000-0000-000000000000` resulta em 404, não 400).
- **Parcelas geradas para todo empréstimo**, inclusive `rejeitado` e `erro_processamento`, para que `parcelas.length` sempre corresponda a `numeroParcelas`.
- **Filtros inválidos em `GET /emprestimos`** (`status` fora do enum, `funcionarioId` não-UUID) retornam 400. O contrato só documenta o 200 nessa rota.
- **Formato estrito de documentos:** CPF e CNPJ apenas com dígitos (11 e 14). Valores com máscara retornam 400, já que o contrato especifica "sem formatação".
- **Campos numéricos precisam ser `number`:** `"5000"` (string) retorna 400; valores monetários aceitam até 2 casas decimais.
- **E-mail normalizado** (minúsculas, sem espaços), portanto a unicidade não diferencia maiúsculas.
- **Campos extras no body são descartados** (não geram erro), evitando 400 por campos não previstos.
- **Ordem das regras de crédito** segue a do contrato (score → margem → limite); o `motivoRejeicao` reflete a primeira regra violada. O score é sempre consultado, então Dataprev fora do ar resulta em 502 mesmo que outra regra fosse reprovar.
- **`erro_processamento` não consome margem nem limite:** só empréstimos `aprovado` são considerados ativos.
- **Autorizações mantêm histórico** em vez de sobrescrever a anterior.

---

## Limitações conhecidas e próximos passos

- **Concorrência por instância:** solicitações simultâneas do mesmo funcionário são serializadas por um mutex em memória, o que impede ultrapassar o limite de 3 ativos ou a margem com uma instância da API. Com várias réplicas, o equivalente seria um lock no banco (`pg_advisory_xact_lock` por funcionário).
- **Reprocessamento** de empréstimos em `erro_processamento` está viabilizado pelo modelo (status persistido), mas não há endpoint ou job para isso, pois está fora do escopo.
- **Autenticação**, conforme o enunciado, não foi implementada; as senhas são apenas armazenadas com hash bcrypt.
- **Retry/circuit breaker** nas chamadas externas não foram adicionados para manter o comportamento exigido (falha imediata após o timeout de 3s).
