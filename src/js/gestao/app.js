// EasyApp Frota — app de Gestão (dono da frota)
import { criarApp } from '../core/app.js';
import { editar } from '../core/form.js';
import * as D from '../dominio.js';
import { money, money0, moneyK, int, percent, date, dateShort, today, esc, sortBy, sum, monthLabel, uid, plural } from '../core/fmt.js';
import { icon, kpi, badge, empty, iniciais, toast, confirmar, insightCard, download, toCSV, waLink } from '../core/ui.js';
import { chart, hbars, legend } from '../core/charts.js';

const S = () => A.S();
const km = (v) => (+v || 0).toLocaleString('pt-BR') + ' km';
const opVeiculos = (s) => s.veiculos.filter((v) => v.ativo !== false).map((v) => [v.id, D.nomeVeiculo(v)]);
const opMotoristas = (s) => s.motoristas.filter((m) => m.ativo !== false).map((m) => [m.id, m.nome]);
const opClientes = (s) => sortBy(s.clientes, (c) => c.nome).map((c) => [c.id, c.nome]);

// ---------- Campos dos cadastros ----------
const CAMPOS_VEICULO = [
  { k: 'placa', label: 'Placa', obrig: true, maiusculas: true, ph: 'ABC-1D23' },
  { k: 'modelo', label: 'Marca / modelo', ph: 'Volvo FH 460' },
  { k: 'tipo', label: 'Tipo', tipo: 'select', opcoes: D.TIPOS_VEICULO },
  { k: 'ano', label: 'Ano', tipo: 'number' },
  { k: 'kmInicial', label: 'Km no cadastro', tipo: 'number', dica: 'O km atual é atualizado sozinho pelas viagens e abastecimentos.' },
  { k: 'oleoCadaKm', label: 'Troca de óleo a cada (km)', tipo: 'number', ph: '30000' },
  { k: 'revisaoCadaKm', label: 'Revisão a cada (km)', tipo: 'number', ph: '60000' },
  { k: 'ativo', label: 'Em operação', tipo: 'checkbox', padrao: true },
];
const CAMPOS_VENC = D.VENCIMENTOS.map(([k, n]) => ({ k: 'v_' + k, label: `${n} (vencimento)`, tipo: 'date' }));
const CAMPOS_MOTORISTA = [
  { k: 'nome', label: 'Nome', obrig: true, col: 2 },
  { k: 'telefone', label: 'WhatsApp', tipo: 'tel', ph: '54999999999' },
  { k: 'veiculoId', label: 'Veículo habitual', tipo: 'select', opcoes: opVeiculos },
  { k: 'cnhCategoria', label: 'Categoria da CNH', tipo: 'select', opcoes: ['B', 'C', 'D', 'E'].map((c) => [c, c]) },
  { k: 'cnhValidade', label: 'Validade da CNH', tipo: 'date' },
  { k: 'comissaoPct', label: 'Comissão sobre o frete (%)', tipo: 'number', padrao: 10, dica: 'Usada nas viagens novas e no acerto.' },
  { k: 'ativo', label: 'Ativo', tipo: 'checkbox', padrao: true },
];
const CAMPOS_CLIENTE = [
  { k: 'nome', label: 'Nome / razão social', obrig: true, col: 2 },
  { k: 'telefone', label: 'WhatsApp', tipo: 'tel' },
  { k: 'cnpj', label: 'CNPJ / CPF' },
  { k: 'prazoDias', label: 'Prazo de pagamento (dias)', tipo: 'number', padrao: 30 },
  { k: 'obs', label: 'Observações', tipo: 'textarea', col: 2 },
];
const CAMPOS_VIAGEM = [
  { k: 'veiculoId', label: 'Veículo', tipo: 'select', obrig: true, opcoes: opVeiculos },
  { k: 'motoristaId', label: 'Motorista', tipo: 'select', obrig: true, opcoes: opMotoristas },
  { k: 'clienteId', label: 'Cliente (contratante)', tipo: 'select', opcoes: opClientes },
  { k: 'carga', label: 'Carga', ph: 'Móveis, grãos…' },
  { k: 'origem', label: 'Origem', obrig: true, ph: 'Cidade/UF' },
  { k: 'destino', label: 'Destino', obrig: true, ph: 'Cidade/UF' },
  { k: 'dataSaida', label: 'Saída', tipo: 'date', obrig: true, padrao: today },
  { k: 'dataChegada', label: 'Chegada', tipo: 'date' },
  { k: 'kmInicio', label: 'Km na saída', tipo: 'number' },
  { k: 'kmFim', label: 'Km na chegada', tipo: 'number' },
  { k: 'valorFrete', label: 'Valor do frete', tipo: 'money' },
  { k: 'comissaoPct', label: 'Comissão do motorista (%)', tipo: 'number' },
  { k: 'adiantamento', label: 'Adiantamento ao motorista', tipo: 'money' },
  { k: 'status', label: 'Situação', tipo: 'select', obrig: true, padrao: 'planejada', opcoes: Object.entries(D.STATUS_VIAGEM).map(([k, v]) => [k, v.label]) },
  { k: 'recebido', label: 'Frete recebido do cliente', tipo: 'checkbox' },
  { k: 'obs', label: 'Observações', tipo: 'textarea', col: 2 },
];
const CAMPOS_ABAST = [
  { k: 'data', label: 'Data', tipo: 'date', obrig: true, padrao: today },
  { k: 'veiculoId', label: 'Veículo', tipo: 'select', obrig: true, opcoes: opVeiculos },
  { k: 'motoristaId', label: 'Motorista', tipo: 'select', opcoes: opMotoristas },
  { k: 'km', label: 'Km no painel', tipo: 'number', obrig: true },
  { k: 'litros', label: 'Litros', tipo: 'number', obrig: true },
  { k: 'valor', label: 'Valor total', tipo: 'money', obrig: true },
  { k: 'posto', label: 'Posto' },
  { k: 'tanqueCheio', label: 'Completou o tanque', tipo: 'checkbox', padrao: true },
  { k: 'pagoPeloMotorista', label: 'Pago pelo motorista (reembolsar no acerto)', tipo: 'checkbox', col: 2 },
];
const CAMPOS_DESPESA = [
  { k: 'data', label: 'Data', tipo: 'date', obrig: true, padrao: today },
  { k: 'categoria', label: 'Categoria', tipo: 'select', obrig: true, opcoes: D.CATEGORIAS },
  { k: 'valor', label: 'Valor', tipo: 'money', obrig: true },
  { k: 'veiculoId', label: 'Veículo', tipo: 'select', opcoes: opVeiculos },
  { k: 'motoristaId', label: 'Motorista', tipo: 'select', opcoes: opMotoristas },
  { k: 'descricao', label: 'Descrição', col: 2 },
  { k: 'pagoPeloMotorista', label: 'Pago pelo motorista (reembolsar no acerto)', tipo: 'checkbox', col: 2 },
];
const CAMPOS_MANUT = [
  { k: 'data', label: 'Data', tipo: 'date', obrig: true, padrao: today },
  { k: 'veiculoId', label: 'Veículo', tipo: 'select', obrig: true, opcoes: opVeiculos },
  { k: 'tipo', label: 'Serviço', tipo: 'select', obrig: true, opcoes: D.TIPOS_MANUT },
  { k: 'km', label: 'Km', tipo: 'number' },
  { k: 'valor', label: 'Valor', tipo: 'money' },
  { k: 'oficina', label: 'Oficina' },
  { k: 'descricao', label: 'O que foi feito', col: 2 },
];

