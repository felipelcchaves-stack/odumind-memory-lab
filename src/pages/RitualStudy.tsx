import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Clock, Package, Check } from "lucide-react";
import { toast } from "sonner";
import { ProtectedContent } from "@/components/ProtectedContent";
import { useContentProtection } from "@/hooks/useContentProtection";
import { useTrackingEvents } from "@/hooks/useTrackingEvents";
import DashboardHeader from "@/components/DashboardHeader";

interface RitualContent {
  id: string;
  numero: number | null;
  nome: string;
  texto_principal: string;
  materiais_necessarios: string[] | null;
  tempo_execucao: number | null;
  dificuldade: string | null;
  odu_relacionados: string[] | null;
  tags: string[] | null;
  contexto_historico: string | null;
  exemplos_praticos: string | null;
  audio_url: string | null;
}

interface UserProgress {
  status: string;
  vezes_praticado: number;
  notas_pessoais: string | null;
}

export default function RitualStudy() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trackOduMemorized } = useTrackingEvents();
  
  // Use centralized content protection
  useContentProtection();
  
  const [ritual, setRitual] = useState<RitualContent | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [relatedOdu, setRelatedOdu] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadRitual();
    }
  }, [id, user]);

  const loadRitual = async () => {
    try {
      // Load ritual content
      const { data: ritualData, error: ritualError } = await supabase
        .from('ritual_content')
        .select('*')
        .eq('id', id)
        .single();

      if (ritualError) throw ritualError;
      setRitual(ritualData);

      // Load user progress if logged in
      if (user) {
        const { data: progressData } = await supabase
          .from('user_ritual_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('ritual_id', id)
          .single();

        if (progressData) {
          setProgress(progressData);
        }
      }

      // Load related Odu if exists
      if (ritualData.odu_relacionados && ritualData.odu_relacionados.length > 0) {
        const { data: oduData } = await supabase
          .from('odu')
          .select('id, numero, nome')
          .in('id', ritualData.odu_relacionados);

        setRelatedOdu(oduData || []);
      }
    } catch (error) {
      console.error('Error loading ritual:', error);
      toast.error("Erro ao carregar ritual");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPracticed = async () => {
    if (!user || !ritual) return;

    try {
      const newVezesPraticado = (progress?.vezes_praticado || 0) + 1;
      
      const { error } = await supabase
        .from('user_ritual_progress')
        .upsert({
          user_id: user.id,
          ritual_id: ritual.id,
          status: 'praticado',
          vezes_praticado: newVezesPraticado,
          ultima_pratica: new Date().toISOString(),
        }, {
          onConflict: 'user_id,ritual_id'
        });

      if (error) throw error;

      // Update local state
      setProgress({
        status: 'praticado',
        vezes_praticado: newVezesPraticado,
        notas_pessoais: progress?.notas_pessoais || null,
      });

      // Track event
      trackOduMemorized(ritual.numero || 0, ritual.nome);

      // Só checa/concede badges - rituais não concedem XP hoje, diferente
      // do fluxo de flashcards.
      await supabase.rpc('check_and_award_badges', { _user_id: user.id });
      
      toast.success(`Ritual praticado! (${newVezesPraticado}x)`);
    } catch (error) {
      console.error('Error marking as practiced:', error);
      toast.error("Erro ao marcar como praticado");
    }
  };

  const getDifficultyColor = (dificuldade: string | null) => {
    if (!dificuldade) return "bg-muted text-muted-foreground";
    switch (dificuldade) {
      case 'iniciante':
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case 'intermediario':
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case 'avancado':
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-5/6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!ritual) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Ritual não encontrado</p>
            <Button onClick={() => navigate('/biblioteca-yoruba')} className="mt-4">
              Voltar para Biblioteca
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/biblioteca-yoruba')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {ritual.numero && (
                <Badge variant="outline">#{ritual.numero}</Badge>
              )}
              {ritual.dificuldade && (
                <Badge className={getDifficultyColor(ritual.dificuldade)}>
                  {ritual.dificuldade}
                </Badge>
              )}
              {progress && (
                <Badge variant="secondary">
                  {progress.vezes_praticado}x praticado
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold">{ritual.nome}</h1>
          </div>
          {user && (
            <Button onClick={handleMarkAsPracticed}>
              <Check className="w-4 h-4 mr-2" />
              Marcar como Praticado
            </Button>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ritual.tempo_execucao && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tempo Estimado</p>
                    <p className="font-semibold">{ritual.tempo_execucao} minutos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {ritual.materiais_necessarios && ritual.materiais_necessarios.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Materiais</p>
                    <p className="font-semibold">{ritual.materiais_necessarios.length} itens necessários</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <ProtectedContent>
              <div className="prose dark:prose-invert max-w-none">
                {ritual.texto_principal}
              </div>
            </ProtectedContent>
          </CardContent>
        </Card>

        {/* Materials */}
        {ritual.materiais_necessarios && ritual.materiais_necessarios.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Materiais Necessários</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {ritual.materiais_necessarios.map((material, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    {material}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Additional Info */}
        <Accordion type="single" collapsible className="w-full">
          {ritual.contexto_historico && (
            <AccordionItem value="contexto">
              <AccordionTrigger>Contexto Histórico</AccordionTrigger>
              <AccordionContent>
                <ProtectedContent>
                  <div className="prose dark:prose-invert max-w-none">
                    {ritual.contexto_historico}
                  </div>
                </ProtectedContent>
              </AccordionContent>
            </AccordionItem>
          )}
          {ritual.exemplos_praticos && (
            <AccordionItem value="exemplos">
              <AccordionTrigger>Exemplos Práticos</AccordionTrigger>
              <AccordionContent>
                <ProtectedContent>
                  <div className="prose dark:prose-invert max-w-none">
                    {ritual.exemplos_praticos}
                  </div>
                </ProtectedContent>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {/* Related Odu */}
        {relatedOdu.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Odu Relacionados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {relatedOdu.map(odu => (
                  <Badge
                    key={odu.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => navigate(`/odu/${odu.id}`)}
                  >
                    #{odu.numero} {odu.nome}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Personal Notes */}
        {user && (
          <Card>
            <CardHeader>
              <CardTitle>Notas Pessoais</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Sistema de notas para rituais em desenvolvimento
              </p>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </div>
  );
}