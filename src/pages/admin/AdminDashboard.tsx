import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatsCard } from "@/components/admin/StatsCard";
import { ActivityLog } from "@/components/admin/ActivityLog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { FileText, Users, Scroll, Plus, Upload, TrendingUp } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOdus: 0,
    totalUsers: 0,
    totalRituais: 0,
    activeUsers: 0,
  });
  const [userGrowth, setUserGrowth] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadUserGrowth();
  }, []);

  async function loadStats() {
    try {
      const [oduCount, userCount, ritualCount, activeCount] = await Promise.all([
        supabase.from("odu").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("ritual_content").select("*", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("last_study_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      setStats({
        totalOdus: oduCount.count || 0,
        totalUsers: userCount.count || 0,
        totalRituais: ritualCount.count || 0,
        activeUsers: activeCount.count || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }

  async function loadUserGrowth() {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("created_at")
        .order("created_at", { ascending: true })
        .limit(30);

      if (data) {
        const grouped = data.reduce((acc: any, profile) => {
          const date = new Date(profile.created_at).toLocaleDateString("pt-BR");
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});

        const chartData = Object.entries(grouped).map(([date, count]) => ({
          date,
          users: count,
        }));

        setUserGrowth(chartData);
      }
    } catch (error) {
      console.error("Error loading user growth:", error);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard"
        description="Visão geral do sistema e métricas principais"
      />

      <div className="container px-4 py-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total de Odu"
            value={stats.totalOdus}
            description={`${256 - stats.totalOdus} faltando`}
            icon={FileText}
          />
          <StatsCard
            title="Usuários"
            value={stats.totalUsers}
            description="Total cadastrado"
            icon={Users}
            chart={
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowth}>
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            }
          />
          <StatsCard
            title="Rituais/Rezas"
            value={stats.totalRituais}
            description="Total de conteúdos"
            icon={Scroll}
          />
          <StatsCard
            title="Usuários Ativos"
            value={stats.activeUsers}
            description="Últimos 7 dias"
            icon={TrendingUp}
            trend={{
              value: Math.round((stats.activeUsers / stats.totalUsers) * 100) || 0,
              positive: true,
            }}
          />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesso rápido às funcionalidades principais</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
                onClick={() => navigate("/admin/odu")}
              >
                <Plus className="h-5 w-5" />
                <span>Criar Odu</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
                onClick={() => navigate("/admin/rituais")}
              >
                <Plus className="h-5 w-5" />
                <span>Criar Ritual</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
                onClick={() => navigate("/admin/odu")}
              >
                <Upload className="h-5 w-5" />
                <span>Upload Odu</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
                onClick={() => navigate("/admin/users")}
              >
                <Users className="h-5 w-5" />
                <span>Gerenciar Usuários</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activity Log */}
        <ActivityLog />
      </div>
    </div>
  );
}
