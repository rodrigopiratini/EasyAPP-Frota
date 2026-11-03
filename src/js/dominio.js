// Regras do negócio da frota (sem interface): cálculos usados pela Gestão e pelo app do Motorista.
import { today, addDays, diffDays, monthKey, sum, sortBy, date } from './core/fmt.js';

export const STATUS_VIAGEM = {
  planejada: { label: 'Planejada', tom: 'info' },
  em_viagem: { label: 'Em viagem', tom: 'warn' },
  concluida: { label: 'Concluída', tom: 'ok' },
};
export const CATEGORIAS = [
  ['pedagio', 'Pedágio'], ['alimentacao', 'Alimentação'], ['hospedagem', 'Pernoite / hospedagem'], ['carga', 'Carga e descarga'],
  ['manutencao', 'Manutenção na estrada'], ['pneu', 'Pneu / borracharia'], ['lavagem', 'Lavagem'], ['multa', 'Multa'], ['seguro', 'Seguro / impostos'], ['outros', 'Outros'],
];
export const nomeCategoria = (k) => CATEGORIAS.find((c) => c[0] === k)?.[1] || k || '—';
export const TIPOS_MANUT = [['oleo', 'Troca de óleo'], ['revisao', 'Revisão'], ['pneus', 'Pneus'], ['freios', 'Freios'], ['eletrica', 'Elétrica'], ['suspensao', 'Suspensão'], ['outros', 'Outros']];
export const nomeManut = (k) => TIPOS_MANUT.find((c) => c[0] === k)?.[1] || k || '—';
export const TIPOS_VEICULO = [['cavalo', 'Cavalo mecânico'], ['truck', 'Truck'], ['toco', 'Toco'], ['bitruck', 'Bitruck'], ['vuc', '3/4 / VUC'], ['carreta', 'Carreta / implemento'], ['utilitario', 'Utilitário']];
export const VENCIMENTOS = [['licenciamento', 'Licenciamento'], ['seguro', 'Seguro'], ['tacografo', 'Tacógrafo'], ['antt', 'ANTT / RNTRC']];

export const veiculo = (s, id) => s.veiculos.find((x) => x.id === id);
export const motorista = (s, id) => s.motoristas.find((x) => x.id === id);
export const cliente = (s, id) => s.clientes.find((x) => x.id === id);
export const nomeVeiculo = (v) => (v ? `${v.placa}${v.apelido || v.modelo ? ' · ' + (v.apelido || v.modelo) : ''}` : '—');
export const proximoNumero = (s) => Math.max(0, ...s.viagens.map((v) => +v.numero || 0)) + 1;
// Km da viagem: o "km rodado" digitado ou, sem ele, a diferença do hodômetro (chegada − saída)
export const kmViagem = (v) => (+v.kmRodado > 0 ? +v.kmRodado : v.kmFim > 0 && v.kmInicio >= 0 && v.kmFim >= v.kmInicio ? v.kmFim - v.kmInicio : 0);
// Custos lançados direto na viagem (o acerto): combustível, pedágio, manutenção e outros
export const CUSTOS_VIAGEM = [['combustivel', 'Combustível'], ['pedagio', 'Pedágio'], ['manutencao', 'Manutenção'], ['outros', 'Outros']];
export const despesasNaViagem = (v) => (+v.pedagio || 0) + (+v.manutencao || 0) + (+v.outros || 0);
export const comissao = (v) => ((+v.valorFrete || 0) * (+v.comissaoPct || 0)) / 100;
const noPeriodo = (d, de, ate) => d && d >= de && d <= ate;
export const dataViagem = (v) => v.dataChegada || v.dataSaida;

// Maior km conhecido do veículo (cadastro, viagens, abastecimentos e manutenções)
export function kmAtual(s, vid) {
  const v = veiculo(s, vid);
  return Math.max(+v?.kmInicial || 0,
    ...s.viagens.filter((x) => x.veiculoId === vid).flatMap((x) => [+x.kmInicio || 0, +x.kmFim || 0]),
    ...s.abastecimentos.filter((x) => x.veiculoId === vid).map((x) => +x.km || 0),
    ...s.manutencoes.filter((x) => x.veiculoId === vid).map((x) => +x.km || 0));
}

