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
// Comissão: a % da viagem ou, sem ela, a do cadastro do motorista
export const pctViagem = (v, s) => (v.comissaoPct != null && v.comissaoPct !== '' ? +v.comissaoPct : +(s && motorista(s, v.motoristaId)?.comissaoPct) || 0);
export const comissao = (v, s) => ((+v.valorFrete || 0) * pctViagem(v, s)) / 100;
// Tudo o que pertence a uma viagem (some junto quando ela é excluída)
export const LANC_VIAGEM = ['abastecimentos', 'despesas', 'recebimentos'];
export const lancamentosDa = (s, vid) => LANC_VIAGEM.flatMap((c) => (s[c] || []).filter((x) => x.viagemId === vid).map((x) => ({ col: c, x })));
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
  const r = { frete: +v.valorFrete || 0, combustivel, litros, despesas, comissao: comissao(v, s), km: kmViagem(v) };
  r.custos = r.combustivel + r.despesas + r.comissao;
  r.lucro = r.frete - r.custos;
  r.margem = r.frete ? r.lucro / r.frete : 0;
  r.kml = r.litros > 0 && r.km ? r.km / r.litros : 0;
  return r;
}

// Data em que um custo entra no resultado: o de uma viagem vai junto com ela (na chegada; enquanto não chega, fica de fora);
// o sem viagem, na própria data. Assim frete e custos da viagem caem sempre no mesmo período.
export function dataCusto(s, x, mapa) {
  if (!x.viagemId) return x.data;
  const v = mapa ? mapa.get(x.viagemId) : s.viagens.find((y) => y.id === x.viagemId);
  if (!v) return x.data;
  return v.status === 'concluida' ? dataViagem(v) : null;
}
const mapaViagens = (s) => new Map(s.viagens.map((v) => [v.id, v]));

// Resultado de um período, total e por veículo
export function resultado(s, de, ate) {
  const viagens = s.viagens.filter((v) => v.status === 'concluida' && noPeriodo(dataViagem(v), de, ate));
  const mv = mapaViagens(s);
  const abast = s.abastecimentos.filter((a) => noPeriodo(dataCusto(s, a, mv), de, ate));
  const desp = s.despesas.filter((d) => noPeriodo(dataCusto(s, d, mv), de, ate));
  const manut = s.manutencoes.filter((m) => noPeriodo(m.data, de, ate));
  // vid: undefined = tudo; null = o que não é de nenhum caminhão cadastrado (despesas gerais, caminhão removido)
  const ids = new Set(s.veiculos.map((v) => v.id));
  const conta = (vid) => {
    const f = (arr) => (vid === undefined ? arr : vid === null ? arr.filter((x) => !ids.has(x.veiculoId)) : arr.filter((x) => x.veiculoId === vid));
    const vs = f(viagens);
    const r = {
      viagens: vs.length, faturamento: sum(vs, (v) => +v.valorFrete), km: sum(vs, kmViagem), litros: sum(f(abast), (a) => +a.litros || 0) + sum(vs, (v) => +v.litros || 0),
      combustivel: sum(f(abast), (a) => +a.valor) + sum(vs, (v) => +v.combustivel || 0), despesas: sum(f(desp), (d) => +d.valor) + sum(vs, despesasNaViagem),
      manutencao: sum(f(manut), (m) => +m.valor), comissoes: sum(vs, (v) => comissao(v, s)),
    };
    r.custos = r.combustivel + r.despesas + r.manutencao + r.comissoes;
    r.resultado = r.faturamento - r.custos;
    r.margem = r.faturamento ? r.resultado / r.faturamento : 0;
    r.custoKm = r.km ? r.custos / r.km : 0;
    r.receitaKm = r.km ? r.faturamento / r.km : 0;
    return r;
  };
  // as linhas por caminhão sempre somam o total: o que não é de caminhão nenhum vira a linha "Sem caminhão"
  const sem = conta(null);
  const porVeiculo = s.veiculos.map((v) => ({ v, ...conta(v.id) })).filter((x) => x.v.ativo !== false || x.viagens || x.custos);
  if (sem.viagens || sem.custos) porVeiculo.push({ v: { id: '', placa: 'Sem caminhão', apelido: 'despesas gerais', geral: true }, ...sem });
  return { ...conta(), porVeiculo };
}

