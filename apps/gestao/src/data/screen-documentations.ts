export type ScreenCategory =
  | "operacoes"
  | "cardapio"
  | "financeiro"
  | "marketing"
  | "configuracoes";

export interface ScreenFeatureItem {
  name: string;
  badge?: string;
  description: string;
  action?: string;
}

export interface ScreenHowToStep {
  title: string;
  description: string;
  expectedResult?: string;
}

export interface ScreenFaqItem {
  question: string;
  answer: string;
}

export interface ScreenDocumentation {
  id: string;
  route: string;
  title: string;
  category: ScreenCategory;
  categoryLabel: string;
  badge: string;
  iconName: string;
  summary: string;
  features: ScreenFeatureItem[];
  howToUse: ScreenHowToStep[];
  proTips: string[];
  faq?: ScreenFaqItem[];
  relatedRoutes?: { label: string; href: string }[];
}

export const CATEGORY_LABELS: Record<ScreenCategory, string> = {
  operacoes: "Operações",
  cardapio: "Cardápio e Estoque",
  financeiro: "Financeiro e Métricas",
  marketing: "Marketing e Clientes",
  configuracoes: "Configurações e Integrações",
};

export const SCREEN_DOCUMENTATIONS: ScreenDocumentation[] = [
  // ==========================================
  // OPERAÇÕES
  // ==========================================
  {
    id: "pedidos",
    route: "/pedidos",
    title: "Gestão de Pedidos em Tempo Real",
    category: "operacoes",
    categoryLabel: "Operações",
    badge: "Tempo Real",
    iconName: "ClipboardListIcon",
    summary:
      "Central operacional de recebimento, produção e despacho de pedidos. Conecta balcão, delivery, autoatendimento e marketplaces em um único fluxo ágil com alertas sonoros e impressão automática.",
    features: [
      {
        name: "Quadro Kanban & Visão em Lista",
        badge: "Visualização",
        description:
          "Permite alternar entre colunas de status (Pendente, Em Preparo, Pronto, Em Rota, Concluído) ou lista compacta para visualizar dezenas de pedidos simultaneamente.",
        action: "Alterne no interruptor 'Kanban / Lista' no topo da tela.",
      },
      {
        name: "Alertas Sonoros Automáticos",
        badge: "Som",
        description:
          "Sino sonoro em tempo real via WebSocket para qualquer novo pedido que chegue de clientes no cardápio online, iFood ou WhatsApp.",
        action: "Ative ou silencie o ícone de alto-falante na barra superior.",
      },
      {
        name: "Auto-Impressão Térmica de Cupons",
        badge: "Automação",
        description:
          "Imprime automaticamente a via da cozinha (produção) e a via do motoboy/cliente assim que o pedido é aprovado, sem intervenção manual.",
        action: "Selecione 'Auto-impressão' no menu superior e escolha entre 'Produção', 'Entrega' ou 'Ambas'.",
      },
      {
        name: "Emissão Fiscal Instantânea (NFC-e / ACBr)",
        badge: "Fiscal",
        description:
          "Transmissão direta da nota fiscal eletrônica de consumidor para a SEFAZ com geração automática da DANFE em PDF e QR Code fiscal.",
        action: "Clique nos três pontinhos do card do pedido e selecione 'Emitir NFC-e'.",
      },
      {
        name: "Despacho Direcionado para Motoboy",
        badge: "Logística",
        description:
          "Vincula o motoboy responsável pela entrega antes de o pedido sair, registrando o horário exato da saída para controle de tempo.",
        action: "Clique no botão 'Despachar' no card do pedido com status 'Pronto'.",
      },
      {
        name: "Filtros por Data e Busca Rápida",
        badge: "Filtros",
        description:
          "Encontre pedidos por número (#123), nome do cliente, telefone, rua ou filtre por Hoje, Ontem, Últimos 7 dias ou intervalo customizado.",
        action: "Digite no campo de busca ou clique nos botões rápidos de período.",
      },
    ],
    howToUse: [
      {
        title: "1. Recebimento e Aceite de Pedidos",
        description:
          "Quando um novo pedido chega, ele entra na coluna 'Pendente' com alerta sonoro. Abra o card para conferir os itens, endereço e observações. Clique no botão 'Avançar' para mover para 'Em Preparo'.",
        expectedResult: "O pedido vai para a cozinha e o KDS recebe o ticket de preparo.",
      },
      {
        title: "2. Finalização de Preparo e Despacho",
        description:
          "Ao terminar na cozinha, o pedido vai para 'Pronto'. Se for entrega (Delivery), clique em 'Despachar', selecione o motoboy na lista e confirme.",
        expectedResult: "O status muda para 'Em Rota' e o tempo de entrega começa a contar.",
      },
      {
        title: "3. Conclusão do Pedido",
        description:
          "Quando o motoboy retornar ou o cliente retirar o pedido no balcão, clique em 'Concluir'.",
        expectedResult: "O pedido é arquivado como finalizado e entra no relatório financeiro.",
      },
      {
        title: "4. Cancelamento ou Estorno",
        description:
          "Caso o cliente desista ou ocorra falta de produto, abra os detalhes do pedido e clique em 'Cancelar Pedido', informando a justificativa.",
        expectedResult: "O pedido é cancelado e eventuais créditos de cashback são revertidos.",
      },
    ],
    proTips: [
      "Deixe a aba de Pedidos sempre aberta em um monitor dedicado com o som ligado no balcão.",
      "Se sua impressora térmica suportar corte automático, a impressão dupla (cozinha + entrega) corta automaticamente entre os dois cupons.",
      "Use as teclas de atalho e a busca rápida pelo número do pedido para atender clientes que ligam no telefone em segundos.",
    ],
    faq: [
      {
        question: "O que fazer se a conexão com o servidor de pedidos cair?",
        answer:
          "O sistema possui reconexão automática e sincroniza todos os pedidos pendentes a cada 10 segundos em segundo plano caso o WebSocket oscile.",
      },
    ],
    relatedRoutes: [
      { label: "PDV (Frente de Caixa)", href: "/pdv" },
      { label: "Cozinha (KDS)", href: "/kds" },
      { label: "Despacho & Entregas", href: "/entregas" },
    ],
  },
  {
    id: "pdv",
    route: "/pdv",
    title: "PDV - Frente de Caixa Ágil",
    category: "operacoes",
    categoryLabel: "Operações",
    badge: "Frente de Caixa",
    iconName: "MonitorSmartphoneIcon",
    summary:
      "Terminal completo de vendas para atendimento presencial, balcão, telefone e salão. Suporta balança serial, pesagem automática, leitor de código de barras, montador de pizzas e múltiplas formas de pagamento.",
    features: [
      {
        name: "Turno e Gestão de Caixa",
        badge: "Segurança",
        description:
          "Controle de abertura de caixa com fundo de troco, registro de operadores, sangrias (retiradas), suprimentos (entradas) e fechamento cego de turno.",
        action: "Abra o turno no início do expediente informando o valor inicial em dinheiro.",
      },
      {
        name: "Catálogo Rápido e Atalhos de Teclado",
        badge: "Agilidade",
        description:
          "Localização instantânea de produtos por clique de categorias, digitação de nome, código interno ou código de barras.",
        action: "Pressione a barra de busca ou clique nas fotos dos produtos.",
      },
      {
        name: "Construtor de Pizzas e Fracionados",
        badge: "Pizzaria",
        description:
          "Seleção intuitiva de até 2 ou mais sabores de pizza, seleção de tipos de bordas recheadas e cálculo automático por maior valor ou média de preço.",
        action: "Clique em uma pizza do catálogo para abrir o assistente de montagem.",
      },
      {
        name: "Integração com Balanças Seriais",
        badge: "Hardware",
        description:
          "Captura automática do peso em tempo real com suporte aos protocolos Toledo, Filizola e Elgin via porta Serial USB/WebSerial.",
        action: "Coloque o produto na balança e o peso será preenchido no carrinho.",
      },
      {
        name: "Múltiplos Meios de Pagamento",
        badge: "Financeiro",
        description:
          "Dinheiro com cálculo automático de troco, Pix com QR Code dinâmico na tela, Cartão de Crédito/Débito, Vales (VR/VA) e Fiado (Caderneta de Clientes).",
        action: "Clique em 'Cobrar' para selecionar as formas de pagamento combinadas.",
      },
      {
        name: "Abertura Automática de Gaveta Elétrica",
        badge: "Automação",
        description:
          "Disparo de pulso elétrico HEX para impressora térmica abrir a gaveta de notas automaticamente nas vendas em dinheiro.",
        action: "Configurado na aba de periféricos da loja.",
      },
    ],
    howToUse: [
      {
        title: "1. Abertura do Turno",
        description:
          "Ao acessar o PDV com caixa fechado, informe o saldo inicial em dinheiro (ex: R$ 100,00) e clique em 'Abrir Caixa'.",
        expectedResult: "O terminal fica liberado para lançar vendas.",
      },
      {
        title: "2. Adicionar Itens na Venda",
        description:
          "Selecione os produtos desejados. Escolha complementos (ex: ponto da carne, queijo extra, bebidas) e selecione o tipo de consumo (Balcão, Entrega ou Mesa).",
        expectedResult: "Os itens são calculados com adicionais no carrinho à direita.",
      },
      {
        title: "3. Receber Pagamento e Finalizar",
        description:
          "Clique em 'Receber (F4)', selecione o meio de pagamento (ex: Pix ou Cartão) e clique em 'Confirmar Venda'.",
        expectedResult: "O cupom é impresso, a gaveta abre (se configurado) e a nota fiscal é emitida.",
      },
      {
        title: "4. Fechamento de Caixa",
        description:
          "No término do turno, clique no menu superior 'Fechar Turno', digite os valores contados fisicamente e confirme.",
        expectedResult: "O relatório de fechamento é impresso e arquivado no Financeiro.",
      },
    ],
    proTips: [
      "Use as setas do teclado e atalhos rápidos para atender filas no balcão sem tocar no mouse.",
      "Você pode associar o cliente digitando apenas os primeiros dígitos do telefone para buscar o histórico e pontuar cashback.",
    ],
    relatedRoutes: [
      { label: "Pedidos", href: "/pedidos" },
      { label: "Fechamentos de Caixa", href: "/financeiro/fechamentos" },
      { label: "Caderneta de Fiados", href: "/financeiro/fiados" },
    ],
  },
  {
    id: "comandas",
    route: "/comandas",
    title: "Gestão de Comandas do Salão",
    category: "operacoes",
    categoryLabel: "Operações",
    badge: "Salão",
    iconName: "UsersRoundIcon",
    summary:
      "Controle de contas individuais e comandas de consumo no salão, bar ou balcão. Permite abrir comandas numeradas, lançar rodadas sucessivas, dividir contas por pessoa e fechar comanda com 1 clique.",
    features: [
      {
        name: "Grade de Comandas Ativas",
        badge: "Visão Geral",
        description:
          "Painel visual mostrando todas as comandas abertas, número, nome do cliente ou mesa, horário de abertura e valor acumulado.",
        action: "Clique em qualquer comanda para ver o extrato detalhado.",
      },
      {
        name: "Lançamento Rápido de Itens",
        badge: "Atendimento",
        description:
          "Adicione bebidas, porções e pratos na comanda em segundos com envio automático para a impressora do bar ou cozinha.",
        action: "Selecione a comanda e clique em '+ Adicionar Produto'.",
      },
      {
        name: "Divisão Inteligente de Conta",
        badge: "Conveniência",
        description:
          "Calculadora integrada para dividir o valor total da comanda entre 2, 3 ou mais pagantes, já calculando taxa de serviço se configurado.",
        action: "Clique em 'Dividir Conta' dentro da comanda.",
      },
      {
        name: "Transferência para o PDV / Fechamento",
        badge: "Caixa",
        description:
          "Envia o saldo da comanda direto para a tela de pagamento do PDV para receber em cartão, dinheiro ou Pix.",
        action: "Clique em 'Fechar Comanda e Cobrar'.",
      },
    ],
    howToUse: [
      {
        title: "1. Abrindo Nova Comanda",
        description:
          "Clique em 'Nova Comanda', digite o número da comanda física ou cartão e o nome do cliente (opcional).",
        expectedResult: "A comanda é aberta com status ativo.",
      },
      {
        title: "2. Registrando Consumo",
        description:
          "Ao longo da permanência do cliente, lance cada pedido solicitado. É possível adicionar observações para a cozinha.",
        expectedResult: "O valor é somado na conta e os tickets de produção são impressos.",
      },
      {
        title: "3. Encerrando e Cobrando",
        description:
          "Quando o cliente pedir a conta, imprima a pré-conta e direcione para pagamento no caixa.",
        expectedResult: "A comanda é liberada e zerada para o próximo cliente.",
      },
    ],
    proTips: [
      "Garçons podem usar o celular no endereço `/garcom` para lançar direto nas comandas sem ir ao terminal fixo.",
    ],
    relatedRoutes: [
      { label: "Mesas do Salão", href: "/mesas" },
      { label: "Terminal Garçom", href: "/garcom" },
      { label: "PDV", href: "/pdv" },
    ],
  },
  {
    id: "mesas",
    route: "/mesas",
    title: "Salão e Mapa de Mesas",
    category: "operacoes",
    categoryLabel: "Operações",
    badge: "Salão",
    iconName: "LayoutGridIcon",
    summary:
      "Mapa visual do salão em tempo real. Acompanhe a ocupação de cada mesa, tempo de permanência dos clientes, valor consumido e emita pré-contas com extrema facilidade.",
    features: [
      {
        name: "Mapa Visual do Salão",
        badge: "Tempo Real",
        description:
          "Grade interativa com cards representando cada mesa cadastrada e status codificado por cores.",
        action: "Verde = Livre, Azul = Ocupada, Amarelo = Aguardando Conta, Roxo = Reservada.",
      },
      {
        name: "Cronômetro de Permanência",
        badge: "Giro de Mesas",
        description:
          "Exibe há quantos minutos a mesa está ocupada, ajudando na gestão do giro de salão em horários de pico.",
        action: "Visível diretamente no card da mesa.",
      },
      {
        name: "Emissão de Pré-Conta para Garçom",
        badge: "Impressão",
        description:
          "Imprime a conferência de mesa com todos os itens consumidos, subtotais e taxa de serviço sugerida para levar até o cliente.",
        action: "Clique na mesa ocupada e selecione 'Imprimir Pré-Conta'.",
      },
      {
        name: "Liberação de Mesa",
        badge: "Salão",
        description:
          "Após o cliente efetuar o pagamento e sair, libere a mesa para novos clientes com 1 clique.",
        action: "Clique em 'Liberar Mesa'.",
      },
    ],
    howToUse: [
      {
        title: "1. Abrir uma Mesa",
        description:
          "Clique em qualquer mesa verde (livre), informe a quantidade de clientes e o garçom responsável.",
        expectedResult: "A mesa muda para a cor azul (ocupada).",
      },
      {
        title: "2. Adicionar Itens à Mesa",
        description:
          "Clique na mesa azul para visualizar o extrato e lançar novos pratos, rodadas de bebidas ou sobremesas.",
        expectedResult: "Os itens são enviados para a cozinha e somados na conta da mesa.",
      },
      {
        title: "3. Solicitação de Conta e Liberação",
        description:
          "Quando o cliente pedir a conta, mude para 'Aguardando Conta' e imprima a pré-conferência. Ao pagar no PDV, libere a mesa.",
        expectedResult: "A mesa volta a ficar verde e disponível no mapa.",
      },
    ],
    proTips: [
      "Cadastre a numeração das mesas de acordo com a distribuição física do seu salão para facilitar para novos garçons.",
    ],
    relatedRoutes: [
      { label: "QR Codes das Mesas", href: "/mesas/qrcodes" },
      { label: "Comandas", href: "/comandas" },
      { label: "Terminal Garçom", href: "/garcom" },
    ],
  },
  {
    id: "mesas-qrcodes",
    route: "/mesas/qrcodes",
    title: "QR Codes de Autoatendimento nas Mesas",
    category: "operacoes",
    categoryLabel: "Operações",
    badge: "Autoatendimento",
    iconName: "QrCodeIcon",
    summary:
      "Gere, visualize e imprima displays de QR Code personalizados para cada mesa. Permite que os clientes façam pedidos diretamente do próprio smartphone sem esperar atendimento.",
    features: [
      {
        name: "QR Code Individual por Mesa",
        badge: "Cardápio na Mesa",
        description:
          "Cada mesa possui um link seguro exclusivo que já identifica o número da mesa quando o cliente escaneia com o celular.",
        action: "Exibe a prévia de cada mesa cadastrada no sistema.",
      },
      {
        name: "Impressão em Lote para Displays Acrílicos",
        badge: "Gráfica",
        description:
          "Gera uma folha de impressão diagramada pronta para corte e inserção em displays de mesa, totens ou adesivos.",
        action: "Clique em 'Imprimir Placas de Mesa'.",
      },
      {
        name: "Download de Arquivos em Alta Definição",
        badge: "Download",
        description:
          "Baixe o arquivo PNG em alta resolução de cada QR Code individual para enviar ao seu designer gráfico.",
        action: "Clique no botão 'Baixar PNG' abaixo do QR Code.",
      },
    ],
    howToUse: [
      {
        title: "1. Cadastro das Mesas",
        description:
          "Certifique-se de que todas as mesas do restaurante foram cadastradas na tela de Mesas.",
        expectedResult: "Os QR Codes de todas as mesas aparecem nesta página automaticamente.",
      },
      {
        title: "2. Impressão das Placas",
        description:
          "Clique em 'Imprimir Placas de Mesa' e escolha imprimir direto em papel couché ou salvar em PDF.",
        expectedResult: "O documento é gerado com a marca da sua loja e instruções de leitura.",
      },
      {
        title: "3. Disponibilização no Salão",
        description:
          "Coloque as placas acrílicas nas respectivas mesas. Ao apontar a câmera, o cliente abre o cardápio e faz o pedido.",
        expectedResult: "O pedido cai direto na tela de Pedidos identificado com o número da mesa.",
      },
    ],
    proTips: [
      "Mesas com QR Code reduzem a sobrecarga dos garçons em até 50% em horários de pico de chopp e porções.",
    ],
    relatedRoutes: [{ label: "Mapa de Mesas", href: "/mesas" }],
  },
  {
    id: "kds",
    route: "/kds",
    title: "KDS - Tela de Cozinha & Linha de Produção",
    category: "operacoes",
    categoryLabel: "Operações",
    badge: "Cozinha",
    iconName: "ConciergeBellIcon",
    summary:
      "Kitchen Display System (KDS) em tela cheia de alto contraste para a cozinha, chapa, forno e bar. Organiza pedidos por antiguidade com alertas visuais de tempo e bip sonoro.",
    features: [
      {
        name: "Cards de Pedidos em Modo Noturno",
        badge: "Interface",
        description:
          "Design escuro de alta visibilidade mesmo sob iluminação intensa de cozinhas industriais.",
        action: "Ideal para monitores touchscreen, TVs com TV Box ou tablets na área de montagem.",
      },
      {
        name: "Temporizador com Código de Cores",
        badge: "Tempo de Preparo",
        description:
          "Alerta visual do tempo decorrido: Verde (dentro da meta), Amarelo (atenção) e Vermelho (pedido atrasado).",
        action: "A contagem em minutos atualiza a cada segundo em tempo real.",
      },
      {
        name: "Detalhamento de Observações e Ponto da Carne",
        badge: "Precisão",
        description:
          "Adicionais, pontos de carne e observações de clientes (ex: 'Sem Cebola', 'Sem Molho') aparecem em destaque amarelo para evitar erros de produção.",
        action: "Exibido logo abaixo de cada produto no card.",
      },
      {
        name: "Conclusão de Itens e Pedidos",
        badge: "Finalização",
        description:
          "Toque em 'Pronto' para notificar imediatamente o painel de pedidos e a TV de senhas para retirada do cliente.",
        action: "Clique no botão 'Marcar como Pronto'.",
      },
    ],
    howToUse: [
      {
        title: "1. Posicionamento do KDS",
        description:
          "Abra o KDS na tela da cozinha e pressione F11 no teclado para entrar em modo tela cheia.",
        expectedResult: "A tela ocupa 100% do monitor sem barras do navegador.",
      },
      {
        title: "2. Preparando os Pratos",
        description:
          "A equipe da cozinha visualiza os pedidos mais antigos sempre à esquerda. Inicie a preparação seguindo os itens e observações.",
        expectedResult: "A produção segue a ordem cronológica correta.",
      },
      {
        title: "3. Finalizando a Produção",
        description:
          "Ao terminar de empratar ou embalar, toque em 'Pronto'.",
        expectedResult: "O pedido sai do KDS e o atendente do balcão ou motoboy é avisado.",
      },
    ],
    proTips: [
      "Elimine totalmente o uso de papel térmico na cozinha usando o KDS; você economiza bobinas e evita pedidos perdidos.",
    ],
    relatedRoutes: [
      { label: "Pedidos", href: "/pedidos" },
      { label: "Painel de Senhas", href: "/senha" },
    ],
  },
  {
    id: "entregas",
    route: "/entregas",
    title: "Despacho & Gestão de Entregas",
    category: "operacoes",
    categoryLabel: "Operações",
    badge: "Logística",
    iconName: "BikeIcon",
    summary:
      "Acompanhe todos os pedidos que estão nas ruas com motoboys em tempo real. Monitore tempos de viagem, endereços, taxas acumuladas e confirme retornos de entregadores.",
    features: [
      {
        name: "Painel de Viagens Ativas",
        badge: "Tempo Real",
        description:
          "Mostra todos os pedidos em trânsito com nome do motoboy, horário de saída e minutos decorridos.",
        action: "Atualizado automaticamente.",
      },
      {
        name: "Atalho Direto para GPS / Rotas",
        badge: "Navegação",
        description:
          "Clique no endereço de entrega para abrir a localização diretamente no Google Maps ou Waze.",
        action: "Clique no ícone de localização ao lado do endereço.",
      },
      {
        name: "Confirmação de Retorno do Entregador",
        badge: "Finalização",
        description:
          "Registre o retorno do motoboy à loja, liberando o entregador para a próxima rota e contabilizando a taxa de entrega na conta dele.",
        action: "Clique em 'Confirmar Entrega'.",
      },
    ],
    howToUse: [
      {
        title: "1. Pedidos Despachados",
        description:
          "Assim que um pedido é despachado na tela de Pedidos, ele passa a ser monitorado aqui.",
        expectedResult: "O cronômetro de entrega começa a rodar.",
      },
      {
        title: "2. Acompanhamento",
        description:
          "Verifique se algum motoboy está demorando mais do que o prazo médio estimado.",
        expectedResult: "Identifique rapidamente qualquer atraso na entrega.",
      },
      {
        title: "3. Retorno do Motoboy",
        description:
          "Quando o motoboy retornar com a maquininha ou comprovante assinado, confirme a finalização.",
        expectedResult: "O pedido é concluído e o valor é somado no relatório do entregador.",
      },
    ],
    proTips: [
      "Combine até 2 pedidos na mesma rota para o mesmo motoboy se os endereços forem no mesmo bairro para economizar tempo.",
    ],
    relatedRoutes: [
      { label: "Configurações de Logística", href: "/logistica" },
      { label: "Pedidos", href: "/pedidos" },
    ],
  },
  {
    id: "senha",
    route: "/senha",
    title: "Painel de Chamada de Senhas (TV)",
    category: "operacoes",
    categoryLabel: "Operações",
    badge: "TV / Salão",
    iconName: "MegaphoneIcon",
    summary:
      "Interface de alta qualidade para TV voltada aos clientes no salão de espera e balcão de retirada. Exibe senhas 'Em Preparo' e 'Prontas para Retirada' com chamada por voz sintetizada.",
    features: [
      {
        name: "Chamada por Voz Sintetizada Automática",
        badge: "Áudio",
        description:
          "Voz clara que anuncia o número da senha e a instrução de retirada assim que o pedido fica pronto.",
        action: "Funciona nativamente através da Web Speech API do navegador da TV.",
      },
      {
        name: "Efeito Sonoro de Campainha",
        badge: "Som",
        description:
          "Sino clássico de atenção que toca imediatamente antes da voz sintetizada anunciar a senha.",
        action: "Disparo automático.",
      },
      {
        name: "Colunas Gigantes de Alta Legibilidade",
        badge: "Design",
        description:
          "Tipografia extra grande e cores de alto contraste visíveis até de 20 metros de distância da TV.",
        action: "Ajusta-se automaticamente a qualquer resolução (Full HD, 4K).",
      },
    ],
    howToUse: [
      {
        title: "1. Conectando a TV",
        description:
          "Abra o navegador da Smart TV ou computador conectado por cabo HDMI e acesse a URL `/senha`.",
        expectedResult: "A tela abre com o logotipo da sua loja e colunas de chamada.",
      },
      {
        title: "2. Configurando o Volume",
        description:
          "Dê um clique na tela para liberar a reprodução de áudio do navegador e ajuste o volume da TV.",
        expectedResult: "O áudio fica ativo e pronto para chamadas.",
      },
      {
        title: "3. Funcionamento Automático",
        description:
          "Não precisa de nenhum operador nesta tela! Quando a cozinha marca 'Pronto', a TV chama a senha na hora.",
        expectedResult: "O cliente ouve o número e se dirige ao balcão para retirar a refeição.",
      },
    ],
    proTips: [
      "Conecte a saída de áudio da TV às caixas de som do salão para que os clientes na varanda também ouçam suas senhas.",
    ],
    relatedRoutes: [
      { label: "Pedidos", href: "/pedidos" },
      { label: "Cozinha (KDS)", href: "/kds" },
    ],
  },
  {
    id: "garcom",
    route: "/garcom",
    title: "Terminal Garçom Mobile",
    category: "operacoes",
    categoryLabel: "Operações",
    badge: "Garçom Mobile",
    iconName: "UsersRoundIcon",
    summary:
      "Interface ultraleve e responsiva para smartphones de garçons e atendentes no salão. Permite abrir mesas e comandas e lançar pedidos à mesa em segundos com zero papel.",
    features: [
      {
        name: "Interface Otimizada para Celular",
        badge: "Mobile First",
        description:
          "Botões grandes, navegação por toque e carregamento ultrarrápido ideal para redes Wi-Fi de salão.",
        action: "Funciona direto no Chrome ou Safari de qualquer smartphone Android ou iPhone.",
      },
      {
        name: "Seleção Rápida de Mesa ou Comanda",
        badge: "Agilidade",
        description:
          "Toque na mesa atendida e selecione pratos, bebidas ou sobremesas em poucos toques.",
        action: "Selecione o número da mesa no início do atendimento.",
      },
      {
        name: "Envio Imediato para Cozinha / Bar",
        badge: "Produção",
        description:
          "Assim que o garçom clica em 'Enviar Pedido', a impressora do bar e da cozinha imprimem os tickets sem o garçom precisar andar até o caixa.",
        action: "Clique no botão flutuante 'Enviar Pedido'.",
      },
    ],
    howToUse: [
      {
        title: "1. Acesso do Garçom",
        description:
          "O garçom faz login com seu usuário individual e papel 'WAITER' ou acessa `/garcom`.",
        expectedResult: "A tela abre em modo aplicativo sem menus administrativos.",
      },
      {
        title: "2. Lançando o Pedido na Mesa",
        description:
          "Escolha a mesa, adicione os produtos pedidos pelos clientes, marque complementos e observações.",
        expectedResult: "O resumo do pedido é exibido na tela.",
      },
      {
        title: "3. Confirmação do Envio",
        description:
          "Clique em 'Enviar Pedido'. Os pratos vão para a cozinha e bebidas para o bar.",
        expectedResult: "O garçom já fica livre para atender a próxima mesa.",
      },
    ],
    proTips: [
      "Garçons usando o celular economizam até 15 minutos por atendimento, aumentando muito a satisfação dos clientes.",
    ],
    relatedRoutes: [
      { label: "Mesas", href: "/mesas" },
      { label: "Comandas", href: "/comandas" },
    ],
  },

  // ==========================================
  // CARDÁPIO E ESTOQUE
  // ==========================================
  {
    id: "cardapio",
    route: "/cardapio",
    title: "Gestão do Cardápio Digital & Produtos",
    category: "cardapio",
    categoryLabel: "Cardápio e Estoque",
    badge: "Catálogo",
    iconName: "UtensilsCrossedIcon",
    summary:
      "Crie, edite e organize categorias, produtos, fotos, preços normais e promocionais, adicionais obrigatórios e opcionais, regras de pizzas e itens em destaque no cardápio online.",
    features: [
      {
        name: "Estrutura por Categorias e Reordenação",
        badge: "Organização",
        description:
          "Crie seções como 'Hambúrgueres Artesanais', 'Pizzas', 'Bebidas' e reordene arrastando e soltando.",
        action: "Clique em 'Nova Categoria' ou use o ícone de arrastar para reposicionar.",
      },
      {
        name: "Cadastro Completo de Produtos",
        badge: "Produtos",
        description:
          "Upload de fotos atraentes, nome, descrição detalhada de ingredientes, preço regular e preço promocional com etiqueta de desconto.",
        action: "Clique em '+ Adicionar Produto' dentro da categoria.",
      },
      {
        name: "Grupos de Opcionais e Complementos",
        badge: "Customização",
        description:
          "Configure escolhas como 'Ponto da Carne' (obrigatório, escolha 1) ou 'Adicionais Pagos' (opcional, até 5 opções: Bacon, Queijo Extra, etc.).",
        action: "Acesse a aba 'Grupos de Complementos' no formulário do produto.",
      },
      {
        name: "Pausar Produto Instantaneamente",
        badge: "Disponibilidade",
        description:
          "Quando um ingrediente acabar no meio do expediente, desative a chave do produto para que ele suma do cardápio em segundos sem precisar excluí-lo.",
        action: "Alterne o switch de 'Disponível' no card do item.",
      },
      {
        name: "Configuração de Pizzas Fracionadas",
        badge: "Pizzas",
        description:
          "Habilite categorias como categoria de pizza para liberar seleção de 2, 3 ou 4 sabores e bordas recheadas.",
        action: "Marque 'Esta categoria contém pizzas' nas configurações da categoria.",
      },
    ],
    howToUse: [
      {
        title: "1. Organizar as Categorias",
        description:
          "Comece criando as categorias na sequência em que o cliente deve ver no app (ex: Entradas, Principais, Bebidas, Sobremesas).",
        expectedResult: "As categorias aparecem na barra de navegação do cardápio.",
      },
      {
        title: "2. Cadastrar Produtos e Fotos",
        description:
          "Clique em 'Novo Produto', adicione uma foto de dar água na boca, descreva os ingredientes e informe o valor de venda.",
        expectedResult: "O produto aparece cadastrado e ativo.",
      },
      {
        title: "3. Vincular Grupos de Adicionais",
        description:
          "Se o prato tiver acompanhamentos ou molhos, vincule o grupo de adicionais definindo as quantidades mínimas e máximas.",
        expectedResult: "O cliente é obrigado ou convidado a escolher os opcionais antes de colocar no carrinho.",
      },
    ],
    proTips: [
      "Pratos com fotos com boa iluminação vendem até 40% a mais do que itens sem imagem.",
      "Use o campo 'Preço Promocional' para destacar pratos com etiqueta chamativa de desconto no topo da página.",
    ],
    relatedRoutes: [
      { label: "Impressão do Cardápio", href: "/cardapio/impressao" },
      { label: "Gerador de Banners", href: "/marketing/banners" },
      { label: "Estoque", href: "/estoque" },
    ],
  },
  {
    id: "cardapio-impressao",
    route: "/cardapio/impressao",
    title: "Gerador de Cardápio Impresso (PDF)",
    category: "cardapio",
    categoryLabel: "Cardápio e Estoque",
    badge: "Gráfica & PDF",
    iconName: "PrinterIcon",
    summary:
      "Diagramação automática e exportação profissional do seu cardápio em PDF de alta resolução, pronto para impressão em folhas A4 ou envio para gráficas.",
    features: [
      {
        name: "Diagramação Automática Profissional",
        badge: "Design",
        description:
          "Organiza categorias, pratos, descrições e preços em colunas elegantes sem você precisar de programas de design.",
        action: "Pré-visualização gerada em tempo real na tela.",
      },
      {
        name: "Filtro de Categorias no Impresso",
        badge: "Filtro",
        description:
          "Escolha quais categorias devem entrar na versão impressa (ex: omitir promoções sazonais exclusivas de delivery).",
        action: "Selecione as categorias nas opções laterais.",
      },
      {
        name: "Exportação em PDF Vetorial",
        badge: "Alta Resolução",
        description:
          "Gera o arquivo com texto nítido e logotipo da sua empresa em alta definição.",
        action: "Clique em 'Gerar PDF para Impressão'.",
      },
    ],
    howToUse: [
      {
        title: "1. Revisão dos Preços",
        description:
          "Verifique se todos os itens e preços estão atualizados na tela de Cardápio.",
        expectedResult: "Os preços impressos refletirão com precisão os valores cadastrados.",
      },
      {
        title: "2. Personalizar o Layout",
        description:
          "Escolha o formato de colunas e selecione se deseja incluir fotos ou apenas descrição textual.",
        expectedResult: "A pré-visualização atualiza instantaneamente.",
      },
      {
        title: "3. Baixar e Imprimir",
        description:
          "Clique em 'Imprimir / Salvar como PDF' e envie o arquivo para sua impressora ou gráfica.",
        expectedResult: "Seu salão conta com cardápios físicos sempre alinhados ao sistema.",
      },
    ],
    proTips: [
      "Sempre que fizer um reajuste de preços no sistema, gere uma nova versão impressa para evitar divergências com clientes no salão.",
    ],
    relatedRoutes: [{ label: "Cardápio Digital", href: "/cardapio" }],
  },
  {
    id: "estoque",
    route: "/estoque",
    title: "Controle de Estoque & Ficha Técnica",
    category: "cardapio",
    categoryLabel: "Cardápio e Estoque",
    badge: "Insumos",
    iconName: "BoxesIcon",
    summary:
      "Cadastre matérias-primas e insumos (kg, g, l, un), vincule fichas técnicas aos produtos do cardápio e tenha baixa de estoque automática a cada venda realizada no sistema.",
    features: [
      {
        name: "Cadastro de Insumos e Unidades",
        badge: "Insumos",
        description:
          "Controle de matérias-primas com unidade de medida (Quilograma, Grama, Litro, Mililitro, Unidade) e custo de aquisição.",
        action: "Clique em 'Novo Insumo'.",
      },
      {
        name: "Ficha Técnica por Prato",
        badge: "Baixa Automática",
        description:
          "Defina os ingredientes consumidos em cada prato (ex: 1 X-Bacon consome 1 pão brioche, 160g de blend bovino, 30g de queijo cheddar e 40g de bacon).",
        action: "Acesse a aba 'Ficha Técnica' do produto.",
      },
      {
        name: "Alerta de Estoque Mínimo e Crítico",
        badge: "Avisos",
        description:
          "Indicadores visuais de itens que atingiram o limite de segurança para reposição antes de esgotarem no fim de semana.",
        action: "Configurado no campo 'Estoque Mínimo' de cada insumo.",
      },
      {
        name: "Ajuste Manual e Registro de Perdas",
        badge: "Auditoria",
        description:
          "Lance perdas por validade, desperdício ou ajustes de contagem física de inventário com justificativa.",
        action: "Clique em 'Ajustar Saldo'.",
      },
    ],
    howToUse: [
      {
        title: "1. Cadastrar Matérias-Primas",
        description:
          "Lance os insumos comprados regularmente (carnes, queijos, pães, embalagens, refrigerantes).",
        expectedResult: "O painel de insumos exibe os saldos atuais.",
      },
      {
        title: "2. Montar a Ficha Técnica",
        description:
          "No produto do cardápio, vincule a quantidade consumida de cada insumo cadastrado.",
        expectedResult: "A cada pedido vendido no PDV ou Delivery, o saldo é abatido automaticamente.",
      },
      {
        title: "3. Inventário Periódico",
        description:
          "Faça uma contagem semanal no estoque físico e use 'Ajustar Saldo' para manter o sistema calibrado com a realidade.",
        expectedResult: "Evita furos de estoque e previne desvios de mercadorias.",
      },
    ],
    proTips: [
      "Cadastre embalagens de delivery nas fichas técnicas para controlar também o custo e estoque de caixas e sacolas.",
    ],
    relatedRoutes: [
      { label: "Compras e Fornecedores", href: "/estoque/compras" },
      { label: "Cardápio", href: "/cardapio" },
    ],
  },
  {
    id: "estoque-compras",
    route: "/estoque/compras",
    title: "Pedidos de Compra & Entradas de Estoque",
    category: "cardapio",
    categoryLabel: "Cardápio e Estoque",
    badge: "Fornecedores",
    iconName: "ShoppingCartIcon",
    summary:
      "Gerencie fornecedores, registre notas fiscais de entrada de mercadorias, alimente o estoque de insumos e gere lançamentos automáticos no Contas a Pagar do Financeiro.",
    features: [
      {
        name: "Cadastro de Fornecedores",
        badge: "Parceiros",
        description:
          "Registro de Razão Social, CNPJ, telefone, chave Pix, e-mail e prazos de pagamento combinados com cada fornecedor.",
        action: "Clique em 'Novo Fornecedor'.",
      },
      {
        name: "Registro de Entrada de Compras",
        badge: "Entrada de NF",
        description:
          "Lance os itens recebidos com quantidade e valor unitário para recalcular o custo médio dos insumos.",
        action: "Clique em 'Nova Entrada de Compra'.",
      },
      {
        name: "Integração com Contas a Pagar",
        badge: "Financeiro",
        description:
          "Gera automaticamente as parcelas de pagamento no módulo Financeiro na data de vencimento da fatura da compra.",
        action: "Habilitado automaticamente ao confirmar a compra.",
      },
    ],
    howToUse: [
      {
        title: "1. Cadastrar o Fornecedor",
        description:
          "Informe os dados da distribuidora ou fornecedor de alimentos com quem você compra.",
        expectedResult: "O fornecedor fica salvo na lista de parceiros comerciais.",
      },
      {
        title: "2. Lançar a Nota de Entrada",
        description:
          "Ao chegar a mercadoria, lance os itens, quantidade faturada e valor total da nota fiscal.",
        expectedResult: "Os saldos no estoque sobem instantaneamente.",
      },
      {
        title: "3. Acompanhamento Financeiro",
        description:
          "Confira o lançamento de contas a pagar criado na aba Financeiro para realizar o pagamento no dia correto.",
        expectedResult: "Controle financeiro e estoque 100% integrados.",
      },
    ],
    proTips: [
      "Acompanhe o histórico de preços unitários para identificar aumentos abusivos de fornecedores ao longo dos meses.",
    ],
    relatedRoutes: [
      { label: "Estoque", href: "/estoque" },
      { label: "Financeiro", href: "/financeiro" },
    ],
  },

  // ==========================================
  // FINANCEIRO E MÉTRICAS
  // ==========================================
  {
    id: "financeiro",
    route: "/financeiro",
    title: "Fluxo de Caixa, DRE & Contas a Pagar/Receber",
    category: "financeiro",
    categoryLabel: "Financeiro e Métricas",
    badge: "Gestão Financeira",
    iconName: "CircleDollarSignIcon",
    summary:
      "Visão 360° da saúde financeira do restaurante. Acompanhe entradas automáticas de vendas, lance contas a pagar (aluguel, fornecedores, folhas de pagamento), veja lucros e DRE operacional.",
    features: [
      {
        name: "Dashboard de Indicadores Financeiros",
        badge: "Métricas",
        description:
          "Total de Receitas, Total de Despesas, Saldo Líquido, Contas a Pagar Hoje e Contas a Receber em cards resumidos.",
        action: "Atualizado em tempo real conforme as operações acontecem.",
      },
      {
        name: "Lançamentos de Contas a Pagar e Receber",
        badge: "Lançamentos",
        description:
          "Cadastre despesas fixas e variáveis com data de vencimento, categoria (ex: Aluguel, Folha, Manutenção) e forma de quitação.",
        action: "Clique em 'Novo Lançamento'.",
      },
      {
        name: "Filtros por Período e Categorias",
        badge: "Filtros",
        description:
          "Filtre os lançamentos por Hoje, Mês Atual, Mês Anterior ou defina datas personalizadas para conciliação.",
        action: "Selecione no filtro superior.",
      },
      {
        name: "DRE Simplificado (Demonstrativo de Resultado)",
        badge: "DRE",
        description:
          "Demonstração do faturamento bruto, custos de mercadorias vendidas (CMV), despesas operacionais e lucro líquido apurado.",
        action: "Acesse a aba 'DRE'.",
      },
    ],
    howToUse: [
      {
        title: "1. Entradas Automáticas de Vendas",
        description:
          "Você não precisa digitar as vendas: todo pedido concluído no PDV ou Delivery já alimenta as receitas com a respectiva forma de pagamento.",
        expectedResult: "O gráfico de receitas reflete o faturamento real da loja.",
      },
      {
        title: "2. Cadastro de Despesas",
        description:
          "Clique em 'Novo Lançamento', selecione 'Despesa', informe a data de vencimento, valor e descrição (ex: Conta de Luz).",
        expectedResult: "A conta aparece na agenda de pagamentos.",
      },
      {
        title: "3. Baixa de Pagamento",
        description:
          "Ao pagar o boleto ou fazer o Pix, clique em 'Marcar como Pago' na despesa correspondente.",
        expectedResult: "O saldo de contas a pagar diminui e a despesa é quitada.",
      },
    ],
    proTips: [
      "Nunca misture contas pessoais com a conta do restaurante para manter o DRE e os relatórios financeiros fidedignos.",
    ],
    relatedRoutes: [
      { label: "Configurações Fiscais", href: "/financeiro/configuracoes-fiscais" },
      { label: "Fechamentos de Caixa", href: "/financeiro/fechamentos" },
      { label: "Relatórios de Vendas", href: "/relatorios" },
    ],
  },
  {
    id: "financeiro-configuracoes-fiscais",
    route: "/financeiro/configuracoes-fiscais",
    title: "Emissão Fiscal de Notas (NFC-e / ACBr API)",
    category: "financeiro",
    categoryLabel: "Financeiro e Métricas",
    badge: "Módulo Fiscal",
    iconName: "FileCheckIcon",
    summary:
      "Configuração e emissão de notas fiscais do consumidor eletrônicas (NFC-e) integradas à SEFAZ via ACBr API. Gerencie certificado digital A1, CSC, CFOP, NCM e histórico de XML e DANFE.",
    features: [
      {
        name: "Upload do Certificado Digital A1 (.pfx)",
        badge: "Certificado",
        description:
          "Envio seguro do arquivo do certificado A1 com chave de senha criptografada para assinatura das notas.",
        action: "Faça o upload do arquivo .pfx e digite a senha.",
      },
      {
        name: "Configuração de CSC e ID Token SEFAZ",
        badge: "SEFAZ",
        description:
          "Campos para informar o Código de Segurança do Contribuinte (CSC) e ID gerados no portal da Fazenda do seu estado para o QR Code da NFC-e.",
        action: "Preencha nos campos indicados e clique em 'Salvar'.",
      },
      {
        name: "Alternância Homologação / Produção",
        badge: "Ambiente",
        description:
          "Permite realizar testes em ambiente de Homologação (sem valor fiscal) antes de virar para Produção (notas válidas).",
        action: "Selecione o ambiente no seletor.",
      },
      {
        name: "Histórico de Emissões, Rejeições e DANFE",
        badge: "Histórico",
        description:
          "Tabela com todas as notas emitidas, status de autorização, motivo de rejeição da SEFAZ (se houver), download do XML e visualização da DANFE.",
        action: "Acesse a aba 'Notas Emitidas'.",
      },
    ],
    howToUse: [
      {
        title: "1. Obter o Certificado A1",
        description:
          "Solicite ao seu contador o arquivo `.pfx` do Certificado A1 da empresa e a senha correspondente.",
        expectedResult: "O arquivo é anexado com sucesso e a data de validade é exibida.",
      },
      {
        title: "2. Configurar os Parâmetros Fiscais",
        description:
          "Informe o CSC, o ID do Token, o CFOP padrão (geralmente 5.102 para comércio ou 5.405 para substituição tributária) e o regime tributário.",
        expectedResult: "O sistema fica apto para assinar e transmitir notas à SEFAZ.",
      },
      {
        title: "3. Emitir Notas nos Pedidos",
        description:
          "Na tela de Pedidos ou PDV, clique em 'Emitir NFC-e'. O sistema transmite em segundos e abre a DANFE para impressão.",
        expectedResult: "Nota autorizada pela SEFAZ com chave de acesso e QR Code fiscal.",
      },
    ],
    proTips: [
      "Certificados A1 vencem a cada 1 ano; anote a data de expiração para renovar com antecedência e não travar as emissões de fim de semana.",
    ],
    relatedRoutes: [
      { label: "Pedidos", href: "/pedidos" },
      { label: "PDV", href: "/pdv" },
      { label: "Financeiro", href: "/financeiro" },
    ],
  },
  {
    id: "financeiro-fechamentos",
    route: "/financeiro/fechamentos",
    title: "Fechamentos de Caixa dos Operadores",
    category: "financeiro",
    categoryLabel: "Financeiro e Métricas",
    badge: "Auditoria",
    iconName: "CoinsIcon",
    summary:
      "Histórico completo de todos os turnos de caixa fechados no PDV. Permite auditar quebras de caixa, sobras, faltas, sangrias e conferências cegas de cada operador.",
    features: [
      {
        name: "Histórico de Turnos por Operador",
        badge: "Turnos",
        description:
          "Lista com data, hora de abertura, hora de fechamento, nome do operador e saldo inicial/final.",
        action: "Clique em qualquer turno para ver o relatório completo.",
      },
      {
        name: "Conferência Cega de Valores",
        badge: "Conferência",
        description:
          "Compara o valor contado fisicamente pelo operador com o valor calculado pelo sistema para identificar divergências (sobras ou faltas).",
        action: "Exibido no espelho de fechamento.",
      },
      {
        name: "Auditoria de Sangrias e Suprimentos",
        badge: "Movimentações",
        description:
          "Extrato detalhado de todas as retiradas de dinheiro para cofre e reforços de troco realizados durante o expediente.",
        action: "Listado dentro dos detalhes do fechamento.",
      },
    ],
    howToUse: [
      {
        title: "1. Fechamento no PDV",
        description:
          "O operador encerra o turno no PDV digitando a contagem física das notas e moedas da gaveta.",
        expectedResult: "O relatório de fechamento é enviado para cá automaticamente.",
      },
      {
        title: "2. Auditoria do Gerente",
        description:
          "O gerente confere os valores depositados no cofre com o valor declarado no relatório.",
        expectedResult: "Qualquer divergência fica registrada no histórico para prestação de contas.",
      },
    ],
    proTips: [
      "Adote o procedimento de sangrias periódicas sempre que a gaveta acumular mais de R$ 300,00 em dinheiro para maior segurança.",
    ],
    relatedRoutes: [
      { label: "PDV", href: "/pdv" },
      { label: "Financeiro", href: "/financeiro" },
    ],
  },
  {
    id: "financeiro-fiados",
    route: "/financeiro/fiados",
    title: "Caderneta de Clientes (Contas a Receber Fiado)",
    category: "financeiro",
    categoryLabel: "Financeiro e Métricas",
    badge: "A Prazo",
    iconName: "CreditCardIcon",
    summary:
      "Controle moderno e seguro da venda a prazo ('fiado / pendura'). Acompanhe saldos devedores de clientes de confiança, estabeleça limites de crédito e receba pagamentos parciais.",
    features: [
      {
        name: "Lista de Clientes com Saldo Devedor",
        badge: "Saldos",
        description:
          "Tabela de clientes com total acumulado a pagar, data da última compra e limite de crédito disponível.",
        action: "Pesquise pelo nome ou telefone do cliente.",
      },
      {
        name: "Extrato de Compras a Prazo",
        badge: "Extrato",
        description:
          "Histórico detalhado com cada item consumido, data, hora e pedido que originou a dívida.",
        action: "Clique no cliente para abrir a conta corrente dele.",
      },
      {
        name: "Quitação Parcial ou Total de Dívida",
        badge: "Recebimento",
        description:
          "Abata pagamentos em dinheiro, Pix ou cartão feitos pelo cliente, emitindo recibo de quitação.",
        action: "Clique em 'Dar Baixa / Receber'.",
      },
    ],
    howToUse: [
      {
        title: "1. Venda a Prazo no PDV",
        description:
          "Ao finalizar a venda no PDV para um cliente cadastrado, escolha a forma de pagamento 'Fiado / Crédito Loja'.",
        expectedResult: "O valor é somado na caderneta digital do cliente.",
      },
      {
        title: "2. Recebimento e Baixa",
        description:
          "Quando o cliente vier quitar a conta, acerte o valor nesta tela informando quanto foi recebido.",
        expectedResult: "O saldo devedor é atualizado e o valor entra no fluxo de caixa do dia.",
      },
    ],
    proTips: [
      "Defina um limite máximo de crédito (ex: R$ 200,00) para cada cliente a fim de evitar inadimplência.",
    ],
    relatedRoutes: [
      { label: "PDV", href: "/pdv" },
      { label: "Clientes (CRM)", href: "/crm" },
    ],
  },
  {
    id: "relatorios",
    route: "/relatorios",
    title: "Relatórios Gerenciais & Métricas de Vendas",
    category: "financeiro",
    categoryLabel: "Financeiro e Métricas",
    badge: "BI & Indicadores",
    iconName: "BarChart3Icon",
    summary:
      "Painel de inteligência de negócios. Analise faturamento bruto, ticket médio, produtos campeões de venda, mapa de calor dos horários de pico e distribuição por canais de venda.",
    features: [
      {
        name: "Gráficos de Faturamento e Evolução",
        badge: "Vendas",
        description:
          "Acompanhe o crescimento diário, semanal ou mensal com comparativo entre períodos anteriores.",
        action: "Alterne o período no cabeçalho (Hoje, 7 dias, Este Mês, Customizado).",
      },
      {
        name: "Ranking dos Produtos Mais Vendidos",
        badge: "Campeões",
        description:
          "Descubra quais pratos trazem a maior receita e quais têm menor saída para otimizar o cardápio.",
        action: "Visualizado na tabela de produtos campeões com quantidade e faturamento.",
      },
      {
        name: "Mapa de Calor por Horário e Dia",
        badge: "Horários de Pico",
        description:
          "Identifique com exatidão os picos de pedidos para planejar escalas de garçons, motoboys e cozinheiros.",
        action: "Exibido no gráfico de distribuição horária.",
      },
      {
        name: "Vendas por Meio de Pagamento",
        badge: "Meios de Pagamento",
        description:
          "Percentual de vendas em Pix, Cartão de Crédito, Débito e Dinheiro para negociar melhores taxas com adquirentes.",
        action: "Gráfico de pizza com detalhamento percentual.",
      },
      {
        name: "Exportação para Planilhas (CSV)",
        badge: "Exportar",
        description:
          "Baixe os dados brutos de pedidos para abrir no Microsoft Excel ou Google Sheets para análises contábeis.",
        action: "Clique em 'Exportar Relatório'.",
      },
    ],
    howToUse: [
      {
        title: "1. Definir o Período de Análise",
        description:
          "Escolha o intervalo que deseja avaliar no canto superior direito.",
        expectedResult: "Todos os gráficos e indicadores recalculam instantaneamente.",
      },
      {
        title: "2. Avaliar Produtos de Baixa Saída",
        description:
          "Consulte o fim da lista de produtos para verificar pratos que venderam pouco nos últimos 30 dias.",
        expectedResult: "Permite criar promoções direcionadas ou substituir ingredientes parados.",
      },
      {
        title: "3. Exportar para a Contabilidade",
        description:
          "No início de cada mês, exporte o relatório do mês anterior para enviar ao seu contador.",
        expectedResult: "Facilidade e precisão na apuração fiscal.",
      },
    ],
    proTips: [
      "Acompanhe o Ticket Médio: se estiver caindo, crie combos de hambúrguer com refrigerante ou sobremesa para elevar o gasto médio por cliente.",
    ],
    relatedRoutes: [
      { label: "Financeiro", href: "/financeiro" },
      { label: "Pedidos", href: "/pedidos" },
    ],
  },

  // ==========================================
  // MARKETING E CLIENTES
  // ==========================================
  {
    id: "crm",
    route: "/crm",
    title: "Clientes & CRM de Fidelização",
    category: "marketing",
    categoryLabel: "Marketing e Clientes",
    badge: "Clientes",
    iconName: "HeartHandshakeIcon",
    summary:
      "Base de clientes centralizada. Acompanhe o histórico de pedidos de cada cliente, telefone, endereço, preferências, saldo de cashback e recupere clientes inativos pelo WhatsApp.",
    features: [
      {
        name: "Lista de Clientes Cadastrados",
        badge: "Base",
        description:
          "Cadastro automático de todos os clientes que fizeram pedidos pelo cardápio online, PDV ou WhatsApp.",
        action: "Pesquise por nome, telefone ou CPF.",
      },
      {
        name: "Histórico Completo por Cliente",
        badge: "Perfil Individual",
        description:
          "Acesse a página do cliente para ver todos os pedidos já feitos, pratos favoritos, gasto total acumulado e saldo de cashback.",
        action: "Clique no nome do cliente para abrir a página detalhada.",
      },
      {
        name: "Atalho Direto para WhatsApp",
        badge: "Atendimento",
        description:
          "Inicie uma conversa no WhatsApp com o cliente em 1 clique com mensagem pré-formatada de pós-venda ou cupom.",
        action: "Clique no ícone verde de WhatsApp na linha do cliente.",
      },
      {
        name: "Segmentação de Clientes (VIP x Inativos)",
        badge: "Segmentação",
        description:
          "Identifique quem são os clientes que mais gastam na loja e quem não pede nada há mais de 30 dias para enviar promoções.",
        action: "Filtre por 'Recorrentes' ou 'Em Risco'.",
      },
    ],
    howToUse: [
      {
        title: "1. Consulta de Clientes",
        description:
          "Encontre rapidamente os dados de um cliente pelo número de telefone dele.",
        expectedResult: "Exibe o endereço cadastrado e pedidos anteriores.",
      },
      {
        title: "2. Resgate de Clientes Sumidos",
        description:
          "Localize clientes que não pedem há mais de 20 dias e envie uma mensagem carinhosa com um cupom especial de retorno.",
        expectedResult: "Aumento direto nas recompras de delivery.",
      },
    ],
    proTips: [
      "Um cliente cadastrado no CRM que recebe uma mensagem personalizada no aniversário tem 60% de chance de pedir no mesmo dia.",
    ],
    relatedRoutes: [
      { label: "Campanhas de Marketing", href: "/campanhas" },
      { label: "Cashback", href: "/cashback" },
      { label: "Cupons", href: "/cupons" },
    ],
  },
  {
    id: "marketing-banners",
    route: "/marketing/banners",
    title: "Gerador de Banners Promocionais com IA",
    category: "marketing",
    categoryLabel: "Marketing e Clientes",
    badge: "Design com IA",
    iconName: "SparklesIcon",
    summary:
      "Crie artes e banners promocionais profissionais com Inteligência Artificial para o topo do seu cardápio digital e redes sociais em segundos, sem precisar de designer gráfico.",
    features: [
      {
        name: "Geração Visual com IA",
        badge: "Inteligência Artificial",
        description:
          "Descreva o prato ou promoção (ex: 'Festival de Hambúrguer Artesanal com Batata Frita Crocante') e a IA desenha o banner.",
        action: "Digite o texto da promoção e clique em 'Gerar com IA'.",
      },
      {
        name: "Publicação Instantânea no Cardápio",
        badge: "1-Clique",
        description:
          "Ative o banner gerado direto no carrossel superior do cardápio digital dos seus clientes.",
        action: "Clique em 'Publicar no Cardápio'.",
      },
      {
        name: "Download em Alta Resolução para Redes",
        badge: "Download",
        description:
          "Baixe a arte pronta no tamanho ideal para postar no Instagram Stories, Feed ou Status do WhatsApp da loja.",
        action: "Clique em 'Baixar Imagem'.",
      },
    ],
    howToUse: [
      {
        title: "1. Descrever a Promoção",
        description:
          "Selecione o estilo visual desejado e escreva a frase chamativa da sua oferta da semana.",
        expectedResult: "A IA processa e renderiza opções profissionais.",
      },
      {
        title: "2. Revisar e Publicar",
        description:
          "Escolha a melhor arte e clique em 'Publicar no Cardápio'.",
        expectedResult: "Os clientes que abrirem o app verão o banner imediatamente no topo.",
      },
    ],
    proTips: [
      "Troque os banners toda semana para dar aspecto dinâmico ao cardápio e aumentar as vendas do prato promovido.",
    ],
    relatedRoutes: [
      { label: "Cardápio", href: "/cardapio" },
      { label: "Campanhas", href: "/campanhas" },
    ],
  },
  {
    id: "campanhas",
    route: "/campanhas",
    title: "Campanhas Promocionais & Disparos",
    category: "marketing",
    categoryLabel: "Marketing e Clientes",
    badge: "Disparos",
    iconName: "MegaphoneIcon",
    summary:
      "Crie campanhas de mensagens programadas para a sua base de clientes. Divulgue novos pratos, promoções relâmpago de chuva ou combos do fim de semana para atrair pedidos.",
    features: [
      {
        name: "Criação de Campanhas Segmentadas",
        badge: "Segmentação",
        description:
          "Envie mensagens específicas para todos os clientes ou apenas para quem costuma pedir nas noites de sexta-feira.",
        action: "Clique em 'Nova Campanha'.",
      },
      {
        name: "Modelos de Mensagem com Tags Dinâmicas",
        badge: "Personalização",
        description:
          "Use tags como `{nome_cliente}` para que cada mensagem chegue personalizada com o primeiro nome do cliente.",
        action: "Insira as variáveis no editor de texto.",
      },
      {
        name: "Métricas de Abertura e Conversão",
        badge: "Resultados",
        description:
          "Acompanhe quantas mensagens foram entregues e quantos pedidos foram gerados a partir da campanha.",
        action: "Visualizado no dashboard da campanha.",
      },
    ],
    howToUse: [
      {
        title: "1. Criar a Mensagem",
        description:
          "Redija uma mensagem atraente, curta e com link direto para o cardápio.",
        expectedResult: "A prévia da mensagem é exibida na tela.",
      },
      {
        title: "2. Definir o Horário de Envio",
        description:
          "Programe o disparo para cerca de 30 minutos antes do início do horário de pico (ex: 18h30).",
        expectedResult: "A mensagem chega no momento em que o cliente está decidindo o que jantar.",
      },
    ],
    proTips: [
      "Evite disparar mensagens tarde da noite. O melhor horário para delivery de jantar é entre 18h e 19h15.",
    ],
    relatedRoutes: [
      { label: "Cupons", href: "/cupons" },
      { label: "WhatsApp", href: "/whatsapp" },
      { label: "Clientes", href: "/crm" },
    ],
  },
  {
    id: "cupons",
    route: "/cupons",
    title: "Cupons de Desconto",
    category: "marketing",
    categoryLabel: "Marketing e Clientes",
    badge: "Descontos",
    iconName: "TagIcon",
    summary:
      "Crie cupons promocionais em porcentagem ou valor fixo. Estabeleça regras como pedido mínimo, limite de usos por CPF, data de expiração e impulsione as vendas em dias fracos.",
    features: [
      {
        name: "Cupons Percentuais e Fixos",
        badge: "Regras",
        description:
          "Desconto em % (ex: 15% OFF) ou valor monetário fixo (ex: R$ 10,00 de desconto).",
        action: "Selecione o tipo de desconto no formulário.",
      },
      {
        name: "Trava de Pedido Mínimo",
        badge: "Margem de Lucro",
        description:
          "Exija que o cliente gaste um valor mínimo (ex: cupom de R$ 15 válido apenas em pedidos acima de R$ 60).",
        action: "Preencha o campo 'Valor Mínimo do Pedido'.",
      },
      {
        name: "Limite por Cliente e Validade",
        badge: "Segurança",
        description:
          "Limite o uso a 1 vez por CPF ou cliente e defina a data de expiração para evitar abusos.",
        action: "Marque '1 uso por cliente' e defina o término.",
      },
    ],
    howToUse: [
      {
        title: "1. Criar o Código do Cupom",
        description:
          "Crie um código fácil de lembrar e marcante (ex: `BEMVINDO`, `SEXTOU10`).",
        expectedResult: "O cupom fica ativo no sistema.",
      },
      {
        title: "2. Divulgação nas Redes",
        description:
          "Divulgue o código no Instagram ou envie no WhatsApp dos clientes.",
        expectedResult: "O cliente digita o cupom no checkout do cardápio e ganha o desconto.",
      },
    ],
    proTips: [
      "Cupons com pedido mínimo aumentam o ticket médio, pois o cliente adiciona uma sobremesa para atingir o valor exigido.",
    ],
    relatedRoutes: [
      { label: "Frete Grátis", href: "/frete" },
      { label: "Cashback", href: "/cashback" },
    ],
  },
  {
    id: "cashback",
    route: "/cashback",
    title: "Programa de Fidelidade com Cashback",
    category: "marketing",
    categoryLabel: "Marketing e Clientes",
    badge: "Fidelização",
    iconName: "CoinsIcon",
    summary:
      "Devolva uma porcentagem do valor gasto em créditos para o cliente usar no próximo pedido. A forma mais eficiente de garantir que o cliente sempre compre com você e não na concorrência.",
    features: [
      {
        name: "Porcentagem de Retorno Automática",
        badge: "Créditos",
        description:
          "Defina a porcentagem de cashback (ex: 5% ou 10%) que é creditada automaticamente após a conclusão do pedido.",
        action: "Ajuste a porcentagem desejada.",
      },
      {
        name: "Validade dos Créditos em Dias",
        badge: "Urgência",
        description:
          "Estabeleça um prazo (ex: 30 dias) para os créditos expirarem, gerando senso de urgência para recomprar.",
        action: "Preencha o campo 'Validade em dias'.",
      },
      {
        name: "Resgate Simples no Checkout",
        badge: "Cliente",
        description:
          "O cliente visualiza o saldo disponível na tela de pagamento e pode abater do total da compra com 1 toque.",
        action: "Automático no cardápio online.",
      },
    ],
    howToUse: [
      {
        title: "1. Ativar o Programa",
        description:
          "Ligue a chave de ativação do Cashback e configure a porcentagem recomendada (entre 3% e 7%).",
        expectedResult: "O cardápio passa a exibir o selo de cashback em todos os pratos.",
      },
      {
        title: "2. Crédito Automático",
        description:
          "Assim que você conclui um pedido, o sistema calcula e credita os pontos na conta do cliente pelo número de telefone.",
        expectedResult: "O cliente recebe uma notificação com o saldo ganho.",
      },
    ],
    proTips: [
      "O cashback é 3x mais eficiente que cupons de desconto, pois garante que a margem concedida só se converta se o cliente fizer uma segunda compra.",
    ],
    relatedRoutes: [
      { label: "Clientes (CRM)", href: "/crm" },
      { label: "Cupons", href: "/cupons" },
    ],
  },
  {
    id: "frete",
    route: "/frete",
    title: "Regras de Frete Grátis Promocional",
    category: "marketing",
    categoryLabel: "Marketing e Clientes",
    badge: "Incentivo",
    iconName: "GiftIcon",
    summary:
      "Configure incentivos de frete grátis por valor mínimo de compra, bairros selecionados ou dias da semana específicos para alavancar o ticket médio e atrair novos pedidos.",
    features: [
      {
        name: "Gatilho por Valor Mínimo",
        badge: "Ticket Médio",
        description:
          "Ofereça frete grátis apenas para pedidos acima de determinado valor (ex: acima de R$ 70,00).",
        action: "Defina o valor mínimo no formulário.",
      },
      {
        name: "Restrição por Bairro ou Raio",
        badge: "Logística",
        description:
          "Restrinja a gratuidade apenas aos bairros mais próximos da loja para não comprometer a taxa dos motoboys.",
        action: "Marque os bairros elegíveis na lista.",
      },
      {
        name: "Barra de Progresso no Carrinho",
        badge: "Conversão",
        description:
          "O cliente vê uma barra animada no carrinho avisando: 'Adicione mais R$ 12,00 para ganhar FRETE GRÁTIS!'.",
        action: "Ativado automaticamente no app.",
      },
    ],
    howToUse: [
      {
        title: "1. Definir o Valor de Corte",
        description:
          "Calcule o seu ticket médio atual e defina a regra de frete grátis cerca de 20% acima dele.",
        expectedResult: "O cliente adiciona itens extras no carrinho para bater a meta.",
      },
      {
        title: "2. Selecionar Dias de Movimento Fraco",
        description:
          "Se preferir, ative o frete grátis apenas às terças e quartas-feiras.",
        expectedResult: "Impulsiona as vendas nos dias tradicionalmente lentos.",
      },
    ],
    proTips: [
      "A barra de incentivo de frete grátis no carrinho é um dos recursos com maior poder de conversão comprovado no e-commerce de comida.",
    ],
    relatedRoutes: [
      { label: "Logística e Taxas", href: "/logistica" },
      { label: "Cupons", href: "/cupons" },
    ],
  },

  // ==========================================
  // CONFIGURAÇÕES E INTEGRAÇÕES
  // ==========================================
  {
    id: "configuracoes",
    route: "/configuracoes",
    title: "Configurações Gerais do Estabelecimento",
    category: "configuracoes",
    categoryLabel: "Configurações e Integrações",
    badge: "Loja & Identidade",
    iconName: "StoreIcon",
    summary:
      "Configure os dados cadastrais da empresa (Nome, CNPJ, Telefone, Endereço), ative canais de atendimento (Delivery, Retirada, Mesa), defina horários de funcionamento e cores da sua marca.",
    features: [
      {
        name: "Aba Estabelecimento (Dados & Logo)",
        badge: "Identidade",
        description:
          "Nome fantasia, descrição da casa, telefone de contato, CNPJ, upload de logotipo e imagem de capa do cardápio.",
        action: "Preencha e clique em 'Salvar Informações'.",
      },
      {
        name: "Aba Módulos & Canais",
        badge: "Canais",
        description:
          "Ligue ou desligue de forma independente: Entrega em Domicílio (Delivery), Retirada no Balcão (Takeaway) e Consumo no Salão / Mesas.",
        action: "Alterne as chaves de cada canal.",
      },
      {
        name: "Aba Horários de Funcionamento",
        badge: "Turnos",
        description:
          "Grade semanal completa de abertura e fechamento por dia, com suporte a múltiplos turnos no mesmo dia (ex: almoço 11h-14h e jantar 18h-23h).",
        action: "Configure horários dia a dia.",
      },
      {
        name: "Agendamento de Pedidos Futuros",
        badge: "Agendamentos",
        description:
          "Permita que clientes façam pedidos com antecedência para entrega programada em horários específicos.",
        action: "Ative a opção de agendamento.",
      },
      {
        name: "Aba Tema Visual & Cores",
        badge: "Personalização",
        description:
          "Personalize a cor primária, cor de destaque e estilo visual do cardápio online para refletir exatamente a identidade da sua marca.",
        action: "Escolha as cores na paleta interativa.",
      },
    ],
    howToUse: [
      {
        title: "1. Cadastrar Dados e Endereço",
        description:
          "Preencha o endereço completo com CEP para que a taxa de entrega por distância calcule com máxima precisão.",
        expectedResult: "O mapa localiza a loja e o cardápio exibe as informações oficiais.",
      },
      {
        title: "2. Definir os Horários Semanais",
        description:
          "Configure os horários em que a cozinha realmente aceita pedidos. Fora desses horários, o cardápio avisa que a loja está fechada.",
        expectedResult: "Evita que entrem pedidos com a cozinha fechada.",
      },
    ],
    proTips: [
      "Se precisar fechar a loja mais cedo por motivo de chuva ou feriado, use o botão rápido de fechamento temporário sem desconfigurar os horários semanais.",
    ],
    relatedRoutes: [
      { label: "Logística", href: "/logistica" },
      { label: "Usuários", href: "/configuracoes/usuarios" },
    ],
  },
  {
    id: "logistica",
    route: "/logistica",
    title: "Logística, Taxas de Entrega & Motoboys",
    category: "configuracoes",
    categoryLabel: "Configurações e Integrações",
    badge: "Entregas & Taxas",
    iconName: "TruckIcon",
    summary:
      "Cadastre motoboys da sua equipe, defina regras de taxas de entrega (por raio de distância em KM ou taxa fixa por bairro) e configure repasses e diárias dos entregadores.",
    features: [
      {
        name: "Cadastro da Equipe de Motoboys",
        badge: "Equipe",
        description:
          "Nome, telefone, placa do veículo, tipo (Moto, Carro, Bicicleta) e chave Pix para pagamento dos repasses.",
        action: "Clique em 'Novo Motoboy'.",
      },
      {
        name: "Taxa de Entrega por Raio em KM",
        badge: "Cálculo Preciso",
        description:
          "Cálculo automático pela rota no mapa: defina um valor base até X km (ex: até 3 km = R$ 6,00) + taxa por km adicional (ex: + R$ 1,50/km).",
        action: "Selecione o modelo 'Por Raio de Distância'.",
      },
      {
        name: "Taxa de Entrega Fixa por Bairro",
        badge: "Bairros",
        description:
          "Cadastre valores fixos de entrega para cada bairro da cidade com estimativa individual de tempo de chegada.",
        action: "Selecione o modelo 'Por Bairros'.",
      },
      {
        name: "Taxa de Repasse / Diária de Motoboy",
        badge: "Financeiro",
        description:
          "Configure se o motoboy recebe uma taxa fixa por corrida (ex: R$ 5,00/entrega), a taxa integral cobrada do cliente ou valor diário.",
        action: "Defina no cadastro de repasse da logística.",
      },
    ],
    howToUse: [
      {
        title: "1. Escolha do Modelo de Cobrança",
        description:
          "Para cidades médias e grandes, o modelo por raio em KM é o mais justo e lucrativo. Para cidades menores, a taxa por bairro é muito fácil de operar.",
        expectedResult: "O valor do frete é calculado automaticamente quando o cliente digita o endereço.",
      },
      {
        title: "2. Cadastro dos Motoboys",
        description:
          "Cadastre os entregadores que prestam serviço para a loja com telefone e chave Pix.",
        expectedResult: "Eles ficam disponíveis na lista de despacho de pedidos.",
      },
    ],
    proTips: [
      "Simule diferentes endereços de clientes conhecidos no mapa para garantir que o cálculo de KM bate exatamente com as rotas reais de moto.",
    ],
    relatedRoutes: [
      { label: "Despacho & Entregas", href: "/entregas" },
      { label: "Frete Grátis", href: "/frete" },
    ],
  },
  {
    id: "configuracoes-usuarios",
    route: "/configuracoes/usuarios",
    title: "Gestão de Usuários, Equipe & Permissões",
    category: "configuracoes",
    categoryLabel: "Configurações e Integrações",
    badge: "Segurança & Perfis",
    iconName: "Users2Icon",
    summary:
      "Controle de acesso seguro para a sua equipe. Crie logins individuais com perfis específicos: Administrador, Gerente, Atendente, Garçom, Cozinha/KDS e Entregador, restringindo acessos indevidos.",
    features: [
      {
        name: "Perfis Granulares de Acesso",
        badge: "Papéis",
        description:
          "Cada funcionário visualiza estritamente o que precisa para trabalhar, impedindo que garçons ou cozinheiros acessem o financeiro ou configurações fiscais.",
        action: "Selecione o papel no cadastro do usuário.",
      },
      {
        name: "Papéis Pré-Configurados",
        badge: "Segurança",
        description:
          "ADMIN (Acesso total), MANAGER (Gestão sem fiscal crítico), ATTENDANT (Pedidos, PDV e Chat), WAITER (Mesas e Comandas), KITCHEN (Apenas KDS de Cozinha), COURIER (Entregador).",
        action: "Escolha na lista suspensa de papel.",
      },
      {
        name: "Redefinição de Senhas e Bloqueio Imediato",
        badge: "Auditoria",
        description:
          "Altere senhas ou inative funcionários desligados instantaneamente para proteger os dados do restaurante.",
        action: "Clique em 'Editar' ou 'Inativar Usuário'.",
      },
    ],
    howToUse: [
      {
        title: "1. Criar Usuários Individuais",
        description:
          "Nunca compartilhe uma única senha com todo mundo. Crie uma conta para cada atendente e gerente com o e-mail ou nome dele.",
        expectedResult: "O sistema registra quem fez cada sangria, cancelamento ou alteração.",
      },
      {
        title: "2. Configurar o Papel Adequado",
        description:
          "Se o funcionário trabalha na montagem de hambúrgueres, defina o papel como 'KITCHEN'; ao logar, ele entrará direto no KDS.",
        expectedResult: "Ambiente limpo e sem distrações ou riscos operacionais.",
      },
    ],
    proTips: [
      "Use senhas seguras para administradores e troque as senhas periodicamente após desligamento de membros da equipe.",
    ],
    relatedRoutes: [{ label: "Configurações", href: "/configuracoes" }],
  },
  {
    id: "marketplaces",
    route: "/marketplaces",
    title: "Integrações com Marketplaces (iFood)",
    category: "configuracoes",
    categoryLabel: "Configurações e Integrações",
    badge: "iFood & APIs",
    iconName: "ShoppingBagIcon",
    summary:
      "Centralize pedidos externos do iFood diretamente no fluxo operacional do EeyFood. Receba todos os pedidos em um único painel, eliminando a confusão de múltiplos tablets no balcão.",
    features: [
      {
        name: "Conexão Oficial com API do iFood",
        badge: "Integração",
        description:
          "Conexão segura via credenciais de parceiro desenvolvedor iFood Merchant API.",
        action: "Insira o Client ID, Client Secret e autorize o restaurante.",
      },
      {
        name: "Centralização no Painel de Pedidos",
        badge: "Praticidade",
        description:
          "Os pedidos do iFood tocam no mesmo kanban dos pedidos próprios com etiqueta 'iFood', imprimem na mesma impressora e vão para o mesmo KDS.",
        action: "Recebimento automático.",
      },
      {
        name: "Sincronização de Status",
        badge: "Automação",
        description:
          "Ao avançar o pedido para 'Pronto' ou 'Despachado' no EeyFood, o status no iFood é atualizado automaticamente.",
        action: "Totalmente integrado em tempo real.",
      },
    ],
    howToUse: [
      {
        title: "1. Obter Credenciais no Portal do iFood",
        description:
          "Acesse o Portal do Parceiro iFood, vá na área de integrações e gere o código de autorização.",
        expectedResult: "As credenciais ficam prontas para validação.",
      },
      {
        title: "2. Vincular a Loja",
        description:
          "Cole as credenciais nesta tela e clique em 'Conectar com iFood'.",
        expectedResult: "Status fica 'Conectado' com luz verde.",
      },
    ],
    proTips: [
      "Use o EeyFood para fidelizar clientes que vêm do iFood enviando um panfleto com cupom de primeira compra no seu cardápio próprio.",
    ],
    relatedRoutes: [{ label: "Pedidos", href: "/pedidos" }],
  },
  {
    id: "whatsapp",
    route: "/whatsapp",
    title: "Conexão WhatsApp & Notificações Automáticas",
    category: "configuracoes",
    categoryLabel: "Configurações e Integrações",
    badge: "Mensageria",
    iconName: "MessageSquareIcon",
    summary:
      "Conecte o número de WhatsApp da sua loja via QR Code e configure disparos automáticos de status de pedido: 'Pedido Confirmado', 'Em Preparo', 'Saiu para Entrega' e pós-venda.",
    features: [
      {
        name: "Conexão Simples via QR Code",
        badge: "WhatsApp Web",
        description:
          "Basta escanear o QR Code exibido na tela com o WhatsApp do celular do restaurante para conectar em segundos.",
        action: "Abra o WhatsApp > Aparelhos Conectados > Conectar Aparelho.",
      },
      {
        name: "Gatilhos Automáticos de Notificação",
        badge: "Automação",
        description:
          "Disparo automático de mensagens a cada mudança de status do pedido com link de rastreamento do motoboy em tempo real.",
        action: "Marque os gatilhos desejados nas opções.",
      },
      {
        name: "Modelos de Mensagens Customizáveis",
        badge: "Textos",
        description:
          "Edite o texto das mensagens com tags dinâmicas como `{nome}`, `{pedido}`, `{tempo_estimado}` e `{chave_pix}`.",
        action: "Edite o texto nas caixas de mensagem e salve.",
      },
    ],
    howToUse: [
      {
        title: "1. Conectar o Aparelho",
        description:
          "Aponte a câmera do WhatsApp para o QR Code nesta tela até que o status mude para 'Conectado'.",
        expectedResult: "A conexão é estabelecida de forma estável.",
      },
      {
        title: "2. Ativar as Mensagens Automáticas",
        description:
          "Habilite os avisos de pedido recebido e saiu para entrega.",
        expectedResult: "Seus clientes são mantidos 100% informados sem seu atendente precisar digitar nada.",
      },
    ],
    proTips: [
      "Mensagens automáticas no WhatsApp reduzem em até 80% as mensagens e ligações de clientes perguntando se o pedido já saiu.",
    ],
    relatedRoutes: [
      { label: "Inteligência Artificial (IA)", href: "/ai" },
      { label: "Campanhas", href: "/campanhas" },
    ],
  },
  {
    id: "ai",
    route: "/ai",
    title: "Inteligência Artificial & Atendente Virtual",
    category: "configuracoes",
    categoryLabel: "Configurações e Integrações",
    badge: "IA Conversacional",
    iconName: "SparklesIcon",
    summary:
      "Configure provedores de Inteligência Artificial (OpenAI, Gemini, Groq, Anthropic) para atendimento automático no WhatsApp, recomendações inteligentes de pratos e respostas automáticas.",
    features: [
      {
        name: "Múltiplos Provedores de IA",
        badge: "Provedores",
        description:
          "Escolha o provedor de sua preferência (OpenAI GPT-4o, Google Gemini, Groq ou Claude) inserindo sua API Key.",
        action: "Selecione o provedor e informe a chave de API.",
      },
      {
        name: "Prompt de Personalidade do Atendente",
        badge: "Prompting",
        description:
          "Defina as instruções de como a IA deve se comportar, o tom de voz da loja, regras do cardápio e pratos que devem ser recomendados.",
        action: "Edite o campo 'Instruções do Sistema'.",
      },
      {
        name: "Simulador de Conversa para Testes",
        badge: "Simulador",
        description:
          "Converse com a IA na própria tela simulando perguntas de clientes antes de liberar para o público real.",
        action: "Envie mensagens no chat de testes à direita.",
      },
    ],
    howToUse: [
      {
        title: "1. Inserir a Chave de API",
        description:
          "Gere sua chave na OpenAI ou Google AI Studio e cole no campo de configuração.",
        expectedResult: "O status do provedor fica ativo.",
      },
      {
        title: "2. Calibrar as Instruções",
        description:
          "Explique no prompt o nome da loja, os pratos mais famosos e os horários de atendimento.",
        expectedResult: "A IA responde dúvidas com precisão como se fosse um atendente humano experiente.",
      },
    ],
    proTips: [
      "Oriente a IA nas instruções a sempre oferecer uma bebida ou batata frita para aumentar o ticket médio do pedido.",
    ],
    relatedRoutes: [
      { label: "WhatsApp", href: "/whatsapp" },
      { label: "Banners com IA", href: "/marketing/banners" },
    ],
  },
  {
    id: "marketing-pixel",
    route: "/marketing",
    title: "Rastreamento, Pixels & Analytics",
    category: "configuracoes",
    categoryLabel: "Configurações e Integrações",
    badge: "Tráfego Pago",
    iconName: "TargetIcon",
    summary:
      "Instale o Pixel do Facebook/Meta, Google Analytics 4 (GA4) e Google Tag Manager (GTM). Rastreie visualizações de produtos, adições ao carrinho e compras concluídas para criar anúncios lucrativos.",
    features: [
      {
        name: "Pixel da Meta (Facebook & Instagram Ads)",
        badge: "Meta Ads",
        description:
          "Insira o ID do seu Pixel para rastrear conversões e criar públicos de remarketing no Gerenciador de Anúncios.",
        action: "Cole o ID do Pixel no campo correspondente.",
      },
      {
        name: "Google Analytics 4 (GA4)",
        badge: "Google",
        description:
          "Acompanhe quantas pessoas acessam seu cardápio, canais de origem e taxa de rejeição com a tag `G-XXXXXXX`.",
        action: "Cole o ID de Medição do GA4.",
      },
      {
        name: "Disparo Automático de Eventos de E-commerce",
        badge: "Eventos",
        description:
          "O EeyFood já dispara nativamente os eventos `ViewContent`, `AddToCart`, `InitiateCheckout` e `Purchase` com o valor exato do pedido.",
        action: "Totalmente automatizado.",
      },
    ],
    howToUse: [
      {
        title: "1. Copiar o ID do Pixel",
        description:
          "No Gerenciador de Negócios da Meta, copie o ID numérico do seu Pixel.",
        expectedResult: "O código é inserido no cabeçalho do cardápio automaticamente.",
      },
      {
        title: "2. Criar Campanhas de Remarketing",
        description:
          "Anuncie no Instagram para todas as pessoas que adicionaram produtos ao carrinho nos últimos 7 dias mas não finalizaram a compra.",
        expectedResult: "Aumento considerável na conversão com custo por pedido extremamente baixo.",
      },
    ],
    proTips: [
      "Campanhas de remarketing para quem visitou o cardápio são as mais baratas e que mais geram vendas no delivery.",
    ],
    relatedRoutes: [
      { label: "Campanhas", href: "/campanhas" },
      { label: "Configurações", href: "/configuracoes" },
    ],
  },
  {
    id: "suporte",
    route: "/suporte",
    title: "Central de Suporte & Atendimento EeyFood",
    category: "configuracoes",
    categoryLabel: "Configurações e Integrações",
    badge: "Ajuda & Contato",
    iconName: "HeadphonesIcon",
    summary:
      "Acesso direto à equipe de suporte técnico e engenharia do EeyFood. Abra chamados no WhatsApp, consulte diagnósticos de conexão do banco e servidor e leia guias de operação.",
    features: [
      {
        name: "Botão Direto para WhatsApp do Suporte",
        badge: "Humano",
        description:
          "Fale em tempo real com nossos especialistas técnicos prontos para auxiliar na operação do seu restaurante.",
        action: "Clique em 'Chamar no WhatsApp do Suporte'.",
      },
      {
        name: "Diagnóstico de Conexões em Tempo Real",
        badge: "Diagnóstico",
        description:
          "Verificação de integridade da conexão do banco de dados PostgreSQL, servidor WebSocket em tempo real e APIs fiscais.",
        action: "Acompanhe os selos de status verde.",
      },
      {
        name: "Horários de Atendimento & Plantão",
        badge: "Plantão",
        description:
          "Informações sobre atendimento em horário comercial e plantão de emergência aos finais de semana.",
        action: "Exibido no rodapé da página.",
      },
    ],
    howToUse: [
      {
        title: "1. Dúvidas Operacionais",
        description:
          "Consulte a Central de Documentações do sistema para resolver a maioria das dúvidas de uso de cada tela.",
        expectedResult: "Autonomia imediata sem esperar atendimento.",
      },
      {
        title: "2. Dúvidas Técnicas ou Instabilidade",
        description:
          "Se encontrar qualquer falha ou precisar de auxílio com certificado fiscal, chame nossa equipe no WhatsApp.",
        expectedResult: "Atendimento prioritário para o seu restaurante.",
      },
    ],
    proTips: [
      "Ao entrar em contato com o suporte, informe o nome da sua unidade para que a equipe localize seu banco de dados imediatamente.",
    ],
    relatedRoutes: [
      { label: "Central de Documentações", href: "/configuracoes/documentacoes" },
    ],
  },
];