const novaViagem = (base = {}) => editar({ titulo: 'Viagem', colecao: 'viagens', campos: CAMPOS_VIAGEM, prefixo: 'vg', doc: null, inicial: base,
  antesDeSalvar: (v, antes) => {
    if (!antes) { v.numero = D.proximoNumero(S()); v.conferido = true; }
    if (v.comissaoPct == null) v.comissaoPct = D.motorista(S(), v.motoristaId)?.comissaoPct ?? 0;
    if (v.kmFim && v.kmInicio && v.kmFim < v.kmInicio) return 'Km na chegada menor que na saída';
    if (v.recebido && !v.recebidoEm) v.recebidoEm = today();
  } });
const editarViagem = (id) => editar({ titulo: `Viagem #${S().viagens.find((v) => v.id === id)?.numero}`, colecao: 'viagens', campos: CAMPOS_VIAGEM, doc: S().viagens.find((v) => v.id === id),
  antesDeSalvar: (v) => { if (v.kmFim && v.kmInicio && v.kmFim < v.kmInicio) return 'Km na chegada menor que na saída'; if (v.recebido && !v.recebidoEm) v.recebidoEm = today(); if (!v.recebido) v.recebidoEm = null; } });
function editarVeiculo(doc) {
  const comVenc = doc ? { ...doc, ...Object.fromEntries(D.VENCIMENTOS.map(([k]) => ['v_' + k, doc.venc?.[k] || ''])) } : null;
  editar({ titulo: 'Veículo', colecao: 'veiculos', campos: [...CAMPOS_VEICULO, ...CAMPOS_VENC], doc: comVenc, prefixo: 've',
    antesDeSalvar: (v) => { v.venc = {}; for (const [k] of D.VENCIMENTOS) { if (v['v_' + k]) v.venc[k] = v['v_' + k]; delete v['v_' + k]; } } });
}

