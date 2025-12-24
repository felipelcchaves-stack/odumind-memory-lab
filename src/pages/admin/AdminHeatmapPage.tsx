import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, MousePointer2, Monitor, Smartphone, Tablet, Trash2, RefreshCw, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ClickData {
  id: string;
  x_percent: number;
  y_percent: number;
  viewport_width: number;
  viewport_height: number;
  element_tag: string | null;
  element_id: string | null;
  element_text: string | null;
  ab_variant: string | null;
  device_type: string | null;
  created_at: string;
  page_url: string;
}

interface HeatmapPoint {
  x: number;
  y: number;
  intensity: number;
}

const GRID_SIZE = 50; // Pixels per grid cell for aggregation

export default function AdminHeatmapPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [variantFilter, setVariantFilter] = useState<string>("all");
  const [pageFilter, setPageFilter] = useState<string>("/");

  // Fetch click data
  const { data: clicks, isLoading, refetch } = useQuery({
    queryKey: ['heatmap-clicks', dateRange, deviceFilter, variantFilter, pageFilter],
    queryFn: async () => {
      let query = supabase
        .from('click_coordinates')
        .select('*')
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString())
        .eq('page_url', pageFilter)
        .order('created_at', { ascending: false })
        .limit(10000);

      if (deviceFilter !== 'all') {
        query = query.eq('device_type', deviceFilter);
      }

      if (variantFilter !== 'all') {
        query = query.eq('ab_variant', variantFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ClickData[];
    },
  });

  // Fetch available variants
  const { data: variants } = useQuery({
    queryKey: ['heatmap-variants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('click_coordinates')
        .select('ab_variant')
        .not('ab_variant', 'is', null);
      
      if (error) throw error;
      
      const uniqueVariants = [...new Set(data.map(d => d.ab_variant).filter(Boolean))];
      return uniqueVariants as string[];
    },
  });

  // Fetch stats
  const stats = useMemo(() => {
    if (!clicks || clicks.length === 0) {
      return {
        totalClicks: 0,
        uniqueSessions: 0,
        topElements: [],
        deviceBreakdown: { mobile: 0, tablet: 0, desktop: 0 },
      };
    }

    const sessions = new Set(clicks.map(c => c.id.split('_')[0])); // Approximate sessions
    
    // Element click counts
    const elementCounts: Record<string, number> = {};
    clicks.forEach(click => {
      const key = click.element_id || click.element_tag || 'unknown';
      elementCounts[key] = (elementCounts[key] || 0) + 1;
    });

    const topElements = Object.entries(elementCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([element, count]) => ({ element, count }));

    // Device breakdown
    const deviceBreakdown = { mobile: 0, tablet: 0, desktop: 0 };
    clicks.forEach(click => {
      if (click.device_type === 'mobile') deviceBreakdown.mobile++;
      else if (click.device_type === 'tablet') deviceBreakdown.tablet++;
      else deviceBreakdown.desktop++;
    });

    return {
      totalClicks: clicks.length,
      uniqueSessions: sessions.size,
      topElements,
      deviceBreakdown,
    };
  }, [clicks]);

  // Generate heatmap points
  const heatmapPoints = useMemo((): HeatmapPoint[] => {
    if (!clicks || clicks.length === 0) return [];

    // Group clicks into grid cells
    const grid: Record<string, number> = {};
    let maxCount = 0;

    clicks.forEach(click => {
      // Round to grid cells (in percentage)
      const gridX = Math.round(click.x_percent / 2) * 2;
      const gridY = Math.round(click.y_percent / 2) * 2;
      const key = `${gridX},${gridY}`;
      
      grid[key] = (grid[key] || 0) + 1;
      maxCount = Math.max(maxCount, grid[key]);
    });

    // Convert to points with normalized intensity
    return Object.entries(grid).map(([key, count]) => {
      const [x, y] = key.split(',').map(Number);
      return {
        x,
        y,
        intensity: count / maxCount,
      };
    });
  }, [clicks]);

  const handleDeleteOldData = async () => {
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
    
    const { error } = await supabase
      .from('click_coordinates')
      .delete()
      .lt('created_at', thirtyDaysAgo);

    if (error) {
      toast.error('Erro ao deletar dados antigos');
    } else {
      toast.success('Dados com mais de 30 dias deletados');
      refetch();
    }
  };

  const handleExportData = () => {
    if (!clicks || clicks.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const csv = [
      ['Data', 'X%', 'Y%', 'Elemento', 'ID', 'Texto', 'Dispositivo', 'Variante'].join(','),
      ...clicks.map(c => [
        format(new Date(c.created_at), 'dd/MM/yyyy HH:mm'),
        c.x_percent,
        c.y_percent,
        c.element_tag,
        c.element_id || '',
        (c.element_text || '').replace(/,/g, ';'),
        c.device_type,
        c.ab_variant || '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heatmap-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Dados exportados com sucesso');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mapa de Calor</h1>
          <p className="text-muted-foreground">Visualize onde os visitantes clicam na landing page</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDeleteOldData}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar +30 dias
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Date Range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            {/* Device Filter */}
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Dispositivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
              </SelectContent>
            </Select>

            {/* Variant Filter */}
            <Select value={variantFilter} onValueChange={setVariantFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Variante A/B" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {variants?.map(v => (
                  <SelectItem key={v} value={v}>Variante {v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Page Filter */}
            <Select value={pageFilter} onValueChange={setPageFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Página" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="/">Landing Page</SelectItem>
                <SelectItem value="/auth">Login</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Cliques</CardDescription>
            <CardTitle className="text-3xl">
              <MousePointer2 className="inline h-6 w-6 mr-2 text-primary" />
              {stats.totalClicks.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Desktop</CardDescription>
            <CardTitle className="text-3xl">
              <Monitor className="inline h-6 w-6 mr-2 text-blue-500" />
              {stats.deviceBreakdown.desktop.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tablet</CardDescription>
            <CardTitle className="text-3xl">
              <Tablet className="inline h-6 w-6 mr-2 text-amber-500" />
              {stats.deviceBreakdown.tablet.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Mobile</CardDescription>
            <CardTitle className="text-3xl">
              <Smartphone className="inline h-6 w-6 mr-2 text-green-500" />
              {stats.deviceBreakdown.mobile.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="heatmap">
        <TabsList>
          <TabsTrigger value="heatmap">Mapa de Calor</TabsTrigger>
          <TabsTrigger value="elements">Elementos Clicados</TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Visualização do Mapa de Calor</CardTitle>
              <CardDescription>
                Cores mais quentes indicam mais cliques. O mapa mostra a distribuição relativa dos cliques na página.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[600px] flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : heatmapPoints.length === 0 ? (
                <div className="h-[600px] flex flex-col items-center justify-center text-muted-foreground">
                  <MousePointer2 className="h-16 w-16 mb-4 opacity-20" />
                  <p>Nenhum clique registrado no período selecionado</p>
                </div>
              ) : (
                <div className="relative bg-gradient-to-b from-background to-muted/30 border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                  {/* Heatmap visualization */}
                  <svg 
                    viewBox="0 0 100 100" 
                    preserveAspectRatio="none"
                    className="w-full h-full"
                  >
                    <defs>
                      <radialGradient id="heatGradient">
                        <stop offset="0%" stopColor="rgba(255, 0, 0, 0.8)" />
                        <stop offset="30%" stopColor="rgba(255, 165, 0, 0.6)" />
                        <stop offset="60%" stopColor="rgba(255, 255, 0, 0.4)" />
                        <stop offset="100%" stopColor="rgba(255, 255, 0, 0)" />
                      </radialGradient>
                    </defs>
                    
                    {heatmapPoints.map((point, index) => (
                      <circle
                        key={index}
                        cx={point.x}
                        cy={point.y}
                        r={2 + point.intensity * 4}
                        fill="url(#heatGradient)"
                        opacity={0.3 + point.intensity * 0.7}
                      />
                    ))}
                  </svg>

                  {/* Legend */}
                  <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm border rounded-lg p-3">
                    <p className="text-xs font-medium mb-2">Intensidade</p>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-3 rounded-full bg-gradient-to-r from-yellow-300 via-orange-500 to-red-600" />
                      <span className="text-xs text-muted-foreground">Baixo → Alto</span>
                    </div>
                  </div>

                  {/* Grid overlay hint */}
                  <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      {clicks?.length || 0} cliques em {heatmapPoints.length} zonas
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="elements" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Elementos Mais Clicados</CardTitle>
              <CardDescription>
                Ranking dos elementos que receberam mais cliques
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.topElements.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum dado disponível</p>
              ) : (
                <div className="space-y-3">
                  {stats.topElements.map((item, index) => (
                    <div key={item.element} className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        index === 0 ? "bg-yellow-500 text-yellow-950" :
                        index === 1 ? "bg-gray-300 text-gray-700" :
                        index === 2 ? "bg-amber-600 text-amber-950" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {item.element}
                        </code>
                      </div>
                      <Badge variant="secondary">{item.count} cliques</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
