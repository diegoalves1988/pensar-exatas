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
DATABASE_URL=mysql://usuario:senha@host:3306/banco_de_dados
```
- Você precisa de um banco de dados MySQL
- Opções: Planetscale, Railway, AWS RDS, etc
- **Recomendado**: Planetscale (gratuito até certo ponto)

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

1. **Banco de Dados** (escolha um):
   - Planetscale: https://planetscale.com (recomendado, gratuito)
   - Railway: https://railway.app
   - AWS RDS
   - Seu próprio servidor

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
- Planetscale é gratuito e fácil de usar
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

