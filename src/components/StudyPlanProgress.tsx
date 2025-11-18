import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, differenceInDays, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface StudyPlan {
  id: string;
  plano_completo: {
    estimativa_dias: number;
    sessoes_por_semana: number;
    cronograma_semanal: {
      dia: string;
      horario: string;
      atividade: string;
      duracao_minutos: number;
    }[];
  };
  data_inicio: string;
  data_fim_estimada: string;
  ativo: boolean;
}

interface StudySession {
  id: string;
  started_at: string;
  ended_at: string | null;
  total_cards: number;
  correct_answers: number;
}

interface ProgressData {
  totalScheduled: number;
  totalCompleted: number;
  completionRate: number;
  chartData: { date: string; programadas: number; concluidas: number }[];
  upcomingSessions: number;
  remainingDays: number;
}

const DIAS_SEMANA: { [key: string]: number } = {
  'segunda': 1,
  'terça': 2,
  'quarta': 3,
  'quinta': 4,
  'sexta': 5,
  'sábado': 6,
  'domingo': 0,
};

export default function StudyPlanProgress() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load active plan
      const { data: planData } = await supabase
        .from('study_plan')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('criado_em', { ascending: false })
        .limit(1)
        .single();

      if (!planData) {
        setLoading(false);
        return;
      }

      setPlan(planData as unknown as StudyPlan);

      // Load study sessions since plan start
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('started_at', planData.data_inicio)
        .order('started_at', { ascending: true });

      const progressData = calculateProgress(planData as unknown as StudyPlan, sessions || []);
      setProgress(progressData);
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (plan: StudyPlan, sessions: StudySession[]): ProgressData => {
    const startDate = startOfDay(parseISO(plan.data_inicio));
    const today = startOfDay(new Date());
    const endDate = parseISO(plan.data_fim_estimada);
    
    // Calculate scheduled sessions until today
    const scheduledSessions = calculateScheduledSessions(
      plan.plano_completo.cronograma_semanal,
      startDate,
      today
    );

    // Count completed sessions
    const completedSessions = sessions.filter(s => s.ended_at !== null).length;

    // Calculate completion rate
    const completionRate = scheduledSessions > 0 
      ? Math.round((completedSessions / scheduledSessions) * 100)
      : 0;

    // Generate chart data (last 4 weeks)
    const chartData = generateChartData(
      plan.plano_completo.cronograma_semanal,
      sessions,
      startDate,
      today
    );

    // Calculate upcoming sessions until end date
    const upcomingSessions = calculateScheduledSessions(
      plan.plano_completo.cronograma_semanal,
      addDays(today, 1),
      endDate
    );

    const remainingDays = Math.max(0, differenceInDays(endDate, today));

    return {
      totalScheduled: scheduledSessions,
      totalCompleted: completedSessions,
      completionRate,
      chartData,
      upcomingSessions,
      remainingDays,
    };
  };

  const calculateScheduledSessions = (
    cronograma: StudyPlan['plano_completo']['cronograma_semanal'],
    startDate: Date,
    endDate: Date
  ): number => {
    let count = 0;
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    days.forEach(day => {
      const dayOfWeek = day.getDay();
      const hasSession = cronograma.some(session => {
        const sessionDayNum = DIAS_SEMANA[session.dia.toLowerCase()];
        return sessionDayNum === dayOfWeek;
      });
      if (hasSession) count++;
    });

    return count;
  };

  const generateChartData = (
    cronograma: StudyPlan['plano_completo']['cronograma_semanal'],
    sessions: StudySession[],
    startDate: Date,
    endDate: Date
  ) => {
    const weekStart = startOfWeek(addDays(endDate, -27), { weekStartsOn: 0 }); // Last 4 weeks
    const weekEnd = endOfWeek(endDate, { weekStartsOn: 0 });
    
    const weeks = [];
    let currentWeek = weekStart;
    
    while (currentWeek <= weekEnd) {
      const weekEndDate = endOfWeek(currentWeek, { weekStartsOn: 0 });
      const weekDays = eachDayOfInterval({ 
        start: currentWeek > startDate ? currentWeek : startDate, 
        end: weekEndDate > endDate ? endDate : weekEndDate 
      });

      const programadas = weekDays.filter(day => {
        const dayOfWeek = day.getDay();
        return cronograma.some(session => {
          const sessionDayNum = DIAS_SEMANA[session.dia.toLowerCase()];
          return sessionDayNum === dayOfWeek;
        });
      }).length;

      const concluidas = sessions.filter(session => {
        const sessionDate = startOfDay(parseISO(session.started_at));
        return sessionDate >= currentWeek && sessionDate <= weekEndDate && session.ended_at !== null;
      }).length;

      weeks.push({
        date: format(currentWeek, 'dd/MM', { locale: ptBR }),
        programadas,
        concluidas,
      });

      currentWeek = addDays(currentWeek, 7);
    }

    return weeks;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Progresso do Plano
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!plan || !progress) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Progresso do Plano
        </CardTitle>
        <CardDescription>
          Acompanhamento das suas sessões de estudo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Taxa de Conclusão</span>
            <span className="text-2xl font-bold text-primary">
              {progress.completionRate}%
            </span>
          </div>
          <Progress value={progress.completionRate} className="h-3" />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{progress.totalCompleted} concluídas</span>
            <span>{progress.totalScheduled} programadas</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1 rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              <span>Sessões Realizadas</span>
            </div>
            <p className="text-2xl font-bold">{progress.totalCompleted}</p>
          </div>
          
          <div className="space-y-1 rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Sessões Restantes</span>
            </div>
            <p className="text-2xl font-bold">{progress.upcomingSessions}</p>
          </div>

          <div className="space-y-1 rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Dias Restantes</span>
            </div>
            <p className="text-2xl font-bold">{progress.remainingDays}</p>
          </div>

          <div className="space-y-1 rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Status</span>
            </div>
            <Badge variant={progress.completionRate >= 80 ? "default" : progress.completionRate >= 50 ? "secondary" : "destructive"}>
              {progress.completionRate >= 80 ? 'Excelente' : progress.completionRate >= 50 ? 'No Caminho' : 'Precisa Foco'}
            </Badge>
          </div>
        </div>

        {/* Chart */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Últimas 4 Semanas</h4>
          <ChartContainer
            config={{
              programadas: {
                label: "Programadas",
                color: "hsl(var(--chart-1))",
              },
              concluidas: {
                label: "Concluídas",
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[200px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progress.chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="programadas"
                  stackId="1"
                  stroke="hsl(var(--chart-1))"
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="concluidas"
                  stackId="2"
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
