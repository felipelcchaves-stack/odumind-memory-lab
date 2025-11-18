import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Clock, Calendar as CalendarIcon } from 'lucide-react';

interface StudySlot {
  id?: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  duracao_minutos?: number;
  ativo: boolean;
}

const DIAS_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export default function StudyCalendar() {
  const [slots, setSlots] = useState<StudySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSlot, setNewSlot] = useState<StudySlot>({
    dia_semana: 1,
    hora_inicio: '19:00',
    hora_fim: '20:00',
    ativo: true
  });

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('study_schedule')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('dia_semana', { ascending: true });

      if (error) throw error;
      setSlots(data || []);
    } catch (error) {
      console.error('Error loading schedule:', error);
      toast.error('Erro ao carregar horários');
    } finally {
      setLoading(false);
    }
  };

  const addSlot = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Validate times
      if (newSlot.hora_inicio >= newSlot.hora_fim) {
        toast.error('Horário de início deve ser antes do fim');
        return;
      }

      const { error } = await supabase
        .from('study_schedule')
        .insert({
          user_id: user.id,
          ...newSlot
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Já existe um horário neste dia e hora');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Horário adicionado com sucesso!');
      loadSchedule();
      setNewSlot({
        dia_semana: 1,
        hora_inicio: '19:00',
        hora_fim: '20:00',
        ativo: true
      });
    } catch (error) {
      console.error('Error adding slot:', error);
      toast.error('Erro ao adicionar horário');
    }
  };

  const removeSlot = async (slotId: string) => {
    try {
      const { error } = await supabase
        .from('study_schedule')
        .delete()
        .eq('id', slotId);

      if (error) throw error;

      toast.success('Horário removido');
      loadSchedule();
    } catch (error) {
      console.error('Error removing slot:', error);
      toast.error('Erro ao remover horário');
    }
  };

  const calculateTotalTime = () => {
    return slots.reduce((acc, slot) => acc + (slot.duracao_minutos || 0), 0);
  };

  if (loading) {
    return <div className="animate-pulse">Carregando...</div>;
  }

  const totalMinutos = calculateTotalTime();
  const totalHoras = Math.floor(totalMinutos / 60);
  const restanteMinutos = totalMinutos % 60;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Calendário de Estudos
        </CardTitle>
        <CardDescription>
          Configure os dias e horários que você pode estudar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="flex flex-wrap gap-4 p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <strong>{slots.length}</strong> sessões/semana
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <strong>{totalHoras}h {restanteMinutos}min</strong> total/semana
            </span>
          </div>
        </div>

        {/* Current schedule */}
        {slots.length > 0 && (
          <div className="space-y-2">
            <Label>Horários Configurados</Label>
            <div className="space-y-2">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="min-w-[110px]">
                      {DIAS_SEMANA[slot.dia_semana]}
                    </Badge>
                    <span className="text-sm font-medium">
                      {slot.hora_inicio} - {slot.hora_fim}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({slot.duracao_minutos} min)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSlot(slot.id!)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new slot */}
        <div className="space-y-4 pt-4 border-t">
          <Label>Adicionar Novo Horário</Label>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dia">Dia da Semana</Label>
              <select
                id="dia"
                value={newSlot.dia_semana}
                onChange={(e) => setNewSlot({ ...newSlot, dia_semana: parseInt(e.target.value) })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                {DIAS_SEMANA.map((dia, index) => (
                  <option key={index} value={index}>
                    {dia}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inicio">Início</Label>
              <Input
                id="inicio"
                type="time"
                value={newSlot.hora_inicio}
                onChange={(e) => setNewSlot({ ...newSlot, hora_inicio: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fim">Fim</Label>
              <Input
                id="fim"
                type="time"
                value={newSlot.hora_fim}
                onChange={(e) => setNewSlot({ ...newSlot, hora_fim: e.target.value })}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={addSlot} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
