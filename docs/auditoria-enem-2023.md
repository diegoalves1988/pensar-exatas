# Auditoria do ENEM 2023 — caderno 7 azul

## Escopo e situação

Revisão das 60 questões de 2023 cadastradas no banco remoto do Pensar Exatas, confrontadas com a prova impressa da aplicação regular, segundo dia, caderno 7 azul. O código consultado foi o da branch main do GitHub. A cópia local do projeto não foi utilizada.

**Este documento registra achados e correções propostas. Nenhuma questão foi alterada, excluída ou importada nesta etapa.** As questões 171–180 foram apenas examinadas; não houve alteração nessa faixa.

Foram lidos enunciados, alternativas e resoluções dos 60 registros; conferidas as 60 letras com o gabarito oficial; examinadas páginas renderizadas para os problemas de figuras, tabelas e gráficos; e verificada a disponibilidade das 86 URLs PNG/JPG únicas referenciadas. Todas responderam HTTP 200 com conteúdo de imagem. Essa disponibilidade não garante que cada recorte esteja correto nem substitui um teste visual de todas as questões no site. Os placeholders broken-image.svg da questão 129 não entram nessa contagem.

## Fontes

- [Arquivo oficial de 2023 — Inep](https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2023)
- [Prova oficial: caderno 7 azul, segundo dia](https://download.inep.gov.br/enem/provas_e_gabaritos/2023_PV_impresso_D2_CD7.pdf)
- [Gabarito oficial: caderno 7 azul, segundo dia](https://download.inep.gov.br/enem/provas_e_gabaritos/2023_GB_impresso_D2_CD7.pdf)
- [Cópia do PDF da prova utilizada para leitura e renderização](https://github.com/MestreAlex/enem/blob/b71c1aa9d5bb7f6aa16445d5bf147767ab2dbdd2/2023_PV_impresso_D2_CD7.pdf), blob 67faf1626dbce1f66dbb09a0daef2d4bcf39dd0e. Usada porque o download direto do Inep falhou. Capa e numeração identificam caderno 7 azul.
- Dados: public.questions, year=2023, IDs 860 a 919, com catálogo public.subjects.

## Resultado principal

- **59 das 60 letras cadastradas coincidem com o gabarito oficial.** A questão **164 foi anulada**, mas está cadastrada com D como resposta.
- **7 registros têm conteúdo predominante de Biologia/Química fora do recorte do site:** 91, 92, 95, 101, 116, 121 e 129.
- **29 registros têm classificação recomendada diferente da atual**, além dos 7 fora do recorte. Algumas mudanças são de refinamento pedagógico; não devem ser confundidas com erro inequívoco de disciplina.
- **5 questões de Matemática estão ausentes:** 148, 149, 153, 154 e 174.
- **5 questões adicionais compatíveis com Física estão ausentes:** 93, 100, 109, 117 e 119. As questões 93 e 119 são interdisciplinares, mas podem ser incluídas por energia nuclear e gases ideais.
- Enunciados incompletos: **141, 142 e 146**.
- Alternativas danificadas: **132 (A–D ausentes), 114 (C duplicada de A), 143 (C transcrita como 12 em vez de 13)**. A alternativa E da 111 está truncada.
- Exemplos de resoluções com dados, interpretação ou contas erradas: **114, 139, 141, 145, 146, 151, 152, 160, 164, 165, 169, 177 e 179**. As questões 142, 144 e 170 têm justificativas genéricas sem a demonstração exigida.
- Há fórmulas transformadas em imagens, sublinhados de Markdown, milhares com pontos/espaços e moeda que precisam de padronização. Não atribuir automaticamente todos esses problemas ao KaTeX: muitos já estão no texto armazenado.

## Correções prioritárias verificadas

### Questão 164: anulação

O gabarito oficial marca **Anulado**. O cadastro não pode continuar pontuando D como resposta oficial. Antes de corrigir, definir tratamento explícito de anulação na listagem, resolução e simulados. Preservar eventuais favoritos e histórico; não apagar a questão para contornar a situação.

O gráfico apresenta percentuais de imunização, não populações absolutas. A resolução atual inventa comparações de tamanho das populações.

### Questão 132: alternativas gráficas

A, B, C e D contêm apenas "[Alternativa sem texto]". Recuperar os quatro gráficos da página 14. A imagem da E existe. A resolução de P/T constante está coerente.

### Questões 141, 142 e 146: completar os enunciados

- **141, página 18:** faltam o contexto do alojamento, a distribuição de cartões por série e os números de alunos. Há 200 cartões do primeiro ano, 300 do segundo e 300 do terceiro. Probabilidade = 300/800 = **3/8, alternativa E**. Dividir 100 por 450 estudantes é incorreto.
- **142, página 18:** faltam 75 moradores, raio 5 m, consumo 200 L por morador/dia, altura remanescente 1,5 m e π≈3. Volume = 3×5²×1,5 = 112,5 m³ = 112500 L. Cota para 10 dias = 112500/(75×10) = 150 L/dia. Economia = 200−150 = **50 L/dia, alternativa A**.
- **146, página 19:** falta a definição do triângulo mágico com números de 1 a 6, sem repetição, e somas iguais nos lados. O recorte remoto contém apenas o desenho. Se S é a soma comum e V a soma dos vértices, 3S=21+V. Para vértices 1,3,5, S=10; para 2,4,6, S=11. As duas disposições existem: os meios dos lados são, respectivamente, 6/4/2 e 5/3/1. **Alternativa E**.

### Resoluções que chegam à letra certa por um caminho errado

| Questão | Correção necessária |
| --- | --- |
| 139 | Produto I aumenta 10 unidades/mês, não 50. Produto II diminui 20. Julho: 110 e 130; agosto: 120 e 110. A produção de II cessa em setembro, D. |
| 145 | O jogador é **Q₃**, alternativa B, não Q₅. Conferir o arco que passa por A, B, Q₁ e Q₃. |
| 151 | Há uma trajetória no plano dos valores A e B, não duas curvas ao longo do tempo. A>B nos pontos de 9h, 12h, 13h e 14h: quatro instantes, B. |
| 152 | I=8×10⁻⁸ W/m². N=10 log₁₀(8×10⁴)=10(0,9+4)=**49 dB**, não 53. Medida II, B. |
| 160 | Quantidades: tipo I **19545240**, tipo II **7956000**, tipo III **7160400**. A ordem das probabilidades permanece p₁<p₂<p₃, A. |
| 165 | Piso 0,25 m e espelho 0,20 m. Pisos: 0,75 m². Espelhos: 0,60 m². Cada lateral: 0,25(0,20+0,40+0,60)=0,30 m². Total **1,95 m²**, E. |
| 169 | A razão é **2/3**, não 1/2. Na profundidade 6 m: L₀(2/3)⁶=**64L₀/729**, D. |
| 170 | V(x)=x²/4−10x+105=(x−20)²/4+5. Mínimo **5 mil reais**, em x=20; classificação ruim, D. |

### Outros reparos de conteúdo

- **114:** corda 1 é traseira e corda 2 é dianteira. Alternativa C deve ter T₂=600 N na aceleração; a A tem 200 N. Na frenagem, ambas apresentam T₁=600 N.
- **140:** calcular a partir do gráfico: frequências para 1 a 7 viagens = 10,10,55,25,0,50,10. Moda 3; mediana 4; média 665/160=4,15625. Logo moda < mediana < média.
- **143:** alternativa C é 13 salas no original.
- **144:** usar o intervalo real de 6h a 8h: vazão = 3(1,1−0,5)/2=0,9 m³/h.
- **156:** intervalos sem sinal: 10–12 e 16–20 minutos.
- **161:** restaurar o radical em √28≈5,29.
- **166:** totais por dia, de segunda a sexta: 1614,1558,1748,1528,1612 cal. Quarta-feira tem o maior total.
- **177:** o modelo de altura deve permitir altura mínima positiva: h(t)=H+R cos(ωt), com H>R. A letra A está correta.
- **179:** a contagem é aditiva por agrupamentos de dois; não é escrita binária posicional.

## Questões ausentes e classificação sugerida

| Questão azul | Tema | Matéria sugerida | Gabarito oficial |
| --- | --- | --- | --- |
| 93 | Energia nuclear e fontes de energia | Física moderna, interdisciplinar | E |
| 100 | Velocidade e aceleração no ponto mais alto de um lançamento | Cinemática | C |
| 109 | Polias fixas e móveis em academia | Dinâmica | D |
| 117 | Dose de radiação e conversão de unidades | Física moderna | A |
| 119 | Pressão em aerossol, equação dos gases ideais | Termodinâmica, interdisciplinar | C |
| 148 | Cabos de sustentação e seno | Trigonometria | C |
| 149 | Escala da representação de altitude | Aritmética/escala | E |
| 153 | Tempo de espera nas filas | Aritmética | E |
| 154 | Parte de um círculo encoberta | Geometria | B |
| 174 | Localização de poltrona em mapa | Geometria/orientação espacial | E |

As questões 130 (condução térmica) e 131 (densidade) também são interdisciplinares e podem permanecer no recorte de Física. Não excluir simplesmente porque mencionam reciclagem ou composição de refrigerantes.

## Inventário dos 60 registros

"Sem erro relevante apontado" nesta auditoria não significa que a apresentação visual já tenha sido testada em todos os dispositivos. As recomendações de classificação utilizam o catálogo atual do site.

| Questão | ID | Matéria atual | Matéria proposta | Gabarito oficial | Achados |
| --- | --- | --- | --- | --- | --- |
| 91 | 860 | Mecânica | Fora do recorte Física/Matemática | D | Biologia: ecologia e alimentação das abelhas; fora do recorte do site. |
| 92 | 861 | Mecânica | Fora do recorte Física/Matemática | B | Biologia/nutrição: anemia; fora do recorte do site. |
| 95 | 862 | Mecânica | Fora do recorte Física/Matemática | B | Biologia: fisiologia muscular; fora do recorte do site. |
| 101 | 863 | Mecânica | Fora do recorte Física/Matemática | A | Biologia: ciclo menstrual; fora do recorte do site. |
| 108 | 864 | Eletromagnetismo | Eletromagnetismo | D | Gabarito e mecanismo principal coerentes. |
| 111 | 865 | Ondulatória | Ondulatória | C | Alternativa E truncada: deve ser «Comprimento de onda». Na resolução, separar período (depende da fonte) e velocidade (depende do meio). |
| 112 | 866 | Ondulatória | Ondulatória | A | Difração e comprimento de onda: conteúdo principal coerente. Ondulatória é classificação válida; Óptica também seria possível. |
| 113 | 867 | Ondulatória | Ondulatória | A | Corrigir «W/m²?, e» no enunciado. Cálculo 2 × 10⁻⁶ W/m² coerente. Preferir fórmulas em KaTeX às imagens das alternativas. |
| 114 | 868 | Dinâmica | Dinâmica | A | Alternativa C foi copiada da A: no original, na aceleração, T₂ = 600 N em C. Resolução troca os nomes dianteira/traseira: corda 1 é traseira e corda 2 é dianteira. Resultados numéricos de A corretos. Corrigir «c assoalho» e unidades m/s². |
| 116 | 869 | Mecânica | Fora do recorte Física/Matemática | B | Biologia: ciclo do nitrogênio. Além da classificação, a resolução troca etapas: 3 nitritação, 4 nitratação, 5 desnitrificação. Amonificação continua sendo 2. |
| 120 | 870 | Eletromagnetismo | Eletromagnetismo | C | Associação mista de resistores: raciocínio e gabarito coerentes. |
| 121 | 871 | Mecânica | Fora do recorte Física/Matemática | A | Química: eletronegatividade e ligação iônica. Fora do recorte; transcrição «M*» deveria representar Mⁿ⁺. |
| 122 | 872 | Mecânica | Termodinâmica | D | Calor sensível e condensação: conteúdo coerente; reclassificar para Termodinâmica. |
| 124 | 873 | Mecânica | Cinemática | B | Resultado 42 min coerente; classificação mais específica Cinemática. |
| 128 | 874 | Aritmética | Ondulatória | C | Ondulatória, não Aritmética. Explicar a interferência no receptor/faixa de comunicação; não afirmar como regra geral que ondas de frequências diferentes não interferem. |
| 129 | 875 | Aritmética | Fora do recorte Física/Matemática | E | Química: polaridade/solubilidade. Fora do recorte; fórmula e estrutura apontam para broken-image.svg. |
| 130 | 876 | Aritmética | Termodinâmica | D | Questão interdisciplinar com condução térmica; manter no recorte de Física em Termodinâmica. |
| 131 | 877 | Aritmética | Hidrostática | A | Densidade: pode permanecer como interdisciplinar em Hidrostática, não Aritmética. Evitar apresentar afundar/flutuar como consequência universal sem dados das latas. |
| 132 | 878 | Aritmética | Termodinâmica | E | Alternativas A–D são apenas «[Alternativa sem texto]». Recuperar quatro gráficos do PDF. E e explicação da relação P/T coerentes; reclassificar para Termodinâmica. |
| 135 | 879 | Ondulatória | Ondulatória | D | Cálculo de ida e volta coerente: 900/0,6 = 1500 m/s. Padronizar milhares. |
| 136 | 880 | Geometria | Geometria | B | Cálculo correto: 1296 g. Trocar «cones concêntricos» por cones semelhantes/coaxiais. Padronizar milhares e fórmulas. |
| 137 | 881 | Aritmética | Estatística | C | Média ponderada correta, 3250 reais; remover expressão «contexto típico» e usar os dados reais. Reclassificar para Estatística. |
| 138 | 882 | Probabilidade | Probabilidade | C | Resultado 64 bolas coerente. |
| 139 | 883 | Aritmética | Funções | D | Resolução usa valores inventados e se contradiz. Dados reais: I = 80, 90, 100; II = 190, 170, 150. Julho 110/130; agosto 120/110; encerramento setembro (D). |
| 140 | 884 | Estatística | Estatística | E | Letra E correta, mas a regra sobre assimetria substitui indevidamente o cálculo. Moda 3; mediana 4; média 665/160 = 4,15625. Usar frequências reais. |
| 141 | 885 | Probabilidade | Probabilidade | E | Enunciado inteiro ausente, restou apenas a pergunta. Resolução erra o espaço amostral: contar cartões, não estudantes. 300/(200+300+300) = 3/8 (E). |
| 142 | 886 | Aritmética | Geometria | A | Enunciado inteiro ausente, restou apenas a pergunta. Resolução genérica sem contas. Volume 112500 L; cota 150 L/pessoa/dia; economia 50 L (A). |
| 143 | 887 | Aritmética | Aritmética | B | Alternativa C está 12, mas no original é 13. Resultado 11 salas (B) correto. |
| 144 | 888 | Geometria | Geometria | C | Resposta 0,9 m³/h correta, porém resolução usa «exemplo típico». Substituir por 3 × (1,1−0,5)/(8−6) = 0,9. |
| 145 | 889 | Aritmética | Geometria | B | Resolução aponta Q₅, mas B é Q₃. Utilizar a circunferência/arco que contém A, B, Q₁ e Q₃; reclassificar para Geometria. |
| 146 | 890 | Geometria | Álgebra | E | Falta o parágrafo que define números 1 a 6 sem repetição e somas iguais; a imagem remota tem só o triângulo. Resolução incompleta: vértices 1,3,5 dão soma 10; 2,4,6 dão 11. |
| 147 | 891 | Aritmética | Aritmética | D | Cálculo de 7 pacotes coerente. |
| 150 | 892 | Aritmética | Funções | A | Expressão C = 0,9q correta; reclassificar para Funções. |
| 151 | 893 | Aritmética | Funções | B | Resolução descreve duas curvas inexistentes. O gráfico tem A no eixo horizontal e B no vertical; comparar x>y nos pontos de 9h, 12h, 13h e 14h: 4 instantes (B). |
| 152 | 894 | Aritmética | Funções | B | Resolução usa I = 2 × 10⁻⁷, mas a prova informa 8 × 10⁻⁸ W/m². Resultado correto N = 10(log₁₀8+4) = 49 dB, não 53 dB. Letra B permanece. |
| 155 | 895 | Geometria | Geometria | D | Área 500 m² coerente. |
| 156 | 896 | Aritmética | Funções | A | Resposta correta; explicitar intervalos sem sinal 10–12 e 16–20 min: 2+4=6. |
| 157 | 897 | Aritmética | Estatística | B | 20% coerente; reclassificar para Estatística. |
| 158 | 898 | Aritmética | Álgebra | D | Cálculo de 4 ajudantes coerente. Corrigir «4%dareceita» para «4% da receita». Padronizar moeda fora de fórmulas. |
| 159 | 899 | Aritmética | Funções | D | 12 dias coerente. Padronizar potências/ milhares e reclassificar para Funções. |
| 160 | 900 | Probabilidade | Probabilidade | A | Dois produtos numéricos errados na resolução: tipo I = 19545240; tipo III = 7160400; tipo II = 7956000 está correto. Ordem p₁<p₂<p₃ e letra A permanecem. |
| 161 | 901 | Aritmética | Álgebra | D | Enunciado perdeu o radical: deve dizer √28 ≈ 5,29, não 28 ≈ 5,29. Cálculo de juros 21,5% coerente. Álgebra/juros compostos. |
| 162 | 902 | Aritmética | Funções | D | Função y=250x+500 coerente; padronizar minúscula y e classificação. |
| 163 | 903 | Aritmética | Funções | A | Trajeto A coerente; classificar em Funções/gráficos. |
| 164 | 904 | Aritmética | Estatística | Anulada | ANULADA no gabarito oficial, mas cadastro marca D. Resolução ainda interpreta percentuais como populações absolutas. Não deve pontuar como questão comum com alternativa correta. |
| 165 | 905 | Geometria | Geometria | E | Resolução inventa piso 0,30 m e espelho 0,15 m, contradiz contas e inclui «Hmm». Figura: piso 0,25 m; espelho 0,20 m; largura 1 m. Área = 0,75+0,60+2×0,30=1,95 m². |
| 166 | 906 | Aritmética | Aritmética | C | Letra C correta, mas faltam contas. Totais seg/ter/qua/qui/sex: 1614, 1558, 1748, 1528, 1612 cal. Explicitar soma horas × gasto horário. |
| 167 | 907 | Aritmética | Aritmética | A | Cálculo de desconto 5,17% coerente; padronizar milhares/moeda. |
| 168 | 908 | Probabilidade | Probabilidade | A | Probabilidades 1/50 e 1/60 coerentes. Converter imagens de frações para KaTeX preservando alternativas. |
| 169 | 909 | Aritmética | Funções | D | Resolução usa razão 1/2 e conclui L₀/64; original usa 2/3. Resultado correto L₀(2/3)⁶ = 64L₀/729 (D). |
| 170 | 910 | Aritmética | Funções | D | Resolução especula sobre função «quadrática ou modular» sem calcular. Original: V(x)=x²/4−10x+105. Mínimo em x=20, V=5 (mil reais), desempenho ruim (D). |
| 171 | 911 | Aritmética | Aritmética | C | 1460 anos correto; padronização futura dos milhares. Apenas auditada, sem alteração. |
| 172 | 912 | Geometria | Geometria | C | Letra C e comparação de áreas coerentes. Distinguir letra a do ângulo α na transcrição. Apenas auditada. |
| 173 | 913 | Aritmética | Aritmética | B | Unidade mL/(min·kg) coerente; pode virar KaTeX. Apenas auditada. |
| 175 | 914 | Aritmética | Álgebra | B | Preço 6,30 reais coerente; classificar Álgebra. Apenas auditada. |
| 176 | 915 | Aritmética | Funções | E | Sequência e resultado 92 coerentes; classificar Funções/sequências. Apenas auditada. |
| 177 | 916 | Aritmética | Trigonometria | A | Letra A correta; modelo h=R+R cos(ωt) contradiz altura mínima positiva citada. Usar h=H+R cos(ωt), H>R. Apenas auditada. |
| 178 | 917 | Geometria | Funções | B | Letra B e intervalos coerentes; reclassificar Funções. Não falta imagem no enunciado, os gráficos são alternativas. Apenas auditada. |
| 179 | 918 | Aritmética | Aritmética | C | Letra C correta; sistema é aditivo por agrupamentos de 2, não numeração binária posicional. Apenas auditada. |
| 180 | 919 | Aritmética | Estatística | C | Dados, médias e dezembro coerentes. Não falta gráfico: a prova traz lista textual. Classificar Estatística. Apenas auditada. |

## Ordem de implementação proposta

1. Tratar a questão anulada e recuperar alternativas/enunciados que impedem responder.
2. Substituir resoluções com dados inventados ou cálculos errados por passos baseados no caderno.
3. Ajustar a classificação, separando registros de Biologia/Química sem apagar histórico.
4. Incluir as questões ausentes com figuras e gabaritos verificados.
5. Padronizar fórmulas e milhares e testar a exibição no site, inclusive ampliação de alternativas.

A atualização de dados deve usar uma cópia de segurança e conferir os valores atuais antes de sobrescrever, para preservar revisões manuais feitas após este levantamento.
