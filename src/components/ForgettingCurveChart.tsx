import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { TrendingDown, TrendingUp, Brain, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ForgettingCurveChartProps {
  oduId: string;
  oduNome: string;
  oduNumero: number;
}

interface DataPoint {
  date: string;
  timestamp: number;
  retencao: number;
  forcaMemoria: number;
  revisao?: boolean;
  daysSinceStart: number;
}

export default function ForgettingCurveChart({ oduId, oduNome, oduNumero }: ForgettingCurveChartProps) {
  const { user } = useAuth();
  const [data, setData] = useState<DataPoint[]>([]);
  const [memData, setMemData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && oduId) {
      loadMemorizationHistory();
    }
  }, [user, oduId]);

  async function loadMemorizationHistory() {
    if (!user) return;

    try {
      // Buscar dados de memorização atual
      const { data: currentMem, error: memError } = await supabase
        .from('memorizacao')
        .select('*')
        .eq('user_id', user.id)
        .eq('odu_id', oduId)
        .maybeSingle();

      if (memError) throw memError;

      setMemData(currentMem);

      // Se não há dados de memorização, criar curva teórica
      if (!currentMem) {
        const theoreticalCurve = generateTheoreticalCurve();
        setData(theoreticalCurve);
        setLoading(false);
        return;
      }

      // Gerar curva baseada nos dados reais
      const curve = generateRealCurve(currentMem);
      setData(curve);

    } catch (error) {
      console.error('Error loading memorization history:', error);
      // Mostrar curva teórica em caso de erro
      const theoreticalCurve = generateTheoreticalCurve();
      setData(theoreticalCurve);
    } finally {
      setLoading(false);
    }
  }

  function generateTheoreticalCurve(): DataPoint[] {
    // Curva de Ebbinghaus teórica: R(t) = e^(-t/S)
    // R = retenção, t = tempo (dias), S = força da memória (constante)
    const curve: DataPoint[] = [];
    const today = new Date();
    const S = 2; // Força de memória inicial baixa

    // Gerar pontos para 30 dias
    for (let day = 0; day <= 30; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (30 - day));
      
      // Fórmula de Ebbinghaus
      const retention = Math.exp(-day / S) * 100;
      
      curve.push({
        date: format(date, 'dd/MM', { locale: ptBR }),
        timestamp: date.getTime(),
        retencao: Math.max(0, retention),
        forcaMemoria: Math.max(0, retention),
        daysSinceStart: day
      });
    }

    return curve;
  }

  function generateRealCurve(mem: any): DataPoint[] {
    const curve: DataPoint[] = [];
    const createdDate = new Date(mem.created_at);
    const today = new Date();
    const totalDays = Math.ceil((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    const lastReviewDate = mem.ultima_revisao ? new Date(mem.ultima_revisao) : null;
    
    // Parâmetros da curva baseados nos dados do usuário
    const S = Math.max(1, mem.forca_memoria / 10); // Força adaptada
    const reviewBonus = Math.min(5, mem.revisoes * 0.3); // Bônus por revisões
    
    // Gerar pontos ao longo do tempo
    const daysToShow = Math.min(60, Math.max(30, totalDays + 7));
    
    for (let day = 0; day <= daysToShow; day++) {
      const date = new Date(createdDate);
      date.setDate(date.getDate() + day);
      
      const daysSinceLastReview = lastReviewDate 
        ? Math.max(0, (date.getTime() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24))
        : day;
      
      // Curva de Ebbinghaus com ajustes
      let retention = Math.exp(-daysSinceLastReview / (S + reviewBonus)) * 100;
      
      // Se houve revisão neste dia (aproximadamente)
      const isReviewDay = lastReviewDate && 
        Math.abs(date.getTime() - lastReviewDate.getTime()) < (1000 * 60 * 60 * 24);
      
      if (isReviewDay) {
        retention = Math.min(100, retention + 30); // Boost na revisão
      }
      
      // Garantir que a força atual seja refletida
      if (day === totalDays) {
        retention = mem.forca_memoria;
      }
      
      curve.push({
        date: format(date, 'dd/MM', { locale: ptBR }),
        timestamp: date.getTime(),
        retencao: Math.max(0, Math.min(100, retention)),
        forcaMemoria: mem.forca_memoria,
        revisao: isReviewDay,
        daysSinceStart: day
      });
    }

    return curve;
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm mb-1">{payload[0].payload.date}</p>
          <p className="text-sm text-primary">
            Retenção: <span className="font-bold">{Math.round(payload[0].value)}%</span>
          </p>
          {payload[0].payload.revisao && (
            <Badge variant="secondary" className="mt-2 text-xs">
              📖 Revisão realizada
            </Badge>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-pulse text-muted-foreground">
              Carregando curva de esquecimento...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentRetention = data.length > 0 ? data[data.length - 1].retencao : 0;
  const isLowRetention = currentRetention < 30;
  const isMediumRetention = currentRetention >= 30 && currentRetention < 70;
  const isHighRetention = currentRetention >= 70;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" />
              Curva de Esquecimento de Ebbinghaus
            </CardTitle>
            <CardDescription className="mt-1">
              Visualização da retenção de memória ao longo do tempo para{' '}
              <span className="font-semibold">Odu {oduNumero} - {oduNome}</span>
            </CardDescription>
          </div>
          
          <Badge 
            variant={isHighRetention ? 'default' : isLowRetention ? 'destructive' : 'secondary'}
            className="text-lg px-4 py-2"
          >
            {isHighRetention && <TrendingUp className="h-4 w-4 mr-1" />}
            {isLowRetention && <TrendingDown className="h-4 w-4 mr-1" />}
            {Math.round(currentRetention)}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Estatísticas */}
        {memData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Brain className="h-3 w-3" />
                Força Atual
              </div>
              <div className="text-xl font-bold text-foreground">
                {memData.forca_memoria}%
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Clock className="h-3 w-3" />
                Revisões
              </div>
              <div className="text-xl font-bold text-foreground">
                {memData.revisoes}x
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">
                Facilidade
              </div>
              <div className="text-xl font-bold text-foreground">
                {memData.facilidade.toFixed(1)}
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">
                Status
              </div>
              <Badge variant={
                memData.status === 'memorizado' ? 'default' : 
                memData.status === 'estudando' ? 'secondary' : 
                'outline'
              }>
                {memData.status === 'memorizado' ? '🟢 Memorizado' :
                 memData.status === 'estudando' ? '🟡 Estudando' :
                 '⚪ Não Estudado'}
              </Badge>
            </div>
          </div>
        )}

        {/* Gráfico */}
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="colorRetencao" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              interval="preserveStartEnd"
            />
            
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              label={{ value: 'Retenção (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Legend 
              wrapperStyle={{ fontSize: 12 }}
              iconType="line"
            />
            
            {/* Linhas de referência */}
            <ReferenceLine 
              y={70} 
              stroke="hsl(var(--success))" 
              strokeDasharray="5 5" 
              label={{ value: 'Forte (70%)', position: 'right', fontSize: 11 }}
            />
            <ReferenceLine 
              y={30} 
              stroke="hsl(var(--destructive))" 
              strokeDasharray="5 5"
              label={{ value: 'Crítico (30%)', position: 'right', fontSize: 11 }}
            />
            
            {/* Área e linha da curva */}
            <Area
              type="monotone"
              dataKey="retencao"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#colorRetencao)"
              name="Retenção de Memória"
            />
            
            <Line 
              type="monotone" 
              dataKey="retencao" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (payload.revisao) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill="hsl(var(--success))"
                      stroke="white"
                      strokeWidth={2}
                    />
                  );
                }
                return null;
              }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legenda explicativa */}
        <div className="mt-6 space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-success"></span>
            <strong>Pontos verdes:</strong> Momentos de revisão (reforço da memória)
          </p>
          <p>
            <strong>Curva de Ebbinghaus:</strong> Representa como a memória naturalmente decai ao longo do tempo. 
            Revisões regulares fortalecem a retenção e aumentam o intervalo até o próximo esquecimento.
          </p>
          {isLowRetention && (
            <p className="text-destructive font-semibold flex items-center gap-2 mt-3">
              ⚠️ Atenção: Retenção crítica! Revise este Odu agora para evitar esquecimento completo.
            </p>
          )}
          {isMediumRetention && (
            <p className="text-warning font-semibold flex items-center gap-2 mt-3">
              ⏰ Revisão recomendada em breve para manter a retenção acima de 70%.
            </p>
          )}
          {isHighRetention && (
            <p className="text-success font-semibold flex items-center gap-2 mt-3">
              ✅ Excelente! Este Odu está bem memorizado. Continue revisando periodicamente.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
