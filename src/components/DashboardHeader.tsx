import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useChangelog } from '@/hooks/useChangelog';
import { useSubscription } from '@/hooks/useSubscription';
import { useTheme } from 'next-themes';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Home, BookOpen, Brain, Shield, Settings, LogOut, Sun, Moon, User, Crown, BarChart3, Edit, Landmark, Lightbulb, Sparkles, Gift, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function DashboardHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin, isColaborador } = useAdmin();
  const { theme, setTheme } = useTheme();
  const { hasUnreadChangelog } = useChangelog();
  const { isFamily } = useSubscription();
  const { simplifiedMode, setSimplifiedMode, highContrast, setHighContrast } = useAccessibility();

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard', priority: 'high' },
    { path: '/biblioteca-yoruba', icon: BookOpen, label: 'Biblioteca', priority: 'high' },
    { path: '/study', icon: Brain, label: 'Estudar', priority: 'high' },
    { path: '/indicar', icon: Gift, label: 'Indicar', priority: 'medium' },
    ...(isFamily() ? [{ path: '/familia', icon: Users, label: 'Família', priority: 'medium' as const }] : []),
    { path: '/memory-palace', icon: Landmark, label: 'Palácio', priority: 'medium' },
    { path: '/tecnicas', icon: Lightbulb, label: 'Técnicas', priority: 'low' },
    { path: '/novidades', icon: Sparkles, label: 'Novidades', showBadge: hasUnreadChangelog, priority: 'low' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">Ọ</span>
          </div>
          <span className="hidden font-semibold sm:inline-block">Isesemind</span>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1" data-tour="nav-menu">
      {navItems
        .filter(item => {
          // On mobile (< 768px), show only high priority items
          if (typeof window !== 'undefined' && window.innerWidth < 768) {
            return item.priority === 'high';
          }
          return true;
        })
        .map((item) => (
        <Button
          key={item.path}
          variant={isActive(item.path) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => navigate(item.path)}
          className="gap-2 relative"
        >
          <item.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{item.label}</span>
          {item.showBadge && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-2 w-2 p-0 animate-pulse" />
          )}
        </Button>
      ))}
        </nav>

        {/* User Menu */}
        <div className="flex items-center gap-2">
          {/* Simplified Mode Toggle (only on Dashboard) */}
          {location.pathname === '/dashboard' && (
            <div className="hidden md:flex items-center gap-2 mr-2">
              <Switch
                id="simplified-mode"
                checked={simplifiedMode}
                onCheckedChange={setSimplifiedMode}
              />
              <Label htmlFor="simplified-mode" className="text-sm cursor-pointer">
                Modo Simples
              </Label>
            </div>
          )}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            data-tour="theme-toggle"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" data-tour="user-menu">
                <User className="h-5 w-5" />
                {isAdmin && (
                  <span className="absolute -right-1 -top-1 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-primary"></span>
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">Minha Conta</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                  {isAdmin && (
                    <Badge variant="secondary" className="w-fit text-xs">
                      Administrador
                    </Badge>
                  )}
                  {isColaborador && !isAdmin && (
                    <Badge variant="outline" className="w-fit text-xs">
                      Colaborador
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/subscription')}>
                <Crown className="mr-2 h-4 w-4" />
                Minha Assinatura
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/familia')}>
                <Users className="mr-2 h-4 w-4" />
                Plano Família
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-2 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="high-contrast-menu" className="text-sm cursor-pointer">
                    Alto Contraste
                  </Label>
                  <Switch
                    id="high-contrast-menu"
                    checked={highContrast}
                    onCheckedChange={setHighContrast}
                  />
                </div>
                <div className="flex items-center justify-between md:hidden">
                  <Label htmlFor="simplified-mode-menu" className="text-sm cursor-pointer">
                    Modo Simples
                  </Label>
                  <Switch
                    id="simplified-mode-menu"
                    checked={simplifiedMode}
                    onCheckedChange={setSimplifiedMode}
                  />
                </div>
              </div>
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <Shield className="mr-2 h-4 w-4" />
                    Painel Admin
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin/analytics')}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Analytics
                  </DropdownMenuItem>
                </>
              )}
              {isColaborador && (
                <DropdownMenuItem onClick={() => navigate('/colaborador')}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar Odu
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
