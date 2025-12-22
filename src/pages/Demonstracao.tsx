import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  Brain,
  Puzzle,
  GripVertical,
  ListOrdered,
  Volume2,
  CheckCircle2,
  X,
  BookOpen,
  Lock,
  ScrollText,
  Users
} from 'lucide-react';

// Dados REAIS do Odu Ejiogbe (Odu #1) do banco de dados
const DEMO_ODU = {
  numero: 1,
  nome: "Ejiogbe",
  // Verso curto mas profundo - extraído do conteúdo real
  versoResumido: "A vida longa e a paz interior se firmam com èbó, disciplina e gratidão constante a Ifá.",
  // Significado real do Odu
  significado: "Ifá revela iré de vida longa, de casa e de vitória. Mas esse iré precisa ser sustentado com èbó, disciplina e gratidão constante.",
  // Texto para quiz
  textoQuiz: "Qual Odu ensina que a vida longa se firma com èbó, disciplina e gratidão?",
  // Preview do conteúdo completo para mostrar profundidade
  narrativaPreview: "Em Ilé-Ifẹ̀, o ancião Bàbá Òjó vivia inquieto: de dia trabalhava e parecia firme, mas as noites eram pesadas, cheias de pensamentos e preocupações sobre o futuro de sua família. Ifá foi consultado e Èjì Ògbè apareceu, revelando que havia iré de vida longa aguardando, mas que dependia de sua postura diante do destino...",
  // Indicadores de profundidade
  palavrasCompletas: 847,
  ensinamentos: 12,
  personagens: "Bàbá Òjó, Ifá, Òrúnmìlà"
};

const EXERCISES = [
  {
    id: 'flashcard',
    name: 'Flashcards Ativos',
    icon: RotateCcw,
    description: 'Memorize virando cards com Active Recall',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'quiz',
    name: 'Quiz Interativo',
    icon: Brain,
    description: 'Teste seu conhecimento com perguntas',
    color: 'from-purple-500 to-pink-600'
  },
  {
    id: 'cloze',
    name: 'Complete as Lacunas',
    icon: Puzzle,
    description: 'Preencha palavras-chave removidas',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'dragdrop',
    name: 'Arraste e Solte',
    icon: GripVertical,
    description: 'Posicione palavras no texto correto',
    color: 'from-orange-500 to-amber-600'
  },
  {
    id: 'order',
    name: 'Ordene o Verso',
    icon: ListOrdered,
    description: 'Organize frases na ordem correta',
    color: 'from-rose-500 to-red-600'
  },
  {
    id: 'audio',
    name: 'Estudo com Áudio',
    icon: Volume2,
    description: 'Ouça e acompanhe o texto sincronizado',
    color: 'from-cyan-500 to-blue-600'
  }
];

// Mini-exercício interativo de Flashcard
function FlashcardDemo() {
  const [isFlipped, setIsFlipped] = useState(false);
  const [rated, setRated] = useState(false);

  const handleRate = () => {
    setRated(true);
    setTimeout(() => {
      setIsFlipped(false);
      setRated(false);
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <div 
        className="relative h-64 cursor-pointer perspective-1000"
        onClick={() => !isFlipped && setIsFlipped(true)}
      >
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Frente */}
          <div 
            className={`absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border-2 border-primary/20 flex flex-col items-center justify-center p-6 ${isFlipped ? 'invisible' : ''}`}
            style={{ backfaceVisibility: 'hidden' }}
          >
            <Badge className="mb-4 bg-primary/20 text-primary">Odu #{DEMO_ODU.numero}</Badge>
            <h3 className="text-2xl font-bold text-center mb-2">{DEMO_ODU.nome}</h3>
            <p className="text-muted-foreground text-sm">Clique para ver o significado</p>
          </div>
          
          {/* Verso */}
          <div 
            className={`absolute inset-0 bg-gradient-to-br from-secondary to-secondary/80 rounded-xl border-2 border-primary/20 flex flex-col items-center justify-center p-6 ${!isFlipped ? 'invisible' : ''}`}
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-center text-sm leading-relaxed">{DEMO_ODU.significado}</p>
          </div>
        </motion.div>
      </div>
      
      {isFlipped && !rated && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center gap-2"
        >
          <Button size="sm" variant="outline" className="border-red-500 text-red-500" onClick={handleRate}>
            Difícil
          </Button>
          <Button size="sm" variant="outline" className="border-yellow-500 text-yellow-500" onClick={handleRate}>
            Médio
          </Button>
          <Button size="sm" variant="outline" className="border-green-500 text-green-500" onClick={handleRate}>
            Fácil
          </Button>
        </motion.div>
      )}

      {rated && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex justify-center"
        >
          <Badge className="bg-green-500/20 text-green-500">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            +50 XP!
          </Badge>
        </motion.div>
      )}
    </div>
  );
}