// ---------- App ----------
const A = criarApp({
  tipo: 'gestao',
  inicio: '#/painel',
  nav: [['#/painel', 'chart', 'Painel'], ['#/viagens', 'map', 'Viagens'], ['#/conferir', 'check', 'Conferir'], ['#/abastecimentos', 'fuel', 'Combustível'],
    ['#/despesas', 'receipt', 'Despesas'], ['#/veiculos', 'truck', 'Veículos'], ['#/motoristas', 'users', 'Motoristas'], ['#/clientes', 'store', 'Clientes']],
  tabs: [['#/painel', 'chart', 'Painel'], ['#/viagens', 'map', 'Viagens'], ['#/conferir', 'check', 'Conferir'], ['#/veiculos', 'truck', 'Veículos'], ['#/mais', 'menu', 'Mais']],
  badges: (s) => ({ '#/conferir': D.aConferir(s).length }),
  ativo: (h, r) => (h === '#/veiculos' && r.startsWith('#/veiculo/')) || (h === '#/motoristas' && r.startsWith('#/motorista/')),
  rotas: [['/painel', vPainel], ['/viagens', vViagens], ['/conferir', vConferir], ['/abastecimentos', vAbastecimentos], ['/despesas', vDespesas],
    ['/veiculos', vVeiculos], ['/veiculo/:id', vVeiculo], ['/motoristas', vMotoristas], ['/motorista/:id', vMotorista], ['/clientes', vClientes]],
  camposEmpresa: [['cidade', 'Cidade/UF'], ['cnpj', 'CNPJ'], ['whatsapp', 'WhatsApp da empresa', '5554999999999']],
  topoDireita: (s) => `<a href="#/conferir" style="color:#fff;position:relative">${icon('check')}${D.aConferir(s).length ? `<span class="badge dot" style="position:absolute;top:-6px;right:-8px">${D.aConferir(s).length}</span>` : ''}</a>`,
  aoMudar: (msg, externo, info) => {
    if (!externo || !info?.novo) return;
    const m = D.motorista(S(), info.doc.motoristaId)?.nome?.split(' ')[0] || 'Motorista';
    if (info.colecao === 'abastecimentos') toast(`${m} lançou um abastecimento (${money(info.doc.valor)})`);
    if (info.colecao === 'despesas') toast(`${m} lançou uma despesa (${money(info.doc.valor)})`);
    if (info.colecao === 'viagens') toast(`${m} iniciou uma viagem para ${info.doc.destino}`);
  },
  acoes: {
    novaViagem: () => novaViagem(),
    editarViagem: (el) => editarViagem(el.dataset.id),
    receber: (el) => { A.store.commit((s) => Object.assign(s.viagens.find((v) => v.id === el.dataset.id), { recebido: true, recebidoEm: today() })); toast('Frete marcado como recebido'); },
    novoAbast: (el) => editar({ titulo: 'Abastecimento', colecao: 'abastecimentos', campos: CAMPOS_ABAST, prefixo: 'ab', inicial: el.dataset.v ? { veiculoId: el.dataset.v } : null, antesDeSalvar: (a, antes) => { if (!antes) a.conferido = true; } }),
    editarAbast: (el) => editar({ titulo: 'Abastecimento', colecao: 'abastecimentos', campos: CAMPOS_ABAST, doc: S().abastecimentos.find((x) => x.id === el.dataset.id) }),
    novaDespesa: () => editar({ titulo: 'Despesa', colecao: 'despesas', campos: CAMPOS_DESPESA, prefixo: 'dp', antesDeSalvar: (d, antes) => { if (!antes) d.conferido = true; } }),
    editarDespesa: (el) => editar({ titulo: 'Despesa', colecao: 'despesas', campos: CAMPOS_DESPESA, doc: S().despesas.find((x) => x.id === el.dataset.id) }),
    novaManut: (el) => editar({ titulo: 'Manutenção', colecao: 'manutencoes', campos: CAMPOS_MANUT, prefixo: 'mn', inicial: el.dataset.v ? { veiculoId: el.dataset.v, km: D.kmAtual(S(), el.dataset.v) } : null }),
    editarManut: (el) => editar({ titulo: 'Manutenção', colecao: 'manutencoes', campos: CAMPOS_MANUT, doc: S().manutencoes.find((x) => x.id === el.dataset.id) }),
    novoVeiculo: () => editarVeiculo(null),
    editarVeiculo: (el) => editarVeiculo(S().veiculos.find((v) => v.id === el.dataset.id)),
    novoMotorista: () => editar({ titulo: 'Motorista', colecao: 'motoristas', campos: CAMPOS_MOTORISTA, prefixo: 'mo', onSalvo: (m, novo) => { if (novo) toast('Gere o acesso ao app em Configurações › Acesso dos motoristas'); } }),
    editarMotorista: (el) => editar({ titulo: 'Motorista', colecao: 'motoristas', campos: CAMPOS_MOTORISTA, doc: S().motoristas.find((x) => x.id === el.dataset.id) }),
    novoCliente: () => editar({ titulo: 'Cliente', colecao: 'clientes', campos: CAMPOS_CLIENTE, prefixo: 'cl' }),
    editarCliente: (el) => editar({ titulo: 'Cliente', colecao: 'clientes', campos: CAMPOS_CLIENTE, doc: S().clientes.find((x) => x.id === el.dataset.id) }),
    conferir: (el) => { const [col, id] = el.dataset.ref.split(':'); A.store.commit((s) => { s[col].find((x) => x.id === id).conferido = true; }); toast('Conferido'); },
    conferirTudo: async () => {
      const itens = D.aConferir(S());
      if (!(await confirmar(`Marcar ${plural(itens.length, 'lançamento')} como conferido? Depois disso os motoristas não alteram mais.`, { ok: 'Conferir tudo' }))) return;
      A.store.commit((s) => { for (const c of ['viagens', 'abastecimentos', 'despesas']) for (const x of s[c]) if (!x.conferido && x.motoristaId && (c !== 'viagens' || x.status === 'concluida')) x.conferido = true; });
      toast('Tudo conferido');
    },
    exportar: (el) => exportarPeriodo(el.dataset.p),
  },
});

const segPeriodo = (rota, p, extra = '') => `<div class="seg mb" style="max-width:100%;overflow-x:auto">${[['30d', '30 dias'], ['mes', 'Este mês'], ['ant', 'Mês passado'], ['ano', 'Este ano']].map(([v, n]) => `<button class="${p === v ? 'on' : ''}" data-act="goto" data-h="#/${rota}?p=${v}${extra}">${n}</button>`).join('')}</div>`;
const conferidoBadge = (x) => (x.motoristaId && !x.conferido ? badge('A conferir', 'warn') : '');

