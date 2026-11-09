# Revisão ENEM 2022

Revisão de Física e Matemática da aplicação regular, segundo dia, **caderno 7 azul**.

## Fontes

- [Prova Inep](https://download.inep.gov.br/enem/provas_e_gabaritos/2022_PV_impresso_D2_CD7.pdf).
- [Gabarito oficial Inep](https://download.inep.gov.br/enem/provas_e_gabaritos/2022_GB_impresso_D2_CD7.pdf).
- O download da prova pelo servidor do Inep falhou nesta sessão. Foi conferido o mesmo caderno original disponibilizado pelo [Curso Objetivo](https://www.curso-objetivo.br/vestibular/resolucao-comentada/enem/2022/2dia/enem2022_2dia_prova_azul.pdf). O gabarito foi obtido diretamente do Inep.

## Resultado editorial

59 registros existentes revisados; 56 resoluções de questões do escopo reescritas. Incluídas seis questões com enunciado, cinco alternativas, resolução, classificação e gabarito: **96, 105, 119, 128, 130 e 144**.

Conjunto final: **65 registros**, dos quais **61 ativos**, **1 anulado para consulta** e **3 arquivados**. São 45 questões de Matemática (incluindo a anulada) e 17 de Física/interdisciplinares. A questão 130 foi incluída em Óptica por trabalhar intensidade luminosa e sensibilidade a fótons; seu contexto também envolve Biologia.

25 classificações existentes ajustadas. As questões 101 (fermentação), 104 (EPO/doping) e 126 (tratamento químico da água) foram arquivadas por não pertencerem ao escopo de Física/Matemática. Não há exclusão de registros ou de histórico.

## Correções relevantes

| Questão | Correção |
| --- | --- |
| 100, 103, 109 | Gravidade, vetores e notação isotópica; correções de texto e classificação. |
| 112 | Resolução de outro problema substituída pela análise do balanço: 360 N por corrente e margem de 25%, resultando em 450 N. |
| 116 | Unidades e cálculo do aquecimento: 6300 W / 220 V; disjuntor de 30 A. |
| 137, 141, 148, 150, 155–158 | Fórmulas e alternativas transcritas para TeX explícito, preservando dados e alternativas da prova. |
| 143 | Gabarito alterado de A para **D**, conforme Inep; resolução da planificação refeita. |
| 144 | Questão ausente incluída; dígito verificador 7, alternativa C. |
| 145 | Distinção entre 500000 moedas no total e 400000 adicionais à troca básica de 100000, leitura usada pelo gabarito E. A resolução explicita essa interpretação do enunciado. |
| 152 | Restaurada a informação de que a tela mede 12 m de largura. |
| 157 | **Anulada oficialmente**; gabarito removido. Mantidas as alternativas originais, inclusive o 625 incorreto. Explicada a função correta; sem pontuação e fora dos simulados. |
| 159 | Removido texto corrompido por OCR; sequência de 13 dias restaurada por recorte da prova e cálculo da 24ª semana refeito. |
| 166 | Restaurada a alternativa A = **0**, ausente na importação. As antigas alternativas 1, 2, 3 e 4 passam a B, C, D e E. Histórico existente deve conservar o valor escolhido por deslocamento do índice e recálculo de acerto. |
| 168 | Restaurado o mapa do trajeto e explicada a sequência DFEFDDEEFFD. |
| 176 | Primeiro parágrafo ausente restaurado e resolução por reflexão geométrica. |

As outras resoluções foram revisadas para explicar a estratégia, as contas e a conclusão, usando parágrafos e etapas. Números com quatro ou mais algarismos não usam espaço separador de milhar.

## Imagens e validação

- 116 URLs de imagens preexistentes consultadas: todas responderam.
- Nove novos recortes da prova em `client/public/questions/2022/`: tabela e cinco circuitos da 96, tabela da 128, sequência da 159 e mapa da 168.
- Recortes conferidos visualmente.
- Gabaritos das 62 questões públicas conferidos com o oficial; cinco alternativas em cada questão.
- `scripts/validateReview2022.mjs` valida contagens, gabaritos, referências locais e sintaxe das fórmulas usando KaTeX 0.16.8, a versão carregada pelo site.
- O fluxo existente de status arquivado/anulado, implementado na revisão de 2023, é reutilizado.
- Aplicação no banco em transação com comparação integral do snapshot anterior, para abortar se houver alterações concorrentes. IDs existentes preservados; novos IDs atribuídos pelo banco.

Dados editoriais versionados em [data/revisao-enem-2022.json](../data/revisao-enem-2022.json). Os novos registros estão em `newQuestions`; os registros existentes, incluindo os arquivados, em `questions`. Timestamps operacionais não integram o arquivo editorial.