// Mini-exercício de Quiz
function QuizDemo() {
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const correctAnswer = 0;

  const options = [
    "Ejiogbe",
    "Oyeku Méjì", 
    "Iwori Méjì",
    "Odi Méjì"
  ];

  const handleSelect = (index: number) => {
    setSelected(index);
    setShowResult(true);
  };

  const reset = () => {
    setSelected(null);
    setShowResult(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-secondary/50 rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground mb-2">{DEMO_ODU.textoQuiz}</p>
        <p className="text-xs text-muted-foreground/70">Primeiro Odu de Ifá</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {options.map((option, i) => (
          <Button
            key={i}
            variant={selected === i ? (i === correctAnswer ? "default" : "destructive") : "outline"}
            className={`h-auto py-3 ${showResult && i === correctAnswer ? 'bg-green-500 hover:bg-green-500 text-white' : ''}`}
            onClick={() => !showResult && handleSelect(i)}
            disabled={showResult}
          >
            {option}
          </Button>
        ))}
      </div>

      {showResult && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-2"
        >
          {selected === correctAnswer ? (
            <Badge className="bg-green-500/20 text-green-500">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Correto! +30 XP
            </Badge>
          ) : (
            <Badge className="bg-red-500/20 text-red-500">
              <X className="w-4 h-4 mr-1" />
              A resposta correta era Ejiogbe
            </Badge>
          )}
          <Button size="sm" variant="ghost" onClick={reset}>
            Tentar novamente
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// Mini-exercício de Cloze
function ClozeDemo() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  
  const gaps = [
    { id: 0, word: 'èbó' },
    { id: 1, word: 'gratidão' },
  ];

  const handleInput = (id: number, value: string) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const checkAnswers = () => {
    setShowResult(true);
  };

  const reset = () => {
    setAnswers({});
    setShowResult(false);
  };

  const renderText = () => {
    const userAnswer0 = answers[0] || '';
    const userAnswer1 = answers[1] || '';
    const isCorrect0 = userAnswer0.toLowerCase().trim() === gaps[0].word.toLowerCase();
    const isCorrect1 = userAnswer1.toLowerCase().trim() === gaps[1].word.toLowerCase();
    
    return (
      <p className="text-sm leading-relaxed">
        A vida longa e a paz interior se firmam com{' '}
        <span className={isCorrect0 ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
          {userAnswer0 || '___'}
        </span>
        , disciplina e{' '}
        <span className={isCorrect1 ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
          {userAnswer1 || '___'}
        </span>
        {' '}constante a Ifá.
      </p>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-secondary/50 rounded-lg p-4">
        {showResult ? (
          renderText()
        ) : (
          <div className="text-sm leading-relaxed space-y-2">
            <p>A vida longa e a paz interior se firmam com <input 
              className="w-16 px-2 py-0.5 text-center border rounded bg-background text-xs"
              placeholder="..."
              value={answers[0] || ''}
              onChange={(e) => handleInput(0, e.target.value)}
            />, disciplina e <input 
              className="w-20 px-2 py-0.5 text-center border rounded bg-background text-xs"
              placeholder="..."
              value={answers[1] || ''}
              onChange={(e) => handleInput(1, e.target.value)}
            /> constante a Ifá.</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <Badge variant="outline" className="cursor-help">èbó</Badge>
        <Badge variant="outline" className="cursor-help">oferenda</Badge>
        <Badge variant="outline" className="cursor-help">gratidão</Badge>
        <Badge variant="outline" className="cursor-help">paciência</Badge>
      </div>

      {!showResult ? (
        <Button size="sm" className="w-full" onClick={checkAnswers}>
          Verificar Respostas
        </Button>
      ) : (
        <div className="text-center space-y-2">
          <Badge className="bg-green-500/20 text-green-500">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            {Object.values(answers).filter((a, i) => a.toLowerCase().trim() === gaps[i].word.toLowerCase()).length}/{gaps.length} corretas
          </Badge>
          <Button size="sm" variant="ghost" onClick={reset}>
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
}

// Mini-exercício de Drag & Drop
function DragDropDemo() {
  const [placed, setPlaced] = useState<Record<number, string>>({});
  const [available, setAvailable] = useState(['èbó', 'gratidão', 'Ifá']);
  const [showResult, setShowResult] = useState(false);

  const handlePlace = (word: string, slot: number) => {
    setPlaced(prev => ({ ...prev, [slot]: word }));
    setAvailable(prev => prev.filter(w => w !== word));
  };

  const reset = () => {
    setPlaced({});
    setAvailable(['èbó', 'gratidão', 'Ifá']);
    setShowResult(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-center min-h-[40px]">
        {available.map(word => (
          <Badge 
            key={word}
            variant="secondary"
            className="cursor-grab active:cursor-grabbing px-3 py-1.5 hover:bg-primary/20"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('word', word)}
          >
            {word}
          </Badge>
        ))}
      </div>

      <div className="bg-secondary/50 rounded-lg p-4 text-sm leading-relaxed">
        <p>
          A vida longa se firma com{' '}
          <span 
            className={`inline-block min-w-[50px] px-2 py-0.5 border-2 border-dashed rounded text-center ${placed[0] ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handlePlace(e.dataTransfer.getData('word'), 0)}
            onClick={() => !placed[0] && available[0] && handlePlace(available[0], 0)}
          >
            {placed[0] || '___'}
          </span>
          {', disciplina e '}
          <span 
            className={`inline-block min-w-[60px] px-2 py-0.5 border-2 border-dashed rounded text-center ${placed[1] ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handlePlace(e.dataTransfer.getData('word'), 1)}
            onClick={() => !placed[1] && available[0] && handlePlace(available[0], 1)}
          >
            {placed[1] || '___'}
          </span>
          {' '}constante a{' '}
          <span 
            className={`inline-block min-w-[40px] px-2 py-0.5 border-2 border-dashed rounded text-center ${placed[2] ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handlePlace(e.dataTransfer.getData('word'), 2)}
            onClick={() => !placed[2] && available[0] && handlePlace(available[0], 2)}
          >
            {placed[2] || '___'}
          </span>
          .
        </p>
      </div>

      {Object.keys(placed).length === 3 && !showResult && (
        <Button size="sm" className="w-full" onClick={() => setShowResult(true)}>
          Verificar
        </Button>
      )}

      {showResult && (
        <div className="text-center space-y-2">
          <Badge className="bg-green-500/20 text-green-500">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Exercício completo!
          </Badge>
          <Button size="sm" variant="ghost" onClick={reset}>
            Refazer
          </Button>
        </div>
      )}
    </div>
  );
}

// Mini-exercício de ordenação
function OrderDemo() {
  const [sentences, setSentences] = useState([
    { id: 2, text: 'E gratidão constante a Ifá.' },
    { id: 0, text: 'A vida longa e a paz interior' },
    { id: 1, text: 'se firmam com èbó e disciplina' },
  ]);
  const [showResult, setShowResult] = useState(false);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newSentences = [...sentences];
    [newSentences[index - 1], newSentences[index]] = [newSentences[index], newSentences[index - 1]];
    setSentences(newSentences);
  };

  const moveDown = (index: number) => {
    if (index === sentences.length - 1) return;
    const newSentences = [...sentences];
    [newSentences[index], newSentences[index + 1]] = [newSentences[index + 1], newSentences[index]];
    setSentences(newSentences);
  };

  const isCorrect = sentences.every((s, i) => s.id === i);

  const reset = () => {
    setSentences([
      { id: 2, text: 'E gratidão constante a Ifá.' },
      { id: 0, text: 'A vida longa e a paz interior' },
      { id: 1, text: 'se firmam com èbó e disciplina' },
    ]);
    setShowResult(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">Ordene as frases corretamente:</p>
      
      <div className="space-y-2">
        {sentences.map((sentence, index) => (
          <div 
            key={sentence.id}
            className={`flex items-center gap-2 p-3 rounded-lg border ${
              showResult 
                ? sentence.id === index 
                  ? 'border-green-500 bg-green-500/10' 
                  : 'border-red-500 bg-red-500/10'
                : 'border-border bg-secondary/50'
            }`}
          >
            <Badge variant="outline" className="shrink-0">{index + 1}</Badge>
            <p className="flex-1 text-sm">{sentence.text}</p>
            {!showResult && (
              <div className="flex flex-col gap-0.5">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveUp(index)}>
                  <ChevronLeft className="h-4 w-4 rotate-90" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveDown(index)}>
                  <ChevronRight className="h-4 w-4 rotate-90" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {!showResult ? (
        <Button size="sm" className="w-full" onClick={() => setShowResult(true)}>
          Verificar Ordem
        </Button>
      ) : (
        <div className="text-center space-y-2">
          {isCorrect ? (
            <Badge className="bg-green-500/20 text-green-500">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Ordem correta! +40 XP
            </Badge>
          ) : (
            <Badge className="bg-red-500/20 text-red-500">
              <X className="w-4 h-4 mr-1" />
              Algumas frases estão fora de ordem
            </Badge>
          )}
          <Button size="sm" variant="ghost" onClick={reset}>
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
}

// Mini-exercício de áudio
function AudioDemo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const words = DEMO_ODU.versoResumido.split(' ');

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    setProgress(0);
    setHighlightIndex(0);

    // Simular progresso
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsPlaying(false);
          setHighlightIndex(-1);
          return 0;
        }
        return prev + 2;
      });
      setHighlightIndex(prev => (prev + 1) % words.length);
    }, 300);
  };

  return (
    <div className="space-y-4">
      <div className="bg-secondary/50 rounded-lg p-4">
        <p className="text-sm leading-relaxed">
          {words.map((word, i) => (
            <span 
              key={i}
              className={`transition-colors ${highlightIndex === i ? 'bg-primary/30 text-primary font-medium rounded px-0.5' : ''}`}
            >
              {word}{' '}
            </span>
          ))}
        </p>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="flex items-center justify-center gap-4">
        <Button size="sm" variant="outline" onClick={togglePlay}>
          {isPlaying ? 'Pausar' : 'Reproduzir'}
          <Volume2 className="w-4 h-4 ml-2" />
        </Button>
        <Badge variant="secondary">1.0x</Badge>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Acompanhe o texto enquanto ouve a pronúncia correta
      </p>
    </div>
  );
}

// Prévia do conteúdo completo
function ContentPreview() {
  const navigate = useNavigate();

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">Prévia do Conteúdo Completo</h3>
        </div>
        
        {/* Narrativa preview */}
        <div className="relative">
          <p className="text-sm text-muted-foreground leading-relaxed italic">
            "{DEMO_ODU.narrativaPreview}"
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent" />
        </div>

        {/* Indicadores de profundidade */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <ScrollText className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{DEMO_ODU.palavrasCompletas}</p>
            <p className="text-xs text-muted-foreground">palavras</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <Sparkles className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{DEMO_ODU.ensinamentos}</p>
            <p className="text-xs text-muted-foreground">ensinamentos</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">3</p>
            <p className="text-xs text-muted-foreground">personagens</p>
          </div>
        </div>

        {/* Badge de quantidade total */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <Badge className="bg-primary/20 text-primary">
            <Lock className="w-3 h-3 mr-1" />
            256 Odus completos disponíveis
          </Badge>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Cada Odu contém histórias ancestrais, significados profundos e orientações práticas para a vida
        </p>

        <Button 
          variant="outline" 
          className="w-full border-primary/30 hover:bg-primary/10"
          onClick={() => navigate('/auth')}
        >
          Ver conteúdo completo
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Demonstracao() {
  const navigate = useNavigate();
  const [activeExercise, setActiveExercise] = useState(0);

  const renderExercise = () => {
    switch (EXERCISES[activeExercise].id) {
      case 'flashcard': return <FlashcardDemo />;
      case 'quiz': return <QuizDemo />;
      case 'cloze': return <ClozeDemo />;
      case 'dragdrop': return <DragDropDemo />;
      case 'order': return <OrderDemo />;
      case 'audio': return <AudioDemo />;
      default: return null;
    }
  };

  const exercise = EXERCISES[activeExercise];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 pb-16">
        {/* Hero */}
        <section className="container mx-auto px-4 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 max-w-3xl mx-auto"
          >
            <Badge className="bg-primary/20 text-primary">
              <Sparkles className="w-3 h-3 mr-1" />
              Demonstração Interativa
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold">
              Experimente Nossas <span className="text-primary">Técnicas de Memorização</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Teste cada exercício com o Odu <strong>Ejiogbe</strong> e descubra como é fácil memorizar os 256 Odu de Ifá
            </p>
          </motion.div>
        </section>

        {/* Exercise Selector */}
        <section className="container mx-auto px-4 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {EXERCISES.map((ex, index) => (
              <Card 
                key={ex.id}
                className={`cursor-pointer transition-all hover:scale-105 ${
                  activeExercise === index 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'hover:bg-secondary/50'
                }`}
                onClick={() => setActiveExercise(index)}
              >
                <CardContent className="p-4 text-center">
                  <div className={`w-10 h-10 mx-auto mb-2 rounded-lg bg-gradient-to-br ${ex.color} flex items-center justify-center`}>
                    <ex.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-medium text-sm">{ex.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Active Exercise */}
        <section className="container mx-auto px-4 pb-12">
          <Card className="max-w-xl mx-auto overflow-hidden">
            <div className={`h-2 bg-gradient-to-r ${exercise.color}`} />
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${exercise.color} flex items-center justify-center`}>
                  <exercise.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{exercise.name}</h2>
                  <p className="text-sm text-muted-foreground">{exercise.description}</p>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeExercise}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderExercise()}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-center gap-4 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setActiveExercise(prev => Math.max(0, prev - 1))}
              disabled={activeExercise === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setActiveExercise(prev => Math.min(EXERCISES.length - 1, prev + 1))}
              disabled={activeExercise === EXERCISES.length - 1}
            >
              Próximo
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </section>

        {/* Content Preview Section */}
        <section className="container mx-auto px-4 pb-12">
          <div className="max-w-xl mx-auto">
            <ContentPreview />
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-12">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 max-w-2xl mx-auto">
            <CardContent className="p-8 text-center space-y-4">
              <h2 className="text-2xl font-bold">Pronto para começar?</h2>
              <p className="text-muted-foreground">
                Essas são apenas algumas das técnicas disponíveis. Com nossa plataforma completa,
                você terá acesso a todos os 256 Odu de Ifá com repetição espaçada personalizada.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button variant="hero" size="lg" onClick={() => navigate('/auth')}>
                  <Play className="w-4 h-4 mr-2" />
                  Começar Agora
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate('/#pricing')}>
                  Ver Planos
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
}
