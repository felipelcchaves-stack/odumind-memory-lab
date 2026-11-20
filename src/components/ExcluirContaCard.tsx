import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { confirmacaoConfere, excluirMinhaConta } from '@/services/excluirConta';
import { SUPORTE_EMAIL } from '@/app/lojasConfig';

/**
 * "Excluir minha conta" (Apple 5.1.1(v) e Google Play). Apaga os dados do app na hora e registra o pedido de
 * exclusão da conta, concluído em até 30 dias. Mesma conta serve ao IseseMind Plus: o aviso diz isso.
 */
export function ExcluirContaCard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [digitado, setDigitado] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState(false);

  const confere = confirmacaoConfere(digitado, user?.email);

  async function excluir() {
    if (!confere || enviando) return;
    setErro(null);
    setEnviando(true);
    const r = await excluirMinhaConta(motivo);
    setEnviando(false);
    if (!('erro' in r)) {
      setFeito(true);
      try {
        await signOut();
      } catch {
        /* a sessão local sai de qualquer forma */
      }
      return;
    }
    setErro(r.erro.mensagem);
  }

  if (feito) {
    return (
      <Card className="mt-6" data-testid="exclusao-feita">
        <CardHeader>
          <CardTitle>Pedido registrado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p role="status">
            Seus dados do aplicativo foram apagados. O pedido de exclusão da conta foi registrado e será concluído em até
            30 dias.
          </p>
          <Button className="min-h-11" onClick={() => navigate('/auth', { replace: true })}>
            Voltar ao início
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 border-destructive/40">
      <CardHeader>
        <CardTitle>Excluir minha conta</CardTitle>
        <CardDescription>
          Apaga os seus dados de estudo (progresso, notas, conquistas e preferências) na hora. A conta em si é removida em
          até 30 dias. A mesma conta é usada no IseseMind Plus. Registros de pagamento são mantidos por obrigação legal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!aberto ? (
          <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => setAberto(true)}>
            Quero excluir a minha conta
          </Button>
        ) : (
          <form
            className="space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void excluir();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="excluir-confirmar">Para confirmar, digite EXCLUIR ou o seu e-mail</Label>
              <Input id="excluir-confirmar" value={digitado} onChange={(e) => setDigitado(e.target.value)} autoComplete="off" className="min-h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="excluir-motivo">Motivo (opcional)</Label>
              <Input id="excluir-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} className="min-h-11" />
            </div>
            {erro && (
              <p role="alert" className="text-sm text-destructive">
                {erro} <span className="break-all">{SUPORTE_EMAIL}</span>
              </p>
            )}
            <div className="flex gap-3">
              <Button type="submit" variant="destructive" className="min-h-11 flex-1" disabled={!confere || enviando} aria-busy={enviando}>
                {enviando ? 'Excluindo...' : 'Excluir agora'}
              </Button>
              <Button type="button" variant="ghost" className="min-h-11" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
