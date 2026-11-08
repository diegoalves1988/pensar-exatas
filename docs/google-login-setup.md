# Ativar login com Google

O site usa autenticação própria e a tabela public.users no Postgres. Esta integração usa OpenID Connect do Google e emite o mesmo cookie de sessão já usado pelo site. Não é necessário habilitar Google no Supabase Auth.

## Google Cloud
1. Abra https://console.cloud.google.com/auth/overview e selecione ou crie um projeto para Pensar Exatas.
2. Configure Google Auth Platform / Branding com nome do aplicativo, e-mail de suporte e contatos. Preencha homepage, política de privacidade e termos com páginas reais do site quando solicitados; não invente URLs.
3. Em Audience, escolha External. Enquanto estiver em Testing, adicione os e-mails dos testadores. Publique para permitir o público geral quando a configuração estiver concluída.
4. Em Clients, crie um OAuth client ID do tipo Web application.
5. Cadastre exatamente a URI de redirecionamento:
   https://pensarexatas.com.br/api/auth/google/callback
6. Use somente os escopos openid, email e profile. Não é necessário acesso ao Gmail ou Drive.
7. Copie Client ID e Client secret diretamente para a configuração privada da Vercel. Não envie o segredo por chat nem o salve no GitHub.

## Vercel
Em Settings > Environment Variables do projeto, ambiente Production:
- GOOGLE_CLIENT_ID: Client ID criado no Google.
- GOOGLE_CLIENT_SECRET: Client secret criado no Google; marque como Sensitive.
- APP_URL: https://pensarexatas.com.br
- JWT_SECRET: preserve o segredo atual. Ele precisa ter pelo menos 32 caracteres para ativar Google. Se for necessário rotacioná-lo, isso encerra sessões existentes; faça essa mudança conscientemente.

Faça Redeploy após configurar. Não use prefixo VITE_ para segredos.

GET /api/auth/providers retorna apenas { "google": true/false }. O botão fica oculto enquanto faltar configuração. GET /api/auth/google inicia o fluxo, e /api/auth/google/callback valida e conclui.

## Comportamento
- Novas contas do Google recebem papel user, nunca admin.
- A identidade usa hash SHA-256 do sub do Google, não e-mail.
- Uma conta existente com o mesmo e-mail não é vinculada automaticamente: o usuário deve entrar pelo método anterior ou recuperar a senha.
- O login tradicional continua disponível.
- Cadastro tradicional não pode redefinir a senha de uma conta existente.
- E-mail já verificado não permite criar sessão sem validar uma credencial.
- Cookie temporário HttpOnly, Secure, SameSite=Lax, validade de 10 minutos; state, nonce, PKCE e validação de assinatura, emissor, audiência e expiração.
- Nenhum token do Google é armazenado no navegador ou no banco. O token temporário de tentativa é apagado ao concluir.
- A implementação de produção está em api/index.ts, usada pela Vercel. O servidor alternativo de desenvolvimento não recebe essas rotas neste patch.

## Validação
Execute pnpm exec vitest run server/googleAuth.test.ts.
O workflow google-auth.yml roda os testes no GitHub.
Após inserir credenciais reais, teste: novo usuário, retorno de usuário Google, cancelamento, conflito com cadastro por senha, favoritos, logout e novo login. Esta etapa real depende da configuração do Google e não pode ser concluída apenas com testes simulados.

Referência: https://developers.google.com/identity/openid-connect/openid-connect
