import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ExcluirContaCard } from '@/components/ExcluirContaCard';
import { LOJAS, SUPORTE_EMAIL } from '@/app/lojasConfig';

/**
 * Página pública /excluir-conta (o Google Play pede um endereço fora do app). Sem login: passo a passo e pedido por e-mail.
 * Com login: o mesmo cartão de exclusão do Perfil.
 */
export default function ExcluirConta() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background px-4 py-8 pt-[calc(env(safe-area-inset-top)+2rem)]">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-4 text-3xl">Excluir minha conta no IseseMind</h1>
        {!LOJAS.exclusaoAutomatica ? (
          <Card>
            <CardHeader>
              <CardTitle>Como pedir a exclusão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Por enquanto a exclusão é feita por pedido. Escreva para <span className="break-all font-medium">{SUPORTE_EMAIL}</span> a partir do e-mail da sua conta, com o assunto &ldquo;Excluir minha conta&rdquo;.
              </p>
              <p>
                Confirmamos o pedido e apagamos a conta e os dados do seu estudo em até 30 dias. A mesma conta é usada no IseseMind Plus, então ela some dos dois. Registros de pagamento são mantidos pelo prazo que a lei exige.
              </p>
            </CardContent>
          </Card>
        ) : user ? (
          <ExcluirContaCard />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Como pedir a exclusão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal space-y-2 pl-5">
                <li>Abra o aplicativo IseseMind e entre com a sua conta.</li>
                <li>Vá em Perfil e toque em &ldquo;Excluir minha conta&rdquo;.</li>
                <li>Digite EXCLUIR e confirme. Os dados do seu estudo são apagados na hora.</li>
                <li>O pedido de exclusão da conta é registrado e concluído em até 30 dias.</li>
              </ol>
              <p className="text-muted-foreground">
                A mesma conta é usada no IseseMind Plus. Registros de pagamento são mantidos pelo prazo que a lei exige.
              </p>
              <p>
                Sem acesso ao app? Escreva para <span className="break-all font-medium">{SUPORTE_EMAIL}</span> a partir do e-mail da conta.
              </p>
              <Button className="min-h-11 w-full" onClick={() => navigate('/auth')}>
                Entrar para excluir
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
