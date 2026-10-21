# ttsp · especificação

**this too shall pass.** Um registro de humor pessoal, feito para iPhone, que transforma dois registros por dia (ao acordar e antes de dormir) numa leitura objetiva de como o bem-estar flutua ao longo do tempo e de como ele responde a fatos importantes, como uma mudança de remédio.

Este documento é a fonte de verdade do projeto. Qualquer pessoa (ou agente) deve conseguir continuar o trabalho só com ele e com o código. A amostra visual aprovada está em [`docs/design-system.html`](design-system.html).

Última revisão: 21 out 2026.

Como rodar: `npm install`, `npm run dev` (abre em `/ttsp/`), `npm test`, `npm run build`. Ícones: `node scripts/icons.mjs` (precisa do Playwright).

---

## 1. Decisões fechadas

| Tema | Decisão |
| --- | --- |
| Plataforma | PWA (app web instalável) para iPhone, adicionado à tela inicial pelo Safari. |
| Hospedagem | GitHub Pages, a partir do repo `caiorubini/ttsp` (público). O repo contém só código. |
| Dados | Ficam só no aparelho, em IndexedDB. Nenhum servidor. Backup por exportação JSON para iCloud/Arquivos. |
| Começo | Do zero. Sem importação de dados antigos. |
| Psiquiatra | O usuário tem acompanhamento e quer poder enviar relatório. O relatório de consulta é prioridade da fase 4. |
| Estética | Elegante e minimalista. Tinta e névoa, sem ícones, só palavras. A única cor do app vem dos registros. |
| Frases | Frase do dia no estilo Co-Star: curta, baseada nos dados, gentil e honesta. Gerada por LLM a partir de fatos calculados, com fallback determinístico. |
| Futuro | Pode virar produto para psiquiatras. O modelo de dados já nasce versionado e exportável para isso. |

## 2. Fundamentos (pesquisa)