// ---------- Painel ----------
function vPainel({ query }) {
  const s = S();
  const p = query.p || '30d';
  const [de, ate, nome] = D.periodo(p);
  const r = D.resultado(s, de, ate);
  const hist = D.historico(s, 6);
  const al = D.alertas(s);
  const rec = D.aReceber(s);
  const custos = [['Combustível', r.combustivel, 'var(--s1)'], ['Despesas de viagem', r.despesas, 'var(--s2)'], ['Manutenção', r.manutencao, 'var(--s3)'], ['Comissões', r.comissoes, 'var(--ink-3)']];
  return A.tela('Painel', `
    ${A.pageHead('Painel', `${nome} · ${date(de)} a ${date(ate)}`, `<button class="btn ghost" data-act="exportar" data-p="${p}">${icon('download')} Exportar</button><button class="btn" data-act="novaViagem">${icon('plus')} Viagem</button>`)}
    ${segPeriodo('painel', p)}
    <div class="grid g4">
      ${kpi('Faturamento', money0(r.faturamento), `${plural(r.viagens, 'viagem', 'viagens')} concluídas`)}
      ${kpi('Custos', money0(r.custos), `combustível ${percent(r.faturamento ? r.combustivel / r.faturamento : 0)} do faturamento`)}
      ${kpi('Resultado', `<span class="${r.resultado >= 0 ? 'up' : 'down'}">${money0(r.resultado)}</span>`, `margem ${percent(r.margem)}`)}
      ${kpi('Rodado', km(r.km), r.km ? `custo ${money(r.custoKm)}/km · receita ${money(r.receitaKm)}/km` : '—')}
    </div>
    ${al.length ? `<div class="card mt"><div class="head"><h2>Atenção</h2><span class="muted small">${al.length}</span></div><div class="col">${al.slice(0, 8).map(insightCard).join('')}</div></div>` : ''}
    <div class="grid g-2-1 mt">
      <div class="card"><div class="head"><h2>Resultado por mês</h2></div>
        ${legend([['Faturamento', 'var(--s1)'], ['Custos', 'var(--s2)']])}
        ${chart({ type: 'line', height: 220, labels: hist.map((h) => monthLabel(h.mes)), series: [{ name: 'Faturamento', color: 'var(--s1)', values: hist.map((h) => h.faturamento) }, { name: 'Custos', color: 'var(--s2)', values: hist.map((h) => h.custos), dash: true }], fmt: moneyK })}</div>
      <div class="card"><div class="head"><h2>Para onde vai o dinheiro</h2></div>
        ${r.custos ? hbars(custos.map(([n, v, c]) => ({ label: n, value: v, color: c, sub: percent(v / r.custos) + ' dos custos' })), money0) : empty('Sem custos no período.', 'money')}
        <div class="small ink2 mt">A receber: <b>${money0(sum(rec, (v) => v.valorFrete))}</b> em ${plural(rec.length, 'frete')} <a href="#/viagens?f=receber">ver</a></div></div>
    </div>
    <div class="card pad-0 mt"><div style="padding:16px 16px 0" class="row between"><h2>Resultado por veículo</h2><span class="muted small">clique para detalhar</span></div><div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Veículo</th><th class="r">Viagens</th><th class="r hide-m">Km</th><th class="r hide-m">Consumo</th><th class="r">Faturamento</th><th class="r hide-m">Custos</th><th class="r">Resultado</th><th class="r hide-m">R$/km</th></tr></thead>
      <tbody>${sortBy(r.porVeiculo, (x) => -x.resultado).map((x) => { const c = D.consumo(s, x.v.id, de, ate); return `<tr class="click" data-act="goto" data-h="#/veiculo/${x.v.id}"><td><b>${esc(x.v.placa)}</b><div class="tiny muted">${esc(x.v.modelo || '')}</div></td><td class="r">${x.viagens}</td><td class="r hide-m">${int(x.km)}</td><td class="r hide-m">${c ? c.toFixed(2) + ' km/l' : '—'}</td><td class="r">${money0(x.faturamento)}</td><td class="r hide-m">${money0(x.custos)}</td><td class="r"><b class="${x.resultado >= 0 ? 'up' : 'down'}">${money0(x.resultado)}</b></td><td class="r hide-m">${x.km ? money(x.resultado / x.km) : '—'}</td></tr>`; }).join('') || `<tr><td colspan="8">${empty('Cadastre o primeiro veículo.', 'truck')}</td></tr>`}</tbody>
      <tfoot><tr><td>Total</td><td class="r">${r.viagens}</td><td class="r hide-m">${int(r.km)}</td><td class="hide-m"></td><td class="r">${money0(r.faturamento)}</td><td class="r hide-m">${money0(r.custos)}</td><td class="r">${money0(r.resultado)}</td><td class="r hide-m">${r.km ? money(r.resultado / r.km) : '—'}</td></tr></tfoot></table></div></div>
    <div class="tiny muted mt-s">Resultado = fretes das viagens concluídas − combustível − despesas − manutenção − comissões dos motoristas. Despesas gerais (sem veículo, ex.: seguro da frota) entram no total, não nos veículos.</div>`);
}

function exportarPeriodo(p) {
  const s = S();
  const [de, ate] = D.periodo(p);
  const dentro = (d) => d >= de && d <= ate;
  const vn = (id) => D.veiculo(s, id)?.placa || '';
  const mn = (id) => D.motorista(s, id)?.nome || '';
  const linhas = [['Tipo', 'Data', 'Veículo', 'Motorista', 'Descrição', 'Km', 'Litros', 'Valor', 'Conferido']];
  for (const v of s.viagens.filter((v) => dentro(D.dataViagem(v)))) linhas.push(['Viagem (frete)', v.dataChegada || v.dataSaida, vn(v.veiculoId), mn(v.motoristaId), `#${v.numero} ${v.origem} → ${v.destino} (${D.STATUS_VIAGEM[v.status]?.label})`, D.kmViagem(v), '', (+v.valorFrete || 0).toFixed(2).replace('.', ','), v.conferido ? 'sim' : 'não']);
  for (const a of s.abastecimentos.filter((a) => dentro(a.data))) linhas.push(['Abastecimento', a.data, vn(a.veiculoId), mn(a.motoristaId), a.posto || '', a.km, a.litros, (-a.valor).toFixed(2).replace('.', ','), a.conferido ? 'sim' : 'não']);
  for (const d of s.despesas.filter((d) => dentro(d.data))) linhas.push(['Despesa · ' + D.nomeCategoria(d.categoria), d.data, vn(d.veiculoId), mn(d.motoristaId), d.descricao || '', '', '', (-d.valor).toFixed(2).replace('.', ','), d.conferido ? 'sim' : 'não']);
  for (const m of s.manutencoes.filter((m) => dentro(m.data))) linhas.push(['Manutenção · ' + D.nomeManut(m.tipo), m.data, vn(m.veiculoId), '', `${m.descricao || ''} ${m.oficina ? '(' + m.oficina + ')' : ''}`, m.km || '', '', (-m.valor || 0).toFixed(2).replace('.', ','), '']);
  download(`frota-${de}-a-${ate}.csv`, toCSV(linhas), 'text/csv;charset=utf-8');
}

