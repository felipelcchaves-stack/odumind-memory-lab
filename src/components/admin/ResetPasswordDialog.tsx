import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Copy, Eye, EyeOff, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  userName: string;
}

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function ResetPasswordDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  userName,
}: ResetPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [resultPassword, setResultPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGeneratePassword = () => {
    const newPassword = generateRandomPassword();
    setPassword(newPassword);
    setShowPassword(true);
  };

  const handleCopyPassword = async () => {
    const passwordToCopy = resultPassword || password;
    if (passwordToCopy) {
      await navigator.clipboard.writeText(passwordToCopy);
      setCopied(true);
      toast.success('Senha copiada!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async () => {
    if (!password.trim()) {
      toast.error('Digite uma senha ou gere uma automática');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('resend-user-password', {
        body: {
          user_id: userId,
          custom_password: password,
          send_email: sendEmail,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao redefinir senha');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // Show the password that was set
      setResultPassword(password);
      
      if (sendEmail) {
        toast.success(`Senha redefinida e enviada para ${userEmail}`);
      } else {
        toast.success('Senha redefinida com sucesso');
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Erro ao redefinir senha');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setResultPassword(null);
    setShowPassword(false);
    setSendEmail(true);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Redefinir Senha</DialogTitle>
          <DialogDescription>
            Defina uma nova senha para o usuário <strong>{userName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email display */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Email do usuário</Label>
            <Input value={userEmail} disabled className="bg-muted" />
          </div>

          {/* Result password display */}
          {resultPassword && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg space-y-2">
              <Label className="text-green-600 dark:text-green-400 font-medium">
                ✓ Senha definida com sucesso
              </Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={resultPassword} 
                  readOnly 
                  className="font-mono bg-background"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPassword}
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {sendEmail 
                  ? 'A senha foi enviada por email. Você também pode copiar e enviar manualmente.'
                  : 'Copie a senha acima e envie ao usuário.'}
              </p>
            </div>
          )}

          {/* Password input - only show if no result yet */}
          {!resultPassword && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite ou gere uma senha"
                      className="pr-10 font-mono"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGeneratePassword}
                    title="Gerar senha aleatória"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendEmail"
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(checked === true)}
                />
                <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer">
                  Enviar senha por email
                </Label>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {resultPassword ? (
            <Button onClick={handleClose}>Fechar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading || !password.trim()}>
                {isLoading ? 'Salvando...' : 'Redefinir Senha'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