// Consumo (km/l) pelo método tanque cheio: km entre o primeiro e o último abastecimento ÷ litros após o primeiro
export function consumo(s, vid, de = '0000', ate = '9999') {
  const ab = sortBy(s.abastecimentos.filter((a) => a.veiculoId === vid && a.km > 0 && noPeriodo(a.data, de, ate)), (a) => a.km);
  if (ab.length < 2) return null;
  const km = ab[ab.length - 1].km - ab[0].km;
  const litros = sum(ab.slice(1), (a) => +a.litros);
  return km > 0 && litros > 0 ? km / litros : null;
}
// Consumo pelas viagens com km rodado e litros lançados no acerto; sem elas, pelo tanque cheio
export function consumoGeral(s, vid, de = '0000', ate = '9999') {
  const vs = s.viagens.filter((v) => v.veiculoId === vid && +v.litros > 0 && kmViagem(v) > 0 && noPeriodo(dataViagem(v), de, ate));
  const l = sum(vs, (v) => +v.litros);
  return l > 0 ? sum(vs, kmViagem) / l : consumo(s, vid, de, ate);
}

// Resultado de uma viagem: frete − custos do acerto − abastecimentos e despesas ligados a ela − comissão
export function resultadoViagem(s, v) {
  const lig = (arr) => arr.filter((x) => x.viagemId === v.id);
  const combustivel = (+v.combustivel || 0) + sum(lig(s.abastecimentos), (a) => +a.valor);
  const litros = (+v.litros || 0) + sum(lig(s.abastecimentos), (a) => +a.litros || 0);
  const despesas = despesasNaViagem(v) + sum(lig(s.despesas), (d) => +d.valor);
  const r = { frete: +v.valorFrete || 0, combustivel, litros, despesas, comissao: comissao(v), km: kmViagem(v) };
  r.custos = r.combustivel + r.despesas + r.comissao;
  r.lucro = r.frete - r.custos;
  r.margem = r.frete ? r.lucro / r.frete : 0;
  r.kml = r.litros > 0 && r.km ? r.km / r.litros : 0;
  return r;
}

// Resultado de um período, total e por veículo
export function resultado(s, de, ate) {
  const viagens = s.viagens.filter((v) => v.status === 'concluida' && noPeriodo(dataViagem(v), de, ate));
  const abast = s.abastecimentos.filter((a) => noPeriodo(a.data, de, ate));
  const desp = s.despesas.filter((d) => noPeriodo(d.data, de, ate));
  const manut = s.manutencoes.filter((m) => noPeriodo(m.data, de, ate));
  const conta = (vid) => {
    const f = (arr) => (vid === undefined ? arr : arr.filter((x) => x.veiculoId === vid));
    const vs = f(viagens);
    const r = {
      viagens: vs.length, faturamento: sum(vs, (v) => +v.valorFrete), km: sum(vs, kmViagem), litros: sum(f(abast), (a) => +a.litros || 0) + sum(vs, (v) => +v.litros || 0),
      combustivel: sum(f(abast), (a) => +a.valor) + sum(vs, (v) => +v.combustivel || 0), despesas: sum(f(desp), (d) => +d.valor) + sum(vs, despesasNaViagem),
      manutencao: sum(f(manut), (m) => +m.valor), comissoes: sum(vs, comissao),
    };
    r.custos = r.combustivel + r.despesas + r.manutencao + r.comissoes;
    r.resultado = r.faturamento - r.custos;
    r.margem = r.faturamento ? r.resultado / r.faturamento : 0;
    r.custoKm = r.km ? r.custos / r.km : 0;
    r.receitaKm = r.km ? r.faturamento / r.km : 0;
    return r;
  };
  return { ...conta(), porVeiculo: s.veiculos.map((v) => ({ v, ...conta(v.id) })).filter((x) => x.v.ativo !== false || x.viagens || x.custos) };
}

