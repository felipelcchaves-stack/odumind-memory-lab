import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { OnboardingModal } from '@/components/OnboardingModal';

interface ProfileCompletionModalProps {
  open: boolean;
  onComplete: () => void;
}

const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function ProfileCompletionModal({ open, onComplete }: ProfileCompletionModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [formData, setFormData] = useState({
    pais: 'Brasil',
    estado: '',
    data_nascimento: '',
    sexo: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.estado || !formData.data_nascimento || !formData.sexo) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          pais: formData.pais,
          estado: formData.estado,
          data_nascimento: formData.data_nascimento,
          sexo: formData.sexo,
          profile_completed: true
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Perfil completado com sucesso!');
      
      // Mostra o onboarding após completar o perfil
      setShowOnboarding(true);
    } catch (error) {
      console.error('Error completing profile:', error);
      toast.error('Erro ao salvar informações do perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    onComplete();
  };

  // Mostra onboarding se o perfil foi completado
  if (showOnboarding) {
    return (
      <OnboardingModal 
        open={showOnboarding}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Complete seu Perfil
          </DialogTitle>
          <DialogDescription>
            Para começar a estudar, precisamos de algumas informações para personalizar sua experiência.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="pais">País *</Label>
            <Input
              id="pais"
              value={formData.pais}
              onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estado">Estado *</Label>
            <Select
              value={formData.estado}
              onValueChange={(value) => setFormData({ ...formData, estado: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione seu estado" />
              </SelectTrigger>
              <SelectContent>
                {BRAZIL_STATES.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
            <Input
              id="data_nascimento"
              type="date"
              value={formData.data_nascimento}
              onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sexo">Sexo *</Label>
            <Select
              value={formData.sexo}
              onValueChange={(value) => setFormData({ ...formData, sexo: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
                <SelectItem value="prefiro_nao_informar">Prefiro não informar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Salvando...' : 'Começar a Estudar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
