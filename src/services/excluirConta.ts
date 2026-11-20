import { supabase } from '@/integrations/supabase/client';

/** Exclusão da conta pelo próprio aluno (Apple 5.1.1(v) / Google). Os dados do app saem na hora; o login o Felipe conclui em até 30 dias. */

export type ErroExcluirConta = { tipo: 'naoPronto' | 'semSessao' | 'falha'; mensagem: string };
export type ResultadoExcluirConta = { ok: true } | { ok: false; erro: ErroExcluirConta };

export const MSG_NAO_PRONTO = 'A exclusão pelo app ainda não está disponível. Nada foi apagado. Peça por e-mail.';
const MSG_SEM_SESSAO = 'Sua sessão expirou. Entre de novo e tente outra vez. Nada foi apagado.';
const MSG_FALHA = 'Não foi possível excluir agora. Nada foi perdido; tente de novo em instantes ou peça por e-mail.';

/** Confirma se o aluno digitou "excluir" (sem diferença de maiúsculas) ou o e-mail da conta. */
export function confirmacaoConfere(digitado: string, email: string | null | undefined): boolean {
  const d = (digitado ?? '').trim().toLowerCase();
  if (!d) return false;
  if (d === 'excluir') return true;
  const e = (email ?? '').trim().toLowerCase();
  return e !== '' && d === e;
}

function classificar(error: unknown): ErroExcluirConta {
  const e = error as { message?: string; status?: number; context?: { status?: number } } | null;
  const status = e?.context?.status ?? e?.status;
  const msg = (e?.message ?? '').toLowerCase();
  if (status === 404 || msg.includes('not found') || msg.includes('404') || msg.includes('failed to send a request') || msg.includes('does not exist')) {
    return { tipo: 'naoPronto', mensagem: MSG_NAO_PRONTO };
  }
  if (status === 401 || msg.includes('401') || msg.includes('não autorizado') || msg.includes('jwt')) {
    return { tipo: 'semSessao', mensagem: MSG_SEM_SESSAO };
  }
  return { tipo: 'falha', mensagem: MSG_FALHA };
}

export async function excluirMinhaConta(motivo?: string): Promise<ResultadoExcluirConta> {
  try {
    const { data, error } = await supabase.functions.invoke('excluir-minha-conta', {
      body: { motivo: motivo?.trim() ? motivo.trim().slice(0, 500) : null },
    });
    if (error) return { ok: false, erro: classificar(error) };
    if (!data?.ok) return { ok: false, erro: { tipo: 'falha', mensagem: MSG_FALHA } };
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: classificar(e) };
  }
}
