# Requirements Document

**Feature:** Desempate por Sorteio (Bolão)

## Introduction

No Bolão, a ordenação dos participantes (tanto na **Classificação Geral** quanto na **Classificação por Rodada**) é resolvida por uma sequência de critérios de desempate. O último critério, quando todos os anteriores se esgotam e permanecem idênticos, é um **sorteio ao vivo** realizado pelo organizador.

Hoje esse critério existe apenas no texto das regras: não há detecção do empate absoluto, não há onde o organizador registrar o resultado do sorteio, e a Classificação não reflete uma ordem definida por sorteio. Esta funcionalidade preenche essa lacuna:

1. **Detecta** quando dois ou mais participantes estão em empate absoluto (todos os critérios anteriores ao sorteio idênticos) numa posição que tem consequência (prêmio ou bônus).
2. **Destaca** os participantes empatados na Classificação.
3. Oferece, na **Central de Controle** (admin), um mecanismo para o organizador registrar o resultado do sorteio ao vivo (a ordem entre os empatados).
4. Aplica essa ordem na Classificação e exibe a tag **"Definido por sorteio"** nos participantes cuja posição foi resolvida dessa forma.

O escopo cobre a Classificação Geral (parcial durante a Copa e final ao término) e a Classificação por Rodada. Não altera a forma como os pontos são calculados — apenas resolve a ordem final entre participantes empatados.

## Glossary

- **Participante**: usuário Premium que consta na Classificação (`agreed_to_ranking = true`). Não inclui o admin marcado como "fora de competição".
- **Classificação Geral**: ranking acumulado de toda a Copa; é o que vale para a premiação final. Pode ser "parcial" (durante o torneio) ou "final" (ao término).
- **Classificação por Rodada**: ranking restrito às partidas de uma rodada; define o bônus escalonado da rodada (1º a 5º).
- **Critérios de desempate**: ver `src/app/ranking/page.tsx`. Geral: (0) pontuação total → (1) pontos de palpite → (2) pontos de placar exato → (3) pontos de vencedor+diferença → (4) Final → (5) Semis → (6) Quartas → (7) Oitavas → (8) sorteio. Por rodada: (0) pontos da rodada → (1) placar exato → (2) vencedor+diferença → (8) sorteio.
- **Empate absoluto**: situação em que dois ou mais participantes têm TODOS os critérios anteriores ao sorteio idênticos, restando apenas o sorteio para ordená-los.
- **Posição com consequência**: posição cuja ordem afeta premiação ou bônus. Na Geral, são as 5 primeiras posições (premiação). Na Rodada, são as 5 primeiras (bônus escalonado).
- **Grupo de empate (tie group)**: conjunto de participantes em empate absoluto entre si.
- **Sorteio (draw)**: registro feito pelo admin que define a ordem entre os participantes de um grupo de empate.
- **Central de Controle**: página de admin (`/admin`).

## Requirements

### Requisito 1: Detecção de empate absoluto na Classificação Geral

**User Story:** Como organizador, quero que o sistema identifique automaticamente quando há empate absoluto entre participantes na Classificação Geral, para saber que um sorteio é necessário.

#### Critérios de Aceitação

1. QUANDO a Classificação Geral é montada, o sistema SHALL agrupar como "grupo de empate" os participantes que tenham idênticos todos os critérios da Geral anteriores ao sorteio (pontuação total e critérios 1 a 7).
2. O sistema SHALL considerar um grupo de empate relevante SOMENTE QUANDO ele ocupar ao menos uma das 5 primeiras posições da Classificação Geral.
3. O sistema SHALL excluir o admin "fora de competição" da detecção de empate.
4. QUANDO um grupo de empate contiver apenas 1 participante (sem empate real), o sistema SHALL NÃO sinalizar necessidade de sorteio.
5. QUANDO existir um grupo de empate relevante ainda não resolvido por sorteio, o sistema SHALL marcar esse grupo como "pendente de sorteio".

### Requisito 2: Detecção de empate absoluto na Classificação por Rodada

**User Story:** Como organizador, quero que o sistema identifique empates absolutos dentro de cada rodada, para resolver o bônus escalonado de forma justa.

#### Critérios de Aceitação

1. QUANDO a Classificação de uma rodada encerrada é montada, o sistema SHALL agrupar como "grupo de empate" os participantes com idênticos todos os critérios da rodada anteriores ao sorteio (pontos da rodada, placar exato e vencedor+diferença).
2. O sistema SHALL considerar o grupo de empate relevante SOMENTE QUANDO ele ocupar ao menos uma das 5 primeiras posições da rodada (faixa de bônus).
3. ENQUANTO a rodada não estiver encerrada, o sistema SHALL NÃO sinalizar necessidade de sorteio para aquela rodada.
4. O sistema SHALL tratar cada rodada de forma independente, identificando o grupo de empate por (rodada, conjunto de participantes empatados).

### Requisito 3: Destaque visual dos participantes empatados na Classificação

**User Story:** Como participante, quero ver claramente quais participantes estão empatados aguardando sorteio, para entender por que as posições ainda não estão definidas.

#### Critérios de Aceitação

