// Extração de palavras-chave de um texto (usada pra gerar lacunas no
// exercício cloze e pra checar de antemão se um Odu tem conteúdo viável
// pra esse modo). Ficava duplicada em StudySession.tsx e ClozeExercise.tsx -
// centralizada aqui pra não divergir se o critério for ajustado num lugar
// e esquecido no outro.

const STOP_WORDS = [
  'que', 'para', 'com', 'uma', 'dos', 'das', 'por', 'como', 'mais', 'seu',
  'sua', 'seus', 'suas', 'ele', 'ela', 'eles', 'elas', 'este', 'esta', 'esse',
  'essa', 'isso', 'aqui', 'ali', 'onde', 'quando', 'porque', 'assim', 'então',
  'também', 'ainda', 'sempre', 'nunca', 'muito', 'pouco', 'não', 'sim', 'ser',
  'ter', 'foi', 'são', 'tem', 'está', 'era', 'vai', 'vem',
];

function splitIntoWords(text: string): string[] {
  return text.replace(/[.,;:!?"""''()]/g, '').split(/\s+/).filter((w) => w.length > 0);
}

// Palavras significativas (>= 3 caracteres, não stopword, não número).
function getSignificantWords(text: string): string[] {
  return splitIntoWords(text).filter(
    (word) => word.length >= 3 && !STOP_WORDS.includes(word.toLowerCase()) && !/^\d+$/.test(word)
  );
}

export function hasViableKeywords(text: string): boolean {
  if (!text || text.trim().length < 20) return false;
  return getSignificantWords(text).length >= 1;
}

// Seleciona até 3 palavras-chave (aleatórias, com fallbacks progressivos pra
// nunca ficar sem nenhuma lacuna num texto curto/atípico).
export function extractKeywords(text: string): string[] {
  const words = splitIntoWords(text);
  let keywords = getSignificantWords(text);

  if (keywords.length === 0) {
    keywords = words
      .filter((w) => w.length >= 2 && !/^\d+$/.test(w))
      .sort((a, b) => b.length - a.length)
      .slice(0, 3);
  }

  if (keywords.length === 0 && words.length > 0) {
    keywords = words.filter((w) => w.length > 1).slice(0, 2);
  }

  const shuffled = keywords.sort(() => Math.random() - 0.5);
  const count = Math.min(3, Math.max(1, keywords.length));
  return shuffled.slice(0, count);
}
