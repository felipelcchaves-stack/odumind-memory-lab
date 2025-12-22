import { useState, useEffect } from 'react';
import { useSubscriptionPlans, SubscriptionPlan, PlanFeature } from '@/hooks/useSubscriptionPlans';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Copy, Trash2, GripVertical, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const PERIODOS = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
  { value: 'unico', label: 'Pagamento Único' },
];

const PLAN_LEVELS = [
  { value: 'gratuito', label: 'Gratuito' },
  { value: 'awo', label: 'Awo (Premium)' },
  { value: 'egbe', label: 'Egbe (Família)' },
];

const VARIANTS = [
  { value: 'outline', label: 'Outline (Básico)' },
  { value: 'default', label: 'Default (Destaque)' },
  { value: 'premium', label: 'Premium (Especial)' },
];

const emptyPlan: Partial<SubscriptionPlan> = {
  slug: '',
  nome: '',
  descricao: '',
  preco: 0,
  preco_original: null,
  moeda: 'BRL',
  periodo: 'mensal',
  duracao_dias: null,
  features: [],
  checkout_url: '',
  guru_product_id: '',
  guru_offer_id: '',
  plan_level: 'awo',
  hierarquia: 1,
  cta_text: 'Assinar',
  badge_text: '',
  variant: 'default',
  cor: '',
  ativo: true,
  visivel_landing: true,
  visivel_subscription: true,
  ordem: 0,
};

