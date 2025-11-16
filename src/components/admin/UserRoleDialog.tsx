import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Shield, Users, GraduationCap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentRole: string;
  onSave: () => void;
}

export default function UserRoleDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentRole,
  onSave
}: UserRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);

      // Delete existing role
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: selectedRole as 'admin' | 'colaborador' | 'aluno' });

      if (insertError) throw insertError;

      toast.success(`Perfil alterado para ${selectedRole}`);
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Erro ao alterar perfil do usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Alterar Perfil de Acesso</DialogTitle>
          <DialogDescription>
            Altere o nível de acesso de {userName}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <RadioGroup value={selectedRole} onValueChange={setSelectedRole}>
            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent">
              <RadioGroupItem value="admin" id="admin" />
              <Label htmlFor="admin" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-semibold">Admin</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Acesso total: gerenciar usuários, conteúdo e configurações da plataforma
                </p>
              </Label>
            </div>

            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent mt-3">
              <RadioGroupItem value="colaborador" id="colaborador" />
              <Label htmlFor="colaborador" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold">Colaborador</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pode estudar e gerenciar conteúdo dos Odu (adicionar, editar, remover)
                </p>
              </Label>
            </div>

            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent mt-3">
              <RadioGroupItem value="aluno" id="aluno" />
              <Label htmlFor="aluno" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">Aluno</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Acesso básico: apenas estudar e acompanhar progresso pessoal
                </p>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || selectedRole === currentRole}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Alterar Perfil'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
