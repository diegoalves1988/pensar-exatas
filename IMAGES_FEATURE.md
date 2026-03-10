# Feature: Suporte a Imagens em Questões

Este documento descreve a implementação de suporte a imagens nas questões do projeto Pensar Exatas.

## O Que Foi Implementado

A feature permite que cada questão tenha uma imagem associada. As imagens aparecem:
- **Na lista de questões** (preview reduzido em miniatura)
- **Na questão expandida** (tamanho completo acima do enunciado)

## Arquivos Modificados

### 1. **Banco de Dados**
- `drizzle/schema.ts` - Adicionado campo `imageUrl` na tabela `questions`
- `drizzle/migrations/0002_fair_thor.sql` - Migração SQL gerada automaticamente

### 2. **Backend (APIs)**
- `server/routers.ts` - Adicionado `imageUrl` nos inputs de `create` e `update` de questões (tRPC)
- `api/admin/questions.ts` - Adicionado `imageUrl` no endpoint serverless POST

### 3. **Frontend**
- `client/src/pages/Questions.tsx` - Renderização de imagens no preview e na seção expandida

### 4. **Scripts e Dados**
- `scripts/seedQuestions.ts` - Suporte a `imageUrl` no tipo `SeedQuestion` e chamada de `createQuestion`
- `scripts/importQuestionsJson.ts` - Suporte a `imageUrl` na importação de JSON
- `data/questions.json` - Adicionado exemplo com `imageUrl`

## Como Usar

### Via Admin API (Serverless)
```bash
curl -X POST http://localhost:3000/api/admin/questions \
  -H "Content-Type: application/json" \
  -b "app_session_id=seu_token" \
  -d '{
    "subjectId": 1,
    "title": "Queda Livre",
    "statement": "Um objeto cai de 100m. Qual o tempo de queda? (g=10m/s²)",
    "solution": "h = (1/2)gt² => 100 = 5t² => t = 2√5 ≈ 4.47s",
    "difficulty": "medium",
    "year": 2023,
    "sourceUrl": "https://exemplo.com/questao",
    "imageUrl": "https://via.placeholder.com/400x300?text=Diagrama"
  }'
```

### Via tRPC em Desenvolvimento
```typescript
const question = await trpc.questions.create.mutate({
  subjectId: 1,
  title: "Queda Livre",
  statement: "Um objeto cai de 100m...",
  solution: "h = (1/2)gt²...",
  imageUrl: "https://via.placeholder.com/400x300?text=Diagrama"
});
```

### Via JSON para Seed
Adicione o campo `imageUrl` no arquivo `data/questions.json`:
```json
{
  "subject": "Mecânica",
  "title": "Queda Livre",
  "statement": "Um objeto cai de 100m...",
  "solution": "h = (1/2)gt²...",
  "imageUrl": "https://via.placeholder.com/400x300?text=Diagrama"
}
```

Depois execute:
```bash
npm run import:questions
```

## Deployment e Migração

### Em Produção (Supabase)
1. Faça commit das mudanças
2. Na plataforma de deployment (Vercel/Railway):
   - A migração será executada automaticamente ao fazer deploy
   - Ou execute manualmente: `npm run db:push`

### Em Desenvolvimento Local
1. Certifique-se que `DATABASE_URL` está configurada no `.env`
2. Execute: `npm run db:push`
3. Opcionalmente, seed com dados de exemplo: `npm run import:questions`

## Detalhes Técnicos

### Campo de Banco de Dados
- **Coluna**: `imageUrl` (varchar 500)
- **Tabela**: `questions`
- **Nullable**: Sim (campo opcional)
- **Tipo**: String (URL)

### Renderização Frontend

**No preview (card collapsed):**
- Altura: 80px
- Width: automático (mantém proporção)
- Bordas: arredondadas (border-radius: 0.375rem)
- Borda: 1px cinza

**Na seção expandida:**
- Largura: 100% do container
- Altura: automática
- Máximo: 384px de altura
- Bordas: arredondadas
- Borda: 1px cinza mais escura
- Aparece logo após a seção de título/info
- Aparece *antes* do enunciado para máxima visibilidade

### Validação
- Campo `imageUrl` é string opcional
- Não há validação de URL no backend (confia na URL do cliente)
- URLs devem suportar CORS para renderizar no browser

## Exemplos de URLs para Teste

- Placeholder: `https://via.placeholder.com/400x300?text=Queda+Livre`
- Unsplash: `https://images.unsplash.com/photo-...`
- Imgur: `https://imgur.com/...`
- CDN próprio (se disponível)

## Considerações Futuras

1. **Validação de URL** - Adicionar validação regex para URLs
2. **Compressão de Imagem** - Adicionar suporte a compressão automática
3. **Upload de Imagem** - Adicionar endpoint para upload em vez de apenas URLs
4. **Alt Text** - Adicionar campo `imageAlt` para acessibilidade
5. **Múltiplas Imagens** - Permitir múltiplas imagens por questão (carousel)
6. **Cache** - Adicionar cache de imagens no browser

## Troubleshooting

### Imagem não aparece
- Verificar se a URL é válida
- Verificar CORS headers do servidor da imagem
- Verificar console do browser para erros

### Migração falha ao fazer deploy
- Verificar se `DATABASE_URL` está configurada no servidor
- Verificar permissões de banco de dados
- Revisar logs do deployment

### Diferença entre preview e versão expandida
- É intencional: preview usa imagem pequena para não deixar a lista pesada
- Versão expandida mostra imagem em tamanho razoável para ver detalhes