// ---------- Viagens ----------
function vViagens({ query }) {
  const s = S();
  const f = query.f || 'abertas';
  const filtros = { abertas: (v) => v.status !== 'concluida', receber: (v) => v.status === 'concluida' && !v.recebido && +v.valorFrete > 0, concluidas: (v) => v.status === 'concluida', todas: () => true };
  const lista = sortBy(s.viagens.filter(filtros[f]), (v) => v.dataSaida + String(v.numero).padStart(6, '0'), true);
  const totRec = sum(D.aReceber(s), (v) => v.valorFrete);
  return A.tela('Viagens', `${A.pageHead('Viagens', f === 'receber' ? `A receber: <b>${money0(totRec)}</b>` : '', A.busca('Buscar destino, placa, motorista…') + `<button class="btn" data-act="novaViagem">${icon('plus')} Viagem</button>`)}
    <div class="seg mb" style="max-width:100%;overflow-x:auto">${[['abertas', 'Em andamento'], ['receber', 'A receber'], ['concluidas', 'Concluídas'], ['todas', 'Todas']].map(([v, n]) => `<button class="${f === v ? 'on' : ''}" data-act="goto" data-h="#/viagens?f=${v}">${n}</button>`).join('')}</div>
    <div class="card pad-0"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Viagem</th><th class="hide-m">Veículo · motorista</th><th>Saída</th><th>Situação</th><th class="r">Frete</th><th class="r hide-m">Km</th><th></th></tr></thead>
    <tbody>${lista.slice(0, 300).map((v) => { const st = D.STATUS_VIAGEM[v.status]; const ve = D.veiculo(s, v.veiculoId), mo = D.motorista(s, v.motoristaId), cl = D.cliente(s, v.clienteId);
      return `<tr data-busca="${esc(`${v.numero} ${v.origem} ${v.destino} ${ve?.placa} ${mo?.nome} ${cl?.nome} ${v.carga}`)}"><td class="click" data-act="editarViagem" data-id="${v.id}"><b>#${v.numero} ${esc(v.origem)} → ${esc(v.destino)}</b><div class="tiny muted">${esc(cl?.nome || 'sem cliente')}${v.carga ? ' · ' + esc(v.carga) : ''}</div></td>
        <td class="hide-m small">${esc(ve?.placa || '—')} · ${esc(mo?.nome || '—')}</td><td>${dateShort(v.dataSaida)}</td>
        <td>${badge(st?.label || v.status, st?.tom)} ${conferidoBadge(v)}${v.status === 'concluida' && +v.valorFrete > 0 ? (v.recebido ? ' ' + badge('Recebido', 'ok') : '') : ''}</td>
        <td class="r">${+v.valorFrete ? money0(v.valorFrete) : '<span class="muted">definir</span>'}</td><td class="r hide-m">${D.kmViagem(v) ? int(D.kmViagem(v)) : '—'}</td>
        <td class="r">${v.status === 'concluida' && !v.recebido && +v.valorFrete > 0 ? `<button class="btn ghost sm" data-act="receber" data-id="${v.id}">Recebido</button>` : ''}</td></tr>`; }).join('') || `<tr><td colspan="7">${empty('Nenhuma viagem aqui.', 'map')}</td></tr>`}</tbody></table></div></div>`);
}

// ---------- Conferir lançamentos dos motoristas ----------
function vConferir() {
  const s = S();
  const itens = sortBy(D.aConferir(s).map((x) => {
    const col = x.origem !== undefined && x.destino !== undefined ? 'viagens' : x.litros !== undefined ? 'abastecimentos' : 'despesas';
    return { x, col, data: col === 'viagens' ? D.dataViagem(x) : x.data };
  }), (i) => i.data, true);
  const desc = ({ x, col }) => col === 'viagens' ? `Viagem #${x.numero || ''} ${esc(x.origem)} → ${esc(x.destino)} · ${D.kmViagem(x) ? int(D.kmViagem(x)) + ' km' : 'km não informado'}${+x.valorFrete ? '' : ' · <b>definir valor do frete</b>'}`
    : col === 'abastecimentos' ? `Abastecimento · ${x.litros} l · ${int(x.km)} km${x.posto ? ' · ' + esc(x.posto) : ''}` : `${esc(D.nomeCategoria(x.categoria))}${x.descricao ? ' · ' + esc(x.descricao) : ''}`;
  const act = { viagens: 'editarViagem', abastecimentos: 'editarAbast', despesas: 'editarDespesa' };
  return A.tela('Conferir', `${A.pageHead('Conferir lançamentos', 'Tudo o que os motoristas lançaram pelo app. Depois de conferido, o motorista não altera mais.', itens.length ? `<button class="btn" data-act="conferirTudo">${icon('check')} Conferir tudo</button>` : '')}
    <div class="card pad-0"><div class="list" style="padding:0 16px">${itens.map((i) => `<div class="li"><div class="avatar">${icon(i.col === 'viagens' ? 'map' : i.col === 'abastecimentos' ? 'fuel' : 'receipt')}</div>
      <div class="grow click" data-act="${act[i.col]}" data-id="${i.x.id}"><div class="t small">${desc(i)}</div><div class="s">${dateShort(i.data)} · ${esc(D.motorista(s, i.x.motoristaId)?.nome || '—')} · ${esc(D.veiculo(s, i.x.veiculoId)?.placa || '—')}${i.x.pagoPeloMotorista ? ' · <b>pago pelo motorista</b>' : ''}</div></div>
      ${i.col !== 'viagens' ? `<b class="num">${money(i.x.valor)}</b>` : ''}<button class="btn sm" data-act="conferir" data-ref="${i.col}:${i.x.id}">${icon('check')}</button></div>`).join('') || empty('Tudo conferido. 👍', 'check')}</div></div>`);
}

