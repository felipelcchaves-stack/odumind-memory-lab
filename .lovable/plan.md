
# Correção: Input do ClozeExercise não reconhecido ("vazio")

## Problema

O usuário preenche a lacuna (ex: "medo"), mas ao clicar "Verificar", o sistema diz `você escreveu "(vazio)"`. A imagem mostra claramente o input preenchido com "medo" e o checkmark verde, mas o feedback trata como vazio.

## Causa Raiz

O `useEffect` de inicialização no `ClozeExercise.tsx` (que cria as lacunas) tem `onAnswer` e `onSkip` como dependências:

```typescript
useEffect(() => {
  // ... reseta gaps com userInput vazio
  setGaps(newGaps); // <-- apaga tudo que o usuário digitou
}, [versoResumido, onAnswer, onSkip, oduInfo, stableLogClozeSkip]);
```

No `StudySession.tsx`, `handleClozeAnswer` e `handleSkipExercise` são funções regulares (não memoizadas com `useCallback`). Qualquer re-render do `StudySession` cria novas referências dessas funções, disparando o `useEffect` do `ClozeExercise`, que **reseta todas as lacunas para vazio** -- apagando o que o usuário digitou.

Sequência do bug:
1. Usuário digita "medo" no input (state `gaps` atualizado via `handleInputChange`)
2. Algo causa re-render no `StudySession` (timer, state update qualquer)
3. `handleClozeAnswer` e `handleSkipExercise` ganham novas referências
4. `useEffect` do ClozeExercise dispara, recria gaps com `userInput: ''`
5. Usuário clica "Verificar" -- o state já foi resetado para vazio
6. Feedback: "você escreveu '(vazio)'"

## Correção

### 1. Remover callbacks das dependências do useEffect (ClozeExercise.tsx)

O `useEffect` de inicialização só precisa re-executar quando o **conteúdo** muda (`versoResumido`), não quando os callbacks mudam. Usar refs para os callbacks:

- Criar `onAnswerRef` e `onSkipRef` com `useRef`
- Manter refs sincronizadas via atualização direta (sem useEffect extra)
- Remover `onAnswer` e `onSkip` das dependências do useEffect de inicialização
- O useEffect usará `onAnswerRef.current` e `onSkipRef.current` para chamadas

### 2. Estabilizar oduInfo (ClozeExercise.tsx)

O `useMemo` de `oduInfo` depende de `oduId`, `numero`, `nome` -- esses não mudam durante o exercício, mas o memo garante estabilidade. Manter como está.

## Detalhes Técnicos

**Arquivo:** `src/components/ClozeExercise.tsx`

Mudanças:
- Adicionar `useRef` para `onAnswer` e `onSkip`
- Sincronizar refs a cada render (atribuição direta no corpo do componente)
- No `useEffect`, trocar chamadas diretas a `onAnswer`/`onSkip` por `onAnswerRef.current`/`onSkipRef.current`
- Remover `onAnswer` e `onSkip` da lista de dependências do `useEffect`
- Nos handlers (`handleReveal`, `handleSubmit`, `handleSkip`), usar refs também para consistência

Nenhuma mudança necessária no `StudySession.tsx` para esta correção.

## Resultado Esperado

- O input do usuário nunca será apagado por re-renders do componente pai
- O useEffect só reseta as lacunas quando o texto (`versoResumido`) realmente muda
- O feedback "você escreveu '(vazio)'" não acontecerá mais quando o campo estiver preenchido
