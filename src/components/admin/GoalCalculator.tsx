import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { Target, TrendingUp, TrendingDown, Calculator, Users, DollarSign, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GoalCalculatorProps {
  currentMrr: number;
  mrrTarget: number;
  currentSubscribers: number;
  churnRate: number;
  gatewayFeePercent: number;
  gatewayFeeFixed: number;
  salesCommissionPercent: number;
}

interface PlanScenario {
  name: string;
  price: number;
  netPrice: number;
  salesNeeded: number;
  salesNeededWithChurn: number;
  color: string;
}

interface ChurnScenario {
  name: string;
  churnPercent: number;
  salesNeeded: number;
  compensatorySales: number;
  monthsToTarget: number;
  color: string;
  type: 'optimistic' | 'realistic' | 'pessimistic';
}

// Planos disponíveis com preços
const PLANS = [
  { name: 'Awo', price: 129.00, color: 'hsl(var(--chart-1))' },
  { name: 'Egbé', price: 327.00, color: 'hsl(var(--chart-2))' },
];

export function GoalCalculator({
  currentMrr,
  mrrTarget,
  currentSubscribers,
  churnRate,
  gatewayFeePercent,
  gatewayFeeFixed,
  salesCommissionPercent,
}: GoalCalculatorProps) {
  const [customChurn, setCustomChurn] = useState(churnRate.toString());
  const [customTarget, setCustomTarget] = useState(mrrTarget.toString());

  const effectiveTarget = parseFloat(customTarget) || mrrTarget;
  const effectiveChurn = parseFloat(customChurn) || churnRate;

  // Calcular receita líquida por plano (após taxas)
  const calculateNetPrice = (grossPrice: number): number => {
    const afterGateway = grossPrice - (grossPrice * gatewayFeePercent) - gatewayFeeFixed;
    const afterCommission = afterGateway - (afterGateway * salesCommissionPercent);
    return afterCommission;
  };

  // Cenários por plano
  const planScenarios: PlanScenario[] = useMemo(() => {
    const gap = Math.max(0, effectiveTarget - currentMrr);
    
    return PLANS.map(plan => {
      const netPrice = calculateNetPrice(plan.price);
      const salesNeeded = netPrice > 0 ? Math.ceil(gap / netPrice) : 0;
      
      // Vendas extras para compensar churn mensal
      const churnLoss = currentMrr * (effectiveChurn / 100);
      const compensatorySales = netPrice > 0 ? Math.ceil(churnLoss / netPrice) : 0;
      const salesNeededWithChurn = salesNeeded + compensatorySales;
      
      return {
        name: plan.name,
        price: plan.price,
        netPrice: Math.round(netPrice * 100) / 100,
        salesNeeded,
        salesNeededWithChurn,
        color: plan.color,
      };
    });
  }, [effectiveTarget, currentMrr, effectiveChurn, gatewayFeePercent, gatewayFeeFixed, salesCommissionPercent]);

  // Cenários de churn
  const churnScenarios: ChurnScenario[] = useMemo(() => {
    const gap = Math.max(0, effectiveTarget - currentMrr);
    const avgNetPrice = PLANS.reduce((sum, p) => sum + calculateNetPrice(p.price), 0) / PLANS.length;
    
    const scenarios = [
      { name: 'Otimista', churnPercent: 3, color: 'hsl(var(--chart-1))', type: 'optimistic' as const },
      { name: 'Realista', churnPercent: effectiveChurn, color: 'hsl(var(--chart-2))', type: 'realistic' as const },
      { name: 'Pessimista', churnPercent: 8, color: 'hsl(var(--destructive))', type: 'pessimistic' as const },
    ];
    
    return scenarios.map(scenario => {
      const churnLoss = currentMrr * (scenario.churnPercent / 100);
      const compensatorySales = avgNetPrice > 0 ? Math.ceil(churnLoss / avgNetPrice) : 0;
      const salesNeeded = avgNetPrice > 0 ? Math.ceil((gap + churnLoss) / avgNetPrice) : 0;
      
      // Estimar meses até a meta (assumindo crescimento de 10% ao mês - churn)
      const netGrowthRate = 0.10 - (scenario.churnPercent / 100);
      const monthsToTarget = netGrowthRate > 0 && currentMrr > 0
        ? Math.ceil(Math.log(effectiveTarget / currentMrr) / Math.log(1 + netGrowthRate))
        : 999;
      
      return {
        ...scenario,
        salesNeeded,
        compensatorySales,
        monthsToTarget: Math.min(monthsToTarget, 36),
      };
    });
  }, [effectiveTarget, currentMrr, effectiveChurn, gatewayFeePercent, gatewayFeeFixed, salesCommissionPercent]);

  // Dados para gráfico de projeção
  const projectionData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    for (let i = 0; i <= 12; i++) {
      const monthDate = addMonths(today, i);
      const monthLabel = format(monthDate, 'MMM', { locale: ptBR });
      
      // Projeção só com churn (sem vendas)
      const churnOnly = currentMrr * Math.pow(1 - (effectiveChurn / 100), i);
      
      // Projeção com vendas (10% crescimento - churn)
      const netGrowth = Math.max(0.01, 0.10 - (effectiveChurn / 100));
      const withSales = currentMrr * Math.pow(1 + netGrowth, i);
      
      // Cenário otimista (3% churn)
      const optimistic = currentMrr * Math.pow(1 + (0.10 - 0.03), i);
      
      data.push({
        month: monthLabel,
        meta: effectiveTarget,
        somenteChurn: Math.round(churnOnly * 100) / 100,
        comVendas: Math.round(Math.min(withSales, effectiveTarget * 1.2) * 100) / 100,
        otimista: Math.round(Math.min(optimistic, effectiveTarget * 1.2) * 100) / 100,
      });
    }
    
    return data;
  }, [currentMrr, effectiveTarget, effectiveChurn]);

  const gapToTarget = Math.max(0, effectiveTarget - currentMrr);
  const progressPercent = effectiveTarget > 0 ? Math.min(100, (currentMrr / effectiveTarget) * 100) : 0;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle>Calculadora de Metas</CardTitle>
        </div>
        <CardDescription>
          Simulador de vendas por plano considerando churn e taxas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configurações */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="target">Meta de MRR (R$)</Label>
            <Input
              id="target"
              type="number"
              value={customTarget}
              onChange={(e) => setCustomTarget(e.target.value)}
              placeholder="10000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="churn">Churn Estimado (%)</Label>
            <Input
              id="churn"
              type="number"
              value={customChurn}
              onChange={(e) => setCustomChurn(e.target.value)}
              placeholder="5"
              min="0"
              max="100"
              step="0.5"
            />
          </div>
        </div>

        {/* Resumo atual */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Progresso para meta</span>
            <span className="text-sm font-medium">{progressPercent.toFixed(1)}%</span>
          </div>
          <Progress value={progressPercent} className="h-3 mb-3" />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">MRR Atual</p>
              <p className="text-lg font-bold text-primary">
                R$ {currentMrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gap</p>
              <p className="text-lg font-bold text-amber-600">
                R$ {gapToTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Meta</p>
              <p className="text-lg font-bold">
                R$ {effectiveTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="plans" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="plans">Por Plano</TabsTrigger>
            <TabsTrigger value="scenarios">Cenários</TabsTrigger>
            <TabsTrigger value="projection">Projeção</TabsTrigger>
          </TabsList>

          {/* Tab: Vendas por Plano */}
          <TabsContent value="plans" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {planScenarios.map((plan) => (
                <Card key={plan.name} className="relative overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 w-1 h-full" 
                    style={{ backgroundColor: plan.color }}
                  />
                  <CardContent className="p-4 pl-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-lg">{plan.name}</h4>
                      <Badge variant="outline">
                        R$ {plan.price.toFixed(2)}/mês
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Preço bruto:</span>
                        <span>R$ {plan.price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Taxas ({((gatewayFeePercent + salesCommissionPercent) * 100).toFixed(1)}%):</span>
                        <span>-R$ {(plan.price - plan.netPrice).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-2">
                        <span>Receita líquida:</span>
                        <span className="text-primary">R$ {plan.netPrice.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Vendas para meta</p>
                          <p className="text-2xl font-bold" style={{ color: plan.color }}>
                            {plan.salesNeeded}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">+ Compensar churn</p>
                          <p className="text-2xl font-bold text-amber-600">
                            +{plan.salesNeededWithChurn - plan.salesNeeded}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        Total mensal: <span className="font-semibold">{plan.salesNeededWithChurn} vendas</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Mix de planos */}
            <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">Cenário Mix (50% cada plano)</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Planos Awo</p>
                    <p className="text-xl font-bold">{Math.ceil(planScenarios[0].salesNeededWithChurn / 2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Planos Egbé</p>
                    <p className="text-xl font-bold">{Math.ceil(planScenarios[1].salesNeededWithChurn / 2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Total vendas/mês</p>
                    <p className="text-xl font-bold text-primary">
                      {Math.ceil(planScenarios[0].salesNeededWithChurn / 2) + Math.ceil(planScenarios[1].salesNeededWithChurn / 2)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Ticket médio líq.</p>
                    <p className="text-xl font-bold">
                      R$ {((planScenarios[0].netPrice + planScenarios[1].netPrice) / 2).toFixed(0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Cenários de Churn */}
          <TabsContent value="scenarios" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {churnScenarios.map((scenario) => (
                <Card 
                  key={scenario.name} 
                  className={`relative ${scenario.type === 'realistic' ? 'ring-2 ring-primary' : ''}`}
                >
                  {scenario.type === 'realistic' && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                      Cenário Atual
                    </Badge>
                  )}
                  <CardContent className="p-4 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {scenario.type === 'optimistic' && <TrendingUp className="h-4 w-4 text-green-600" />}
                        {scenario.type === 'realistic' && <Target className="h-4 w-4 text-amber-600" />}
                        {scenario.type === 'pessimistic' && <TrendingDown className="h-4 w-4 text-red-600" />}
                        <h4 className="font-semibold">{scenario.name}</h4>
                      </div>
                      <Badge 
                        variant="outline"
                        className={
                          scenario.type === 'optimistic' ? 'border-green-500 text-green-600' :
                          scenario.type === 'pessimistic' ? 'border-red-500 text-red-600' :
                          ''
                        }
                      >
                        {scenario.churnPercent}% churn
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      <div className="p-3 bg-muted/50 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground mb-1">Vendas necessárias/mês</p>
                        <p className="text-3xl font-bold" style={{ color: scenario.color }}>
                          {scenario.salesNeeded}
                        </p>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Compensar churn:
                          </span>
                          <span className="text-amber-600">+{scenario.compensatorySales}/mês</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tempo estimado:</span>
                          <span className="font-medium">
                            {scenario.monthsToTarget >= 36 ? '36+ meses' : `${scenario.monthsToTarget} meses`}
                          </span>
                        </div>
                      </div>

                      {scenario.type === 'pessimistic' && (
                        <div className="flex items-start gap-2 p-2 bg-red-500/10 rounded text-xs text-red-600">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>Churn alto exige mais vendas para compensar perdas</span>
                        </div>
                      )}
                      
                      {scenario.type === 'optimistic' && (
                        <div className="flex items-start gap-2 p-2 bg-green-500/10 rounded text-xs text-green-600">
                          <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>Menos vendas compensatórias com retenção alta</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Fórmula explicativa */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Fórmula de Cálculo
                </h4>
                <div className="text-sm text-muted-foreground space-y-1 font-mono">
                  <p>Vendas Necessárias = (Gap + Perda por Churn) / Ticket Líquido</p>
                  <p>Perda por Churn = MRR Atual × Churn%</p>
                  <p>Ticket Líquido = Preço - Taxas Gateway - Comissão</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Gráfico de Projeção */}
          <TabsContent value="projection" className="space-y-4">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis 
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    className="text-xs"
                  />
                  <Tooltip 
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Legend />
                  <ReferenceLine 
                    y={effectiveTarget} 
                    stroke="hsl(var(--primary))" 
                    strokeDasharray="5 5"
                    label={{ value: 'Meta', position: 'right', fill: 'hsl(var(--primary))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="somenteChurn"
                    name="Só Churn (sem vendas)"
                    stroke="hsl(var(--destructive))"
                    fill="hsl(var(--destructive))"
                    fillOpacity={0.1}
                  />
                  <Line
                    type="monotone"
                    dataKey="comVendas"
                    name="Com Vendas (10% crescimento)"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="otimista"
                    name="Cenário Otimista (3% churn)"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
                  <TrendingDown className="h-4 w-4" />
                  Só Churn
                </div>
                <p className="text-xs text-muted-foreground">
                  Sem novas vendas, o MRR cai {effectiveChurn}% ao mês
                </p>
              </div>
              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center gap-2 text-amber-600 text-sm mb-1">
                  <Target className="h-4 w-4" />
                  Com Vendas
                </div>
                <p className="text-xs text-muted-foreground">
                  10% crescimento bruto - {effectiveChurn}% churn = {(10 - effectiveChurn).toFixed(1)}% líquido
                </p>
              </div>
              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
                  <TrendingUp className="h-4 w-4" />
                  Otimista
                </div>
                <p className="text-xs text-muted-foreground">
                  Se reduzir churn para 3%, crescimento líquido de 7%/mês
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