export function PlansManager() {
  const { plans, loading, createPlan, updatePlan, deletePlan, togglePlanActive, refresh } = useSubscriptionPlans();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<SubscriptionPlan> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [featuresText, setFeaturesText] = useState('');

  // Load all plans including inactive on mount
  useEffect(() => {
    refresh();
  }, []);

  const handleOpenCreate = () => {
    setEditingPlan({ ...emptyPlan });
    setFeaturesText('');
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setEditingPlan({ ...plan });
    // Convert features array to text format
    const text = plan.features
      .map(f => `${f.included ? '+' : '-'} ${f.text}`)
      .join('\n');
    setFeaturesText(text);
    setIsDialogOpen(true);
  };

  const handleDuplicate = (plan: SubscriptionPlan) => {
    setEditingPlan({
      ...plan,
      id: undefined,
      slug: `${plan.slug}-copia`,
      nome: `${plan.nome} (Cópia)`,
      ativo: false
    });
    const text = plan.features
      .map(f => `${f.included ? '+' : '-'} ${f.text}`)
      .join('\n');
    setFeaturesText(text);
    setIsDialogOpen(true);
  };

  const parseFeatures = (text: string): PlanFeature[] => {
    return text
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const trimmed = line.trim();
        const included = !trimmed.startsWith('-');
        const textContent = trimmed.replace(/^[+-]\s*/, '');
        return { text: textContent, included };
      });
  };

  const handleSave = async () => {
    if (!editingPlan) return;

    try {
      setIsSubmitting(true);

      const features = parseFeatures(featuresText);
      const planData = {
        ...editingPlan,
        features,
        preco: Number(editingPlan.preco) || 0,
        preco_original: editingPlan.preco_original ? Number(editingPlan.preco_original) : null,
        duracao_dias: editingPlan.duracao_dias ? Number(editingPlan.duracao_dias) : null,
        hierarquia: Number(editingPlan.hierarquia) || 0,
        ordem: Number(editingPlan.ordem) || 0,
      };

      if (editingPlan.id) {
        await updatePlan(editingPlan.id, planData);
        toast.success('Plano atualizado com sucesso!');
      } else {
        await createPlan(planData);
        toast.success('Plano criado com sucesso!');
      }

      setIsDialogOpen(false);
      setEditingPlan(null);
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Erro ao salvar plano');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (plan: SubscriptionPlan) => {
    if (!confirm(`Tem certeza que deseja excluir o plano "${plan.nome}"?`)) return;

    try {
      await deletePlan(plan.id);
      toast.success('Plano excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Erro ao excluir plano');
    }
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      await togglePlanActive(plan.id, !plan.ativo);
      toast.success(plan.ativo ? 'Plano desativado' : 'Plano ativado');
    } catch (error) {
      console.error('Error toggling plan:', error);
      toast.error('Erro ao alterar status do plano');
    }
  };

  const formatPrice = (preco: number, moeda: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: moeda
    }).format(preco);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Planos de Assinatura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Planos de Assinatura</CardTitle>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Plano
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Ordem</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Visibilidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map(plan => (
                <TableRow key={plan.id} className={!plan.ativo ? 'opacity-50' : ''}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="ml-1">{plan.ordem}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{plan.nome}</span>
                      <span className="text-xs text-muted-foreground">{plan.slug}</span>
                    </div>
                    {plan.badge_text && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {plan.badge_text}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{formatPrice(plan.preco, plan.moeda)}</span>
                      {plan.preco_original && (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(plan.preco_original, plan.moeda)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{plan.periodo}</span>
                    {plan.duracao_dias && (
                      <span className="text-xs text-muted-foreground block">
                        ({plan.duracao_dias} dias)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      plan.plan_level === 'egbe' ? 'default' :
                      plan.plan_level === 'awo' ? 'secondary' : 'outline'
                    }>
                      {plan.plan_level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {plan.visivel_landing && (
                        <Badge variant="outline" className="text-xs">Landing</Badge>
                      )}
                      {plan.visivel_subscription && (
                        <Badge variant="outline" className="text-xs">Assinatura</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={plan.ativo}
                      onCheckedChange={() => handleToggleActive(plan)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {plan.checkout_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(plan.checkout_url!, '_blank')}
                          title="Abrir Checkout"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(plan)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicate(plan)}
                        title="Duplicar"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(plan)}
                        title="Excluir"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {plans.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum plano cadastrado. Clique em "Novo Plano" para começar.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan?.id ? 'Editar Plano' : 'Novo Plano'}
            </DialogTitle>
          </DialogHeader>

          {editingPlan && (
            <div className="grid gap-4 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Plano</Label>
                  <Input
                    id="nome"
                    value={editingPlan.nome || ''}
                    onChange={e => setEditingPlan({ ...editingPlan, nome: e.target.value })}
                    placeholder="Ex: Awo Anual"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (identificador)</Label>
                  <Input
                    id="slug"
                    value={editingPlan.slug || ''}
                    onChange={e => setEditingPlan({ ...editingPlan, slug: e.target.value })}
                    placeholder="Ex: awo-anual"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={editingPlan.descricao || ''}
                  onChange={e => setEditingPlan({ ...editingPlan, descricao: e.target.value })}
                  placeholder="Ex: Para estudantes dedicados"
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preco">Preço</Label>
                  <Input
                    id="preco"
                    type="number"
                    step="0.01"
                    value={editingPlan.preco || 0}
                    onChange={e => setEditingPlan({ ...editingPlan, preco: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preco_original">Preço Original (riscado)</Label>
                  <Input
                    id="preco_original"
                    type="number"
                    step="0.01"
                    value={editingPlan.preco_original || ''}
                    onChange={e => setEditingPlan({ 
                      ...editingPlan, 
                      preco_original: e.target.value ? parseFloat(e.target.value) : null 
                    })}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodo">Período</Label>
                  <Select
                    value={editingPlan.periodo || 'mensal'}
                    onValueChange={value => setEditingPlan({ ...editingPlan, periodo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIODOS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duracao_dias">Duração em dias (vazio = recorrente)</Label>
                  <Input
                    id="duracao_dias"
                    type="number"
                    value={editingPlan.duracao_dias || ''}
                    onChange={e => setEditingPlan({ 
                      ...editingPlan, 
                      duracao_dias: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    placeholder="Ex: 365 para acesso de 1 ano"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan_level">Nível do Plano (permissões)</Label>
                  <Select
                    value={editingPlan.plan_level || 'awo'}
                    onValueChange={value => setEditingPlan({ ...editingPlan, plan_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAN_LEVELS.map(l => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* GURU Integration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkout_url">URL de Checkout (GURU)</Label>
                  <Input
                    id="checkout_url"
                    value={editingPlan.checkout_url || ''}
                    onChange={e => setEditingPlan({ ...editingPlan, checkout_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guru_offer_id">GURU Offer ID</Label>
                  <Input
                    id="guru_offer_id"
                    value={editingPlan.guru_offer_id || ''}
                    onChange={e => setEditingPlan({ ...editingPlan, guru_offer_id: e.target.value })}
                    placeholder="Ex: awo-mensal"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guru_product_id">GURU Product ID (webhook)</Label>
                <Input
                  id="guru_product_id"
                  value={editingPlan.guru_product_id || ''}
                  onChange={e => setEditingPlan({ ...editingPlan, guru_product_id: e.target.value })}
                  placeholder="ID do produto no GURU para o webhook"
                />
              </div>

              {/* Features */}
              <div className="space-y-2">
                <Label htmlFor="features">
                  Features (uma por linha, + incluído, - não incluído)
                </Label>
                <Textarea
                  id="features"
                  value={featuresText}
                  onChange={e => setFeaturesText(e.target.value)}
                  placeholder={`+ Acesso a todos os 256 Odu
+ Flashcards ilimitados
+ Progresso detalhado
- Suporte prioritário`}
                  rows={6}
                />
              </div>

              {/* Display Options */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cta_text">Texto do Botão (CTA)</Label>
                  <Input
                    id="cta_text"
                    value={editingPlan.cta_text || ''}
                    onChange={e => setEditingPlan({ ...editingPlan, cta_text: e.target.value })}
                    placeholder="Ex: Assinar Agora"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="badge_text">Badge (destaque)</Label>
                  <Input
                    id="badge_text"
                    value={editingPlan.badge_text || ''}
                    onChange={e => setEditingPlan({ ...editingPlan, badge_text: e.target.value })}
                    placeholder="Ex: Mais Popular"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="variant">Estilo Visual</Label>
                  <Select
                    value={editingPlan.variant || 'default'}
                    onValueChange={value => setEditingPlan({ ...editingPlan, variant: value as 'outline' | 'default' | 'premium' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VARIANTS.map(v => (
                        <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hierarquia">Hierarquia (upgrade/downgrade)</Label>
                  <Input
                    id="hierarquia"
                    type="number"
                    value={editingPlan.hierarquia || 0}
                    onChange={e => setEditingPlan({ ...editingPlan, hierarquia: parseInt(e.target.value) })}
                    placeholder="0=free, 1=awo, 2=egbe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ordem">Ordem de Exibição</Label>
                  <Input
                    id="ordem"
                    type="number"
                    value={editingPlan.ordem || 0}
                    onChange={e => setEditingPlan({ ...editingPlan, ordem: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              {/* Visibility */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="ativo"
                    checked={editingPlan.ativo}
                    onCheckedChange={checked => setEditingPlan({ ...editingPlan, ativo: checked })}
                  />
                  <Label htmlFor="ativo">Plano Ativo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="visivel_landing"
                    checked={editingPlan.visivel_landing}
                    onCheckedChange={checked => setEditingPlan({ ...editingPlan, visivel_landing: checked })}
                  />
                  <Label htmlFor="visivel_landing">Visível na Landing</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="visivel_subscription"
                    checked={editingPlan.visivel_subscription}
                    onCheckedChange={checked => setEditingPlan({ ...editingPlan, visivel_subscription: checked })}
                  />
                  <Label htmlFor="visivel_subscription">Visível na Assinatura</Label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
