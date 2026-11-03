// =====================================================================
// SEGMENTO — EasyApp Frota: pequenas transportadoras (dono da frota + motoristas).
// Este arquivo é lido pelo navegador E pelo supabase/gerar.mjs: só dados, sem importar nada.
// =====================================================================
export const SEGMENTO = {
  id: 'easyapp-frota',
  schema: 'frota',                       // pasta deste app no banco (projeto easyapp-fabrica)
  nome: 'EasyApp Frota',
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

  gestao: { nome: 'EasyApp Frota Gestão', curto: 'Gestão', descricao: 'Para o dono da frota: resultado por caminhão, viagens, combustível, despesas, manutenção e acerto dos motoristas.' },
  usuario: {
    nome: 'EasyApp Frota Motorista', curto: 'Motorista', descricao: 'Para o motorista: iniciar e encerrar viagens, lançar abastecimentos e despesas na hora e ver o próprio acerto.',
    colecao: 'motoristas', papel: 'Motorista', papelPlural: 'Motoristas', icone: 'fuel',
  },

  colecoes: {
    veiculos: { nome: 'Veículos', leitura: 'todos' },
    motoristas: { nome: 'Motoristas', leitura: 'proprio', ref: 'id' },
    clientes: { nome: 'Clientes', leitura: 'gestao' },
    viagens: { nome: 'Viagens', leitura: 'proprio', escrita: 'proprio', ref: 'motoristaId',
      protegidos: ['valorFrete', 'clienteId', 'comissaoPct', 'adiantamento', 'recebido', 'recebidoEm', 'numero', 'combustivel', 'pedagio', 'manutencao', 'outros'], trava: 'conferido' },
    abastecimentos: { nome: 'Abastecimentos', leitura: 'proprio', escrita: 'proprio', ref: 'motoristaId', trava: 'conferido' },
    despesas: { nome: 'Despesas', leitura: 'proprio', escrita: 'proprio', ref: 'motoristaId', trava: 'conferido' },
    manutencoes: { nome: 'Manutenções', leitura: 'gestao' },
  },

  campos: { nome: 'nome', placa: 'placa', modelo: 'modelo', status: 'situação', valorFrete: 'valor do frete', comissaoPct: 'comissão', adiantamento: 'adiantamento',
    recebido: 'recebido', conferido: 'conferido', kmInicio: 'km inicial', kmFim: 'km final', kmRodado: 'km rodado', combustivel: 'combustível', pedagio: 'pedágio', manutencao: 'manutenção', outros: 'outros', apelido: 'apelido', km: 'km', litros: 'litros', valor: 'valor', origem: 'origem', destino: 'destino',
    dataSaida: 'saída', dataChegada: 'chegada', categoria: 'categoria', descricao: 'descrição', cnhValidade: 'validade da CNH', veiculoId: 'veículo', motoristaId: 'motorista', pagoPeloMotorista: 'pago pelo motorista' },
};
