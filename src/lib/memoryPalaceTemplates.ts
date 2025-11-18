export interface PalaceTemplate {
  id: string;
  nome: string;
  descricao: string;
  icon: string;
  salas: {
    [key: number]: {
      nome: string;
      descricao: string;
      posicoes: {
        [key: number]: {
          nome: string;
          dica: string;
        };
      };
    };
  };
}

export const PALACE_TEMPLATES: Record<string, PalaceTemplate> = {
  casa: {
    id: "casa",
    nome: "Casa",
    descricao: "Use os cômodos da sua casa para organizar os Odus",
    icon: "🏠",
    salas: {
      1: {
        nome: "Sala de Estar",
        descricao: "O coração da casa onde todos se reúnem",
        posicoes: {
          1: { nome: "Sofá Principal", dica: "Imagine o Odu sentado no sofá" },
          2: { nome: "Mesa de Centro", dica: "O Odu está sobre a mesa" },
          3: { nome: "Estante de Livros", dica: "O Odu está entre os livros" },
          4: { nome: "TV", dica: "O Odu aparece na tela" },
          5: { nome: "Poltrona", dica: "O Odu descansa na poltrona" },
          6: { nome: "Luminária", dica: "O Odu brilha como a luz" },
          7: { nome: "Quadro na Parede", dica: "O Odu está pintado no quadro" },
          8: { nome: "Tapete", dica: "O Odu está desenhado no tapete" },
          9: { nome: "Janela", dica: "O Odu olha pela janela" },
          10: { nome: "Cortina", dica: "O Odu se esconde atrás da cortina" },
          11: { nome: "Vaso de Planta", dica: "O Odu cresce como planta" },
          12: { nome: "Aparador", dica: "O Odu está sobre o aparador" },
          13: { nome: "Revista", dica: "O Odu está na capa da revista" },
          14: { nome: "Controle Remoto", dica: "O Odu controla tudo" },
          15: { nome: "Almofada", dica: "O Odu está bordado na almofada" },
          16: { nome: "Porta de Entrada", dica: "O Odu está na porta" }
        }
      },
      2: {
        nome: "Cozinha",
        descricao: "Onde os sabores e aromas se misturam",
        posicoes: {
          1: { nome: "Fogão", dica: "O Odu cozinha no fogão" },
          2: { nome: "Geladeira", dica: "O Odu está congelado dentro" },
          3: { nome: "Pia", dica: "O Odu nada na água" },
          4: { nome: "Mesa de Jantar", dica: "O Odu é servido na mesa" },
          5: { nome: "Cadeiras", dica: "O Odu senta em cada cadeira" },
          6: { nome: "Armário Superior", dica: "O Odu está guardado lá em cima" },
          7: { nome: "Gaveta de Talheres", dica: "O Odu está entre os garfos" },
          8: { nome: "Micro-ondas", dica: "O Odu gira dentro" },
          9: { nome: "Cafeteira", dica: "O Odu é o café" },
          10: { nome: "Fruteira", dica: "O Odu está entre as frutas" },
          11: { nome: "Toalha de Mesa", dica: "O Odu está estampado" },
          12: { nome: "Janela da Cozinha", dica: "O Odu observa pelo vidro" },
          13: { nome: "Lixeira", dica: "O Odu está ao lado" },
          14: { nome: "Pano de Prato", dica: "O Odu seca os pratos" },
          15: { nome: "Temperos", dica: "O Odu está no pote" },
          16: { nome: "Quadro de Recados", dica: "O Odu deixa um recado" }
        }
      },
      3: {
        nome: "Quarto",
        descricao: "O santuário do descanso",
        posicoes: {
          1: { nome: "Cama", dica: "O Odu dorme na cama" },
          2: { nome: "Travesseiro", dica: "O Odu sonha no travesseiro" },
          3: { nome: "Criado-Mudo", dica: "O Odu está ao lado" },
          4: { nome: "Guarda-Roupa", dica: "O Odu se veste no armário" },
          5: { nome: "Espelho", dica: "O Odu se reflete" },
          6: { nome: "Penteadeira", dica: "O Odu se arruma" },
          7: { nome: "Abajur", dica: "O Odu ilumina a noite" },
          8: { nome: "Cortina do Quarto", dica: "O Odu protege da luz" },
          9: { nome: "Colcha", dica: "O Odu está bordado" },
          10: { nome: "Livro na Cabeceira", dica: "O Odu é a história" },
          11: { nome: "Despertador", dica: "O Odu te acorda" },
          12: { nome: "Porta do Armário", dica: "O Odu está na porta" },
          13: { nome: "Tapete ao Pé da Cama", dica: "O Odu está no chão" },
          14: { nome: "Quadro no Quarto", dica: "O Odu está na arte" },
          15: { nome: "Cabide", dica: "O Odu está pendurado" },
          16: { nome: "Porta do Quarto", dica: "O Odu guarda a entrada" }
        }
      },
      4: {
        nome: "Banheiro",
        descricao: "O espaço de renovação",
        posicoes: {
          1: { nome: "Chuveiro", dica: "O Odu cai com a água" },
          2: { nome: "Vaso Sanitário", dica: "O Odu está na tampa" },
          3: { nome: "Pia do Banheiro", dica: "O Odu está no espelho" },
          4: { nome: "Espelho Grande", dica: "O Odu te observa" },
          5: { nome: "Toalha", dica: "O Odu te seca" },
          6: { nome: "Shampoo", dica: "O Odu está no frasco" },
          7: { nome: "Sabonete", dica: "O Odu faz espuma" },
          8: { nome: "Escova de Dente", dica: "O Odu escova" },
          9: { nome: "Armário do Banheiro", dica: "O Odu está guardado" },
          10: { nome: "Box", dica: "O Odu está no vidro" },
          11: { nome: "Ralo", dica: "O Odu escoa" },
          12: { nome: "Lixeira do Banheiro", dica: "O Odu está ao lado" },
          13: { nome: "Tapete do Banheiro", dica: "O Odu está embaixo" },
          14: { nome: "Saboneteira", dica: "O Odu segura o sabonete" },
          15: { nome: "Gancho de Toalha", dica: "O Odu está pendurado" },
          16: { nome: "Porta do Banheiro", dica: "O Odu fecha a porta" }
        }
      }
    }
  },
  rua: {
    id: "rua",
    nome: "Rua",
    descricao: "Use o caminho que você percorre diariamente",
    icon: "🛣️",
    salas: {
      1: {
        nome: "Início da Rua",
        descricao: "O começo do seu caminho diário",
        posicoes: {
          1: { nome: "Portão de Casa", dica: "O Odu abre o portão" },
          2: { nome: "Calçada", dica: "O Odu caminha na calçada" },
          3: { nome: "Árvore Grande", dica: "O Odu está na sombra" },
          4: { nome: "Poste de Luz", dica: "O Odu ilumina" },
          5: { nome: "Placa de Rua", dica: "O Odu está escrito" },
          6: { nome: "Carro Estacionado", dica: "O Odu está no carro" },
          7: { nome: "Hidrante", dica: "O Odu é vermelho" },
          8: { nome: "Lixeira Pública", dica: "O Odu está ao lado" },
          9: { nome: "Banco da Praça", dica: "O Odu descansa" },
          10: { nome: "Banca de Jornal", dica: "O Odu é notícia" },
          11: { nome: "Ponto de Ônibus", dica: "O Odu espera" },
          12: { nome: "Semáforo", dica: "O Odu controla o trânsito" },
          13: { nome: "Faixa de Pedestre", dica: "O Odu atravessa" },
          14: { nome: "Bueiro", dica: "O Odu está no chão" },
          15: { nome: "Muro com Grafite", dica: "O Odu é arte" },
          16: { nome: "Portão Vizinho", dica: "O Odu visita" }
        }
      },
      2: {
        nome: "Comércio Local",
        descricao: "As lojas e serviços da região",
        posicoes: {
          1: { nome: "Padaria", dica: "O Odu é o pão fresco" },
          2: { nome: "Farmácia", dica: "O Odu cura" },
          3: { nome: "Mercadinho", dica: "O Odu está no carrinho" },
          4: { nome: "Barbearia", dica: "O Odu corta cabelo" },
          5: { nome: "Lanchonete", dica: "O Odu é o lanche" },
          6: { nome: "Lotérica", dica: "O Odu é a sorte" },
          7: { nome: "Caixa Eletrônico", dica: "O Odu é dinheiro" },
          8: { nome: "Vitrine da Loja", dica: "O Odu está exposto" },
          9: { nome: "Entrada do Mercado", dica: "O Odu te recebe" },
          10: { nome: "Carrinho de Hot Dog", dica: "O Odu é o vendedor" },
          11: { nome: "Floricultura", dica: "O Odu é uma flor" },
          12: { nome: "Pet Shop", dica: "O Odu brinca com os pets" },
          13: { nome: "Academia", dica: "O Odu malha" },
          14: { nome: "Açougue", dica: "O Odu está no balcão" },
          15: { nome: "Sapataria", dica: "O Odu é um sapato" },
          16: { nome: "Correios", dica: "O Odu é uma carta" }
        }
      },
      3: {
        nome: "Praça e Parque",
        descricao: "O espaço verde do bairro",
        posicoes: {
          1: { nome: "Fonte de Água", dica: "O Odu jorra água" },
          2: { nome: "Playground", dica: "O Odu brinca" },
          3: { nome: "Balanço", dica: "O Odu balança" },
          4: { nome: "Escorregador", dica: "O Odu escorrega" },
          5: { nome: "Gangorra", dica: "O Odu sobe e desce" },
          6: { nome: "Quadra Esportiva", dica: "O Odu joga bola" },
          7: { nome: "Pista de Caminhada", dica: "O Odu corre" },
          8: { nome: "Academia ao Ar Livre", dica: "O Odu se exercita" },
          9: { nome: "Coreto", dica: "O Odu toca música" },
          10: { nome: "Lago com Patos", dica: "O Odu nada" },
          11: { nome: "Gramado", dica: "O Odu rola na grama" },
          12: { nome: "Cerca Viva", dica: "O Odu se esconde" },
          13: { nome: "Canteiro de Flores", dica: "O Odu floresce" },
          14: { nome: "Estátua", dica: "O Odu é a estátua" },
          15: { nome: "Chafariz", dica: "O Odu faz barulho de água" },
          16: { nome: "Lixeira de Reciclagem", dica: "O Odu recicla" }
        }
      },
      4: {
        nome: "Final da Rua",
        descricao: "O destino do seu percurso",
        posicoes: {
          1: { nome: "Esquina Principal", dica: "O Odu vira a esquina" },
          2: { nome: "Igreja", dica: "O Odu reza" },
          3: { nome: "Escola", dica: "O Odu ensina" },
          4: { nome: "Posto de Gasolina", dica: "O Odu abastece" },
          5: { nome: "Estação de Metrô", dica: "O Odu pega o trem" },
          6: { nome: "Terminal de Ônibus", dica: "O Odu viaja" },
          7: { nome: "Shopping Center", dica: "O Odu faz compras" },
          8: { nome: "Hospital", dica: "O Odu cuida" },
          9: { nome: "Delegacia", dica: "O Odu protege" },
          10: { nome: "Biblioteca", dica: "O Odu lê" },
          11: { nome: "Cinema", dica: "O Odu assiste" },
          12: { nome: "Restaurante", dica: "O Odu come" },
          13: { nome: "Banco", dica: "O Odu guarda dinheiro" },
          14: { nome: "Cartório", dica: "O Odu registra" },
          15: { nome: "Parque de Diversões", dica: "O Odu se diverte" },
          16: { nome: "Rodovia", dica: "O Odu segue viagem" }
        }
      }
    }
  },
  escola: {
    id: "escola",
    nome: "Escola",
    descricao: "Use os ambientes da escola para memorizar",
    icon: "🎓",
    salas: {
      1: {
        nome: "Sala de Aula",
        descricao: "O espaço principal de aprendizado",
        posicoes: {
          1: { nome: "Lousa", dica: "O Odu está escrito na lousa" },
          2: { nome: "Mesa do Professor", dica: "O Odu é o professor" },
          3: { nome: "Primeira Carteira", dica: "O Odu senta na frente" },
          4: { nome: "Carteira do Meio", dica: "O Odu está no centro" },
          5: { nome: "Última Carteira", dica: "O Odu está no fundo" },
          6: { nome: "Mochila", dica: "O Odu está na mochila" },
          7: { nome: "Caderno", dica: "O Odu está anotado" },
          8: { nome: "Livro Didático", dica: "O Odu é a lição" },
          9: { nome: "Lápis", dica: "O Odu escreve" },
          10: { nome: "Borracha", dica: "O Odu apaga" },
          11: { nome: "Régua", dica: "O Odu mede" },
          12: { nome: "Globo Terrestre", dica: "O Odu é um continente" },
          13: { nome: "Relógio da Parede", dica: "O Odu marca o tempo" },
          14: { nome: "Lixeira da Sala", dica: "O Odu está ao lado" },
          15: { nome: "Ventilador", dica: "O Odu ventila" },
          16: { nome: "Porta da Sala", dica: "O Odu guarda a entrada" }
        }
      },
      2: {
        nome: "Biblioteca",
        descricao: "O templo do conhecimento",
        posicoes: {
          1: { nome: "Balcão de Empréstimo", dica: "O Odu empresta livros" },
          2: { nome: "Primeira Estante", dica: "O Odu é um livro" },
          3: { nome: "Seção de História", dica: "O Odu conta histórias" },
          4: { nome: "Seção de Ciências", dica: "O Odu experimenta" },
          5: { nome: "Mesa de Leitura", dica: "O Odu lê concentrado" },
          6: { nome: "Cadeira Confortável", dica: "O Odu descansa lendo" },
          7: { nome: "Computador", dica: "O Odu pesquisa" },
          8: { nome: "Enciclopédia", dica: "O Odu é todo o saber" },
          9: { nome: "Jornal do Dia", dica: "O Odu é notícia" },
          10: { nome: "Revista", dica: "O Odu está na capa" },
          11: { nome: "Dicionário", dica: "O Odu é uma palavra" },
          12: { nome: "Atlas", dica: "O Odu é um mapa" },
          13: { nome: "Fichário", dica: "O Odu está catalogado" },
          14: { nome: "Marcador de Livro", dica: "O Odu marca a página" },
          15: { nome: "Luminária de Mesa", dica: "O Odu ilumina a leitura" },
          16: { nome: "Placa de Silêncio", dica: "O Odu pede silêncio" }
        }
      },
      3: {
        nome: "Pátio",
        descricao: "O espaço de convivência",
        posicoes: {
          1: { nome: "Quadra de Esportes", dica: "O Odu joga" },
          2: { nome: "Trave do Gol", dica: "O Odu defende" },
          3: { nome: "Cesta de Basquete", dica: "O Odu faz cesta" },
          4: { nome: "Linha do Meio", dica: "O Odu divide o campo" },
          5: { nome: "Arquibancada", dica: "O Odu assiste" },
          6: { nome: "Bebedouro", dica: "O Odu mata a sede" },
          7: { nome: "Cantina", dica: "O Odu come" },
          8: { nome: "Fila da Cantina", dica: "O Odu espera" },
          9: { nome: "Mesa do Lanche", dica: "O Odu lancha" },
          10: { nome: "Lixeira do Pátio", dica: "O Odu descarta" },
          11: { nome: "Árvore Grande", dica: "O Odu faz sombra" },
          12: { nome: "Banco Embaixo da Árvore", dica: "O Odu conversa" },
          13: { nome: "Muro do Pátio", dica: "O Odu está no muro" },
          14: { nome: "Portão de Entrada", dica: "O Odu chega" },
          15: { nome: "Sino da Escola", dica: "O Odu toca" },
          16: { nome: "Bandeira do Brasil", dica: "O Odu tremula" }
        }
      },
      4: {
        nome: "Laboratório",
        descricao: "O espaço de experimentos",
        posicoes: {
          1: { nome: "Bancada de Experimentos", dica: "O Odu experimenta" },
          2: { nome: "Microscópio", dica: "O Odu aumenta" },
          3: { nome: "Tubo de Ensaio", dica: "O Odu reage" },
          4: { nome: "Bico de Bunsen", dica: "O Odu queima" },
          5: { nome: "Béquer", dica: "O Odu mistura" },
          6: { nome: "Balança de Precisão", dica: "O Odu pesa" },
          7: { nome: "Reagentes", dica: "O Odu é químico" },
          8: { nome: "Luvas de Proteção", dica: "O Odu protege" },
          9: { nome: "Óculos de Segurança", dica: "O Odu enxerga seguro" },
          10: { nome: "Jaleco", dica: "O Odu veste branco" },
          11: { nome: "Tabela Periódica", dica: "O Odu é um elemento" },
          12: { nome: "Esqueleto Humano", dica: "O Odu é osso" },
          13: { nome: "Modelo do DNA", dica: "O Odu é genético" },
          14: { nome: "Lâmina para Microscópio", dica: "O Odu está na lâmina" },
          15: { nome: "Extintor", dica: "O Odu apaga fogo" },
          16: { nome: "Armário de Vidraria", dica: "O Odu está guardado" }
        }
      }
    }
  },
  trabalho: {
    id: "trabalho",
    nome: "Trabalho",
    descricao: "Use seu ambiente profissional",
    icon: "💼",
    salas: {
      1: {
        nome: "Recepção",
        descricao: "A entrada da empresa",
        posicoes: {
          1: { nome: "Balcão de Atendimento", dica: "O Odu recebe" },
          2: { nome: "Recepcionista", dica: "O Odu atende" },
          3: { nome: "Sofá de Espera", dica: "O Odu aguarda" },
          4: { nome: "Revistas", dica: "O Odu está na capa" },
          5: { nome: "TV da Recepção", dica: "O Odu aparece na tela" },
          6: { nome: "Logo da Empresa", dica: "O Odu é o logo" },
          7: { nome: "Placa de Boas-Vindas", dica: "O Odu te recebe" },
          8: { nome: "Relógio de Ponto", dica: "O Odu marca entrada" },
          9: { nome: "Catraca", dica: "O Odu libera passagem" },
          10: { nome: "Elevador", dica: "O Odu sobe" },
          11: { nome: "Escada", dica: "O Odu desce" },
          12: { nome: "Planta Decorativa", dica: "O Odu é verde" },
          13: { nome: "Quadro de Avisos", dica: "O Odu avisa" },
          14: { nome: "Extintor da Entrada", dica: "O Odu protege" },
          15: { nome: "Câmera de Segurança", dica: "O Odu vigia" },
          16: { nome: "Porta Giratória", dica: "O Odu gira" }
        }
      },
      2: {
        nome: "Escritório",
        descricao: "O ambiente de trabalho",
        posicoes: {
          1: { nome: "Sua Mesa", dica: "O Odu é seu colega" },
          2: { nome: "Computador", dica: "O Odu está na tela" },
          3: { nome: "Teclado", dica: "O Odu digita" },
          4: { nome: "Mouse", dica: "O Odu clica" },
          5: { nome: "Telefone", dica: "O Odu liga" },
          6: { nome: "Cadeira Giratória", dica: "O Odu gira" },
          7: { nome: "Gaveta da Mesa", dica: "O Odu está guardado" },
          8: { nome: "Porta-Canetas", dica: "O Odu escreve" },
          9: { nome: "Agenda", dica: "O Odu agenda" },
          10: { nome: "Calendário", dica: "O Odu marca a data" },
          11: { nome: "Porta-Retratos", dica: "O Odu está na foto" },
          12: { nome: "Cafezinho", dica: "O Odu é café" },
          13: { nome: "Arquivo", dica: "O Odu está arquivado" },
          14: { nome: "Impressora", dica: "O Odu imprime" },
          15: { nome: "Ar Condicionado", dica: "O Odu refresca" },
          16: { nome: "Janela do Escritório", dica: "O Odu olha pra fora" }
        }
      },
      3: {
        nome: "Sala de Reunião",
        descricao: "Onde as decisões são tomadas",
        posicoes: {
          1: { nome: "Mesa de Reunião", dica: "O Odu preside" },
          2: { nome: "Cadeira do Chefe", dica: "O Odu comanda" },
          3: { nome: "Projetor", dica: "O Odu projeta" },
          4: { nome: "Tela de Projeção", dica: "O Odu é apresentado" },
          5: { nome: "Flip Chart", dica: "O Odu está desenhado" },
          6: { nome: "Pincel para Quadro", dica: "O Odu escreve ideias" },
          7: { nome: "Água e Copos", dica: "O Odu hidrata" },
          8: { nome: "Bloco de Notas", dica: "O Odu está anotado" },
          9: { nome: "Controle do Projetor", dica: "O Odu controla" },
          10: { nome: "Telefone de Conferência", dica: "O Odu fala" },
          11: { nome: "Relógio de Parede", dica: "O Odu marca o tempo" },
          12: { nome: "Quadro de Vidro", dica: "O Odu está no quadro" },
          13: { nome: "Porta da Sala", dica: "O Odu entra" },
          14: { nome: "Placa 'Em Reunião'", dica: "O Odu avisa" },
          15: { nome: "Cortina Blackout", dica: "O Odu escurece" },
          16: { nome: "Lixeira da Sala", dica: "O Odu descarta ideias ruins" }
        }
      },
      4: {
        nome: "Área Comum",
        descricao: "O espaço de descontração",
        posicoes: {
          1: { nome: "Copa/Cozinha", dica: "O Odu prepara café" },
          2: { nome: "Geladeira", dica: "O Odu está gelado" },
          3: { nome: "Micro-ondas", dica: "O Odu esquenta" },
          4: { nome: "Máquina de Café", dica: "O Odu é café fresco" },
          5: { nome: "Mesa de Almoço", dica: "O Odu almoça" },
          6: { nome: "Sofá de Descanso", dica: "O Odu relaxa" },
          7: { nome: "TV de Descanso", dica: "O Odu assiste" },
          8: { nome: "Videogame", dica: "O Odu joga" },
          9: { nome: "Mesa de Sinuca", dica: "O Odu joga sinuca" },
          10: { nome: "Pebolim", dica: "O Odu é o goleiro" },
          11: { nome: "Estante de Livros", dica: "O Odu é leitura" },
          12: { nome: "Puff", dica: "O Odu está confortável" },
          13: { nome: "Banheiro", dica: "O Odu lava as mãos" },
          14: { nome: "Armário de Itens Pessoais", dica: "O Odu está guardado" },
          15: { nome: "Quadro de Fotos da Equipe", dica: "O Odu está na foto" },
          16: { nome: "Saída de Emergência", dica: "O Odu escapa rápido" }
        }
      }
    }
  }
};

export const getTemplateById = (id: string): PalaceTemplate | undefined => {
  return PALACE_TEMPLATES[id];
};

export const getAllTemplates = (): PalaceTemplate[] => {
  return Object.values(PALACE_TEMPLATES);
};
