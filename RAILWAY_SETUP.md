# Guia Completo: Railway + Vercel - Física ENEM Descomplicada

Olá Diego! Este é seu guia passo a passo para usar Railway como banco de dados.

---

## 🚂 Parte 1: Configurar Railway

### 1.1 Criar Conta

1. Acesse https://railway.app
2. Clique em **"Start Free"**
3. Clique em **"Sign up with GitHub"**
4. Autorize com sua conta `diegoalves1988`
5. Pronto! Você está dentro

### 1.2 Criar Banco de Dados MySQL

1. No dashboard, clique em **"New Project"**
2. Clique em **"Provision New"**
3. Procure por **"MySQL"** (ou role para baixo)
4. Clique em **"MySQL"**
5. Aguarde 1-2 minutos para criar...

✅ Pronto! Seu banco foi criado!

### 1.3 Obter a Connection String

1. Clique no banco MySQL que apareceu
2. Vá em **"Variables"** (abinha no topo)
3. Procure por **"DATABASE_URL"** ou **"DATABASE_PRIVATE_URL"**
4. Copie a URL completa (começa com `mysql://`)

**Exemplo:**
```
mysql://root:senha123@containers-us-west-123.railway.app:3306/railway
```

---

## 💻 Parte 2: Rodar Migrações Localmente

Antes de fazer deploy, você precisa criar as tabelas no banco.

### 2.1 No seu computador

Abra o terminal e execute:

```bash
# Vá para a pasta do projeto
cd enem-fisica

# Defina a variável de ambiente (Windows)
set DATABASE_URL=mysql://seu_usuario:sua_senha@seu_host:3306/seu_banco

# Ou (Mac/Linux)
export DATABASE_URL=mysql://seu_usuario:sua_senha@seu_host:3306/seu_banco

# Rode as migrações
pnpm db:push
```

✅ Se funcionou, você verá mensagens de sucesso!

---

## 🌐 Parte 3: Adicionar no Vercel

### 3.1 Configurar Variáveis

1. Vá ao seu projeto no Vercel
2. Clique em **"Settings"**
3. Vá em **"Environment Variables"**
4. Adicione:
   - **Key**: `DATABASE_URL`
   - **Value**: Cole a URL do Railway
5. Clique em **"Save"**

### 3.2 Outras Variáveis (Importante!)

Adicione também:

```
JWT_SECRET = gere_uma_chave_aleatoria
VITE_APP_ID = seu_app_id
OAUTH_SERVER_URL = https://api.manus.im
VITE_OAUTH_PORTAL_URL = https://oauth.manus.im
OWNER_OPEN_ID = seu_id
OWNER_NAME = Diego Alves
VITE_APP_TITLE = Física ENEM Descomplicada
VITE_APP_LOGO = url_da_logo
BUILT_IN_FORGE_API_URL = https://api.manus.im
BUILT_IN_FORGE_API_KEY = sua_chave_api
```

---

## 🚀 Parte 4: Fazer Deploy

1. Volte ao Vercel (seu projeto)
2. Clique em **"Deployments"**
3. Clique em **"Redeploy"** (botão com 3 pontos)
4. Escolha **"Redeploy"**
5. Aguarde 5-10 minutos

✅ Pronto! Seu site está no ar!

---

## 🌍 Parte 5: Conectar Domínio

### 5.1 No Vercel

1. Vá em **"Settings"** do seu projeto
2. Clique em **"Domains"**
3. Clique em **"Add Domain"**
4. Digite: `pensarexatas.com.br`
5. Clique em **"Add"**

Vercel vai te dar instruções de DNS.

### 5.2 No Hostinger

1. Acesse sua conta Hostinger
2. Vá em **"Domínios"** → **"pensarexatas.com.br"**
3. Clique em **"Gerenciar DNS"**
4. Adicione os registros que o Vercel forneceu
5. Salve

⏳ Aguarde 24-48 horas para propagação.

---

## ✅ Verificar se Funcionou

1. Acesse https://pensarexatas.com.br
2. Você deve ver seu site!
3. Teste:
   - ✅ Página inicial carrega
   - ✅ Clique em "Questões"
   - ✅ Clique em "Portfólio"
   - ✅ Faça login

---

## 🆘 Troubleshooting

### Erro: "Database connection failed"
- Verifique se a `DATABASE_URL` está correta
- Certifique-se que você rodou `pnpm db:push`
- Verifique se o Railway está rodando

### Erro: "Build failed"
- Verifique se todas as variáveis estão no Vercel
- Verifique se o `package.json` está correto

### Domínio não funciona
- Aguarde 24-48 horas
- Verifique os registros DNS em https://dnschecker.org/

---

## 📞 Suporte

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Hostinger Support: https://www.hostinger.com.br/suporte

---

## 🎉 Parabéns!

Seu site está no ar! Boa sorte com a Física ENEM Descomplicada! 🚀

**Diego Alves**
*Criado com ❤️ em 2024*