export const limitesMes = (k) => { const [y, m] = k.split('-').map(Number); const fim = new Date(y, m, 0).getDate(); return [`${k}-01`, `${k}-${String(fim).padStart(2, '0')}`]; };
export const mesMais = (k, n) => { const [y, m] = k.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
export function historico(s, n = 6, fim = monthKey(today())) {
  return Array.from({ length: n }, (_, i) => mesMais(fim, i - n + 1)).map((k) => ({ mes: k, ...resultado(s, ...limitesMes(k)) }));
}

export const aReceber = (s) => s.viagens.filter((v) => v.status === 'concluida' && !v.recebido && +v.valorFrete > 0);
export const aConferir = (s) => [...s.viagens.filter((v) => v.status === 'concluida'), ...s.abastecimentos, ...s.despesas].filter((x) => !x.conferido && x.motoristaId);

// Acerto do motorista: comissões das viagens concluídas + reembolsos do que ele pagou − adiantamentos
export function acerto(s, mid, de, ate) {
  const viagens = s.viagens.filter((v) => v.motoristaId === mid && v.status === 'concluida' && noPeriodo(dataViagem(v), de, ate));
  const adiant = s.viagens.filter((v) => v.motoristaId === mid && noPeriodo(v.dataSaida, de, ate) && +v.adiantamento > 0);
  const pagos = [...s.abastecimentos, ...s.despesas].filter((x) => x.motoristaId === mid && x.pagoPeloMotorista && noPeriodo(x.data, de, ate));
  const r = { viagens, adiant, pagos, comissoes: sum(viagens, comissao), reembolsos: sum(pagos, (x) => +x.valor), adiantamentos: sum(adiant, (v) => +v.adiantamento) };
  r.saldo = r.comissoes + r.reembolsos - r.adiantamentos;
  return r;
}

// Alertas: documentos vencendo, CNH, manutenção por km, lançamentos a conferir, fretes a receber
export function alertas(s) {
  const out = [];
  const t = today();
  const prazo = (data, titulo, link, icone = 'file') => {
    if (!data) return;
    const d = diffDays(data, t);
    if (d < 0) out.push({ nivel: 'critico', icone, titulo, texto: `Venceu em ${date(data)}`, link, ordem: d });
    else if (d <= 30) out.push({ nivel: 'atencao', icone, titulo, texto: `Vence em ${date(data)} (${d === 0 ? 'hoje' : d + ' dias'})`, link, ordem: d });
  };
  for (const v of s.veiculos.filter((x) => x.ativo !== false)) {
    for (const [k, n] of VENCIMENTOS) prazo(v.venc?.[k], `${n} · ${v.placa}`, `#/veiculo/${v.id}`);
    const km = kmAtual(s, v.id);
    for (const [tipo, campo, nome] of [['oleo', 'oleoCadaKm', 'Troca de óleo'], ['revisao', 'revisaoCadaKm', 'Revisão']]) {
      const cada = +v[campo];
      if (!cada) continue;
      const ult = sortBy(s.manutencoes.filter((m) => m.veiculoId === v.id && m.tipo === tipo && m.km > 0), (m) => m.km, true)[0];
      const base = ult?.km ?? (+v.kmInicial || 0);
      const falta = base + cada - km;
      if (falta <= 0) out.push({ nivel: 'critico', icone: 'wrench', titulo: `${nome} · ${v.placa}`, texto: `Passou ${Math.abs(falta).toLocaleString('pt-BR')} km do previsto (a cada ${cada.toLocaleString('pt-BR')} km)`, link: `#/veiculo/${v.id}`, ordem: -1 });
      else if (falta <= Math.max(1000, cada * 0.1)) out.push({ nivel: 'atencao', icone: 'wrench', titulo: `${nome} · ${v.placa}`, texto: `Faltam ${falta.toLocaleString('pt-BR')} km`, link: `#/veiculo/${v.id}`, ordem: 5 });
    }
  }
  for (const m of s.motoristas.filter((x) => x.ativo !== false)) prazo(m.cnhValidade, `CNH · ${m.nome}`, `#/motorista/${m.id}`, 'user');
  const conf = aConferir(s).length;
  if (conf) out.push({ nivel: 'acao', icone: 'check', titulo: `${conf} lançamento(s) dos motoristas para conferir`, texto: 'Viagens, abastecimentos e despesas lançados pelo app', link: '#/conferir', ordem: 0 });
  const atrasados = aReceber(s).filter((v) => diffDays(t, dataViagem(v)) > 30);
  if (atrasados.length) out.push({ nivel: 'atencao', icone: 'money', titulo: `${atrasados.length} frete(s) a receber há mais de 30 dias`, texto: 'Marque como recebido quando o cliente pagar', link: '#/viagens?f=receber', ordem: 3 });
  const nivel = { critico: 0, acao: 1, atencao: 2 };
  return sortBy(out, (a) => nivel[a.nivel] * 1000 + a.ordem);
}

export const periodo = (k) => {
  const t = today();
  if (k === '30d') return [addDays(t, -29), t, 'Últimos 30 dias'];
  if (k === 'ant') { const m = mesMais(monthKey(t), -1); return [...limitesMes(m), 'Mês passado']; }
  if (k === 'ano') return [t.slice(0, 4) + '-01-01', t, 'Este ano'];
  return [...limitesMes(monthKey(t)), 'Este mês'];
};