- **Escalas visuais analógicas (VAS) de 0 a 100.** Em avaliação ecológica momentânea (EMA, registros no dia a dia), VAS teve correlação maior com critérios externos de psicopatologia que escalas Likert e menos respostas nos extremos ([Collabra 2025](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12222338/)). No celular, a precisão é boa: pedindo 31, a média foi 31,01 com DP 3,28 em 3.761 pessoas ([Oxford, CIPA](https://www.psy.ox.ac.uk/publications/publication_modal/2277564)).
- **Afeto tem mais de uma dimensão.** Valência (agradável/desagradável), energia (energetic arousal) e tensão (tense arousal, Thayer) são em boa parte independentes. Por isso humor, energia e calma são escalas separadas.
- **WHO-5** (domínio público) cobre humor positivo, calma, vitalidade, descanso ao acordar e interesse. Inspira as dimensões e pode entrar como âncora quinzenal (fase 5).
- **Diário de sono consensual** (Carney et al., 2012): qualidade do sono e sensação de descanso ao acordar, preenchidos até uma hora após levantar.
- **NIMH Life Chart Method**: registro diário prospectivo de humor com medicação e eventos de vida anotados. Validado em bipolaridade. É o modelo para eventos e faixas de medicação.
- **Engajamento**: registro de humor sofre fadiga gradual, e uma revisão de 2026 achou que lembretes podem aumentar abandono. Por isso não há sequências de dias seguidos nem culpa por dia perdido.
- **Variabilidade**: MSSD (média do quadrado das diferenças sucessivas) é a medida padrão de instabilidade emocional em EMA.

## 3. O que se registra

Todas as escalas são VAS de 0 a 100, com polo desagradável à esquerda. O valor nunca aparece durante o registro.

### Núcleo (manhã e noite, sempre sobre o "agora")

| chave | rótulo | polo 0 | polo 100 | pergunta |
| --- | --- | --- | --- | --- |
| `humor` | humor | triste | feliz | Como está o seu humor agora? |
| `calma` | tensão | ansioso | calmo | Quanta calma você sente agora? |
| `energia` | energia | esgotado | com energia | Quanta energia você tem agora? |
| `interesse` | interesse | apático | engajado | Quanto interesse você sente pelas coisas? |
| `paciencia` | paciência | irritado | tranquilo | Como está a sua paciência? |
| `clareza` | mente | nebulosa | clara | Como está a sua mente? |

### Só de manhã

- `sono`: horário em que deitou e em que acordou (pré-preenchidos com os últimos valores usados). Duração calculada.
- `sono_qualidade`: péssimo ↔ ótimo. "Como foi o seu sono?"
- `descanso`: cansado ↔ descansado. "Você acordou descansado?"

### Só à noite

- `satisfacao`: angustiado ↔ satisfeito. "Como você se sente sobre o dia de hoje?"
- `conexao`: isolado ↔ conectado. "Quão conectado você se sentiu com as pessoas hoje?"
- Contexto do dia (chips de toque, personalizáveis): exercício, ar livre, socializei, álcool, cafeína tarde, tela até tarde, conflito, trabalho pesado, dor física.
- Remédios: confirmação de cada remédio ativo tomado hoje (sim/não).
- "Algo importante aconteceu?": abre a criação de um evento, sem sair do fluxo.

### Eventos (única parte com texto)

Tipos: `medicacao`, `bom`, `dificil`, `saude`, `outro`. Campos: dia (pode ser retroativo), título, nota opcional. Um evento de medicação guarda nome do remédio e dose nova (e anterior, quando houver). Cada evento de medicação abre um novo período, desenhado como faixa no gráfico.

### Regras do registro

- Uma pergunta por tela. A escala é uma barra retangular com os dois polos escritos dentro e um ponto no neutro. Ela começa vazia: tocar preenche até ali com a própria tinta, translúcida, e arrastar ajusta. Enquanto o dedo está na barra o preenchimento fica mais opaco. Uma linha vertical na borda do preenchimento marca o valor. Ao soltar, avança sozinho depois de 650 ms.
- Toda pergunta tem "pular". Pular grava `null`, nunca um valor inventado.
- Depois de responder aparece uma linha fina com o valor do registro anterior. Nunca antes, para não ancorar.
- O dia lógico vira às 5h (configurável). Um registro à 1h conta como noite do dia anterior.
- Antes das 14h o app sugere "registrar a manhã", depois sugere "registrar a noite". A sugestão é só o padrão: o usuário sempre pode escolher o momento e o dia.
- Registro de um dia passado é marcado como `retro` e aparece com outro estilo nos gráficos.
- Editar um registro reabre o fluxo com os valores preenchidos.

## 4. Cor

A cor é a assinatura de cada registro. Uma cor só, ancorada no azul `#1074C4`.

- **Humor é a saturação.** Humor 0 é cinza, sem cor. Humor 100 é a cor plena.
- **Tensão é o tom.** Calmo (100) é o azul `#1074C4` (oklch H 249,95). Ansioso (0) adiciona vermelho e vai ao roxo (H 305).
- **Energia é o brilho.** Energia 0 é preto. Energia 100 é o brilho de `#1074C4` (oklch L 0,5495).
- Tudo no máximo dá exatamente `#1074C4`. Tudo no zero dá `#000000`.
- O brilho tem teto, então o texto sobre a cor é sempre claro.

Fórmula (OKLCH, valores de 0 a 1):

```
L = 0.5495 × energia^0.75
H = 249.95 + (1 − calma) × (305 − 249.95)
C = min(0.1493 × humor, croma máximo em sRGB para L e H)
```

Valores pulados contam como 50 para a cor. A cor de um dia é a cor da média dos registros do dia. Implementação: `src/lib/color.ts`.

## 5. Sistema visual

Detalhes e amostras interativas em `docs/design-system.html`. Resumo dos tokens:

| token | névoa (dia) | noite |
| --- | --- | --- |
| `--bg` | `#F1F2F4` | `#0C0E13` |
| `--surface` | `#FBFBFC` | `#141720` |
| `--ink` | `#15171C` | `#E7E8EC` |
| `--ink-2` | `#555A65` | `#A0A5B0` |
| `--ink-3` | `#8A8F99` | `#666C79` |
| `--line` | `#D8DBE0` | `#272B36` |

- O tema segue o sistema do iPhone.
- Tipografia: Newsreader (frases e perguntas, itálico 300 para a frase do dia), Geist (interface), Geist Mono (rótulos e números, tabulares).
- Espaço: 4, 8, 12, 16, 24, 32, 48, 72.
- Cantos: 8 (faixas), 18 (cartões), pílula (botões e chips).
- Movimento: 180 ms (estados), 420 ms (troca de pergunta), 380 ms (cor de fundo). `prefers-reduced-motion` desliga tudo.
- Sem verde e vermelho para bom e ruim. Nenhum extremo é premiado.

## 6. Telas

1. **Hoje.** Nome do app ("this too shall pass") e data, frase do dia com a base do cálculo ("a partir de 34 manhãs e 34 noites"), horizonte dos últimos 30 dias (índice, média de 7 dias), ponto de hoje na cor do dia, estado dos registros de hoje e botão principal para registrar o momento sugerido pela hora. Cada linha de manhã e noite também abre o seu registro, e "registrar outro momento ou outro dia" deixa escolher manhã ou noite de qualquer dia até hoje. Aviso discreto quando o último backup tem mais de 7 dias.
2. **Registro.** Fluxo da seção 3 com o fundo assumindo a cor ao vivo. No fim, "sua cor de agora" com nome da cor e valores.
3. **Linha.** Faixa de cor dos dias, gráfico com recortes (2 semanas, 3 meses, 1 ano, tudo), seleção de dimensão (índice e cada escala), pontos crus apagados, média de 7 dias forte, linha pontilhada do seu normal, eventos como alfinetes, períodos de medicação como faixas. Cartão "isso também vai passar". Manhã vs. noite. Lista de registros com editar e apagar.
4. **Eventos.** Lista por data, criação e edição. Gestão dos remédios ativos.
5. **Ajustes.** Tamanho do texto (normal, maior, bem maior), exportar backup (JSON pelo menu de compartilhar), importar backup (mescla por id), exportar CSV, virada do dia, chips do contexto, remédios, chave de IA, estado do armazenamento persistente.

## 7. Análises

Princípios: toda afirmação mostra o n que a sustenta, nunca há linguagem causal, nenhum insight aparece antes de 14 dias de dados.

- **Índice (maré)**: média de humor, calma, interesse, paciência e clareza disponíveis no registro. Energia fica de fora do índice e sempre visível ao lado, porque energia alta nem sempre é boa.
- **Valor do dia**: média dos registros do dia.
- **Média móvel**: 7 dias corridos, contando só dias com dado.
- **Seu normal**: mediana dos valores diários dos últimos 90 dias.
- **Fase abaixo do normal**: sequência de 3 ou mais dias com média móvel menor que o normal − 6. Reporta quantas, duração típica (mediana), a mais longa e o dia atual se houver uma em curso.
- **Manhã vs. noite**: média da diferença manhã − noite nos dias com os dois registros.
- **Antes/depois de um evento** (fase 4): janelas de 28 dias, ignorando os 7 primeiros dias depois de um evento de medicação. Diferença de média e MSSD por dimensão, com n.
- **Sono e hábitos** (fase 4): diferença do índice no dia seguinte com e sem cada chip ou com sono < 6 h. Mínimo de 8 dias em cada grupo.
- **Relatório de consulta** (fase 4): página imprimível desde a data da última consulta. Gráfico, eventos, adesão aos remédios, médias por dimensão, sono. Sem texto de IA.

Implementação: `src/lib/analytics.ts`, com testes em `src/lib/analytics.test.ts`.

## 8. Voz e frases

- Minúsculas, frases curtas, no máximo duas.
- Toda frase nasce de um fato calculado pelo app. O modelo nunca inventa número ou tendência.
- Observa e lê, não aconselha. Nada de "você consegue".
- Dado fraco é dito como fraco. Correlação nunca vira causa.
- Gentil e honesta. Nunca pessimista, nunca falsa.

Exemplos (fato → frase):

- humor ao acordar 11 pontos abaixo do da noite, 34 dias → "você acorda pior do que termina o dia. a manhã costuma mentir um pouco."
- 5º dia abaixo do normal, 5 fases anteriores, típica de 8 dias → "quinto dia abaixo do seu normal. nas últimas cinco vezes, no oitavo já era outra coisa."
- 3 noites seguidas com menos de 6 h → "três noites curtas seguidas. parte da irritação de hoje pode ser só sono."

### Motor de frases

1. `src/lib/facts.ts` calcula uma lista de fatos candidatos, cada um com prioridade, base numérica (`basis`) e uma frase determinística já escrita nessa voz.
2. Sem chave de IA: a tela Hoje mostra a frase do fato de maior prioridade e a base logo abaixo.
3. Com chave de IA (fase 4): os fatos vão como JSON para o modelo com as regras de voz acima. A frase é gerada uma vez por registro e guardada. A leitura semanal (3 ou 4 frases) sai no domingo à noite.

### Chave de IA e privacidade

- A chave é colada pelo usuário nos ajustes, no próprio iPhone. Fica só no IndexedDB do aparelho. Nunca vai para o repo nem passa por servidor.
- Provedores suportados: OpenAI e Anthropic (chamada direta do navegador).
- Por padrão, só números e categorias vão para a IA. Nomes de remédio e textos de evento só vão se o usuário ativar.
- Recomendação: colocar limite de gasto mensal na conta do provedor.

## 9. Dados

Banco IndexedDB `ttsp` via Dexie. Esquema versão 1.

```ts
Entry {
  id: string            // uuid
  kind: 'morning' | 'night'
  day: string           // 'YYYY-MM-DD', dia lógico
  at: string            // ISO, momento do registro
  updatedAt: string
  retro: boolean
  schema: 1             // versão do questionário
  values: Record<DimKey, number | null>   // 0 a 100
  sleep?: { bed: 'HH:MM', wake: 'HH:MM', hours: number }
  tags: string[]
  meds: Record<string, boolean>           // medId → tomou
}

Event {
  id: string
  day: string
  type: 'medicacao' | 'bom' | 'dificil' | 'saude' | 'outro'
  title: string
  note?: string
  med?: { medId?: string, name: string, dose: string, prevDose?: string }
  createdAt: string
}

Med { id: string, name: string, dose: string, active: boolean, createdAt: string }

Setting { key: string, value: unknown }
// dayStartHour (5), tags (lista), aiProvider, aiKey, aiShareNames (false), lastBackupAt
```

Backup JSON: `{ app: 'ttsp', version: 1, exportedAt, entries, events, meds, settings }`, sem a chave de IA. Importar mescla por `id`, mantendo o `updatedAt` mais recente.

## 10. Arquitetura

- Vite + Preact + TypeScript. Sem roteador: estado de tela no `App`.
- Dexie para IndexedDB, com `liveQuery` para telas reativas.
- vite-plugin-pwa (Workbox) para manifesto e service worker. Funciona 100% offline.
- Gráficos em SVG desenhados à mão.
- `navigator.storage.persist()` pedido a cada abertura.
- Ícones PNG (o iOS ignora SVG na tela inicial): 180, 192, 512 e maskable, gerados por `scripts/icons.mjs`.
- Deploy: GitHub Actions publica `dist/` no Pages a cada push na `main`. Base `/ttsp/`.
- Testes: Vitest para cor, dia lógico e análises.

Estrutura:

```
src/
  main.tsx, app.tsx, styles.css
  lib/   color.ts, day.ts, dims.ts, db.ts, analytics.ts, facts.ts, backup.ts, live.ts (+ testes *.test.ts)
  ui/    Vas.tsx, Chart.tsx, Horizon.tsx, EventForm.tsx
  screens/ Home.tsx, Flow.tsx, Timeline.tsx, Events.tsx, Settings.tsx
docs/  SPEC.md, design-system.html
```

## 11. Instalação no iPhone

1. Abrir `https://caiorubini.github.io/ttsp/` no Safari.
2. Compartilhar → Adicionar à Tela de Início.
3. Abrir sempre pelo ícone. Os dados do app da tela inicial são separados dos dados do Safari.
4. Lembretes: o iOS não deixa um web app agendar notificação local. Usar o app Atalhos: Automação → Horário do dia → Abrir URL do ttsp, às 7h e às 22h30.

Pré-requisito no GitHub (feito pelo dono do repo): Settings → Pages → Source: GitHub Actions. Depois disso, cada push na `main` publica o app.

Atualizações: o service worker baixa a versão nova em segundo plano e ela vale na próxima abertura do app.

## 12. Fases

| fase | escopo | estado |
| --- | --- | --- |
| 0 | Repo, spec, PWA, ícones, deploy | feito |
| 1 | Registro manhã e noite, eventos, remédios, backup | feito |
| 2 | Hoje (frase determinística, horizonte), Linha (gráfico, faixa, eventos, "isso também vai passar"), lista de registros | feito |
| 3 | Validação no iPhone real: instalação, offline, persistência, uso por alguns dias | próximo |
| 4 | Antes/depois de evento, variabilidade, sono e hábitos, relatório de consulta, frases por IA, leitura semanal | a fazer |
| 5 | Palavras de emoção, WHO-5 quinzenal, lembretes por push, sincronização opcional | a fazer |

## 13. Em aberto

- Brilho mínimo para dias sem energia, se dias quase pretos incomodarem no uso.
- Peso de cada dimensão no índice, a revisar com uns 30 dias de dados reais.
- Produto para psiquiatras: exigiria servidor, consentimento, tratamento de dado sensível de saúde pela LGPD e provável avaliação como software médico na ANVISA se fizer afirmações clínicas.
