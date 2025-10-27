# Guia de Monetização - Física ENEM Descomplicada

## Visão Geral

O site está preparado para monetização através de anúncios. Foram implementados placeholders de anúncios em locais estratégicos para maximizar a receita sem prejudicar a experiência do usuário.

## Locais de Anúncios

### 1. Página Inicial (Home)
- **Após Hero Section**: Anúncio horizontal (728x90 ou responsivo)
- **Entre Stats e Features**: Anúncio vertical ou horizontal
- **Antes da CTA Final**: Anúncio horizontal
- **Após CTA Final**: Anúncio vertical ou horizontal

### 2. Página de Questões
- **Acima da lista de questões**: Anúncio horizontal
- **Entre questões**: Anúncios intercalados (a cada 5 questões)
- **Após lista de questões**: Anúncio horizontal

### 3. Página de Portfólio
- Anúncios discretos nas laterais (quando houver espaço)

## Como Configurar Google AdSense

### Passo 1: Criar Conta Google AdSense
1. Acesse [Google AdSense](https://www.google.com/adsense/)
2. Clique em "Começar"
3. Faça login com sua conta Google
4. Preencha as informações do site

### Passo 2: Obter Código de Publicador
Após aprovação, você receberá um código de publicador (ca-pub-xxxxxxxxxxxxxxxx)

### Passo 3: Configurar Anúncios no Site

#### Opção 1: Usar Componente AdBanner (Recomendado)
```tsx
import { AdBanner } from "@/components/AdBanner";

// Em qualquer página
<AdBanner 
  slot="1234567890" 
  format="horizontal" 
  className="my-6"
/>
```

#### Opção 2: Adicionar Script Manualmente
No arquivo `client/index.html`, adicione antes de `</head>`:
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-xxxxxxxxxxxxxxxx"
     crossorigin="anonymous"></script>
```

### Passo 4: Substituir Placeholders
No arquivo `client/src/components/AdBanner.tsx`, substitua:
- `ca-pub-xxxxxxxxxxxxxxxx` pelo seu código de publicador
- Os valores de `data-ad-slot` pelos slots específicos de cada anúncio

## Tipos de Anúncios Disponíveis

### 1. Anúncios Responsivos
- Melhor para a maioria dos casos
- Ajustam-se automaticamente ao tamanho da tela
- `format="auto"`

### 2. Anúncios Horizontais
- Ideal para topo e rodapé
- Tamanhos comuns: 728x90, 970x90
- `format="horizontal"`

### 3. Anúncios Verticais
- Ideal para laterais
- Tamanhos comuns: 300x600, 160x600
- `format="vertical"`

## Boas Práticas de Monetização

### ✅ Recomendado
- Máximo 3 anúncios por página
- Anúncios acima da dobra (visíveis sem scroll)
- Espaçamento adequado entre conteúdo e anúncios
- Usar anúncios responsivos para melhor experiência

### ❌ Evitar
- Mais de 4 anúncios por página
- Anúncios que cobrem conteúdo importante
- Pop-ups ou anúncios intersticiais excessivos
- Anúncios que prejudicam a experiência do usuário

## Otimização de Receita

### 1. Posicionamento
- Anúncios acima da dobra geram mais cliques
- Anúncios próximos ao conteúdo relevante performam melhor
- Anúncios em páginas com muito tráfego geram mais receita

### 2. Conteúdo de Qualidade
- Quanto melhor o conteúdo, mais tempo o usuário fica
- Mais tempo = mais oportunidades de cliques
- Conteúdo relevante atrai anúncios de melhor qualidade

### 3. Tráfego Qualificado
- Usuários de países desenvolvidos geram mais receita
- Tráfego orgânico é mais valioso que tráfego pago
- Construir comunidade fiel aumenta receita

## Monitoramento de Desempenho

### Métricas Importantes
- **RPM (Revenue Per Mille)**: Receita por 1000 impressões
- **CTR (Click-Through Rate)**: Taxa de cliques nos anúncios
- **CPC (Cost Per Click)**: Valor médio por clique
- **Impressões**: Número de vezes que anúncios foram exibidos

### Dashboard Google AdSense
- Acesse regularmente para monitorar desempenho
- Teste diferentes formatos e posições
- Otimize baseado em dados reais

## Alternativas de Monetização

### 1. Afiliados
- Links para cursos online relacionados
- Livros de física na Amazon
- Plataformas de educação

### 2. Conteúdo Premium
- Questões extras com assinatura
- Resoluções em vídeo
- Aulas ao vivo com o professor

### 3. Doações
- Botão de "Apoiar o Projeto"
- Patreon ou similar
- PIX/PayPal direto

### 4. Parcerias
- Cursinhos online
- Plataformas de educação
- Editoras de livros

## Conformidade e Políticas

### Google AdSense Policies
- Não clique nos seus próprios anúncios
- Não peça a outros para clicar
- Não use anúncios em conteúdo adulto
- Não use anúncios em conteúdo ilegal

### Privacidade
- Adicione política de privacidade clara
- Informe sobre cookies de publicidade
- Cumpra LGPD (Lei Geral de Proteção de Dados)

## Próximos Passos

1. ✅ Criar conta Google AdSense
2. ✅ Obter aprovação
3. ✅ Configurar código de publicador
4. ✅ Substituir placeholders no código
5. ✅ Testar anúncios em staging
6. ✅ Deploy para produção
7. ✅ Monitorar desempenho
8. ✅ Otimizar baseado em dados

## Suporte

Para dúvidas sobre Google AdSense:
- [Centro de Ajuda AdSense](https://support.google.com/adsense)
- [Políticas de AdSense](https://support.google.com/adsense/answer/48182)
- [Fórum da Comunidade](https://support.google.com/adsense/community)