/**
 * Helper para localizar a documentação exata correspondente à rota atual.
 */
export function getDocForPathname(pathname: string): ScreenDocumentation | undefined {
  if (!pathname) return undefined;

  const normalized = pathname.replace(/\/$/, "");

  // 1. Match exato
  const exact = SCREEN_DOCUMENTATIONS.find((doc) => doc.route === normalized);
  if (exact) return exact;

  // 2. Subrotas específicas mapeadas
  if (normalized.startsWith("/crm/")) {
    return SCREEN_DOCUMENTATIONS.find((d) => d.id === "crm");
  }
  if (normalized.startsWith("/financeiro/configuracoes-fiscais")) {
    return SCREEN_DOCUMENTATIONS.find((d) => d.id === "financeiro-configuracoes-fiscais");
  }
  if (normalized.startsWith("/financeiro/fechamentos")) {
    return SCREEN_DOCUMENTATIONS.find((d) => d.id === "financeiro-fechamentos");
  }
  if (normalized.startsWith("/financeiro/fiados")) {
    return SCREEN_DOCUMENTATIONS.find((d) => d.id === "financeiro-fiados");
  }
  if (normalized.startsWith("/financeiro")) {
    return SCREEN_DOCUMENTATIONS.find((d) => d.id === "financeiro");
  }
  if (normalized.startsWith("/cardapio/impressao")) {
    return SCREEN_DOCUMENTATIONS.find((d) => d.id === "cardapio-impressao");
  }
  if (normalized.startsWith("/cardapio")) {
    return SCREEN_DOCUMENTATIONS.find((d) => d.id === "cardapio");
  }
  if (normalized.startsWith("/estoque/compras")) {
    return SCREEN_DOCUMENTATIONS.find((d) => d.id === "estoque-compras");
  }
  if (normalized.startsWith("/estoque")) {
    return SCREEN_DOCUMENTATIONS.find((d) => d.id === "estoque");
  }
  if (normalized.startsWith("/mesas/qrcodes")) {
    return SCREEN_DOCUMENTATIONS.find((d) => d.id === "mesas-qrcodes");
  }
  if (normalized.startsWith("/mesas")) {
    return SCREEN_DOCUMENTATIONS.find((d) => d.id === "mesas");
  }
  if (normalized.startsWith("/marketing/banners")) {
    return SCREEN_DOCUMENTATIONS.find((d) => d.id === "marketing-banners");
  }
  if (normalized.startsWith("/configuracoes/usuarios")) {
    return SCREEN_DOCUMENTATIONS.find((d) => d.id === "configuracoes-usuarios");
  }
  if (normalized.startsWith("/configuracoes/documentacoes")) {
    return undefined; // A própria tela de documentações
  }
  if (normalized.startsWith("/configuracoes")) {
    return SCREEN_DOCUMENTATIONS.find((d) => d.id === "configuracoes");
  }

  // 3. Fallback por prefixo
  return SCREEN_DOCUMENTATIONS.find(
    (doc) => normalized.startsWith(doc.route) && doc.route !== "/",
  );
}
