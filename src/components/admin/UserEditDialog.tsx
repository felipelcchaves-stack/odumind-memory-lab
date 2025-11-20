import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const userSchema = z.object({
  nome: z.string()
    .trim()
    .min(2, { message: "Nome deve ter pelo menos 2 caracteres" })
    .max(100, { message: "Nome deve ter no máximo 100 caracteres" }),
  email: z.string()
    .trim()
    .email({ message: "Email inválido" })
    .max(255, { message: "Email deve ter no máximo 255 caracteres" }),
  meta_diaria: z.number()
    .int({ message: "Meta diária deve ser um número inteiro" })
    .min(1, { message: "Meta diária deve ser pelo menos 1" })
    .max(100, { message: "Meta diária deve ser no máximo 100" }),
  password: z.string()
    .min(6, { message: "Senha deve ter pelo menos 6 caracteres" })
    .max(72, { message: "Senha deve ter no máximo 72 caracteres" })
    .optional()
    .or(z.literal("")),
});

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  onSave: () => void;
  isCreate?: boolean;
}

export default function UserEditDialog({ open, onOpenChange, userId, onSave, isCreate = false }: UserEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [metaDiaria, setMetaDiaria] = useState(30);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'colaborador' | 'aluno'>('aluno');
  const [selectedPlan, setSelectedPlan] = useState<string>('Gratuito');
  const [currentSubscriptionStatus, setCurrentSubscriptionStatus] = useState<string>('free');
  const [originalPlan, setOriginalPlan] = useState<string>('Gratuito');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [subscriptionChangeReason, setSubscriptionChangeReason] = useState('');

  useEffect(() => {
    if (open && userId && !isCreate) {
      loadUserData();
    } else if (open && isCreate) {
      // Reset form for new user
      setNome('');
      setEmail('');
      setMetaDiaria(30);
      setAvatarUrl(null);
      setPassword('');
      setSelectedRole('aluno');
      setSelectedPlan('Gratuito');
      setCurrentSubscriptionStatus('free');
      setOriginalPlan('Gratuito');
    }
  }, [open, userId, isCreate]);

  const loadUserData = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      // Get profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('nome, meta_diaria, avatar_url')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // Get email
      const { data: emailData, error: emailError } = await supabase
        .rpc('get_user_emails', { user_ids: [userId] });

      if (emailError) throw emailError;

      // Get user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error loading role:', roleError);
      }

      // Get subscription/plan
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('plan_name, status')
        .eq('user_id', userId)
        .single();

      if (subError && subError.code !== 'PGRST116') {
        console.error('Error loading subscription:', subError);
      }

      if (profile) {
        setNome(profile.nome || '');
        setMetaDiaria(profile.meta_diaria);
        setAvatarUrl(profile.avatar_url);
      }

      if (emailData && emailData.length > 0) {
        setEmail(emailData[0].email);
      }

      if (roleData) {
        setSelectedRole(roleData.role as 'admin' | 'colaborador' | 'aluno');
      } else {
        setSelectedRole('aluno');
      }

      if (subscription) {
        setSelectedPlan(subscription.plan_name);
        setCurrentSubscriptionStatus(subscription.status);
        setOriginalPlan(subscription.plan_name);
      } else {
        setSelectedPlan('Gratuito');
        setCurrentSubscriptionStatus('free');
        setOriginalPlan('Gratuito');
      }
    } catch (error) {
      console.error('Error loading user:', error);
      toast.error('Erro ao carregar dados do usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId || 'temp'}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast.success('Avatar atualizado com sucesso');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao fazer upload do avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Validate inputs
      const validation = userSchema.safeParse({
        nome,
        email,
        meta_diaria: metaDiaria,
        password: isCreate ? password : undefined,
      });

      if (!validation.success) {
        const firstError = validation.error.errors[0];
        toast.error(firstError.message);
        return;
      }

      if (isCreate) {
        // Create new user
        if (!validation.data.password || validation.data.password === "") {
          toast.error('Senha é obrigatória para criar usuário');
          return;
        }

        // Call edge function to create user
        const { data, error } = await supabase.functions.invoke('admin-create-user', {
          body: {
            email: validation.data.email,
            password: validation.data.password,
            nome: validation.data.nome,
            meta_diaria: validation.data.meta_diaria,
            avatar_url: avatarUrl,
            role: selectedRole,
          },
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Falha ao criar usuário');

        toast.success('Usuário criado com sucesso');
      } else {
        // Update existing user
        if (!userId) return;

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            nome: validation.data.nome,
            meta_diaria: validation.data.meta_diaria,
            avatar_url: avatarUrl,
          })
          .eq('user_id', userId);

        if (profileError) throw profileError;

        // Update user role
        // First, delete existing role
        const { error: deleteRoleError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        if (deleteRoleError) {
          console.error('Error deleting old role:', deleteRoleError);
          throw deleteRoleError;
        }

        // Then, insert new role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: selectedRole,
          });

        if (roleError) {
          console.error('Error updating role:', roleError);
          throw roleError;
        }

        // Update subscription via edge function if changed
        if (selectedPlan !== originalPlan) {
          const { data: changeResult, error: changeError } = await supabase.functions.invoke(
            'admin-change-subscription',
            {
              body: {
                userId: userId,
                newPlan: selectedPlan,
                billingCycle: billingCycle,
                reason: subscriptionChangeReason || null,
              },
            }
          );

          if (changeError) throw changeError;

          if (!changeResult?.success) {
            throw new Error(changeResult?.error || 'Erro ao alterar assinatura no Stripe');
          }

          toast.success(
            `Assinatura alterada com sucesso! ${changeResult.message}`,
            { duration: 5000 }
          );
        } else {
          toast.success('Usuário atualizado com sucesso');
        }
      }

      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error.message || 'Erro ao salvar dados do usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto animate-enter">
        <DialogHeader>
          <DialogTitle>{isCreate ? 'Criar Novo Usuário' : 'Editar Perfil do Usuário'}</DialogTitle>
          <DialogDescription>
            {isCreate 
              ? 'Preencha os dados para criar um novo usuário na plataforma'
              : 'Atualize as informações do perfil do usuário'
            }
          </DialogDescription>
        </DialogHeader>

        {loading && !isCreate ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-4 px-1">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback>{nome?.charAt(0)?.toUpperCase() || email?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
              </Avatar>
              <div>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <Label htmlFor="avatar-upload">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading || loading}
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    asChild
                  >
                    <span>
                      {uploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {uploading ? 'Enviando...' : 'Alterar Avatar'}
                    </span>
                  </Button>
                </Label>
              </div>
            </div>

            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                placeholder="Digite o nome do usuário"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isCreate}
                maxLength={255}
              />
              {!isCreate && (
                <p className="text-xs text-muted-foreground">Email não pode ser alterado</p>
              )}
            </div>

            {/* Password Field (only for create) */}
            {isCreate && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                />
              </div>
            )}
            
            {/* Role Field (for both create and edit) */}
            <div className="space-y-2">
              <Label htmlFor="role">Perfil de Acesso</Label>
              <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aluno">Aluno</SelectItem>
                  <SelectItem value="colaborador">Colaborador</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Plan Selector - Only for editing existing users */}
            {!isCreate && (
              <div className="space-y-2">
                <Label htmlFor="plan">Plano de Assinatura</Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger id="plan">
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gratuito">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Gratuito</Badge>
                        <span className="text-sm text-muted-foreground">Plano básico</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Premium">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Premium</Badge>
                        <span className="text-sm text-muted-foreground">R$ 49,90/mês</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Profissional">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Profissional</Badge>
                        <span className="text-sm text-muted-foreground">R$ 99,90/mês</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Família">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Família</Badge>
                        <span className="text-sm text-muted-foreground">R$ 129,90/mês (até 5 contas)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Alterar o plano cria/cancela assinaturas no Stripe automaticamente.
                </p>
              </div>
            )}

            {/* Billing Cycle - Only for editing and non-free plans */}
            {!isCreate && selectedPlan !== 'Gratuito' && (
              <div className="space-y-2">
                <Label htmlFor="billing-cycle">Ciclo de Cobrança</Label>
                <Select value={billingCycle} onValueChange={(value: 'monthly' | 'annual') => setBillingCycle(value)}>
                  <SelectTrigger id="billing-cycle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="annual">Anual (desconto 16%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Subscription Change Reason - Only when plan changed */}
            {!isCreate && selectedPlan !== originalPlan && selectedPlan !== 'Gratuito' && (
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo da Alteração (opcional)</Label>
                <Input
                  id="reason"
                  value={subscriptionChangeReason}
                  onChange={(e) => setSubscriptionChangeReason(e.target.value)}
                  placeholder="Ex: Solicitação do cliente, upgrade premium..."
                />
              </div>
            )}

            {/* Warning alert if plan changed */}
            {!isCreate && selectedPlan !== originalPlan && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Alteração de Assinatura com Stripe</AlertTitle>
                <AlertDescription>
                  <strong>O que vai acontecer:</strong>
                  <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
                    <li>Assinatura antiga será <strong>cancelada imediatamente</strong> no Stripe</li>
                    <li>Nova assinatura será criada com o plano <strong>{selectedPlan}</strong></li>
                    <li>Ciclo de cobrança: <strong>{billingCycle === 'monthly' ? 'Mensal' : 'Anual'}</strong></li>
                    <li>Registro completo será salvo no histórico de auditoria</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Daily Goal Field */}
            <div className="space-y-2">
              <Label htmlFor="meta">Meta Diária (minutos)</Label>
              <Input
                id="meta"
                type="number"
                min="1"
                max="1000"
                value={metaDiaria}
                onChange={(e) => setMetaDiaria(parseInt(e.target.value) || 30)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading || uploading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || uploading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              isCreate ? 'Criar Usuário' : 'Salvar Alterações'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
