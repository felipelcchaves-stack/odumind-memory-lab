import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Zap, BookOpen, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

interface ProfileData {
  xp: number;
  streak: number;
  meta_diaria: number;
}

export default function Dashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('xp, streak, meta_diaria')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setProfile(data);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const memorizedPercentage = 15; // Placeholder
  const dailyGoalPercentage = (profile?.xp || 0) / (profile?.meta_diaria || 30) * 100;

  // Mock heatmap data
  const heatmapData = Array.from({ length: 365 }, (_, i) => ({
    date: new Date(Date.now() - (364 - i) * 24 * 60 * 60 * 1000),
    value: Math.random() > 0.7 ? Math.floor(Math.random() * 4) : 0
  }));

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Odùmind
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Bem-vindo de volta! 🌟</h2>
          <p className="text-muted-foreground">
            Continue sua jornada de memorização dos Odu Ifá
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">% Memorizada</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{memorizedPercentage}%</div>
              <Progress value={memorizedPercentage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                38 de 256 Odu memorizado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">XP Total</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{profile?.xp || 0}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Continue estudando para ganhar mais XP
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Streak</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                {profile?.streak || 0}
                <Badge variant="secondary">dias</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Estude hoje para manter seu streak
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meta Diária</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{profile?.meta_diaria || 30} min</div>
              <Progress value={dailyGoalPercentage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {Math.min(100, Math.round(dailyGoalPercentage))}% completo hoje
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Button */}
        <div className="text-center mb-8">
          <Button size="lg" className="text-lg px-8 py-6">
            <BookOpen className="mr-2 h-5 w-5" />
            Estudar Agora
          </Button>
        </div>

        {/* Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Estudos</CardTitle>
            <CardDescription>
              Visualize sua consistência ao longo do ano
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto pb-4">
              <div className="inline-grid gap-1" style={{ gridTemplateColumns: 'repeat(53, minmax(0, 1fr))' }}>
                {heatmapData.map((day, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-sm transition-colors"
                    style={{
                      backgroundColor:
                        day.value === 0
                          ? 'hsl(var(--muted))'
                          : day.value === 1
                          ? 'hsl(var(--primary) / 0.3)'
                          : day.value === 2
                          ? 'hsl(var(--primary) / 0.6)'
                          : 'hsl(var(--primary))'
                    }}
                    title={day.date.toLocaleDateString()}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
              <span>Menos</span>
              <div className="w-3 h-3 rounded-sm bg-muted" />
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--primary) / 0.3)' }} />
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--primary) / 0.6)' }} />
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--primary))' }} />
              <span>Mais</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
