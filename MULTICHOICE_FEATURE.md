# Feature: Suporte a Questões de Múltipla Escolha

Esta documentação descreve as alterações necessárias para oferecer um modo
interativo de questões com alternativas.

## O Que Foi Implementado

A nova funcionalidade permite:

- Armazenar alternativas (`choices`), lista de strings.
- Indicar qual alternativa é correta (`correctChoice`, índice 0‑based).
- Mostrar botões quando uma questão possui alternativas e permitir que o
  usuário selecione uma resposta.
- Exibir feedback imediato: se acertar, mostra atenção verde; se errar, indica a
  alternativa certa.
- Mesma interface de administração (via API) passou a aceitar as informações.


## Alterações de Banco de Dados

- `drizzle/schema.ts`:
  - Importado `jsonb`.
  - Adicionados campos `choices` (jsonb array) e `correctChoice` (integer) à
    tabela `questions`.

- Migração automática criará `drizzle/migrations/0003_multiple_choice.sql`:

  ```sql
  ALTER TABLE "questions" ADD COLUMN "choices" jsonb;
  ALTER TABLE "questions" ADD COLUMN "correctChoice" integer;
  ```


## Backend (APIs)

- `server/routers.ts`:
  - `trpc.questions.create` e `update` admitem `choices` e `correctChoice` no
    input schema (via `z.array(z.string())` e `z.number().int()`).

- `api/admin/questions.ts` (endpoint serverless POST)
  aceita os novos campos no corpo e repassa ao `db.createQuestion`.

- `server/db.ts` não precisou de mudanças específicas além de aceitar
  arbitrários, mas os tipos inferidos já contemplam as novas colunas.


## Frontend

- `client/src/pages/AdminQuestions.tsx`:
  - Novos controles para inserir alternativas dinâmicas e informar índice
    correto.
  - Payload JSON enviado ao servidor inclui `choices` e `correctChoice` quando
    definidos.

- `client/src/pages/Questions.tsx`:
  - Estado `answers` para acompanhar escolhas já respondidas.
  - Renderização de botões de alternativa no detalhamento expandido.
  - Feedback visual e textual após a seleção.

- `data/questions.json` foi atualizado com exemplo de questão de múltipla
  escolha.


## Scripts e Dados

- `scripts/seedQuestions.ts` e `scripts/importQuestionsJson.ts` passaram a
  suportar os novos campos.
- Os jogadores/administradores podem adicionar perguntas de múltipla escolha
  no JSON de seed ou via interface de admin.


## Migração e Deploy

1. Commitar as alterações.
2. Em produção (Supabase/Vercel) a migração será executada automaticamente
   (`npm run db:push` ou similar).
3. Em desenvolvimento:
   - Atualizar `.env` com `DATABASE_URL`.
   - Executar `npm run db:push`.
   - Re-seed ou importar JSON se desejar dados de exemplo.


## Observações Técnicas

- `choices` é um array de strings e pode ser `NULL`/omitido para manter
  questões de texto puro sem alternativas.
- `correctChoice` deve ser um índice válido dentro do vetor `choices`.
- Não há validação na API sobre consistência entre os dois campos; a validação
  pode ser adicionada posteriormente caso necessário.
- A interface tratará tanto casos com quanto sem alternativas de forma
  transparente.


## Exemplo de requisição curl (serverless)

```bash
curl -X POST http://localhost:3000/api/admin/questions \
  -H "Content-Type: application/json" \
  -b "app_session_id=seu_token" \
  -d '{
    "subjectId": 1,
    "title": "Corrente em resistor",
    "statement": "Um resistor de 10 Ω é ligado a 20 V. Qual a corrente?",
    "choices": ["0.5 A","1 A","2 A","4 A"],
    "correctChoice": 2,
    "solution": "I=V/R=20/10=2A",
    "difficulty": "easy",
    "year": 2023
  }'
```

