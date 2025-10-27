# Guia Completo: Supabase + Vercel - Física ENEM Descomplicada

Olá Diego! Este é seu guia passo a passo para usar Supabase (100% gratuito) como banco de dados PostgreSQL.

---

## 🎯 Por que Supabase?

- ✅ **100% Gratuito** - Sem cartão de crédito
- ✅ **PostgreSQL** - Banco profissional
- ✅ **Fácil de usar** - Interface intuitiva
- ✅ **Integra com Vercel** - Perfeito para seu projeto

---

## 🚀 Parte 1: Configurar Supabase

### 1.1 Criar Conta

1. Acesse https://supabase.com
2. Clique em **"Start your project"**
3. Clique em **"Sign up with GitHub"**
4. Autorize com sua conta `diegoalves1988`
5. Preencha as informações básicas
6. Pronto! Você está dentro

### 1.2 Criar um Projeto

1. No dashboard, clique em **"New project"**
2. Preencha:
   - **Project name**: `enem-fisica`
   - **Database password**: Crie uma senha forte (salve em um lugar seguro!)
   - **Region**: Escolha a mais próxima do Brasil (ex: São Paulo)
3. Clique em **"Create new project"**

⏳ Aguarde 2-3 minutos para criar...

### 1.3 Obter a Connection String

1. Quando o projeto for criado, vá em **"Settings"** (ícone de engrenagem)
2. Clique em **"Database"**
3. Procure por **"Connection string"**
4. Selecione **"Postgres"**
5. Copie a URL completa (começa com `postgresql://`)

**Exemplo:**
```
postgresql://postgres:sua_senha@db.seu-projeto.supabase.co:5432/postgres
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
set DATABASE_URL=postgresql://seu_usuario:sua_senha@seu_host:5432/seu_banco

# Ou (Mac/Linux)
export DATABASE_URL=postgresql://seu_usuario:sua_senha@seu_host:5432/seu_banco

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
   - **Value**: Cole a URL do Supabase
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

**Como gerar JWT_SECRET:**
```bash
# No terminal
openssl rand -base64 32
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
- Verifique se o Supabase está rodando

### Erro: "Build failed"
- Verifique se todas as variáveis estão no Vercel
- Verifique se o `package.json` está correto

### Domínio não funciona
- Aguarde 24-48 horas
- Verifique os registros DNS em https://dnschecker.org/

### Erro de SSL no Supabase
- Adicione `?sslmode=require` no final da connection string
- Exemplo: `postgresql://...?sslmode=require`

---

## 📊 Próximos Passos

1. ✅ Criar conta Supabase
2. ✅ Criar projeto
3. ✅ Obter connection string
4. ✅ Rodar migrações localmente
5. ✅ Adicionar no Vercel
6. ✅ Fazer deploy
7. ✅ Conectar domínio
8. ✅ Configurar Google AdSense (veja MONETIZATION.md)
9. ✅ Adicionar conteúdo (questões, aulas, portfólio)

---

## 📞 Suporte

- Supabase Docs: https://supabase.com/docs
- Vercel Docs: https://vercel.com/docs
- Hostinger Support: https://www.hostinger.com.br/suporte

---

## 🎉 Parabéns!

Seu site está pronto para ir ao ar! Boa sorte com a Física ENEM Descomplicada! 🚀

**Diego Alves**
*Criado com ❤️ em 2024*

