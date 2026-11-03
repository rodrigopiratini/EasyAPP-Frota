// Dados de demonstração (modo local / ?demo=1): uma pequena transportadora com ~6 meses de histórico.
// seed({ vazio: true }) = começar do zero.
import { today, addDays } from './core/fmt.js';

export function seed({ vazio = false } = {}) {
  const meta = { versao: 1, demo: !vazio, empresa: 'Transportes Serra Azul (demonstração)', pinGestao: '0000', cidade: 'Caxias do Sul/RS', precoDiesel: 6.19 };
  const vazioTudo = { meta, veiculos: [], motoristas: [], clientes: [], viagens: [], abastecimentos: [], despesas: [], manutencoes: [], acessos: [] };
  if (vazio) return vazioTudo;
  const t = today();
  let semente = 7;
  const rnd = () => ((semente = (semente * 9301 + 49297) % 233280) / 233280);
  const entre = (a, b) => Math.round(a + rnd() * (b - a));

  const veiculos = [
    { id: 've1', placa: 'IZA-4F21', modelo: 'Volvo FH 460', ano: 2019, tipo: 'cavalo', kmInicial: 412000, oleoCadaKm: 30000, revisaoCadaKm: 60000, ativo: true, venc: { licenciamento: addDays(t, 18), seguro: addDays(t, 140), tacografo: addDays(t, 75), antt: addDays(t, 300) } },
    { id: 've2', placa: 'JBC-7H03', modelo: 'Scania R 450', ano: 2021, tipo: 'cavalo', kmInicial: 265000, oleoCadaKm: 30000, revisaoCadaKm: 60000, ativo: true, venc: { licenciamento: addDays(t, 95), seguro: addDays(t, -3), tacografo: addDays(t, 200), antt: addDays(t, 300) } },
    { id: 've3', placa: 'IRT-2B88', modelo: 'VW Constellation 24.280', ano: 2016, tipo: 'truck', kmInicial: 538000, oleoCadaKm: 20000, revisaoCadaKm: 40000, ativo: true, venc: { licenciamento: addDays(t, 60), seguro: addDays(t, 30), tacografo: addDays(t, 12), antt: addDays(t, 300) } },
    { id: 've4', placa: 'QHE-1J45', modelo: 'Mercedes Accelo 1016', ano: 2020, tipo: 'vuc', kmInicial: 188000, oleoCadaKm: 15000, revisaoCadaKm: 30000, ativo: true, venc: { licenciamento: addDays(t, 120), seguro: addDays(t, 200), tacografo: addDays(t, 150), antt: addDays(t, 300) } },
  ];
  const motoristas = [
    { id: 'mo1', nome: 'João Pereira', telefone: '54999110001', cnhCategoria: 'E', cnhValidade: addDays(t, 400), comissaoPct: 12, veiculoId: 've1', ativo: true },
    { id: 'mo2', nome: 'Marcos Oliveira', telefone: '54999110002', cnhCategoria: 'E', cnhValidade: addDays(t, 22), comissaoPct: 12, veiculoId: 've2', ativo: true },
    { id: 'mo3', nome: 'Luiz Fernando Costa', telefone: '54999110003', cnhCategoria: 'D', cnhValidade: addDays(t, 800), comissaoPct: 10, veiculoId: 've3', ativo: true },
    { id: 'mo4', nome: 'Rafael Souza', telefone: '54999110004', cnhCategoria: 'C', cnhValidade: addDays(t, 600), comissaoPct: 10, veiculoId: 've4', ativo: true },
  ];
  const clientes = [
    { id: 'cl1', nome: 'Móveis Gramado Ltda', telefone: '54999220001', prazoDias: 30 },
    { id: 'cl2', nome: 'Vinícola Vale Verde', telefone: '54999220002', prazoDias: 15 },
    { id: 'cl3', nome: 'Agro Cereais Planalto', telefone: '54999220003', prazoDias: 28 },
    { id: 'cl4', nome: 'Distribuidora Litoral', telefone: '54999220004', prazoDias: 21 },
  ];
  const rotas = [['Caxias do Sul/RS', 'São Paulo/SP', 1130, 9800], ['Caxias do Sul/RS', 'Curitiba/PR', 560, 5200], ['Bento Gonçalves/RS', 'Porto Alegre/RS', 120, 1600],
    ['Passo Fundo/RS', 'Rio Grande/RS', 480, 4600], ['Caxias do Sul/RS', 'Florianópolis/SC', 430, 4100], ['Farroupilha/RS', 'Joinville/SC', 610, 5600]];
  const viagens = [], abastecimentos = [], despesas = [], manutencoes = [];
  let n = 1;
  for (const [vi, v] of veiculos.entries()) {
    const m = motoristas[vi];
    let km = v.kmInicial;
    const curto = v.tipo === 'vuc' || v.tipo === 'truck';
    for (let d = -175 + vi * 2; d < -1; ) {
      const [orig, dest, dist, frete] = curto ? rotas[[2, 3, 4][entre(0, 2)]] : rotas[entre(0, 5)];
      const dias = Math.max(1, Math.round(dist / 550));
      const saida = addDays(t, d), chegada = addDays(t, d + dias);
      const kmI = km, kmF = km + dist + entre(5, 40);
      const valorFrete = Math.round(frete * (curto ? 0.75 : 1) * (0.9 + rnd() * 0.25) / 10) * 10;
      const recebido = d < -40 || rnd() > 0.5;
      viagens.push({ id: 'vg' + n, numero: n, motoristaId: m.id, veiculoId: v.id, clienteId: clientes[entre(0, 3)].id, origem: orig, destino: dest, carga: ['Móveis', 'Vinhos', 'Grãos', 'Carga geral'][entre(0, 3)],
        dataSaida: saida, dataChegada: chegada, kmInicio: kmI, kmFim: kmF, valorFrete, comissaoPct: m.comissaoPct, adiantamento: dist > 500 ? 400 : 150, status: 'concluida',
        recebido, recebidoEm: recebido ? addDays(chegada, entre(5, 25)) : null, conferido: d < -6 });
      // abastecimentos ao longo da viagem (consumo realista)
      const kml = curto ? (v.tipo === 'vuc' ? 6.2 : 3.6) : 2.4;
      let kmA = kmI;
      for (let parte = 0; parte < Math.max(1, Math.round(dist / 450)); parte++) {
        kmA += Math.round(dist / Math.max(1, Math.round(dist / 450)));
        const litros = Math.round((dist / Math.max(1, Math.round(dist / 450))) / (kml * (0.92 + rnd() * 0.16)));
        abastecimentos.push({ id: 'ab' + n + '_' + parte, data: addDays(saida, Math.min(dias, parte)), veiculoId: v.id, motoristaId: m.id, viagemId: 'vg' + n, km: kmA, litros, valor: Math.round(litros * (6.05 + rnd() * 0.3) * 100) / 100,
          posto: ['Posto Graal', 'Rede Buffon', 'Posto Ipiranga BR-116', 'Posto Sim'][entre(0, 3)], tanqueCheio: true, pagoPeloMotorista: rnd() > 0.8, conferido: d < -6 });
      }
      if (dist > 300) despesas.push({ id: 'dp' + n, data: saida, categoria: 'pedagio', descricao: `Pedágios ${orig.split('/')[0]} → ${dest.split('/')[0]}`, valor: Math.round(dist * 0.32), veiculoId: v.id, motoristaId: m.id, viagemId: 'vg' + n, pagoPeloMotorista: false, conferido: d < -6 });
      if (dias > 1) despesas.push({ id: 'dq' + n, data: addDays(saida, 1), categoria: 'alimentacao', descricao: 'Refeições na estrada', valor: 45 * dias + entre(0, 30), veiculoId: v.id, motoristaId: m.id, viagemId: 'vg' + n, pagoPeloMotorista: true, conferido: d < -6 });
      km = kmF + entre(10, 60);
      d += dias + entre(1, 3);
      n++;
    }
    manutencoes.push({ id: 'mn' + vi + 'a', data: addDays(t, -60 + vi * 5), veiculoId: v.id, km: km - 9000 - vi * 1500, tipo: 'oleo', descricao: 'Óleo e filtros', valor: curto ? 780 : 1450, oficina: 'Diesel Center' });
    if (vi === 2) manutencoes.push({ id: 'mn2b', data: addDays(t, -25), veiculoId: v.id, km: km - 4000, tipo: 'freios', descricao: 'Lonas e tambores traseiros', valor: 2380, oficina: 'Freios Serra' });
    if (vi === 0) manutencoes.push({ id: 'mn0b', data: addDays(t, -40), veiculoId: v.id, km: km - 9000, tipo: 'pneus', descricao: '2 pneus de tração recapados', valor: 2900, oficina: 'Borracharia Rota 116' });
  }
  // viagem em andamento do João e uma planejada para o Marcos
  const kmJ = Math.max(...viagens.filter((x) => x.veiculoId === 've1').map((x) => x.kmFim)) + 30;
  viagens.push({ id: 'vg' + n, numero: n++, motoristaId: 'mo1', veiculoId: 've1', clienteId: 'cl1', origem: 'Caxias do Sul/RS', destino: 'São Paulo/SP', carga: 'Móveis', dataSaida: t, kmInicio: kmJ, valorFrete: 10200, comissaoPct: 12, adiantamento: 400, status: 'em_viagem', recebido: false, conferido: false });
  viagens.push({ id: 'vg' + n, numero: n++, motoristaId: 'mo2', veiculoId: 've2', clienteId: 'cl2', origem: 'Bento Gonçalves/RS', destino: 'Curitiba/PR', carga: 'Vinhos', dataSaida: addDays(t, 1), valorFrete: 5400, comissaoPct: 12, adiantamento: 0, status: 'planejada', recebido: false, conferido: false });
  despesas.push({ id: 'dpx', data: addDays(t, -12), categoria: 'seguro', descricao: 'Parcela seguro da frota', valor: 1850, veiculoId: null, motoristaId: null, conferido: true });
  const acessos = [
    { codigo: 'JOAO', ref: 'mo1', nome: 'João Pereira', pin: '1234', ativo: true },
    { codigo: 'MARCOS', ref: 'mo2', nome: 'Marcos Oliveira', pin: '1234', ativo: true },
  ];
  return { ...vazioTudo, veiculos, motoristas, clientes, viagens, abastecimentos, despesas, manutencoes, acessos };
}
