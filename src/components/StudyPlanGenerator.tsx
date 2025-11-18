import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Sparkles, Calendar, Clock, Target, TrendingUp, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { format, addDays, setHours, setMinutes, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateICalendar, downloadICalFile } from '@/lib/icalGenerator';

interface StudyPlan {
  id: string;
  plano_completo: {
    estimativa_dias: number;
    sessoes_por_semana: number;
    novos_odus_por_sessao: number;
    revisoes_por_sessao: number;
    observacoes: string[];
    cronograma_semanal: {
      dia: string;
      horario: string;
      atividade: string;
      duracao_minutos: number;
    }[];
  };
  estimativa_dias: number;
  data_inicio: string;
  data_fim_estimada: string;
  ativo: boolean;
  criado_em: string;
}

export default function StudyPlanGenerator() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasSchedule, setHasSchedule] = useState(false);

  useEffect(() => {
    checkScheduleAndLoadPlan();
  }, []);

  const checkScheduleAndLoadPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has schedule configured
      const { data: schedule } = await supabase
        .from('study_schedule')
        .select('id')
        .eq('user_id', user.id)
        .eq('ativo', true);

      setHasSchedule(schedule && schedule.length > 0);

      // Load active plan if exists
      const { data: activePlan } = await supabase
        .from('study_plan')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('criado_em', { ascending: false })
        .limit(1)
        .single();

      if (activePlan) {
        setPlan(activePlan as unknown as StudyPlan);
      }
    } catch (error) {
      console.error('Error loading:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async () => {
    if (!hasSchedule) {
      toast.error('Configure seus horários de estudo primeiro');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-study-plan', {
        body: {}
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Plano de estudos gerado com sucesso! 🎉');
        setPlan(data.plano as unknown as StudyPlan);
      }
    } catch (error: any) {
      console.error('Error generating plan:', error);
      toast.error(error.message || 'Erro ao gerar plano');
    } finally {
      setGenerating(false);
    }
  };

  const exportToCalendar = () => {
    if (!plan || !plan.plano_completo.cronograma_semanal) {
      toast.error('Nenhum cronograma disponível');
      return;
    }
    
    if (plan.plano_completo.cronograma_semanal.length === 0) {
      toast.error('Cronograma vazio');
      return;
    }

    console.log('📅 Gerando calendário:', {
      dataInicio: plan.data_inicio,
      dataFim: plan.data_fim_estimada,
      cronograma: plan.plano_completo.cronograma_semanal
    });

    const events = [];
    const startDate = plan.data_inicio ? new Date(plan.data_inicio) : new Date();
    const endDate = plan.data_fim_estimada 
      ? new Date(plan.data_fim_estimada) 
      : addDays(startDate, plan.estimativa_dias);
    const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    // Generate events for each week until end date
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      plan.plano_completo.cronograma_semanal.forEach(item => {
        const dayIndex = weekDays.indexOf(item.dia);
        if (dayIndex === -1) {
          console.warn('Dia inválido:', item.dia);
          return;
        }

        const eventDate = new Date(currentDate);
        const daysToAdd = (dayIndex - currentDate.getDay() + 7) % 7;
        eventDate.setDate(currentDate.getDate() + daysToAdd);

        if (eventDate > endDate || eventDate < startDate) return;

        // Parse time (format: "HH:MM")
        const horarioMatch = item.horario.match(/(\d{1,2}):(\d{2})/);
        if (!horarioMatch) {
          console.error('Formato de horário inválido:', item.horario);
          return;
        }
        const [_, hours, minutes] = horarioMatch;
        const startTime = setMinutes(setHours(new Date(eventDate), parseInt(hours)), parseInt(minutes));
        const endTime = new Date(startTime.getTime() + item.duracao_minutos * 60000);

        events.push({
          title: `📚 ${item.atividade}`,
          description: `Plano de Estudos Odu Ifá\n${item.atividade}\nDuração: ${item.duracao_minutos} minutos`,
          start: startTime,
          end: endTime,
          location: 'Estudo Odu Ifá'
        });
      });

      currentDate = addDays(currentDate, 7);
    }

    console.log('📅 Eventos gerados:', events.length);
    if (events.length > 0) {
      console.log('📅 Primeiro evento:', events[0]);
    }

    if (events.length === 0) {
      toast.error('Nenhum evento foi gerado. Verifique o cronograma.');
      return;
    }

    const icalContent = generateICalendar(events, 'Plano de Estudos Odu Ifá');
    console.log('📅 Conteúdo iCal gerado:', icalContent.substring(0, 200));
    downloadICalFile(icalContent, 'plano-estudos-odu-ifa.ics');
    toast.success('Calendário exportado! Importe o arquivo no Google Calendar ou Apple Calendar.');
  };

  if (loading) {
    return <div className="animate-pulse">Carregando...</div>;
  }

  if (!hasSchedule) {
    return (
      <Card className="border-warning">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning">
            <AlertCircle className="h-5 w-5" />
            Configure seu Calendário
          </CardTitle>
          <CardDescription>
            Antes de gerar um plano de estudos, você precisa configurar seus horários disponíveis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Use o calendário acima para adicionar os dias e horários em que você pode estudar.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Plano de Estudos com IA
          </CardTitle>
          <CardDescription>
            Gere um plano personalizado baseado nos seus horários disponíveis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              Nossa IA vai analisar seus horários, seu perfil de aprendizagem e criar um plano 
              otimizado para você memorizar todos os 256 Odu de Ifá.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={generatePlan} 
            disabled={generating}
            size="lg"
            className="w-full"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            {generating ? 'Gerando Plano...' : 'Gerar Plano com IA'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const plano = plan.plano_completo;
  const diasRestantes = Math.ceil(
    (new Date(plan.data_fim_estimada).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Seu Plano de Estudos Personalizado
        </CardTitle>
        <CardDescription>
          Gerado em {format(new Date(plan.criado_em), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-primary/10 rounded-lg text-center">
            <Calendar className="h-5 w-5 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{plan.estimativa_dias}</div>
            <div className="text-xs text-muted-foreground">dias totais</div>
          </div>
          
          <div className="p-4 bg-primary/10 rounded-lg text-center">
            <Target className="h-5 w-5 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{diasRestantes}</div>
            <div className="text-xs text-muted-foreground">dias restantes</div>
          </div>

          <div className="p-4 bg-primary/10 rounded-lg text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{plano.novos_odus_por_sessao}</div>
            <div className="text-xs text-muted-foreground">novos/sessão</div>
          </div>

          <div className="p-4 bg-primary/10 rounded-lg text-center">
            <Clock className="h-5 w-5 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{plano.sessoes_por_semana}</div>
            <div className="text-xs text-muted-foreground">sessões/semana</div>
          </div>
        </div>

        {/* Observations */}
        {plano.observacoes && plano.observacoes.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Recomendações:</h4>
            <ul className="space-y-2">
              {plano.observacoes.map((obs, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className="mt-0.5">
                    {i + 1}
                  </Badge>
                  <span className="text-muted-foreground">{obs}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weekly Schedule */}
        {plano.cronograma_semanal && plano.cronograma_semanal.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Cronograma Semanal:</h4>
            <div className="space-y-2">
              {plano.cronograma_semanal.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 border rounded-lg bg-accent/30"
                >
                  <div className="flex items-center gap-3">
                    <Badge>{item.dia}</Badge>
                    <span className="text-sm font-medium">{item.horario}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{item.atividade}</span>
                    <Badge variant="outline">{item.duracao_minutos} min</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button 
            onClick={exportToCalendar}
            variant="default"
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar para Calendário
          </Button>
          <Button 
            onClick={generatePlan} 
            disabled={generating}
            variant="outline"
            className="flex-1"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Gerar Novo Plano
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
