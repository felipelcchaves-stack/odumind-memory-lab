import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Star, Check, X, Sparkles, TrendingUp, MessageSquare, User, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  is_featured: boolean;
  xp_at_review: number;
  display_name: string | null;
  created_at: string;
  profiles?: {
    nome: string | null;
  } | null;
  user_email?: string | null;
}

interface ReviewStats {
  total: number;
  average: number;
  distribution: { rating: number; count: number }[];
  fiveStarCount: number;
  approvedCount: number;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [settings, setSettings] = useState({
    minXp: '500',
    minCountToShow: '100',
    showOnLanding: 'true'
  });

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      // Load reviews with profile info
      let query = supabase
        .from('user_reviews')
        .select(`
          *,
          profiles:user_id (
            nome
          )
        `)
        .order('created_at', { ascending: false });

      if (filter === '5-stars') {
        query = query.eq('rating', 5);
      } else if (filter === 'approved') {
        query = query.eq('is_approved', true);
      } else if (filter === 'pending') {
        query = query.eq('is_approved', false);
      }

      const { data: reviewsData } = await query;
      
      // Get user emails for all reviews
      if (reviewsData && reviewsData.length > 0) {
        const userIds = reviewsData.map(r => r.user_id);
        const { data: emailsData } = await supabase.rpc('get_user_emails', { user_ids: userIds });
        
        const emailMap = new Map<string, string>();
        if (emailsData) {
          emailsData.forEach((e: { user_id: string; email: string }) => {
            emailMap.set(e.user_id, e.email);
          });
        }
        
        const reviewsWithEmails = reviewsData.map(review => ({
          ...review,
          user_email: emailMap.get(review.user_id) || null
        }));
        
        setReviews(reviewsWithEmails);
      } else {
        setReviews([]);
      }

      // Load stats
      const { data: allReviews } = await supabase
        .from('user_reviews')
        .select('rating, is_approved');

      if (allReviews) {
        const total = allReviews.length;
        const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
        const average = total > 0 ? sum / total : 0;
        
        const distribution = [5, 4, 3, 2, 1].map(rating => ({
          rating,
          count: allReviews.filter(r => r.rating === rating).length
        }));

        setStats({
          total,
          average,
          distribution,
          fiveStarCount: allReviews.filter(r => r.rating === 5).length,
          approvedCount: allReviews.filter(r => r.is_approved).length
        });
      }

      // Load settings
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['review_min_xp', 'review_min_count_to_show', 'review_show_on_landing']);

      if (settingsData) {
        const settingsMap: Record<string, string> = {};
        settingsData.forEach(s => { settingsMap[s.key] = s.value || ''; });
        setSettings({
          minXp: settingsMap['review_min_xp'] || '500',
          minCountToShow: settingsMap['review_min_count_to_show'] || '100',
          showOnLanding: settingsMap['review_show_on_landing'] || 'true'
        });
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateReview = async (id: string, updates: Partial<Review>) => {
    try {
      const { error } = await supabase
        .from('user_reviews')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Avaliação atualizada');
      loadData();
    } catch (error) {
      console.error('Error updating review:', error);
      toast.error('Erro ao atualizar avaliação');
    }
  };

  const deleteReview = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta avaliação?')) return;

    try {
      const { error } = await supabase
        .from('user_reviews')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Avaliação excluída');
      loadData();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Erro ao excluir avaliação');
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value })
        .eq('key', key);

      if (error) throw error;
      toast.success('Configuração atualizada');
      setSettings(prev => ({ ...prev, [key.replace('review_', '')]: value }));
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Erro ao atualizar configuração');
    }
  };

  const canShowOnLanding = stats && stats.fiveStarCount >= parseInt(settings.minCountToShow);

  return (
    <div className="p-6 space-y-6">
      <AdminPageHeader 
        title="Avaliações" 
        description="Gerencie avaliações dos usuários e configurações de exibição"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Total de Avaliações</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.average.toFixed(1) || '0.0'}</p>
                <p className="text-sm text-muted-foreground">Média Geral</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.fiveStarCount || 0}</p>
                <p className="text-sm text-muted-foreground">5 Estrelas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.approvedCount || 0}</p>
                <p className="text-sm text-muted-foreground">Aprovadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reviews List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lista de Avaliações</CardTitle>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="5-stars">5 Estrelas</SelectItem>
                  <SelectItem value="approved">Aprovadas</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : reviews.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhuma avaliação encontrada</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead>Comentário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{review.display_name || 'Anônimo'}</p>
                          {review.profiles?.nome && review.profiles.nome !== review.display_name && (
                            <p className="text-xs text-muted-foreground">
                              Perfil: {review.profiles.nome}
                            </p>
                          )}
                          {review.user_email && (
                            <a 
                              href={`mailto:${review.user_email}`}
                              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                            >
                              <Mail className="h-3 w-3" />
                              {review.user_email}
                            </a>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(review.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-muted-foreground">{review.xp_at_review} XP</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`}
                            />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="truncate text-sm">{review.comment || '-'}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={review.is_approved ? 'default' : 'secondary'}>
                            {review.is_approved ? 'Aprovada' : 'Pendente'}
                          </Badge>
                          {review.is_featured && (
                            <Badge variant="outline" className="text-amber-500 border-amber-500">
                              Destaque
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="Ver perfil do usuário"
                          >
                            <Link to={`/admin/user/${review.user_id}`}>
                              <User className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateReview(review.id, { is_approved: !review.is_approved })}
                            title={review.is_approved ? 'Reprovar' : 'Aprovar'}
                          >
                            {review.is_approved ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                          </Button>
                          {review.rating === 5 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateReview(review.id, { is_featured: !review.is_featured })}
                              title={review.is_featured ? 'Remover destaque' : 'Destacar'}
                            >
                              <Sparkles className={`h-4 w-4 ${review.is_featured ? 'text-amber-500' : ''}`} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteReview(review.id)}
                            title="Excluir"
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Settings & Distribution */}
        <div className="space-y-6">
          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações</CardTitle>
              <CardDescription>Ajuste os parâmetros do sistema de avaliações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>XP mínimo para avaliar</Label>
                <Input
                  type="number"
                  value={settings.minXp}
                  onChange={(e) => setSettings(prev => ({ ...prev, minXp: e.target.value }))}
                  onBlur={() => updateSetting('review_min_xp', settings.minXp)}
                />
              </div>

              <div className="space-y-2">
                <Label>Mínimo para exibir na landing</Label>
                <Input
                  type="number"
                  value={settings.minCountToShow}
                  onChange={(e) => setSettings(prev => ({ ...prev, minCountToShow: e.target.value }))}
                  onBlur={() => updateSetting('review_min_count_to_show', settings.minCountToShow)}
                />
                <p className="text-xs text-muted-foreground">
                  Atual: {stats?.fiveStarCount || 0} de {settings.minCountToShow} avaliações 5 estrelas
                </p>
              </div>

              <div className="space-y-2">
                <Label>Exibir na landing page</Label>
                <Select
                  value={settings.showOnLanding}
                  onValueChange={(value) => {
                    setSettings(prev => ({ ...prev, showOnLanding: value }));
                    updateSetting('review_show_on_landing', value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!canShowOnLanding && settings.showOnLanding === 'true' && (
                <div className="p-3 bg-amber-500/10 rounded-md text-sm text-amber-600">
                  Ainda não há avaliações 5 estrelas suficientes ({stats?.fiveStarCount || 0}/{settings.minCountToShow}) para exibir na landing page.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats?.distribution.map(({ rating, count }) => {
                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="w-8 text-sm font-medium">{rating}★</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-sm text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
