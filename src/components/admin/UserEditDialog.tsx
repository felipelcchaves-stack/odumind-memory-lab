import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const userSchema = z.object({
  nome: z.string().trim().max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z.string().trim().email('Email inválido').max(255),
  meta_diaria: z.number().min(1, 'Meta deve ser no mínimo 1').max(1000, 'Meta deve ser no máximo 1000'),
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
        nome: nome.trim(),
        email: email.trim(),
        meta_diaria: metaDiaria,
      });

      if (!validation.success) {
        const firstError = validation.error.errors[0];
        toast.error(firstError.message);
        return;
      }

      if (isCreate) {
        // Create new user
        if (!password || password.length < 6) {
          toast.error('Senha deve ter no mínimo 6 caracteres');
          return;
        }

        // Call edge function to create user
        const { data, error } = await supabase.functions.invoke('admin-create-user', {
          body: {
            email: email.trim(),
            password: password,
            nome: nome.trim() || undefined,
            meta_diaria: metaDiaria,
            avatar_url: avatarUrl || undefined,
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
            nome: nome.trim() || null,
            meta_diaria: metaDiaria,
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

        toast.success('Perfil atualizado com sucesso');
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
      <DialogContent className="sm:max-w-[500px]">
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
          <div className="space-y-6 py-4">
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