1. ENQUANTO um grupo de empate relevante estiver pendente de sorteio, o sistema SHALL destacar visualmente todos os participantes desse grupo na Classificação correspondente (Geral ou Rodada).
2. QUANDO um grupo de empate estiver pendente de sorteio, o sistema SHALL exibir uma indicação textual de que as posições serão definidas por sorteio.
3. ENQUANTO o sorteio estiver pendente, o sistema SHALL atribuir aos participantes empatados a mesma faixa de posição (ex.: exibir todos como a posição mais alta do grupo) em vez de uma ordem arbitrária.
4. O sistema SHALL aplicar o destaque tanto na Classificação Geral quanto na Classificação por Rodada, conforme o grupo de empate detectado.

### Requisito 4: Caixa de sorteio na Central de Controle

**User Story:** Como organizador, quero uma área na Central de Controle para registrar o resultado do sorteio ao vivo, para oficializar a ordem entre os empatados.

#### Critérios de Aceitação

1. QUANDO existir ao menos um grupo de empate relevante pendente, o sistema SHALL exibir na Central de Controle uma seção de "Sorteios pendentes" listando cada grupo de empate (Geral ou Rodada) e os participantes envolvidos.
2. O sistema SHALL apresentar, para cada grupo de empate pendente, um controle que permita ao admin definir a ordem dos participantes (do 1º ao último do grupo).
3. QUANDO o admin submeter a ordem do sorteio, o sistema SHALL validar que a ordem inclui exatamente os participantes do grupo de empate, sem repetições nem ausências.
4. O sistema SHALL restringir o acesso a essa funcionalidade exclusivamente a usuários admin (mesma verificação `requireAdmin` das demais ações de admin).
5. QUANDO não houver nenhum grupo de empate pendente, o sistema SHALL informar que não há sorteios pendentes.

### Requisito 5: Persistência do resultado do sorteio

**User Story:** Como organizador, quero que o resultado do sorteio fique salvo, para que a ordem permaneça estável e não precise ser refeita a cada atualização.

#### Critérios de Aceitação

1. QUANDO o admin registra um sorteio, o sistema SHALL persistir o resultado de forma durável (não pode ser perdido em recálculos do sync).
2. O sistema SHALL registrar, para cada sorteio, o escopo (Geral ou identificador da rodada), o conjunto de participantes empatados e a ordem definida.
3. O sistema SHALL associar o sorteio a uma "assinatura" do empate (os participantes empatados e o nível de empate), para permitir identificar quando o sorteio ainda é válido.
4. O sistema SHALL registrar quem (admin) e quando realizou o sorteio.

### Requisito 6: Aplicação da ordem do sorteio e tag "Definido por sorteio"

**User Story:** Como participante, quero ver a posição final já definida pelo sorteio com uma marca clara, para saber que aquele desempate foi resolvido por sorteio.

#### Critérios de Aceitação

1. QUANDO um grupo de empate possui sorteio registrado e válido, o sistema SHALL ordenar os participantes desse grupo conforme a ordem do sorteio.
2. QUANDO a posição de um participante foi definida por sorteio, o sistema SHALL exibir a tag "Definido por sorteio" ao lado do nome desse participante na Classificação correspondente.
3. O sistema SHALL aplicar a ordem do sorteio tanto na Classificação Geral quanto na Classificação por Rodada, conforme o escopo do sorteio.
4. QUANDO um sorteio resolve o empate, o sistema SHALL deixar de exibir a indicação de "pendente de sorteio" para aquele grupo.

### Requisito 7: Invalidação do sorteio quando o empate muda

**User Story:** Como organizador, quero que um sorteio deixe de valer se os pontos dos participantes mudarem e desfizerem o empate, para evitar aplicar uma ordem que não corresponde mais à realidade.

#### Critérios de Aceitação

1. QUANDO os critérios de desempate de um participante mudam (ex.: novos pontos pelo sync) e o empate absoluto deixa de existir, o sistema SHALL ignorar o sorteio anteriormente registrado para aquele grupo e ordenar pelos critérios normais.
2. QUANDO o conjunto de participantes empatados muda (entra ou sai alguém do grupo de empate), o sistema SHALL tratar o sorteio anterior como inválido e voltar a sinalizar "pendente de sorteio".
3. QUANDO um sorteio é invalidado, o sistema SHALL NÃO exibir a tag "Definido por sorteio" para os participantes afetados.
4. O sistema SHALL preservar o registro histórico do sorteio invalidado (não é obrigatório apagá-lo), mas SHALL NÃO aplicá-lo enquanto a assinatura do empate não corresponder.

### Requisito 8: Consistência entre exibição e dados

**User Story:** Como participante, quero que a numeração das posições continue coerente após o sorteio, para que a classificação faça sentido.

#### Critérios de Aceitação

1. QUANDO o sorteio define a ordem de um grupo de empate, o sistema SHALL renumerar as posições subsequentes de forma contínua e sem buracos (respeitando a regra existente de o admin não ocupar posição).
2. O sistema SHALL manter o comportamento atual para participantes não envolvidos em empate (sem alterações de ordem ou destaque).
3. QUANDO há múltiplos grupos de empate distintos na mesma classificação, o sistema SHALL tratá-los de forma independente.

## Decisões confirmadas

1. **Abrangência**: o sorteio só é exigido quando o empate absoluto ocupa as **5 primeiras posições** (faixa de prêmio na Geral / faixa de bônus na Rodada). Empates fora dessa faixa NÃO disparam sorteio nem destaque.
2. **Granularidade**: o admin define a **ordem completa** do grupo empatado (do 1º ao último), pois posições diferentes têm prêmios/bônus distintos.
3. **Notificação**: NÃO há notificação aos participantes nesta versão.