// ---------- Combustível ----------
function vAbastecimentos({ query }) {
  const s = S();
  const p = query.p || '30d';
  const [de, ate, nome] = D.periodo(p);
  const ab = sortBy(s.abastecimentos.filter((a) => a.data >= de && a.data <= ate && (!query.v || a.veiculoId === query.v)), (a) => a.data + String(a.km).padStart(9, '0'), true);
  const litros = sum(ab, (a) => +a.litros), valor = sum(ab, (a) => +a.valor);
  const porV = s.veiculos.map((v) => ({ v, c: D.consumo(s, v.id, de, ate), l: sum(ab.filter((a) => a.veiculoId === v.id), (a) => +a.litros) })).filter((x) => x.l);
  return A.tela('Combustível', `${A.pageHead('Combustível', nome, `<button class="btn" data-act="novoAbast">${icon('plus')} Abastecimento</button>`)}${segPeriodo('abastecimentos', p, query.v ? '&v=' + query.v : '')}
    <div class="grid g4">${kpi('Gasto', money0(valor), plural(ab.length, 'abastecimento'))}${kpi('Litros', int(litros), litros ? `média ${money(valor / litros)}/l` : '—')}
      ${kpi('Melhor consumo', porV.length ? `${(sortBy(porV.filter((x) => x.c), (x) => -x.c)[0]?.c || 0).toFixed(2)} km/l` : '—', esc(sortBy(porV.filter((x) => x.c), (x) => -x.c)[0]?.v.placa || ''))}
      ${kpi('Pago pelos motoristas', money0(sum(ab.filter((a) => a.pagoPeloMotorista), (a) => a.valor)), 'reembolso no acerto')}</div>
    ${porV.length ? `<div class="card mt"><div class="head"><h2>Consumo por veículo</h2><span class="muted small">km/l · tanque cheio</span></div>${hbars(porV.filter((x) => x.c).map((x) => ({ label: x.v.placa + ' · ' + (x.v.modelo || ''), value: x.c, vtxt: x.c.toFixed(2) + ' km/l', sub: `${int(x.l)} litros`, attrs: `data-act="goto" data-h="#/abastecimentos?p=${p}&v=${x.v.id}"` })), (v) => v.toFixed(2))}</div>` : ''}
    ${query.v ? `<div class="mt"><a href="#/abastecimentos?p=${p}" class="btn ghost sm">${esc(D.veiculo(s, query.v)?.placa)} ✕</a></div>` : ''}
    <div class="card pad-0 mt"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th>Veículo</th><th class="hide-m">Motorista</th><th class="r">Km</th><th class="r">Litros</th><th class="r">Valor</th><th class="r hide-m">R$/l</th><th></th></tr></thead>
      <tbody>${ab.map((a) => `<tr class="click" data-act="editarAbast" data-id="${a.id}"><td>${dateShort(a.data)}</td><td>${esc(D.veiculo(s, a.veiculoId)?.placa || '—')}</td><td class="hide-m small">${esc(D.motorista(s, a.motoristaId)?.nome || '—')}</td><td class="r">${int(a.km)}</td><td class="r">${(+a.litros).toLocaleString('pt-BR')}</td><td class="r">${money(a.valor)}</td><td class="r hide-m">${a.litros ? money(a.valor / a.litros) : '—'}</td><td>${conferidoBadge(a)}</td></tr>`).join('') || `<tr><td colspan="8">${empty('Nenhum abastecimento no período.', 'fuel')}</td></tr>`}</tbody></table></div></div>`);
}

// ---------- Despesas ----------
function vDespesas({ query }) {
  const s = S();
  const p = query.p || '30d';
  const [de, ate, nome] = D.periodo(p);
  const ds = sortBy(s.despesas.filter((d) => d.data >= de && d.data <= ate), (d) => d.data, true);
  const man = s.manutencoes.filter((m) => m.data >= de && m.data <= ate);
  const porCat = sortBy(D.CATEGORIAS.map(([k, n]) => ({ label: n, value: sum(ds.filter((d) => d.categoria === k), (d) => +d.valor) })).filter((x) => x.value), (x) => -x.value);
  return A.tela('Despesas', `${A.pageHead('Despesas', `${nome} · despesas de viagem e gerais (manutenção fica em cada veículo)`, `<button class="btn" data-act="novaDespesa">${icon('plus')} Despesa</button>`)}${segPeriodo('despesas', p)}
    <div class="grid g-2-1"><div class="card"><div class="head"><h2>Por categoria</h2><b>${money0(sum(ds, (d) => d.valor))}</b></div>${porCat.length ? hbars(porCat, money0) : empty('Nenhuma despesa no período.', 'receipt')}</div>
      <div class="col">${kpi('Manutenção no período', money0(sum(man, (m) => m.valor)), plural(man.length, 'serviço'))}${kpi('Pago pelos motoristas', money0(sum(ds.filter((d) => d.pagoPeloMotorista), (d) => d.valor)), 'reembolso no acerto')}</div></div>
    <div class="card pad-0 mt"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th>Categoria</th><th class="hide-m">Descrição</th><th class="hide-m">Veículo · motorista</th><th class="r">Valor</th><th></th></tr></thead>
      <tbody>${ds.map((d) => `<tr class="click" data-act="editarDespesa" data-id="${d.id}"><td>${dateShort(d.data)}</td><td>${esc(D.nomeCategoria(d.categoria))}</td><td class="hide-m small">${esc(d.descricao || '')}</td><td class="hide-m small">${esc(D.veiculo(s, d.veiculoId)?.placa || 'geral')}${d.motoristaId ? ' · ' + esc(D.motorista(s, d.motoristaId)?.nome || '') : ''}</td><td class="r">${money(d.valor)}</td><td>${conferidoBadge(d)}</td></tr>`).join('') || `<tr><td colspan="6">${empty('—')}</td></tr>`}</tbody></table></div></div>`);
}

