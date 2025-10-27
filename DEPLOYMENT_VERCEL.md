# Guia de Deployment no Vercel - Física ENEM Descomplicada

Olá Diego! 👋 Este é seu guia passo a passo para fazer deploy do site no Vercel.

## 📋 Pré-requisitos

- ✅ Conta GitHub (você já tem: `diegoalves1988`)
- ✅ Conta Vercel (gratuita)
- ✅ Domínio `pensarexatas.com.br` (você já tem no Hostinger)

---

## 🚀 Passo 1: Preparar o Repositório GitHub

### 1.1 Criar um novo repositório no GitHub

1. Acesse https://github.com/new
2. Preencha:
   - **Repository name**: `enem-fisica` (ou outro nome que preferir)
   - **Description**: "Site de Física ENEM com questões resolvidas e gamificação"
   - **Public** ou **Private** (sua escolha)
   - **Não** inicialize com README (vamos fazer isso)
3. Clique em **"Create repository"**

### 1.2 Fazer push do código para GitHub

Abra o terminal no seu computador e execute:

```bash
# Clone o repositório que você criou
git clone https://github.com/diegoalves1988/enem-fisica.git
cd enem-fisica

# Copie os arquivos do projeto para cá
# (Você vai receber os arquivos em um ZIP ou similar)

# Adicione os arquivos ao Git
git add .

# Faça o commit
git commit -m "Initial commit: Física ENEM Descomplicada"

# Envie para GitHub
git push -u origin main
```

---

## 🌐 Passo 2: Conectar ao Vercel

### 2.1 Criar conta Vercel (se não tiver)

1. Acesse https://vercel.com
2. Clique em **"Sign Up"**
3. Escolha **"Continue with GitHub"**
4. Autorize o Vercel a acessar sua conta GitHub

### 2.2 Fazer Deploy

1. No Vercel, clique em **"New Project"**
2. Selecione o repositório `enem-fisica`
3. Configure:
   - **Framework Preset**: Node.js
   - **Root Directory**: `./` (deixe como está)
   - **Build Command**: `pnpm build`
   - **Output Directory**: `dist`

4. **Variáveis de Ambiente** (IMPORTANTE!):
   
   Você precisa adicionar as mesmas variáveis que usamos aqui:
   
   ```
   DATABASE_URL=seu_banco_de_dados_url
   JWT_SECRET=seu_jwt_secret
   VITE_APP_ID=seu_app_id
   OAUTH_SERVER_URL=seu_oauth_url
   VITE_OAUTH_PORTAL_URL=seu_oauth_portal_url
   OWNER_OPEN_ID=seu_owner_id
   OWNER_NAME=seu_nome
   VITE_APP_TITLE=Física ENEM Descomplicada
   VITE_APP_LOGO=url_da_logo
   BUILT_IN_FORGE_API_URL=url_api
   BUILT_IN_FORGE_API_KEY=sua_chave_api
   ```

5. Clique em **"Deploy"**

⏳ Aguarde 2-5 minutos para o deploy ser concluído.

---

## 🌍 Passo 3: Conectar seu Domínio

### 3.1 No Vercel

1. Vá para o projeto que você acabou de fazer deploy
2. Clique em **"Settings"**
3. Vá em **"Domains"**
4. Clique em **"Add Domain"**
5. Digite: `pensarexatas.com.br`
6. Clique em **"Add"**

Você receberá instruções de DNS. Copie os registros!

### 3.2 No Hostinger

1. Acesse sua conta Hostinger
2. Vá em **"Domínios"** → **"pensarexatas.com.br"**
3. Clique em **"Gerenciar DNS"** ou **"DNS Management"**
4. Procure por **"Registros DNS"** ou **"DNS Records"**
5. Adicione os registros que o Vercel forneceu (geralmente um CNAME ou A record)
6. Salve as alterações

⏳ Aguarde 24-48 horas para a propagação do DNS.

---

## ✅ Verificar se Funcionou

1. Acesse https://pensarexatas.com.br
2. Você deve ver seu site funcionando!
3. Verifique se:
   - ✅ Página inicial carrega
   - ✅ Pode clicar em "Questões"
   - ✅ Pode clicar em "Portfólio"
   - ✅ Pode fazer login

---

## 🔧 Próximos Passos

### 1. Configurar Google AdSense

Veja o arquivo `MONETIZATION.md` para instruções completas.

### 2. Adicionar Conteúdo

1. Faça login como admin no seu site
2. Vá em **"Admin"** (canto superior direito)
3. Comece a adicionar:
   - Questões
   - Aulas
   - Informações do seu portfólio

### 3. Otimizar para SEO

Adicione meta tags e descrições para melhorar no Google.

---

## 🆘 Troubleshooting

### Erro: "Build failed"
- Verifique se todas as variáveis de ambiente estão configuradas
- Verifique se o `package.json` tem todos os scripts

### Erro: "Database connection failed"
- Verifique se a `DATABASE_URL` está correta
- Certifique-se que o banco de dados está acessível

### Domínio não funciona
- Aguarde 24-48 horas para propagação
- Verifique os registros DNS em https://dnschecker.org/
- Certifique-se que adicionou os registros corretos no Hostinger

---

## 📞 Suporte

Se tiver dúvidas:
- Vercel Docs: https://vercel.com/docs
- GitHub Docs: https://docs.github.com
- Hostinger Support: https://www.hostinger.com.br/suporte

---

## 🎉 Parabéns!

Seu site está pronto para ir ao ar! Boa sorte com a Física ENEM Descomplicada! 🚀

**Diego Alves**
*Criado com ❤️ em 2024*

