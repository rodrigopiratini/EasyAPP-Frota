// =====================================================================
// SEGMENTO — EasyApp Frota: pequenas transportadoras (dono da frota + motoristas).
// Este arquivo é lido pelo navegador E pelo supabase/gerar.mjs: só dados, sem importar nada.
// =====================================================================
export const SEGMENTO = {
  id: 'easyapp-frota',
  schema: 'frota',                       // pasta deste app no banco (projeto easyapp-fabrica)
  nome: 'EasyAPP Frota',
  slogan: 'Gestão de frota para pequenas transportadoras: viagens, combustível, despesas, manutenção e o acerto de cada motorista.',
  icone: 'truck',
  logo: null,

  suporte: { nome: 'EasyApp', whatsapp: '', email: '' },
  plataforma: { admins: [] },            // e-mails que administram as empresas; ex.: ['voce@gmail.com']
  planos: [
    { id: 'frota5', nome: 'Frota 5', preco: 149, descricao: 'até 5 veículos' },
    { id: 'frota15', nome: 'Frota 15', preco: 249, descricao: 'até 15 veículos' },
    { id: 'frota30', nome: 'Frota 30', preco: 399, descricao: 'até 30 veículos' },
  ],
  diasTeste: 30,
  atividade: false,                      // registro de atividades fora do menu por enquanto (continua gravando)

  gestao: { nome: 'EasyAPP Frota Gestão', curto: 'Gestão', descricao: 'Para o dono da frota: resultado por caminhão, viagens, combustível, despesas, manutenção e acerto dos motoristas.' },
  usuario: {
    nome: 'EasyAPP Frota Motorista', curto: 'Motorista', descricao: 'Para o motorista: iniciar e encerrar viagens, lançar abastecimentos e despesas na hora e ver o próprio acerto.',
    colecao: 'motoristas', papel: 'Motorista', papelPlural: 'Motoristas', icone: 'fuel',
  },

  colecoes: {
    veiculos: { nome: 'Veículos', leitura: 'todos' },
    motoristas: { nome: 'Motoristas', leitura: 'proprio', ref: 'id' },
    clientes: { nome: 'Clientes', leitura: 'gestao' },
    viagens: { nome: 'Viagens', leitura: 'proprio', escrita: 'proprio', ref: 'motoristaId',
      protegidos: ['valorFrete', 'clienteId', 'comissaoPct', 'adiantamento', 'recebido', 'recebidoEm', 'numero', 'combustivel', 'pedagio', 'manutencao', 'outros', 'recebimentos', 'pagoMotorista', 'fechadoEm', 'obsFechamento'], trava: 'conferido' },
    abastecimentos: { nome: 'Abastecimentos', leitura: 'proprio', escrita: 'proprio', ref: 'motoristaId', trava: 'conferido' },
    despesas: { nome: 'Despesas', leitura: 'proprio', escrita: 'proprio', ref: 'motoristaId', trava: 'conferido' },
    manutencoes: { nome: 'Manutenções', leitura: 'gestao' },
    recebimentos: { nome: 'Recebimentos', leitura: 'proprio', escrita: 'proprio', ref: 'motoristaId', trava: 'conferido' },
  },

  // Assistente (IA): o que ele precisa saber deste negócio
  assistente: {
    instrucoes: [
      'Viagem: numero sequencial (o maior + 1; quem numera é a gestão); status planejada | em_viagem | concluida; dataSaida e dataChegada; origem e destino;',
      'valorFrete (frete), comissaoPct (% do frete que é do motorista), adiantamento (dinheiro dado ao motorista na saída); kmInicio e kmFim.',
      'Viagem com fechadoEm preenchido já foi fechada: não proponha mudar a viagem nem os lançamentos dela; diga para reabrir na página da viagem.',
      'Lançamentos de uma viagem (abastecimentos, despesas, recebimentos) levam viagemId, motoristaId e veiculoId iguais aos da viagem.',
      'Despesa: categoria pedagio | alimentacao | hospedagem | carga | manutencao | pneu | lavagem | multa | seguro | outros; pagoPeloMotorista true = reembolso no acerto.',
      'Abastecimento: km, litros, valor, precoLitro (valor / litros), posto, tanqueCheio. Recebimento do frete: valor, forma (pix | deposito | boleto | carta_frete | especie | cheque | outro) e com ("motorista" em carta_frete e especie; senão "dono").',
      'Manutenção: veiculoId, data, tipo (oleo | revisao | pneus | freios | eletrica | suspensao | outros), km, valor, descricao.',
      'Resultado, acerto e quem deve a quem: use a coleção calculada fechamento_viagens (os mesmos números das telas). saldoMotorista > 0: o motorista devolve à empresa; < 0: a empresa paga ao motorista.',
      'Consumo (km/l): km rodado entre abastecimentos de tanque cheio dividido pelos litros.',
    ].join(' '),
    gestao: { instrucoes: 'Lançamento feito pela gestão já nasce conferido (conferido: true). Conferir = marcar conferido: true.' },
    usuario: { instrucoes: 'O motorista lança os abastecimentos, despesas e recebimentos dele (conferido: false) e inicia/encerra as viagens dele. Ele não muda frete, comissão nem nada já conferido.' },
  },

  campos: { nome: 'nome', placa: 'placa', modelo: 'modelo', status: 'situação', valorFrete: 'valor do frete', comissaoPct: 'comissão', adiantamento: 'adiantamento',
    recebido: 'recebido', conferido: 'conferido', kmInicio: 'km inicial', kmFim: 'km final', kmRodado: 'km rodado', combustivel: 'combustível', pedagio: 'pedágio', manutencao: 'manutenção', outros: 'outros', apelido: 'apelido', km: 'km', litros: 'litros', valor: 'valor', origem: 'origem', destino: 'destino',
    dataSaida: 'saída', dataChegada: 'chegada', categoria: 'categoria', descricao: 'descrição', cnhValidade: 'validade da CNH', veiculoId: 'veículo', motoristaId: 'motorista', pagoPeloMotorista: 'pago pelo motorista' },
};
