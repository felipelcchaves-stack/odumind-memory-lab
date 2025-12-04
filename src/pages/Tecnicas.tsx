import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, BookOpen, Lightbulb, Landmark, Clock, ArrowRight, CheckCircle2, Lock, Unlock, Loader2, Sparkles } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import { ProtectedContent } from '@/components/ProtectedContent';
import { useTechniqueUnlock, TECHNIQUE_REQUIREMENTS } from '@/hooks/useTechniqueUnlock';
import { cn } from '@/lib/utils';

export default function Tecnicas() {
  const navigate = useNavigate();
  const { 
    loading, 
    getTechniqueProgress, 
    getUnlockedCount, 
    getNextUnlock,
    totalTechniques 
  } = useTechniqueUnlock();

  const tecnicas = [
    {
      id: 'spaced-repetition',
      icon: Clock,
      title: 'Repetição Espaçada',
      description: 'Sistema automático que otimiza suas revisões',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      lockedBgColor: 'bg-muted',
      exemplo: 'O sistema calcula automaticamente quando você deve revisar cada Odu baseado no seu desempenho. Quanto melhor você responde, mais espaçado fica o intervalo.',
      beneficios: [
        'Maximiza retenção de longo prazo',
        'Reduz tempo de estudo necessário',
        'Previne esquecimento',
        'Adapta-se ao seu ritmo'
      ],
      comousar: 'Estude regularmente e o sistema cuida do resto. Responda honestamente aos flashcards e o algoritmo ajusta os intervalos ideais.',
      action: () => navigate('/study')
    },
    {
      id: 'flashcards',
      icon: Brain,
      title: 'Flashcards Ativos',
      description: 'Teste seu conhecimento com recall ativo',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      lockedBgColor: 'bg-muted',
      exemplo: 'Veja o nome de um Odu e tente lembrar seu significado completo antes de revelar a resposta. O esforço mental de tentar lembrar fortalece a memória.',
      beneficios: [
        'Fortalece conexões neurais',
        'Identifica pontos fracos rapidamente',
        'Aumenta confiança',
        'Feedback imediato'
      ],
      comousar: 'Na sessão de estudos, tente sempre lembrar a resposta antes de clicar para revelar. Seja honesto ao avaliar seu desempenho.',
      action: () => navigate('/study')
    },
    {
      id: 'elaborative-encoding',
      icon: Lightbulb,
      title: 'Codificação Elaborativa',
      description: 'Crie conexões profundas com perguntas',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      lockedBgColor: 'bg-muted',
      exemplo: 'Ao estudar Ogbe Meji, responda: "Como isso se relaciona com minha vida?" ou "Qual situação prática ilustra este Odu?". Essas conexões pessoais tornam a memória mais forte.',
      beneficios: [
        'Cria memórias mais duradouras',
        'Conecta conhecimento novo ao existente',
        'Torna aprendizado significativo',
        'Facilita aplicação prática'
      ],
      comousar: 'Ao estudar cada Odu, clique em "Elaborar" e responda às perguntas reflexivas. Quanto mais pessoal e detalhada sua resposta, melhor.',
      action: () => navigate('/odu')
    },
    {
      id: 'mnemonics',
      icon: BookOpen,
      title: 'Mnemônicos',
      description: 'Use histórias e associações criativas',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      lockedBgColor: 'bg-muted',
      exemplo: 'Para lembrar Irete Meji, crie uma história: "Irete fez MEu JInho" (Irete-MEJi). Ou visualize uma imagem bizarra que conecte o nome ao significado.',
      beneficios: [
        'Facilita memorização de nomes difíceis',
        'Torna estudo mais divertido',
        'Usa criatividade para fixar conteúdo',
        'Personalizável ao seu estilo'
      ],
      comousar: 'Crie seus próprios mnemônicos ou use IA para gerar sugestões. Os mnemônicos mais eficazes são visuais, bizarros e pessoais.',
      action: () => navigate('/odu')
    },
    {
      id: 'memory-palace',
      icon: Landmark,
      title: 'Palácio da Memória',
      description: 'Organize Odus em locais mentais',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      lockedBgColor: 'bg-muted',
      exemplo: 'Imagine sua casa dividida em salas. Na entrada, coloque os primeiros Odus. Na sala, outros 16. Visualize cada Odu em um local específico com detalhes vívidos.',
      beneficios: [
        'Usa memória espacial natural',
        'Organização clara dos 256 Odus',
        'Técnica milenar comprovada',
        'Memorização em ordem'
      ],
      comousar: 'Acesse o Palácio da Memória, escolha um local mental familiar (sua casa, rua, escola) e distribua os Odus pelas salas. Crie imagens mentais vívidas.',
      action: () => navigate('/memory-palace')
    }
  ];

  const nextUnlock = getNextUnlock();
  const unlockedCount = getUnlockedCount();

  if (loading) {
    return (
      <ProtectedContent showWatermark={false}>
        <div className="min-h-screen bg-background">
          <DashboardHeader />
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </ProtectedContent>
    );
  }

  return (
    <ProtectedContent showWatermark={false}>
      <div className="min-h-screen bg-background">
        <DashboardHeader />
      
        <div className="container max-w-6xl py-8 px-4">
          {/* Header */}
          <div className="mb-8 text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              Técnicas de Memorização
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Domine os 256 Odu Ifá em 14 dias usando as técnicas de memorização mais eficazes da neurociência moderna
            </p>
            
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className="text-sm px-4 py-2">
                <Unlock className="h-4 w-4 mr-2" />
                {unlockedCount}/{totalTechniques} técnicas desbloqueadas
              </Badge>
            </div>
          </div>

          {/* Next unlock card */}
          {nextUnlock && (
            <Card className="mb-8 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Próximo Desbloqueio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {TECHNIQUE_REQUIREMENTS.find(t => t.id === nextUnlock.techniqueId)?.name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {nextUnlock.requirementLabel}
                  </span>
                </div>
                <Progress value={nextUnlock.progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Continue estudando para desbloquear esta técnica avançada!
                </p>
              </CardContent>
            </Card>
          )}

          {/* Combinação de técnicas */}
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Por que combinar técnicas?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>
                Cada técnica ativa diferentes áreas do cérebro. Ao combiná-las, você cria múltiplos "caminhos" para a mesma memória, tornando-a muito mais forte e duradoura.
              </p>
              <p className="font-medium text-foreground">
                O sistema Isesemind integra todas essas técnicas automaticamente para resultados máximos.
              </p>
            </CardContent>
          </Card>

          {/* Grid de técnicas */}
          <div className="grid gap-6 md:grid-cols-2">
            {tecnicas.map((tecnica) => {
              const Icon = tecnica.icon;
              const progress = getTechniqueProgress(tecnica.id);
              const isUnlocked = progress?.unlocked ?? false;

              return (
                <Card 
                  key={tecnica.id} 
                  className={cn(
                    "transition-all relative overflow-hidden",
                    isUnlocked 
                      ? "hover:shadow-lg" 
                      : "opacity-75 grayscale-[30%]"
                  )}
                >
                  {/* Lock overlay for locked techniques */}
                  {!isUnlocked && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center">
                      <div className="bg-muted rounded-full p-4 mb-3">
                        <Lock className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="font-semibold text-foreground">Técnica Bloqueada</p>
                      {progress && (
                        <div className="mt-3 w-48 space-y-2">
                          <Progress value={progress.progress} className="h-2" />
                          <p className="text-xs text-muted-foreground text-center">
                            {progress.requirementLabel}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <CardHeader>
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn(
                        "p-3 rounded-lg",
                        isUnlocked ? tecnica.bgColor : tecnica.lockedBgColor
                      )}>
                        <Icon className={cn(
                          "h-6 w-6",
                          isUnlocked ? tecnica.color : "text-muted-foreground"
                        )} />
                      </div>
                      <Badge 
                        variant={isUnlocked ? "default" : "outline"} 
                        className={cn(
                          "text-xs",
                          isUnlocked ? "bg-green-500 hover:bg-green-600" : ""
                        )}
                      >
                        {isUnlocked ? (
                          <>
                            <Unlock className="h-3 w-3 mr-1" />
                            Liberado
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3 mr-1" />
                            Bloqueado
                          </>
                        )}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{tecnica.title}</CardTitle>
                    <CardDescription>{tecnica.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Exemplo */}
                    <div>
                      <h4 className="font-semibold text-sm mb-2 text-foreground">Exemplo Prático</h4>
                      <p className="text-sm text-muted-foreground">{tecnica.exemplo}</p>
                    </div>

                    {/* Benefícios */}
                    <div>
                      <h4 className="font-semibold text-sm mb-2 text-foreground">Benefícios</h4>
                      <ul className="space-y-1">
                        {tecnica.beneficios.map((beneficio, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>{beneficio}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Como usar */}
                    <div>
                      <h4 className="font-semibold text-sm mb-2 text-foreground">Como Usar</h4>
                      <p className="text-sm text-muted-foreground">{tecnica.comousar}</p>
                    </div>

                    {/* CTA */}
                    <Button 
                      onClick={tecnica.action}
                      className="w-full gap-2 mt-4"
                      variant={isUnlocked ? "outline" : "ghost"}
                      disabled={!isUnlocked}
                    >
                      {isUnlocked ? (
                        <>
                          Experimentar agora
                          <ArrowRight className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Desbloqueie para usar
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Dicas finais */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Dicas para Máximo Aproveitamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Estude diariamente</p>
                  <p className="text-sm">Mesmo que por 15 minutos. Consistência é mais importante que duração.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Não pule revisões</p>
                  <p className="text-sm">O sistema calcula o momento ideal. Revisar no tempo certo é crucial para retenção.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Seja honesto nas avaliações</p>
                  <p className="text-sm">Avaliar corretamente sua dificuldade ajuda o algoritmo a otimizar seu estudo.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Desbloqueie todas as técnicas</p>
                  <p className="text-sm">Cada técnica reforça as outras. Continue estudando para desbloquear técnicas avançadas!</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA final */}
          <div className="mt-8 text-center">
            <Button size="lg" onClick={() => navigate('/study')} className="gap-2">
              Começar a estudar agora
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </ProtectedContent>
  );
}