// ---------- Veículos ----------
function vVeiculos() {
  const s = S();
  const [de, ate] = D.periodo('mes');
  const r = D.resultado(s, de, ate);
  const al = D.alertas(s);
  return A.tela('Veículos', `${A.pageHead('Veículos', `${plural(s.veiculos.filter((v) => v.ativo !== false).length, 'veículo')} em operação`, `<button class="btn" data-act="novoVeiculo">${icon('plus')} Veículo</button>`)}
    <div class="grid g3">${sortBy(s.veiculos, (v) => (v.ativo === false ? 'z' : '') + v.placa).map((v) => {
      const x = r.porVeiculo.find((y) => y.v.id === v.id) || { resultado: 0, viagens: 0 };
      const a = al.filter((y) => y.link === `#/veiculo/${v.id}`);
      const emViagem = s.viagens.find((y) => y.veiculoId === v.id && y.status === 'em_viagem');
      return `<a class="card col ${v.ativo === false ? 'li off' : ''}" href="#/veiculo/${v.id}" style="color:inherit;gap:8px"><div class="row between"><div><div style="font-family:var(--font-t);font-size:20px">${esc(v.placa)}</div><div class="small muted">${esc(v.modelo || '')}${v.ano ? ' · ' + v.ano : ''}</div></div>${emViagem ? badge('Em viagem', 'warn') : v.ativo === false ? badge('Parado') : badge('Disponível', 'ok')}</div>
        <div class="small ink2">${km(D.kmAtual(s, v.id))} · ${D.consumo(s, v.id)?.toFixed(2) || '—'} km/l</div>
        <div class="small">Este mês: <b class="${x.resultado >= 0 ? 'up' : 'down'}">${money0(x.resultado)}</b> em ${plural(x.viagens, 'viagem', 'viagens')}</div>
        ${a.length ? `<div class="row gap-s wrap">${a.map((y) => badge(y.titulo.split(' · ')[0], y.nivel === 'critico' ? 'crit' : 'warn')).join('')}</div>` : ''}</a>`;
    }).join('') || `<div class="card">${empty('Cadastre o primeiro veículo.', 'truck')}</div>`}</div>`);
}

function vVeiculo({ id }) {
  const s = S();
  const v = D.veiculo(s, id);
  if (!v) return A.tela('Veículo', empty('Veículo não encontrado'), { back: true });
  const hist = D.historico(s, 6).map((h) => ({ mes: h.mes, ...h.porVeiculo.find((x) => x.v.id === id) }));
  const al = D.alertas(s).filter((y) => y.link === `#/veiculo/${id}`);
  const man = sortBy(s.manutencoes.filter((m) => m.veiculoId === id), (m) => m.data, true);
  const vgs = sortBy(s.viagens.filter((x) => x.veiculoId === id), (x) => x.dataSaida, true).slice(0, 12);
  const [de, ate] = D.periodo('ano');
  const ano = D.resultado(s, de, ate).porVeiculo.find((x) => x.v.id === id) || {};
  return A.tela(v.placa, `${A.pageHead(`${esc(v.placa)} <span class="muted" style="font-size:16px">${esc(v.modelo || '')}</span>`, `${esc(D.TIPOS_VEICULO.find((t) => t[0] === v.tipo)?.[1] || '')}${v.ano ? ' · ' + v.ano : ''} · ${km(D.kmAtual(s, id))}`,
      `<button class="btn ghost" data-act="editarVeiculo" data-id="${id}">${icon('edit')} Editar</button><button class="btn ghost" data-act="novoAbast" data-v="${id}">${icon('fuel')} Abastecimento</button><button class="btn" data-act="novaManut" data-v="${id}">${icon('wrench')} Manutenção</button>`)}
    ${al.length ? `<div class="col mb">${al.map(insightCard).join('')}</div>` : ''}
    <div class="grid g4">${kpi('Resultado no ano', money0(ano.resultado || 0), `margem ${percent(ano.margem || 0)}`)}${kpi('Faturamento no ano', money0(ano.faturamento || 0), plural(ano.viagens || 0, 'viagem', 'viagens'))}${kpi('Consumo médio', D.consumo(s, id) ? D.consumo(s, id).toFixed(2) + ' km/l' : '—', 'tanque cheio')}${kpi('Custo por km', ano.km ? money(ano.custoKm) : '—', `${int(ano.km || 0)} km no ano`)}</div>
    <div class="card mt"><div class="head"><h2>Resultado por mês</h2></div>${chart({ type: 'columns', height: 190, data: hist.map((h) => ({ label: monthLabel(h.mes), value: Math.max(0, h.resultado || 0), tip: `<b>${monthLabel(h.mes)}</b><br>Faturamento ${money0(h.faturamento || 0)}<br>Custos ${money0(h.custos || 0)}<br>Resultado ${money0(h.resultado || 0)}` })), fmt: moneyK })}</div>
    <div class="grid g2 mt">
      <div class="card"><div class="head"><h2>Documentos</h2></div><div class="list">${D.VENCIMENTOS.map(([k, n]) => `<div class="li"><div class="grow t small">${n}</div>${v.venc?.[k] ? badge(date(v.venc[k]), v.venc[k] < today() ? 'crit' : '') : '<span class="muted small">não informado</span>'}</div>`).join('')}</div>
        <div class="tiny muted mt-s">Óleo a cada ${v.oleoCadaKm ? km(v.oleoCadaKm) : '—'} · revisão a cada ${v.revisaoCadaKm ? km(v.revisaoCadaKm) : '—'}</div></div>
      <div class="card"><div class="head"><h2>Manutenções</h2></div><div class="list">${man.map((m) => `<a class="li" href="#" data-act="editarManut" data-id="${m.id}"><div class="grow"><div class="t small">${esc(D.nomeManut(m.tipo))}${m.descricao ? ' · ' + esc(m.descricao) : ''}</div><div class="s">${date(m.data)}${m.km ? ' · ' + km(m.km) : ''}${m.oficina ? ' · ' + esc(m.oficina) : ''}</div></div><b class="num small">${money0(m.valor)}</b></a>`).join('') || empty('Nenhuma manutenção registrada.', 'wrench')}</div></div>
    </div>
    <div class="card pad-0 mt"><div style="padding:16px 16px 0"><h2>Últimas viagens</h2></div><div class="tbl-wrap"><table class="tbl"><tbody>${vgs.map((x) => `<tr class="click" data-act="editarViagem" data-id="${x.id}"><td>${dateShort(x.dataSaida)}</td><td>#${x.numero} ${esc(x.origem)} → ${esc(x.destino)}</td><td class="hide-m small">${esc(D.motorista(s, x.motoristaId)?.nome || '')}</td><td class="r">${money0(x.valorFrete)}</td></tr>`).join('') || `<tr><td>${empty('—')}</td></tr>`}</tbody></table></div></div>`, { back: true });
}

