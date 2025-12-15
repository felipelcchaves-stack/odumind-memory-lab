import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Smartphone, 
  Share, 
  PlusSquare, 
  Check, 
  Download,
  Wifi,
  Zap,
  Bell,
  MoreVertical,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import DashboardHeader from '@/components/DashboardHeader';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';

export default function Instalar() {
  const navigate = useNavigate();
  const { 
    isInstalled, 
    isInstallable, 
    isIOS, 
    isAndroid,
    isMobile,
    promptInstall 
  } = usePWAInstall();

  // Celebration when already installed
  useEffect(() => {
    if (isInstalled) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isInstalled]);

  const handleNativeInstall = async () => {
    await promptInstall();
  };

  const benefits = [
    {
      icon: Zap,
      title: 'Acesso Instantâneo',
      description: 'Abra direto da tela inicial do seu celular'
    },
    {
      icon: Wifi,
      title: 'Funciona Offline',
      description: 'Estude seus Odu mesmo sem internet'
    },
    {
      icon: Bell,
      title: 'Notificações',
      description: 'Receba lembretes de revisão no momento certo'
    },
    {
      icon: Smartphone,
      title: 'Experiência Nativa',
      description: 'Visual de app sem barra do navegador'
    }
  ];

  // Already installed state
  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <DashboardHeader />
        <main className="container max-w-2xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <Check className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              App já instalado!
            </h1>
            <p className="text-muted-foreground mb-8">
              O IseseMind já está instalado no seu dispositivo. Você pode acessá-lo pela tela inicial.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <DashboardHeader />
      
      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Instale o IseseMind
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Tenha acesso rápido ao seu estudo dos Odu Ifá direto da tela inicial do seu celular.
          </p>
        </motion.div>

        {/* Native Install Button (Android/Desktop) */}
        {isInstallable && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="py-6 text-center">
                <h2 className="font-semibold text-lg mb-3">Instalação com um clique!</h2>
                <Button size="lg" onClick={handleNativeInstall} className="gap-2">
                  <Download className="h-5 w-5" />
                  Instalar Agora
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Platform Instructions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* iOS Instructions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className={isIOS ? 'ring-2 ring-primary' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    🍎 iPhone / iPad
                  </CardTitle>
                  {isIOS && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      Seu dispositivo
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Siga estes passos no Safari:
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-sm">Toque no ícone Compartilhar</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Share className="h-4 w-4" /> Na barra inferior do Safari
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-sm">Adicionar à Tela de Início</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <PlusSquare className="h-4 w-4" /> Role para baixo e toque
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-sm">Confirme tocando em "Adicionar"</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        O app aparecerá na sua tela inicial
                      </p>
                    </div>
                  </div>
                </div>

                {isIOS && (
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => navigate('/dashboard')}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Entendi! Vou instalar
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Android Instructions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className={isAndroid && !isInstallable ? 'ring-2 ring-primary' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    🤖 Android
                  </CardTitle>
                  {isAndroid && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      Seu dispositivo
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isInstallable ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Clique no botão abaixo para instalar diretamente:
                    </p>
                    <Button size="lg" onClick={handleNativeInstall} className="w-full gap-2">
                      <Download className="h-5 w-5" />
                      Instalar App
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Siga estes passos no Chrome:
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                          1
                        </div>
                        <div>
                          <p className="font-medium text-sm">Toque no menu do Chrome</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MoreVertical className="h-4 w-4" /> Três pontinhos no canto superior
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                          2
                        </div>
                        <div>
                          <p className="font-medium text-sm">Instalar aplicativo</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Download className="h-4 w-4" /> ou "Adicionar à tela inicial"
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                          3
                        </div>
                        <div>
                          <p className="font-medium text-sm">Confirme a instalação</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            O app aparecerá na sua tela inicial
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {isAndroid && !isInstallable && (
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => navigate('/dashboard')}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Entendi! Vou instalar
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Separator className="mb-8" />
          
          <h2 className="text-lg font-semibold text-center mb-6">
            Por que instalar o app?
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6 pb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <benefit.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-medium text-sm mb-1">{benefit.title}</h3>
                  <p className="text-xs text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
