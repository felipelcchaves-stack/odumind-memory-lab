
# Correção: Exercícios sendo pulados automaticamente na sessão de estudo

## Problema Identificado

O aluno relata que ao clicar em "avançar" uma única vez, o sistema pula 2-3 exercícios de uma vez. Após análise detalhada do código, identifiquei a causa raiz:

### Causa Raiz: Auto-skip em cadeia no ClozeExercise

Quando o sistema seleciona o modo "cloze" (Complete a Frase) para um Odu, o componente `ClozeExercise` verifica se consegue criar lacunas no texto. Se o `verso_resumido` existir mas nao tiver palavras-chave viáveis, o componente **auto-pula silenciosamente** chamando `onAnswer(true, 50)` via `setTimeout` (2-2.5 segundos) -- sem qualquer interação do usuário.

Fluxo do bug:

```text
1. Usuario clica "Facil" no Flashcard
2. handleFlashcardRate() processa resposta, salva no banco
3. Apos 1.2s, selectRandomOdu() escolhe proximo Odu com modo "cloze"
4. ClozeExercise monta, descobre que verso nao tem keywords
5. Auto-chama onAnswer(true, 50) apos 2s (SEM interacao do usuario)
6. handleClozeAnswer() -> handleFlashcardRate() processa como se fosse resposta real
7. selectRandomOdu() escolhe outro Odu, possivelmente "cloze" de novo
8. Repete passos 4-7 -> pula 2-3 exercicios visivelmente
```

O contador de exercicios (`cardsStudied`) incrementa a cada auto-skip, entao o usuario ve o numero pular de ex: 3 para 6.

### Problemas secundarios encontrados

1. **Side effect dentro de `useMemo`**: Em `generateQuizQuestion` (linha 1334), há um `setMode("flashcard")` dentro de um `useMemo`, que é um anti-pattern do React e pode causar renders inesperados.

2. **Flashcard fallback sem `key`**: O flashcard de fallback (linhas 2120-2131) não tem prop `key` unica, podendo manter estado de um exercício anterior.

3. **Validação de conteúdo insuficiente**: A verificação `hasClozeContent = versoContent.length >= 20` na seleção de modo não é suficiente -- um texto de 20+ caracteres pode ser composto apenas de stopwords.

---

## Plano de Correção

### 1. Eliminar auto-skip silencioso no ClozeExercise

**Arquivo:** `src/components/ClozeExercise.tsx`

Quando o ClozeExercise não consegue criar lacunas, em vez de chamar `onAnswer()` automaticamente, vai chamar `onSkip()` imediatamente. Isso faz o sistema selecionar outro Odu/modo sem registrar como exercício completado (sem incrementar `cardsStudied`, sem dar XP).

Mudanças:
- Remover os `setTimeout(() => onAnswer(true, 50), ...)` das linhas 132 e 153
- Substituir por chamada direta a `onSkip?.()` ou `onAnswer(false, 0)` (sem delay)
- Manter o feedback visual de fallback mas sem auto-avançar como "correto"

### 2. Adicionar validação de keywords ANTES de selecionar modo cloze

**Arquivo:** `src/pages/StudySession.tsx`

Na função `selectRandomOdu`, melhorar a validação `hasClozeContent` para verificar se o texto realmente tem palavras-chave viáveis antes de selecionar cloze/dragdrop/sentence-order.

Mudanças:
- Criar função `hasViableKeywords(text)` que reproduz a logica de `extractKeywords` para verificação prévia
- Usar essa validação na seleção de modo (linhas 795-845)
- Se o texto não tiver keywords viáveis, forçar flashcard ou quiz

### 3. Impedir que auto-skips contem como exercícios completados

**Arquivo:** `src/pages/StudySession.tsx`

Modificar `handleSkipExercise` para NÃO chamar `handleFlashcardRate` e NÃO incrementar `sessionStats.cardsStudied`. Skip deve apenas avançar para o próximo exercício sem registrar progresso.

### 4. Corrigir side effect no useMemo

**Arquivo:** `src/pages/StudySession.tsx`

Remover o `setMode("flashcard")` de dentro do `generateQuizQuestion` useMemo. Em vez disso, tratar o caso de "poucas opções para quiz" na renderização ou no selectRandomOdu.

### 5. Adicionar key ao Flashcard de fallback

**Arquivo:** `src/pages/StudySession.tsx`

Adicionar prop `key` ao flashcard de fallback (linhas 2120-2131) para garantir reset de estado.

---

## Resultado Esperado

- Exercícios que não podem ser gerados (cloze sem keywords) serão pulados instantaneamente SEM contar como completados
- O contador de exercícios só incrementa quando o usuario realmente interage
- A seleção de modo evita escolher cloze/dragdrop para Odus sem conteúdo viável
- Fim dos "pulos" visíveis de 2-3 exercícios
