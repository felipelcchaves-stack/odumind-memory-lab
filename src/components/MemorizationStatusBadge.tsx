import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { BookOpen, Brain, Trophy } from "lucide-react";

interface MemorizationStatusBadgeProps {
  status: 'nao_estudado' | 'estudando' | 'memorizado';
  revisoes?: number;
  forcaMemoria?: number;
  showProgress?: boolean;
  className?: string;
}

const statusConfig = {
  nao_estudado: {
    icon: BookOpen,
    label: 'Não Estudado',
    bgClass: 'bg-muted text-muted-foreground border-border',
    tooltip: {
      title: 'Não Estudado',
      description: 'Este Odu ainda não foi estudado. Inicie uma sessão de estudo para começar sua jornada de memorização!',
      requirements: []
    }
  },
  estudando: {
    icon: Brain,
    label: 'Estudando',
    bgClass: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
    getTooltip: (revisoes: number = 0, forcaMemoria: number = 0) => ({
      title: 'Em Progresso',
      description: 'Continue estudando para memorizar este Odu. Você está no caminho certo!',
      requirements: [
        `Revisões: ${revisoes}/3 ${revisoes >= 3 ? '✓' : ''}`,
        `Força de memória: ${Math.round(forcaMemoria)}%/60% ${forcaMemoria >= 60 ? '✓' : ''}`
      ],
      needsInfo: [
        revisoes < 3 ? `Faltam ${3 - revisoes} revisões` : null,
        forcaMemoria < 60 ? `Faltam ${Math.round(60 - forcaMemoria)}% de força` : null
      ].filter(Boolean)
    })
  },
  memorizado: {
    icon: Trophy,
    label: 'Memorizado',
    bgClass: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
    tooltip: {
      title: 'Memorizado! 🎉',
      description: 'Parabéns! Este Odu foi memorizado com sucesso. Continue revisando periodicamente para manter a retenção a longo prazo.',
      requirements: ['✓ 3+ revisões', '✓ 60%+ força de memória']
    }
  }
};

export default function MemorizationStatusBadge({ 
  status, 
  revisoes = 0, 
  forcaMemoria = 0, 
  showProgress = false,
  className = ""
}: MemorizationStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  const tooltip = status === 'estudando' && 'getTooltip' in config
    ? config.getTooltip(revisoes, forcaMemoria)
    : 'tooltip' in config ? config.tooltip : { title: '', description: '', requirements: [] };

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <Badge 
          variant="outline" 
          className={`${config.bgClass} ${className} cursor-help transition-all hover:scale-105`}
        >
          <Icon className="h-3 w-3 mr-1" />
          {config.label}
          {showProgress && status === 'estudando' && (
            <span className="ml-1 text-xs opacity-75">
              ({revisoes}/3)
            </span>
          )}
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-4" align="start">
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Icon className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">{tooltip.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tooltip.description}
              </p>
            </div>
          </div>

          {tooltip.requirements && tooltip.requirements.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="font-medium text-xs text-muted-foreground mb-2">Requisitos para Memorização:</p>
              <ul className="space-y-1.5">
                {tooltip.requirements.map((req, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <span className={req.includes('✓') ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                      {req}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status === 'estudando' && 'needsInfo' in tooltip && Array.isArray(tooltip.needsInfo) && tooltip.needsInfo.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="font-medium text-xs text-muted-foreground mb-2">O que falta:</p>
              <ul className="space-y-1.5">
                {(tooltip.needsInfo as string[]).map((need, i) => (
                  <li key={i} className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-2">
                    <span>→</span> {need}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status === 'nao_estudado' && (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground italic">
                Clique em "Estudar Agora" para começar a memorizar este Odu.
              </p>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