export const limitesMes = (k) => { const [y, m] = k.split('-').map(Number); const fim = new Date(y, m, 0).getDate(); return [`${k}-01`, `${k}-${String(fim).padStart(2, '0')}`]; };
export const mesMais = (k, n) => { const [y, m] = k.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
export function historico(s, n = 6, fim = monthKey(today())) {
  return Array.from({ length: n }, (_, i) => mesMais(fim, i - n + 1)).map((k) => ({ mes: k, ...resultado(s, ...limitesMes(k)) }));
}

// Fretes a receber: concluídos, não marcados como recebidos e com parte ainda não lançada nos recebimentos
export const aReceber = (s) => s.viagens.filter((v) => v.status === 'concluida' && !v.recebido && +v.valorFrete > 0 && fechamento(s, v).faltaReceber > 0.004);
export const faltaReceber = (s, v) => (v.recebido ? 0 : fechamento(s, v).faltaReceber);
// Onde um caminhão / motorista / cliente é usado (para não excluir quem tem histórico)
export function usos(s, campo, id) {
  const cols = ['viagens', 'abastecimentos', 'despesas', 'manutencoes', 'recebimentos'];
  const n = Object.fromEntries(cols.map((c) => [c, (s[c] || []).filter((x) => x[campo] === id).length]));
  if (campo === 'veiculoId') n.motoristas = s.motoristas.filter((m) => m.veiculoId === id).length;
  n.total = Object.values(n).reduce((a, b) => a + b, 0);
  return n;
}
export const aConferir = (s) => [...s.viagens.filter((v) => v.status === 'concluida'), ...s.abastecimentos, ...s.despesas, ...(s.recebimentos || [])].filter((x) => !x.conferido && x.motoristaId);

// ---------- Recebimento do frete e fechamento da viagem ----------
// Cada viagem pode receber o frete de vários jeitos; "com" diz com quem o dinheiro ficou.
export const FORMAS_RECEB = [
  ['pix', 'PIX / transferência ao dono', 'dono'], ['deposito', 'Depósito do cliente', 'dono'], ['boleto', 'Boleto / fatura', 'dono'],
  ['carta_frete', 'Carta frete', 'motorista'], ['especie', 'Dinheiro com o motorista', 'motorista'], ['cheque', 'Cheque', 'dono'], ['outro', 'Outro', 'dono'],
];
export const nomeForma = (k) => FORMAS_RECEB.find((f) => f[0] === k)?.[1] || k || '—';
export const comPadrao = (k) => FORMAS_RECEB.find((f) => f[0] === k)?.[2] || 'dono';
// Recebimentos da viagem: os lançados (coleção recebimentos) + os antigos gravados dentro da viagem
export const recebimentos = (v, s) => [
  ...(Array.isArray(v.recebimentos) ? v.recebimentos : []),
  ...(s ? (s.recebimentos || []).filter((x) => x.viagemId === v.id) : []),
].filter((r) => +r.valor > 0);

// Fechamento de uma viagem: quanto ficou com o motorista, o que ele pagou, a comissão e quem deve a quem.
//   saldo > 0 → o motorista devolve à empresa; saldo < 0 → a empresa paga ao motorista
export function fechamento(s, v) {
  const lig = (arr) => arr.filter((x) => x.viagemId === v.id);
  const pm = v.pagoMotorista || {};
  const custos = [
    ...CUSTOS_VIAGEM.filter(([k]) => +v[k] > 0).map(([k, n]) => ({ k, label: n, valor: +v[k], pagoMotorista: !!pm[k], origem: 'viagem' })),
    ...lig(s.abastecimentos).map((a) => ({ k: 'ab:' + a.id, label: `Abastecimento ${date(a.data)}${a.posto ? ' · ' + a.posto : ''}`, valor: +a.valor || 0, pagoMotorista: !!a.pagoPeloMotorista, origem: 'abastecimentos', id: a.id })),
    ...lig(s.despesas).map((d) => ({ k: 'dp:' + d.id, label: `${nomeCategoria(d.categoria)} ${date(d.data)}${d.descricao ? ' · ' + d.descricao : ''}`, valor: +d.valor || 0, pagoMotorista: !!d.pagoPeloMotorista, origem: 'despesas', id: d.id })),
  ];
  const recs = recebimentos(v, s);
  const r = {
    frete: +v.valorFrete || 0, recs, custos,
    recebidoDono: sum(recs.filter((x) => x.com !== 'motorista'), (x) => +x.valor),
    comMotorista: sum(recs.filter((x) => x.com === 'motorista'), (x) => +x.valor),
    adiantamento: +v.adiantamento || 0,
    gastosMotorista: sum(custos.filter((c) => c.pagoMotorista), (c) => c.valor),
    custosTotal: sum(custos, (c) => c.valor),
    comissao: comissao(v, s), pct: pctViagem(v, s),
  };
  r.recebido = r.recebidoDono + r.comMotorista;
  r.faltaReceber = Math.max(0, r.frete - r.recebido);
  r.dinheiroMotorista = r.comMotorista + r.adiantamento;
  r.saldo = r.dinheiroMotorista - r.gastosMotorista - r.comissao;
  r.lucro = r.frete - r.custosTotal - r.comissao;
  r.margem = r.frete ? r.lucro / r.frete : 0;
  return r;
}

// Acerto do motorista no período: comissões + o que ele pagou − adiantamentos − o dinheiro do frete que ficou com ele.
//   saldo > 0 → a empresa paga ao motorista; saldo < 0 → o motorista devolve
export function acerto(s, mid, de, ate) {
  const viagens = s.viagens.filter((v) => v.motoristaId === mid && v.status === 'concluida' && noPeriodo(dataViagem(v), de, ate));
  const ids = new Set(viagens.map((v) => v.id));
  const adiant = [...viagens, ...s.viagens.filter((v) => v.motoristaId === mid && v.status !== 'concluida' && noPeriodo(v.dataSaida, de, ate))].filter((v) => +v.adiantamento > 0);
  const fs = viagens.map((v) => ({ v, f: fechamento(s, v) }));
  const pagos = [
    ...fs.flatMap(({ v, f }) => f.custos.filter((c) => c.pagoMotorista).map((c) => ({ data: dataViagem(v), descricao: `${c.label} · viagem #${v.numero}`, valor: c.valor }))),
    ...[...s.abastecimentos, ...s.despesas].filter((x) => x.motoristaId === mid && x.pagoPeloMotorista && !ids.has(x.viagemId) && noPeriodo(x.data, de, ate))
      .map((x) => ({ data: x.data, descricao: x.litros !== undefined ? 'Abastecimento' : nomeCategoria(x.categoria), valor: +x.valor || 0 })),
  ];
  const especie = fs.flatMap(({ v, f }) => f.recs.filter((x) => x.com === 'motorista').map((x) => ({ data: dataViagem(v), descricao: `${nomeForma(x.forma)} · viagem #${v.numero}`, valor: +x.valor })));
  const r = { viagens, adiant, pagos, especie, comissoes: sum(viagens, (v) => comissao(v, s)), reembolsos: sum(pagos, (x) => x.valor), adiantamentos: sum(adiant, (v) => +v.adiantamento), emEspecie: sum(especie, (x) => x.valor) };
  r.saldo = r.comissoes + r.reembolsos - r.adiantamentos - r.emEspecie;
  // o mesmo acerto, viagem por viagem (saldo > 0 → a empresa paga ao motorista; < 0 → ele devolve)
  r.porViagem = sortBy(fs.map(({ v, f }) => ({ v, f, comissao: f.comissao, pagou: f.gastosMotorista, ficou: f.comMotorista + f.adiantamento, saldo: -f.saldo })), (x) => dataViagem(x.v), true);
  r.foraDeViagem = [
    ...pagos.slice(sum(fs, ({ f }) => f.custos.filter((c) => c.pagoMotorista).length)).map((x) => ({ ...x, sinal: 1 })),
    ...adiant.filter((v) => !ids.has(v.id)).map((v) => ({ data: v.dataSaida, descricao: `Adiantamento · viagem #${v.numero || ''} ${v.destino} (em andamento)`, valor: +v.adiantamento, sinal: -1 })),
  ];
  return r;
}

// Agrupa lançamentos pela viagem a que pertencem (os sem viagem ficam no fim, com v = null)
export function porViagem(s, itens) {
  const g = new Map();
  for (const it of itens) { const k = it.x?.viagemId || it.viagemId || ''; if (!g.has(k)) g.set(k, []); g.get(k).push(it); }
  const out = [...g.entries()].map(([k, lista]) => ({ v: k ? s.viagens.find((v) => v.id === k) || null : null, id: k, itens: lista }));
  return sortBy(out, (x) => (x.v ? (x.v.dataSaida || '') : '0000'), true);
}

// Todos os custos do período, item por item (é o "extrato" do Painel). Soma = resultado().custos
export const CATS_CUSTO = { combustivel: 'Combustível', comissao: 'Comissões', oficina: 'Manutenção (oficina)', ...Object.fromEntries(CATEGORIAS) };
export function itensCusto(s, de, ate) {
  const out = [];
  const add = (cat, data, descricao, valor, veiculoId, motoristaId, col, id) => { if (+valor) out.push({ cat, data, descricao, valor: +valor, veiculoId, motoristaId, col, id }); };
  for (const v of s.viagens.filter((v) => v.status === 'concluida' && noPeriodo(dataViagem(v), de, ate))) {
    const rota = `#${v.numero} ${v.origem} → ${v.destino}`;
    add('combustivel', dataViagem(v), `Combustível · ${rota}`, v.combustivel, v.veiculoId, v.motoristaId, 'viagens', v.id);
    add('pedagio', dataViagem(v), `Pedágio · ${rota}`, v.pedagio, v.veiculoId, v.motoristaId, 'viagens', v.id);
    add('manutencao', dataViagem(v), `Manutenção · ${rota}`, v.manutencao, v.veiculoId, v.motoristaId, 'viagens', v.id);
    add('outros', dataViagem(v), `Outros · ${rota}`, v.outros, v.veiculoId, v.motoristaId, 'viagens', v.id);
    add('comissao', dataViagem(v), `Comissão ${pctViagem(v, s)}% · ${rota}`, comissao(v, s), v.veiculoId, v.motoristaId, 'viagens', v.id);
  }
  const mv = mapaViagens(s);
  for (const a of s.abastecimentos.filter((a) => noPeriodo(dataCusto(s, a, mv), de, ate))) add('combustivel', a.data, `Abastecimento${a.litros ? ' · ' + (+a.litros).toLocaleString('pt-BR') + ' l' : ''}${a.posto ? ' · ' + a.posto : ''}`, a.valor, a.veiculoId, a.motoristaId, 'abastecimentos', a.id);
  for (const d of s.despesas.filter((d) => noPeriodo(dataCusto(s, d, mv), de, ate))) add(d.categoria || 'outros', d.data, `${nomeCategoria(d.categoria)}${d.descricao ? ' · ' + d.descricao : ''}`, d.valor, d.veiculoId, d.motoristaId, 'despesas', d.id);
  for (const m of s.manutencoes.filter((m) => noPeriodo(m.data, de, ate))) add('oficina', m.data, `${nomeManut(m.tipo)}${m.descricao ? ' · ' + m.descricao : ''}${m.oficina ? ' (' + m.oficina + ')' : ''}`, m.valor, m.veiculoId, null, 'manutencoes', m.id);
  return out;
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
