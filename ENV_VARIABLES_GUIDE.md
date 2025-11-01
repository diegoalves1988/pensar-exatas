# Guia de Variáveis de Ambiente para Vercel

Quando você fizer deploy no Vercel, você precisa adicionar estas variáveis de ambiente.

## 📋 Como Adicionar no Vercel

1. Acesse seu projeto no Vercel
2. Vá em **Settings**
3. Clique em **Environment Variables**
4. Adicione cada variável abaixo

---

## 🔐 Variáveis Necessárias

### 1. DATABASE_URL (OBRIGATÓRIO)
```
DATABASE_URL=postgresql://usuario:senha@host:5432/banco_de_dados
```
- O projeto usa PostgreSQL (drizzle-orm/postgres-js)
- Opções: Supabase, Railway, Neon, AWS RDS, Render, etc
- Recomendado: Supabase (fácil de iniciar) ou Railway/Neon

### 2. JWT_SECRET (OBRIGATÓRIO)
```
JWT_SECRET=sua_chave_secreta_aleatoria
```
- Gere uma chave aleatória forte
- Comando: `openssl rand -base64 32`

### 3. VITE_APP_ID
```
VITE_APP_ID=seu_app_id
```
- Se você tiver uma aplicação OAuth registrada

### 4. OAUTH_SERVER_URL
```
OAUTH_SERVER_URL=https://api.manus.im
```
- Deixe como está se estiver usando Manus Auth

### 5. VITE_OAUTH_PORTAL_URL
```
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
```
- Deixe como está se estiver usando Manus Auth

### 6. OWNER_OPEN_ID
```
OWNER_OPEN_ID=seu_open_id
```
- Seu ID de usuário no sistema

### 7. OWNER_NAME
```
OWNER_NAME=Diego Alves
```
- Seu nome

### 8. VITE_APP_TITLE
```
VITE_APP_TITLE=Física ENEM Descomplicada
```
- Título do seu site

### 9. VITE_APP_LOGO
```
VITE_APP_LOGO=https://seu-dominio.com/logo.png
```
- URL da logo do seu site

### 10. BUILT_IN_FORGE_API_URL
```
BUILT_IN_FORGE_API_URL=https://api.manus.im
```
- Deixe como está

### 11. BUILT_IN_FORGE_API_KEY
```
BUILT_IN_FORGE_API_KEY=sua_chave_api
```
- Chave de autenticação para APIs

---

## 🚀 Passo a Passo Rápido

1. **Banco de Dados (PostgreSQL)** (escolha um):
   - Supabase: https://supabase.com (recomendado para começar)
   - Railway: https://railway.app
   - Neon: https://neon.tech
   - AWS RDS / Render / Seu próprio servidor

2. **Gere JWT_SECRET**:
   ```bash
   openssl rand -base64 32
   ```

3. **Adicione no Vercel**:
   - Settings → Environment Variables
   - Cole cada variável

4. **Redeploy**:
   - Vercel vai fazer rebuild automaticamente

---

## 💡 Dicas

- **Nunca** compartilhe suas chaves secretas
- Use variáveis diferentes para dev e produção
- Prefira provedores PostgreSQL (o projeto não usa MySQL)

## 💻 Desenvolvimento local (.env)

Crie um arquivo `.env` na raiz do projeto com, no mínimo:

```
DATABASE_URL=postgresql://usuario:senha@host:5432/banco_de_dados
JWT_SECRET=sua_chave_secreta_aleatoria
```

Depois rode as migrações:

```
pnpm run db:push
```

E inicie o servidor de desenvolvimento:

```
# PowerShell
$env:NODE_ENV = "development"; pnpm dlx tsx watch server/_core/index.ts
```
- Se tiver dúvidas, consulte a documentação de cada serviço

---

## 🆘 Problemas Comuns

### "Database connection failed"
- Verifique se DATABASE_URL está correta
- Certifique-se que o banco de dados está acessível
- Verifique firewall/whitelist

### "JWT_SECRET is missing"
- Adicione a variável no Vercel
- Faça redeploy

### "OAuth not working"
- Verifique VITE_APP_ID
- Certifique-se que a aplicação está registrada

---

## 📞 Suporte

Se precisar de ajuda:
- Vercel Docs: https://vercel.com/docs
- Planetscale Docs: https://planetscale.com/docs
- Railway Docs: https://docs.railway.app