// ---------- Motoristas ----------
function vMotoristas() {
  const s = S();
  const [de, ate] = D.periodo('mes');
  return A.tela('Motoristas', `${A.pageHead('Motoristas', 'O acesso ao app de cada motorista (código + PIN) fica em Configurações.', `<button class="btn ghost" data-act="goto" data-h="#/config">${icon('link')} Acessos</button><button class="btn" data-act="novoMotorista">${icon('plus')} Motorista</button>`)}
    <div class="card pad-0"><div class="list" style="padding:0 16px">${sortBy(s.motoristas, (m) => (m.ativo === false ? 'z' : '') + m.nome).map((m) => {
      const ac = D.acerto(s, m.id, de, ate);
      const cnh = m.cnhValidade && m.cnhValidade < today() ? badge('CNH vencida', 'crit') : '';
      return `<a class="li ${m.ativo === false ? 'off' : ''}" href="#/motorista/${m.id}" data-busca="${esc(m.nome)}"><div class="avatar">${esc(iniciais(m.nome))}</div><div class="grow"><div class="t">${esc(m.nome)} ${cnh}</div><div class="s">${esc(D.veiculo(s, m.veiculoId)?.placa || 'sem veículo')} · comissão ${m.comissaoPct || 0}% · ${plural(ac.viagens.length, 'viagem', 'viagens')} no mês</div></div><div class="r"><div class="small muted">acerto do mês</div><b class="num">${money0(ac.saldo)}</b></div></a>`;
    }).join('') || empty('Cadastre o primeiro motorista.', 'users')}</div></div>`);
}

function vMotorista({ id, query }) {
  const s = S();
  const m = D.motorista(s, id);
  if (!m) return A.tela('Motorista', empty('Motorista não encontrado'), { back: true });
  const p = query.p || '30d';
  const [de, ate, nome] = D.periodo(p);
  const ac = D.acerto(s, id, de, ate);
  const texto = `Acerto ${nome.toLowerCase()} (${date(de)} a ${date(ate)}) — ${m.nome}\n\nComissões: ${money(ac.comissoes)} (${ac.viagens.length} viagens)\nReembolsos: ${money(ac.reembolsos)}\nAdiantamentos: −${money(ac.adiantamentos)}\nSaldo: ${money(ac.saldo)}`;
  return A.tela(m.nome, `${A.pageHead(esc(m.nome), `${esc(D.veiculo(s, m.veiculoId)?.placa || 'sem veículo habitual')} · CNH ${esc(m.cnhCategoria || '—')} até ${date(m.cnhValidade)} · comissão ${m.comissaoPct || 0}%`,
      `<a class="btn ghost" target="_blank" rel="noopener" href="${waLink(m.telefone, texto)}">${icon('whatsapp')} Enviar acerto</a><button class="btn ghost" data-act="editarMotorista" data-id="${id}">${icon('edit')} Editar</button>`)}
    ${segPeriodo(`motorista/${id}`, p)}
    <div class="grid g4">${kpi('Comissões', money0(ac.comissoes), plural(ac.viagens.length, 'viagem', 'viagens'))}${kpi('Reembolsos', money0(ac.reembolsos), 'gastos pagos por ele')}${kpi('Adiantamentos', money0(ac.adiantamentos), 'já pagos')}${kpi('Saldo do acerto', `<span class="${ac.saldo >= 0 ? '' : 'down'}">${money0(ac.saldo)}</span>`, ac.saldo >= 0 ? 'a pagar ao motorista' : 'motorista deve à empresa')}</div>
    <div class="card pad-0 mt"><div style="padding:16px 16px 0"><h2>Detalhe</h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th>Item</th><th class="r">Valor</th></tr></thead><tbody>
      ${ac.viagens.map((v) => `<tr><td>${dateShort(D.dataViagem(v))}</td><td>Comissão ${v.comissaoPct}% · #${v.numero} ${esc(v.origem)} → ${esc(v.destino)} (${money0(v.valorFrete)})</td><td class="r up">${money(D.comissao(v))}</td></tr>`).join('')}
      ${ac.pagos.map((x) => `<tr><td>${dateShort(x.data)}</td><td>Reembolso · ${x.litros !== undefined ? 'abastecimento' : esc(D.nomeCategoria(x.categoria))}</td><td class="r up">${money(x.valor)}</td></tr>`).join('')}
      ${ac.adiant.map((v) => `<tr><td>${dateShort(v.dataSaida)}</td><td>Adiantamento · viagem #${v.numero}</td><td class="r down">−${money(v.adiantamento)}</td></tr>`).join('')}
      </tbody><tfoot><tr><td></td><td>Saldo</td><td class="r">${money(ac.saldo)}</td></tr></tfoot></table></div></div>`, { back: true });
}

// ---------- Clientes ----------
function vClientes() {
  const s = S();
  return A.tela('Clientes', `${A.pageHead('Clientes', 'Quem contrata os fretes', A.busca('Buscar…') + `<button class="btn" data-act="novoCliente">${icon('plus')} Cliente</button>`)}
    <div class="card pad-0"><div class="list" style="padding:0 16px">${sortBy(s.clientes, (c) => c.nome).map((c) => {
      const vs = s.viagens.filter((v) => v.clienteId === c.id && v.status === 'concluida');
      const rec = sum(vs.filter((v) => !v.recebido), (v) => v.valorFrete);
      return `<a class="li" href="#" data-act="editarCliente" data-id="${c.id}" data-busca="${esc(c.nome)}"><div class="avatar">${esc(iniciais(c.nome))}</div><div class="grow"><div class="t">${esc(c.nome)}</div><div class="s">${plural(vs.length, 'frete')} · ${money0(sum(vs, (v) => v.valorFrete))}</div></div>${rec ? `<div class="r"><div class="small muted">a receber</div><b class="num">${money0(rec)}</b></div>` : ''}</a>`;
    }).join('') || empty('Nenhum cliente cadastrado.', 'store')}</div></div>`);
}

A.iniciar();
