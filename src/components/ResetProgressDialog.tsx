import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useResetProgress } from '@/hooks/useResetProgress';

export function ResetProgressDialog() {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const { resetProgress, isResetting } = useResetProgress();

  const handleReset = async () => {
    const success = await resetProgress();
    if (success) {
      setOpen(false);
      setConfirmed(false);
      setConfirmText('');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full sm:w-auto">
          <RotateCcw className="h-4 w-4 mr-2" />
          Zerar Todo o Progresso
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            ⚠️ Atenção! Ação Irreversível
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p className="font-bold text-foreground">
              Você está prestes a DELETAR PERMANENTEMENTE todo o seu progresso:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Todos os 256 Odu memorizados</li>
              <li>Todo o XP e streak acumulados</li>
              <li>Todas as conquistas e badges</li>
              <li>Histórico de sessões de estudo</li>
              <li>Notas, mnemônicos e palácio da memória</li>
              <li>Perfil de aprendizagem</li>
            </ul>
            <p className="font-bold text-destructive">
              Esta ação NÃO PODE ser desfeita!
            </p>

            <div className="space-y-4 pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="confirm"
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(checked as boolean)}
                />
                <Label htmlFor="confirm" className="text-sm font-normal cursor-pointer">
                  Eu entendo que esta ação é irreversível
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmText">
                  Digite <span className="font-bold">ZERAR</span> para confirmar:
                </Label>
                <Input
                  id="confirmText"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Digite ZERAR"
                  disabled={!confirmed}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            disabled={!confirmed || confirmText !== 'ZERAR' || isResetting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isResetting ? 'Zerando...' : 'Zerar Progresso'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
