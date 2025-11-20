import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import DashboardHeader from '@/components/DashboardHeader';
import { z } from 'zod';

const profileSchema = z.object({
  nome: z.string()
    .trim()
    .min(2, { message: "Nome deve ter pelo menos 2 caracteres" })
    .max(100, { message: "Nome deve ter no máximo 100 caracteres" }),
  password: z.string()
    .min(6, { message: "Senha deve ter pelo menos 6 caracteres" })
    .max(72, { message: "Senha deve ter no máximo 72 caracteres" })
    .optional()
    .or(z.literal("")),
  confirmPassword: z.string().optional().or(z.literal("")),
}).refine((data) => {
  if (data.password && data.password !== "") {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "As senhas não correspondem",
  path: ["confirmPassword"],
});

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nome, setNome] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    loadProfile();
  }, [user, navigate]);

  async function loadProfile() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nome, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setNome(data.nome || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!user || !event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    try {
      setUploading(true);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(data.publicUrl);
      toast.success('Foto atualizada com sucesso!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao fazer upload da foto: ' + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);

      // Validate input
      const validation = profileSchema.safeParse({
        nome,
        password: newPassword,
        confirmPassword,
      });

      if (!validation.success) {
        const firstError = validation.error.errors[0];
        toast.error(firstError.message);
        setLoading(false);
        return;
      }

      // Update nome
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ nome: validation.data.nome })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Update password if provided
      if (validation.data.password && validation.data.password !== "") {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: validation.data.password
        });

        if (passwordError) throw passwordError;

        setNewPassword('');
        setConfirmPassword('');
        toast.success('Perfil e senha atualizados com sucesso!');
      } else {
        toast.success('Perfil atualizado com sucesso!');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const getInitials = () => {
    if (nome) {
      return nome.substring(0, 2).toUpperCase();
    }
    return user?.email?.substring(0, 2).toUpperCase() || '??';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <DashboardHeader />

      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Meu Perfil</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações pessoais
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>
              Atualize seu nome, foto e senha
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={avatarUrl} alt={nome || 'Avatar'} />
                  <AvatarFallback className="text-3xl">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <Label htmlFor="avatar-upload">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Alterar Foto
                        </>
                      )}
                    </Button>
                  </Label>
                </div>
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Digite seu nome"
                />
              </div>

              {/* Nova Senha */}
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha (opcional)</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Deixe em branco para não alterar"
                />
              </div>

              {/* Confirmar Senha */}
              {newPassword && (
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite a senha novamente"
                  />
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
