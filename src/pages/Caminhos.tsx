import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAllLearningPaths, LearningPathWithProgress } from '@/hooks/useAllLearningPaths';
import DashboardHeader from '@/components/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BookOpen, 
  Leaf, 
  Music, 
  Sparkles, 
  Lock, 
  ArrowRight,
  Trophy,
  Clock,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  Leaf,
  Music,
  Sparkles,
  GraduationCap,
};

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' },
  green: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30' },
  red: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-500', border: 'border-pink-500/30' },
};

function PathCard({ path }: { path: LearningPathWithProgress }) {
  const navigate = useNavigate();
  const Icon = iconMap[path.icone] || BookOpen;
  const colors = colorMap[path.cor] || colorMap.amber;

  const getStatusBadge = () => {
    if (path.isLocked) {
      return <Badge variant="secondary" className="gap-1"><Lock className="w-3 h-3" /> Premium</Badge>;
    }
    if (path.userProgress.percentage === 100) {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30 gap-1"><Trophy className="w-3 h-3" /> Concluído</Badge>;
    }
    if (path.userProgress.memorized > 0 || path.userProgress.studying > 0) {
      return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> Em Progresso</Badge>;
    }
    return <Badge variant="outline">Não iniciado</Badge>;
  };

  const handleClick = () => {
    if (path.isLocked) {
      navigate('/subscription');
      return;
    }
    
    // Map slug to route
    if (path.slug === 'caminho-ifa') {
      navigate('/caminho-ifa');
    } else {
      navigate(`/caminho/${path.slug}`);
    }
  };

  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
        "border-2 hover:border-primary/50",
        path.isLocked && "opacity-80"
      )}
      onClick={handleClick}
    >
      {path.imagem_url && (
        <div className="h-32 overflow-hidden rounded-t-lg">
          <img 
            src={path.imagem_url} 
            alt={path.nome}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      
      <CardHeader className={cn(!path.imagem_url && "pt-6")}>
        <div className="flex items-start justify-between mb-2">
          <div className={cn("p-3 rounded-xl", colors.bg)}>
            <Icon className={cn("w-6 h-6", colors.text)} />
          </div>
          {getStatusBadge()}
        </div>
        
        <CardTitle className="text-xl">{path.nome}</CardTitle>
        <CardDescription className="line-clamp-2">
          {path.descricao}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{path.userProgress.totalContent} conteúdos</span>
          <span className="font-medium text-foreground">{path.userProgress.percentage}%</span>
        </div>
        
        <Progress value={path.userProgress.percentage} className="h-2" />
        
        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="text-green-500 font-medium">{path.userProgress.memorized} memorizados</span>
            <span className="text-amber-500 font-medium">{path.userProgress.studying} estudando</span>
          </div>
        </div>

        <Button 
          className="w-full group-hover:bg-primary"
          variant={path.isLocked ? "secondary" : "outline"}
        >
          {path.isLocked ? (
            <>
              <Lock className="w-4 h-4 mr-2" />
              Desbloquear
            </>
          ) : path.userProgress.percentage > 0 ? (
            <>
              Continuar
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </>
          ) : (
            <>
              Começar
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function PathSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <Skeleton className="w-20 h-5 rounded-full" />
        </div>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-8" />
        </div>
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

export default function Caminhos() {
  const { user, loading: authLoading } = useAuth();
  const { activePaths, comingSoonPaths, loading, error } = useAllLearningPaths();
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Caminhos de Aprendizado</h1>
          <p className="text-muted-foreground">
            Escolha seu caminho de estudo e comece sua jornada de conhecimento.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg mb-6">
            {error}
          </div>
        )}

        <section className={comingSoonPaths.length > 0 ? "mb-12" : ""}>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Cursos Disponíveis
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <>
                <PathSkeleton />
                <PathSkeleton />
                <PathSkeleton />
              </>
            ) : activePaths.length > 0 ? (
              activePaths.map(path => (
                <PathCard key={path.id} path={path} />
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Nenhum curso disponível no momento.
              </div>
            )}
          </div>
        </section>

        {comingSoonPaths.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Em Breve
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {comingSoonPaths.map((path) => {
                const Icon = iconMap[path.icone] || BookOpen;
                const colors = colorMap[path.cor] || colorMap.amber;
                
                return (
                  <Card 
                    key={path.id}
                    className="opacity-60 border-dashed"
                  >
                    {path.imagem_url && (
                      <div className="h-32 overflow-hidden rounded-t-lg">
                        <img 
                          src={path.imagem_url} 
                          alt={path.nome}
                          className="w-full h-full object-cover grayscale"
                        />
                      </div>
                    )}
                    <CardHeader className={!path.imagem_url ? "pt-6" : undefined}>
                      <div className="flex items-start justify-between mb-2">
                        <div className={cn("p-3 rounded-xl", colors.bg)}>
                          <Icon className={cn("w-6 h-6", colors.text)} />
                        </div>
                        <Badge variant="outline" className="gap-1">
                          <Clock className="w-3 h-3" /> Em Breve
                        </Badge>
                      </div>
                      
                      <CardTitle className="text-xl">{path.nome}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {path.descricao}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      <Button variant="ghost" className="w-full" disabled>
                        Aguarde o lançamento
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
