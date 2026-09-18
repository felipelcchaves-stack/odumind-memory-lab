// Configuração centralizada de todos os planos de assinatura
// Fonte única de verdade para Pricing.tsx, Subscription.tsx, e outros

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface Plan {
  id: string;
  name: string;
  price: string;
  priceValue: number;
  description: string;
  features: PlanFeature[];
  cta: string;
  variant: 'outline' | 'default' | 'premium';
  popular?: boolean;
  guruOfferId?: string;
}

// IDs dos planos - usar estes para referência consistente
export const PLAN_IDS = {
  GRATUITO: 'gratuito',
  AWO: 'awo',
  EGBE: 'egbe',
} as const;

// Configuração completa dos planos
export const PLANS: Plan[] = [
  {
    id: PLAN_IDS.GRATUITO,
    name: "Gratuito",
    price: "R$ 0",
    priceValue: 0,
    description: "Para conhecer o método",
    features: [
      { text: "Acesso a 5 Odu", included: true },
      { text: "Flashcards básicos", included: true },
      { text: "Progresso limitado", included: true },
      { text: "Sem acesso aos rituais", included: false },
      { text: "Sem suporte prioritário", included: false },
    ],
    cta: "Começar Grátis",
    variant: "outline",
  },
  {
    id: PLAN_IDS.AWO,
    name: "Awo",
    price: "R$ 129,00",
    priceValue: 129.00,
    description: "Para estudantes dedicados",
    features: [
      { text: "Acesso a todos os 256 Odu", included: true },
      { text: "Flashcards ilimitados", included: true },
      { text: "Spaced repetition avançado", included: true },
      { text: "Progresso detalhado", included: true },
      { text: "Acesso aos rituais", included: true },
    ],
    cta: "Assinar Awo",
    variant: "default",
    popular: true,
    guruOfferId: "awo-mensal",
  },
  {
    id: PLAN_IDS.EGBE,
    name: "Egbe",
    price: "R$ 327,00",
    priceValue: 327.00,
    description: "Para sacerdotes e mestres",
    features: [
      { text: "Tudo do plano Awo", included: true },
      { text: "Conteúdo exclusivo avançado", included: true },
      { text: "Mentoria em grupo", included: true },
      { text: "Suporte prioritário", included: true },
      { text: "Certificados de conclusão", included: true },
    ],
    cta: "Assinar Egbe",
    variant: "premium",
    guruOfferId: "egbe-mensal",
  },
];

// Helper para obter plano por ID
export const getPlanById = (id: string): Plan | undefined => {
  return PLANS.find(plan => plan.id === id);
};

// Helper para obter plano por nome
export const getPlanByName = (name: string): Plan | undefined => {
  return PLANS.find(plan => plan.name.toLowerCase() === name.toLowerCase());
};

// Hierarquia de planos para upgrades/downgrades
export const PLAN_HIERARCHY: Record<string, number> = {
  'gratuito': 0,
  'free': 0,
  'awo': 1,
  'professional': 1,
  'profissional': 1,
  'premium': 1,
  'akapo': 1,
  'egbe': 2,
  'familia': 2,
  'family': 2,
};
