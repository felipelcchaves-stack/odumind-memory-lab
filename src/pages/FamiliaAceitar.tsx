import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function FamiliaAceitar() {
  const { token } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      loadInviteInfo();
    }
  }, [token, authLoading]);

  const loadInviteInfo = async () => {
    if (!token) {
      setError('Token de convite inválido');
      setLoading(false);
      return;
    }

    try {
      const { data, error: inviteError } = await supabase
        .from('family_invites')
        .select(`
          *,
          family_groups (
            group_name,
            max_members
          )
        `)
        .eq('token', token)
        .single();

      if (inviteError || !data) {
        setError('Convite não encontrado');
        setLoading(false);
        return;
      }

      // Verificar se expirou
      const now = new Date();
      const expiresAt = new Date(data.expires_at);
      if (now > expiresAt) {
        setError('Este convite expirou');
        setLoading(false);
        return;
      }

      // Verificar se já foi usado
      if (data.status !== 'pending') {
        setError('Este convite já foi usado ou cancelado');
        setLoading(false);
        return;
      }

      setInviteInfo(data);
    } catch (err) {
      console.error('Erro ao carregar convite:', err);
      setError('Erro ao carregar informações do convite');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!user) {
      // Redirecionar para login com retorno para esta página
      navigate(`/auth?redirect=/familia/aceitar/${token}`);
      return;
    }

    setAccepting(true);
    try {
      const { data, error: acceptError } = await supabase.functions.invoke('accept-family-invite', {
        body: { invite_token: token }
      });

      if (acceptError) throw acceptError;

      if (data.success) {
        setSuccess(true);
        toast.success('Convite aceito com sucesso!', {
          description: `Você agora faz parte de: ${data.group_name}`,
        });

        setTimeout(() => {
          navigate('/familia');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Erro ao aceitar convite:', err);
      toast.error(err.message || 'Erro ao aceitar convite');
      setError(err.message || 'Erro ao aceitar convite');
    } finally {
      setAccepting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <CardTitle>Convite Inválido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/')}>
              Voltar para Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <CardTitle>Convite Aceito!</CardTitle>
            <CardDescription>
              Você agora faz parte do Plano Família
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Redirecionando para o painel da família...
            </p>
            <Loader2 className="h-6 w-6 mx-auto animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-primary" />
          <CardTitle>Convite para Plano Família</CardTitle>
          <CardDescription>
            Você foi convidado para participar de um Plano Família
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Grupo:</p>
            <p className="text-lg font-semibold">{inviteInfo?.family_groups?.group_name}</p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Email convidado:</p>
            <p className="text-sm">{inviteInfo?.email}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Ao aceitar este convite, você terá acesso ao Plano Premium compartilhado com até 5 membros.
            </p>
            {!user && (
              <p className="text-sm font-medium text-primary">
                Você precisa fazer login ou criar uma conta para aceitar este convite.
              </p>
            )}
          </div>

          <Button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full"
          >
            {accepting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Aceitando...
              </>
            ) : user ? (
              'Aceitar Convite'
            ) : (
              'Fazer Login para Aceitar'
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="w-full"
          >
            Cancelar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
