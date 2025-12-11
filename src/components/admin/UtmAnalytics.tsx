import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link2, Target, Megaphone, TrendingUp, Users } from 'lucide-react';

interface UtmRecord {
  id: string;
  user_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  referrer: string | null;
  landing_page: string | null;
  created_at: string;
}

interface UtmStats {
  totalVisits: number;
  bySource: { name: string; value: number }[];
  byMedium: { name: string; value: number }[];
  byCampaign: { name: string; value: number }[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658'];

export default function UtmAnalytics() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<UtmRecord[]>([]);
  const [stats, setStats] = useState<UtmStats>({
    totalVisits: 0,
    bySource: [],
    byMedium: [],
    byCampaign: [],
  });

  useEffect(() => {
    loadUtmData();
  }, []);

  const loadUtmData = async () => {
    try {
      const { data, error } = await supabase
        .from('utm_tracking')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const utmRecords = data || [];
      setRecords(utmRecords);

      // Calculate statistics
      const sourceCount: Record<string, number> = {};
      const mediumCount: Record<string, number> = {};
      const campaignCount: Record<string, number> = {};

      utmRecords.forEach((record) => {
        const source = record.utm_source || 'Direto';
        const medium = record.utm_medium || 'Sem mídia';
        const campaign = record.utm_campaign || 'Sem campanha';

        sourceCount[source] = (sourceCount[source] || 0) + 1;
        mediumCount[medium] = (mediumCount[medium] || 0) + 1;
        campaignCount[campaign] = (campaignCount[campaign] || 0) + 1;
      });

      setStats({
        totalVisits: utmRecords.length,
        bySource: Object.entries(sourceCount)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6),
        byMedium: Object.entries(mediumCount)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6),
        byCampaign: Object.entries(campaignCount)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6),
      });
    } catch (error) {
      console.error('Error loading UTM data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Visitas UTM</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisits}</div>
            <p className="text-xs text-muted-foreground">Usuários rastreados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Fonte</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bySource[0]?.name || '-'}</div>
            <p className="text-xs text-muted-foreground">
              {stats.bySource[0]?.value || 0} visitas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Mídia</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byMedium[0]?.name || '-'}</div>
            <p className="text-xs text-muted-foreground">
              {stats.byMedium[0]?.value || 0} visitas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Campanha</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{stats.byCampaign[0]?.name || '-'}</div>
            <p className="text-xs text-muted-foreground">
              {stats.byCampaign[0]?.value || 0} visitas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Visitas por Fonte (utm_source)
            </CardTitle>
            <CardDescription>Distribuição de tráfego por origem</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.bySource.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.bySource}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Nenhum dado UTM registrado ainda
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Visitas por Mídia (utm_medium)
            </CardTitle>
            <CardDescription>Tipos de mídia utilizados</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.byMedium.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.byMedium}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {stats.byMedium.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Nenhum dado UTM registrado ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Performance por Campanha
          </CardTitle>
          <CardDescription>Visitas por campanha (utm_campaign)</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.byCampaign.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.byCampaign} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              Nenhuma campanha registrada ainda
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Últimos Registros UTM
          </CardTitle>
          <CardDescription>Últimas 100 visitas com parâmetros UTM</CardDescription>
        </CardHeader>
        <CardContent>
          {records.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Mídia</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Página</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.slice(0, 20).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(record.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {record.utm_source ? (
                          <Badge variant="secondary">{record.utm_source}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.utm_medium ? (
                          <Badge variant="outline">{record.utm_medium}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.utm_campaign ? (
                          <Badge>{record.utm_campaign}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {record.landing_page || '/'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum registro UTM encontrado.</p>
              <p className="text-sm mt-2">
                Os dados serão exibidos quando usuários acessarem com parâmetros UTM.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
