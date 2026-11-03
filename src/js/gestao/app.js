// EasyApp Frota — app de Gestão (dono da frota)
import { criarApp } from '../core/app.js';
import { editar } from '../core/form.js';
import * as D from '../dominio.js';
import { money, money0, moneyK, int, percent, date, dateShort, today, esc, sortBy, sum, monthLabel, uid, plural } from '../core/fmt.js';
import { icon, kpi, badge, empty, iniciais, toast, confirmar, insightCard, download, toCSV, waLink, modal, closeModal } from '../core/ui.js';
import { chart, hbars, legend } from '../core/charts.js';
import { ligarTres, completarTres } from '../tres.js';
import { resumoHTML, relatorio, textoWhats } from './fechamento.js';

// Motorista e caminhão andam juntos: escolher um puxa o outro (dá para trocar quando outro motorista cobre)
function ligarVinculo(formId) {
  const f = document.getElementById(formId);
  if (!f) return;
  f.addEventListener('change', (e) => {
    const s = S(), el = f.elements;
    if (e.target.name === 'motoristaId') {
      const m = D.motorista(s, e.target.value);
      if (m?.veiculoId && el.veiculoId) el.veiculoId.value = m.veiculoId;
      if (m && el.comissaoPct && m.comissaoPct != null) el.comissaoPct.value = m.comissaoPct;
    }
    if (e.target.name === 'veiculoId' && el.motoristaId) {
      const m = s.motoristas.find((x) => x.veiculoId === e.target.value && x.ativo !== false);
      if (m) { el.motoristaId.value = m.id; if (el.comissaoPct && m.comissaoPct != null) el.comissaoPct.value = m.comissaoPct; }
    }
  });
}

const S = () => A.S();
const km = (v) => (+v || 0).toLocaleString('pt-BR') + ' km';
const opVeiculos = (s) => s.veiculos.filter((v) => v.ativo !== false).map((v) => [v.id, D.nomeVeiculo(v)]);
const opMotoristas = (s) => s.motoristas.filter((m) => m.ativo !== false).map((m) => [m.id, m.nome]);
const opClientes = (s) => sortBy(s.clientes, (c) => c.nome).map((c) => [c.id, c.nome]);

// ---------- Campos dos cadastros ----------
const CAMPOS_VEICULO = [
  { k: 'placa', label: 'Placa', obrig: true, maiusculas: true, ph: 'ABC-1D23' },
  { k: 'apelido', label: 'Apelido', ph: 'FH540', dica: 'Como você chama o caminhão (aparece junto da placa).' },
  { k: 'modelo', label: 'Marca / modelo', ph: 'Volvo FH 460' },
  { k: 'motoristaId', label: 'Motorista', tipo: 'select', opcoes: (s) => s.motoristas.filter((m) => m.ativo !== false).map((m) => [m.id, m.nome]) },
  { k: 'tipo', label: 'Tipo', tipo: 'select', opcoes: D.TIPOS_VEICULO },
  { k: 'ano', label: 'Ano', tipo: 'number' },
  { k: 'kmInicial', label: 'Km no cadastro', tipo: 'inteiro', dica: 'O km atual é atualizado sozinho pelas viagens e abastecimentos.' },
  { k: 'oleoCadaKm', label: 'Troca de óleo a cada (km)', tipo: 'inteiro', ph: '30.000' },
  { k: 'revisaoCadaKm', label: 'Revisão a cada (km)', tipo: 'inteiro', ph: '60.000' },
  { k: 'ativo', label: 'Em operação', tipo: 'checkbox', padrao: true },
];
const CAMPOS_VENC = D.VENCIMENTOS.map(([k, n]) => ({ k: 'v_' + k, label: `${n} (vencimento)`, tipo: 'date' }));
const CAMPOS_MOTORISTA = [
  { k: 'nome', label: 'Nome', obrig: true, col: 2 },
  { k: 'telefone', label: 'WhatsApp', tipo: 'tel', ph: '54999999999' },
  { k: 'veiculoId', label: 'Veículo habitual', tipo: 'select', opcoes: opVeiculos },
  { k: 'cnhCategoria', label: 'Categoria da CNH', tipo: 'select', opcoes: ['B', 'C', 'D', 'E'].map((c) => [c, c]) },
  { k: 'cnhValidade', label: 'Validade da CNH', tipo: 'date' },
  { k: 'comissaoPct', label: 'Comissão sobre o frete (%)', tipo: 'number', padrao: 12, dica: 'Vale para as viagens dele; no fechamento dá para mudar.' },
  { k: 'ativo', label: 'Ativo', tipo: 'checkbox', padrao: true },
];
const CAMPOS_CLIENTE = [
  { k: 'nome', label: 'Nome / razão social', obrig: true, col: 2 },
  { k: 'telefone', label: 'WhatsApp', tipo: 'tel' },
  { k: 'cnpj', label: 'CNPJ / CPF' },
  { k: 'prazoDias', label: 'Prazo de pagamento (dias)', tipo: 'number', padrao: 30 },
  { k: 'obs', label: 'Observações', tipo: 'textarea', col: 2 },
];
const SITUACOES = Object.entries(D.STATUS_VIAGEM).map(([k, v]) => [k, v.label]);
const naEdicao = (d) => !!d.id;
const CAMPOS_VIAGEM = [
  { k: 'motoristaId', label: 'Motorista', tipo: 'select', obrig: true, opcoes: opMotoristas },
  { k: 'veiculoId', label: 'Caminhão', tipo: 'select', obrig: true, opcoes: opVeiculos, dica: 'Vem do motorista; troque se for outro caminhão.' },
  { k: 'origem', label: 'Origem', obrig: true, ph: 'Cidade/UF' },
  { k: 'destino', label: 'Destino', obrig: true, ph: 'Cidade/UF' },
  { k: 'clienteId', label: 'Cliente (contratante)', tipo: 'select', opcoes: opClientes },
  { k: 'carga', label: 'Carga', ph: 'Adubo, grãos…' },
  { k: 'valorFrete', label: 'Valor do frete', tipo: 'money' },
  { k: 'comissaoPct', label: 'Comissão do motorista (%)', tipo: 'number', dica: 'Vem do cadastro do motorista.' },
  { k: 'dataSaida', label: 'Data de saída', tipo: 'date', obrig: true, padrao: today },
  { k: 'adiantamento', label: 'Adiantamento ao motorista', tipo: 'money' },
  { k: 'kmInicio', label: 'Km do painel na saída', tipo: 'inteiro' },
  { k: 'status', label: 'Situação', tipo: 'select', obrig: true, padrao: 'planejada', opcoes: SITUACOES, dica: 'Planejada: o motorista inicia pelo app dele.' },
  { k: 'dataChegada', label: 'Data de chegada', tipo: 'date', se: naEdicao },
  { k: 'kmFim', label: 'Km do painel na chegada', tipo: 'inteiro', se: naEdicao },
  { k: 'kmRodado', label: 'Km rodado', tipo: 'inteiro', se: naEdicao, dica: 'Só se não tiver o km do painel.' },
  { k: 'recebido', label: 'Frete todo recebido do cliente', tipo: 'checkbox', se: naEdicao },
  { k: 'obs', label: 'Observações', tipo: 'textarea', col: 2 },
];
const CAMPOS_ABAST = [
  { k: 'data', label: 'Data', tipo: 'date', obrig: true, padrao: today },
  { k: 'veiculoId', label: 'Veículo', tipo: 'select', obrig: true, opcoes: opVeiculos },
  { k: 'motoristaId', label: 'Motorista', tipo: 'select', opcoes: opMotoristas },
  { k: 'km', label: 'Km no painel', tipo: 'inteiro', obrig: true },
  { k: 'litros', label: 'Litros', tipo: 'number', obrig: true },
  { k: 'valor', label: 'Valor total', tipo: 'money', obrig: true },
  { k: 'precoLitro', label: 'Preço por litro', tipo: 'money', dica: 'Preencha 2 de 3 (valor, litros, preço): o terceiro é calculado na hora.' },
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
  { k: 'km', label: 'Km', tipo: 'inteiro' },
  { k: 'valor', label: 'Valor', tipo: 'money' },
  { k: 'oficina', label: 'Oficina' },
  { k: 'descricao', label: 'O que foi feito', col: 2 },
];

const checarViagem = (v) => {
  if (v.kmFim && v.kmInicio && v.kmFim < v.kmInicio) return 'Km na chegada menor que na saída';
  if (v.status === 'concluida' && !v.dataChegada) v.dataChegada = today();
  if (v.dataChegada && v.dataChegada < v.dataSaida) return 'A chegada está antes da saída';
};
// Abrir viagem (gestão): motorista, caminhão, rota e frete. Custos e recebimentos vão sendo lançados nela depois.
const novaViagem = (base = {}) => {
  const m0 = S().motoristas.find((m) => m.ativo !== false);
  editar({ titulo: 'Abrir viagem', colecao: 'viagens', campos: CAMPOS_VIAGEM, prefixo: 'vg', doc: null,
    inicial: { motoristaId: m0?.id, veiculoId: m0?.veiculoId, comissaoPct: m0?.comissaoPct ?? '', ...base },
    antesDeSalvar: (v) => {
      v.numero = D.proximoNumero(S()); v.conferido = false;
      if (v.comissaoPct == null) v.comissaoPct = D.motorista(S(), v.motoristaId)?.comissaoPct ?? null;
      return checarViagem(v);
    },
    onSalvo: (v) => { if (v) location.hash = '#/viagem/' + v.id; } });
  ligarVinculo('fed');
};
const editarViagem = (id) => {
  const doc = S().viagens.find((v) => v.id === id);
  editar({ titulo: `Viagem #${doc?.numero || ''}`, colecao: 'viagens', campos: CAMPOS_VIAGEM, doc, apagar: false,
    antesDeSalvar: (v) => { const e = checarViagem(v); if (e) return e; if (v.recebido && !v.recebidoEm) v.recebidoEm = today(); if (!v.recebido) v.recebidoEm = null; } });
  ligarVinculo('fed');
};

// Lançamentos dentro da viagem: escolhe o tipo e lança (o caminhão e o motorista vêm da viagem)
const CAMPOS_ABAST_V = [
  { k: 'data', label: 'Data', tipo: 'date', obrig: true, padrao: today },
  { k: 'km', label: 'Km no painel', tipo: 'inteiro' },
  { k: 'valor', label: 'Valor total', tipo: 'money', obrig: true },
  { k: 'litros', label: 'Litros', tipo: 'number' },
  { k: 'precoLitro', label: 'Preço por litro', tipo: 'money', dica: 'Preencha 2 de 3 (valor, litros, preço): o terceiro é calculado.' },
  { k: 'posto', label: 'Posto' },
  { k: 'pagoPeloMotorista', label: 'Pago pelo motorista (com o dinheiro da viagem)', tipo: 'checkbox', col: 2 },
];
const CAMPOS_DESP_V = [
  { k: 'data', label: 'Data', tipo: 'date', obrig: true, padrao: today },
  { k: 'valor', label: 'Valor', tipo: 'money', obrig: true },
  { k: 'descricao', label: 'Descrição', col: 2 },
  { k: 'pagoPeloMotorista', label: 'Pago pelo motorista (com o dinheiro da viagem)', tipo: 'checkbox', col: 2 },
];
const CAMPOS_RECEB = [
  { k: 'forma', label: 'Forma', tipo: 'select', obrig: true, opcoes: D.FORMAS_RECEB.map(([k, n]) => [k, n]) },
  { k: 'valor', label: 'Valor', tipo: 'money', obrig: true },
  { k: 'com', label: 'Com quem ficou', tipo: 'select', obrig: true, padrao: 'dono', opcoes: [['dono', 'Dono (conta da empresa)'], ['motorista', 'Motorista (presta conta no fechamento)']] },
  { k: 'data', label: 'Data', tipo: 'date', obrig: true, padrao: today },
  { k: 'obs', label: 'Observação', col: 2 },
];
const daViagem = (v) => ({ viagemId: v.id, veiculoId: v.veiculoId, motoristaId: v.motoristaId });
function lancarNaViagem(v, tipo) {
  const nome = tipo === 'combustivel' ? 'Combustível' : D.nomeCategoria(tipo);
  if (tipo === 'combustivel') {
    editar({ titulo: `${nome} · viagem #${v.numero || ''}`, colecao: 'abastecimentos', campos: CAMPOS_ABAST_V, prefixo: 'ab', largo: false, inicial: { km: '' },
      antesDeSalvar: (a) => { completarTres(a); Object.assign(a, daViagem(v), { conferido: true, tanqueCheio: false }); } });
    return ligarTres('fed');
  }
  editar({ titulo: `${nome} · viagem #${v.numero || ''}`, colecao: 'despesas', campos: CAMPOS_DESP_V, prefixo: 'dp', largo: false,
    antesDeSalvar: (d) => { Object.assign(d, daViagem(v), { categoria: tipo, conferido: true }); } });
}
function receitaForm(v, doc = null) {
  editar({ titulo: doc ? 'Recebimento' : `Receita · viagem #${v.numero || ''}`, colecao: 'recebimentos', campos: CAMPOS_RECEB, prefixo: 'rc', doc, largo: false,
    antesDeSalvar: (r, antes) => { if (!antes) Object.assign(r, daViagem(v), { conferido: true }); } });
  const f = document.getElementById('fed');
  f?.addEventListener('change', (e) => { if (e.target.name === 'forma') f.elements.com.value = D.comPadrao(e.target.value); });
}

function editarVeiculo(doc) {
  // o motorista do caminhão fica no cadastro do motorista (veículo habitual)
  const comVenc = doc ? { ...doc, motoristaId: S().motoristas.find((m) => m.veiculoId === doc.id)?.id || '', ...Object.fromEntries(D.VENCIMENTOS.map(([k]) => ['v_' + k, doc.venc?.[k] || ''])) } : null;
  let motoristaId = '';
  editar({ titulo: 'Veículo', colecao: 'veiculos', campos: [...CAMPOS_VEICULO, ...CAMPOS_VENC], doc: comVenc, prefixo: 've',
    antesDeSalvar: (v) => { motoristaId = v.motoristaId; delete v.motoristaId; v.venc = {}; for (const [k] of D.VENCIMENTOS) { if (v['v_' + k]) v.venc[k] = v['v_' + k]; delete v['v_' + k]; } },
    onSalvo: (v) => {
      if (!v) return;
      const antes = S().motoristas.find((m) => m.veiculoId === v.id)?.id || '';
      if (motoristaId === antes) return;
      A.store.commit((s) => { for (const m of s.motoristas) { if (m.id === motoristaId) m.veiculoId = v.id; else if (m.veiculoId === v.id) m.veiculoId = ''; } });
    } });
}

// ---------- App ----------
const quemDeveTxt = (f) => (f.saldo > 0.004 ? `Motorista devolve ${money(f.saldo)}` : f.saldo < -0.004 ? `Empresa paga ao motorista ${money(-f.saldo)}` : 'Acerto zerado');
const numerar = (id) => A.store.commit((s) => { const x = s.viagens.find((y) => y.id === id); if (x && !x.numero) x.numero = D.proximoNumero(s); });
let ACOES;
const A = criarApp({
  tipo: 'gestao',
  inicio: '#/painel',
  nav: [['#/painel', 'chart', 'Painel'], ['#/viagens', 'map', 'Viagens'], ['#/conferir', 'check', 'Conferir'],
    ['#/despesas', 'receipt', 'Despesas'], ['#/veiculos', 'truck', 'Veículos'], ['#/motoristas', 'users', 'Motoristas'], ['#/clientes', 'store', 'Clientes']],
  tabs: [['#/painel', 'chart', 'Painel'], ['#/viagens', 'map', 'Viagens'], ['#/conferir', 'check', 'Conferir'], ['#/veiculos', 'truck', 'Veículos'], ['#/mais', 'menu', 'Mais']],
  badges: (s) => ({ '#/conferir': D.aConferir(s).length }),
  ativo: (h, r) => (h === '#/despesas' && r.startsWith('#/abastecimentos')) || (h === '#/viagens' && r.startsWith('#/viagem/')) || (h === '#/veiculos' && r.startsWith('#/veiculo/')) || (h === '#/motoristas' && r.startsWith('#/motorista/')),
  rotas: [['/painel', vPainel], ['/viagens', vViagens], ['/viagem/:id', vViagem], ['/conferir', vConferir], ['/abastecimentos', (a) => vDespesas({ ...a, query: { ...a.query, c: 'combustivel' } })], ['/despesas', vDespesas],
    ['/veiculos', vVeiculos], ['/veiculo/:id', vVeiculo], ['/motoristas', vMotoristas], ['/motorista/:id', vMotorista], ['/clientes', vClientes]],
  camposEmpresa: [['cidade', 'Cidade/UF'], ['cnpj', 'CNPJ'], ['whatsapp', 'WhatsApp da empresa', '5554999999999']],
  topoDireita: (s) => `<a href="#/conferir" style="color:#fff;position:relative">${icon('check')}${D.aConferir(s).length ? `<span class="badge dot" style="position:absolute;top:-6px;right:-8px">${D.aConferir(s).length}</span>` : ''}</a>`,
  aoMudar: (msg, externo, info) => {
    if (!externo || !info?.doc) return;
    const m = D.motorista(S(), info.doc.motoristaId)?.nome?.split(' ')[0] || 'Motorista';
    // viagem aberta pelo motorista chega sem número (só a gestão numera)
    if (info.colecao === 'viagens' && !info.doc.numero) setTimeout(() => numerar(info.doc.id), 0);
    if (info.colecao === 'viagens' && !info.novo && info.doc.status === 'concluida' && info.antes?.status !== 'concluida') toast(`${m} chegou: viagem para ${info.doc.destino} pronta para o fechamento`);
    if (info.colecao === 'recebimentos' && info.novo) toast(`${m} lançou um recebimento (${money(info.doc.valor)})`);
    if (!info.novo) return;
    if (info.colecao === 'abastecimentos') toast(`${m} lançou um abastecimento (${money(info.doc.valor)})`);
    if (info.colecao === 'despesas') toast(`${m} lançou uma despesa (${money(info.doc.valor)})`);
    if (info.colecao === 'viagens') toast(`${m} iniciou uma viagem para ${info.doc.destino}`);
  },
  acoes: (ACOES = {
    novaViagem: () => novaViagem(),
    editarViagem: (el) => editarViagem(el.dataset.id),
    abrirViagem: (el) => { location.hash = '#/viagem/' + el.dataset.id; },
    lancarDespesa: (el) => {
      const v = S().viagens.find((x) => x.id === el.dataset.id); if (!v) return;
      const tipos = [['combustivel', 'Combustível', 'fuel'], ...D.CATEGORIAS.map(([k, n]) => [k, n, 'receipt'])];
      modal({ title: 'Nova despesa da viagem', body: `<div class="grid g2" style="gap:10px">${tipos.map(([k, n, ic]) => `<button class="acao-grande" data-act="tipo" data-k="${k}"><span class="ic">${icon(ic)}</span><span class="grow"><div class="t">${n}</div></span></button>`).join('')}</div>`,
        handlers: { tipo: (b) => { closeModal(); lancarNaViagem(v, b.dataset.k); } } });
    },
    lancarReceita: (el) => { const v = S().viagens.find((x) => x.id === el.dataset.id); if (v) receitaForm(v); },
    editarReceita: (el) => { const r = S().recebimentos.find((x) => x.id === el.dataset.id); const v = S().viagens.find((x) => x.id === r?.viagemId) || {}; if (r) receitaForm(v, r); },
    fecharViagem: (el) => {
      const v = S().viagens.find((x) => x.id === el.dataset.id); if (!v) return;
      const w = window.open('', '_blank'); // abre já no clique (senão o navegador bloqueia a janela)
      const f = D.fechamento(S(), v);
      A.store.commit((s) => {
        const x = s.viagens.find((y) => y.id === v.id);
        Object.assign(x, { fechadoEm: today(), conferido: true, status: 'concluida', dataChegada: x.dataChegada || today(), numero: x.numero || D.proximoNumero(s) });
        if (f.faltaReceber === 0 && f.frete > 0) Object.assign(x, { recebido: true, recebidoEm: x.recebidoEm || today() });
        for (const { col, x: l } of D.lancamentosDa(s, v.id)) s[col].find((y) => y.id === l.id).conferido = true;
      });
      gruposAbertos.delete(v.id);
      toast(`Viagem #${v.numero || ''} fechada · ${quemDeveTxt(f)}`);
      if (w) { w.document.write(relatorio(S(), S().viagens.find((x) => x.id === v.id), S().meta.empresa)); w.document.close(); setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 400); }
      else toast('Libere as janelas (pop-up) para ver o relatório; ele também fica na página da viagem');
    },
    reabrirViagem: (el) => { A.store.commit((s) => { s.viagens.find((x) => x.id === el.dataset.id).fechadoEm = null; }); toast('Viagem reaberta para ajustes'); },
    pdfViagem: (el) => {
      const v = S().viagens.find((x) => x.id === el.dataset.id); if (!v) return;
      const w = window.open('', '_blank'); if (!w) return toast('Libere as janelas (pop-up) para gerar o relatório');
      w.document.write(relatorio(S(), v, S().meta.empresa)); w.document.close(); setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 400);
    },
    whatsViagem: (el) => { const v = S().viagens.find((x) => x.id === el.dataset.id); if (v) window.open(waLink(D.motorista(S(), v.motoristaId)?.telefone, textoWhats(S(), v)), '_blank', 'noopener'); },
    excluirViagem: async (el) => {
      const v = S().viagens.find((x) => x.id === el.dataset.id); if (!v) return;
      const lig = D.lancamentosDa(S(), v.id).length;
      if (!(await confirmar(`Excluir a viagem #${v.numero || ''} ${esc(v.origem)} → ${esc(v.destino)}${lig ? ` e os ${lig} lançamento(s) dela (despesas, abastecimentos e recebimentos)` : ''}? Não dá para desfazer.`, { ok: 'Excluir tudo', titulo: 'Excluir viagem' }))) return;
      A.store.commit((s) => { s.viagens = s.viagens.filter((x) => x.id !== v.id); for (const c of D.LANC_VIAGEM) s[c] = (s[c] || []).filter((x) => x.viagemId !== v.id); });
      toast('Viagem excluída');
      if (location.hash.startsWith('#/viagem/')) location.hash = '#/viagens';
    },
    detalhe: (el) => abrirDetalhe(el.dataset.k, el.dataset.p, el.dataset.cat),
    receber: (el) => { A.store.commit((s) => Object.assign(s.viagens.find((v) => v.id === el.dataset.id), { recebido: true, recebidoEm: today() })); toast('Frete marcado como recebido'); },
    novoAbast: (el) => { editar({ titulo: 'Abastecimento', colecao: 'abastecimentos', campos: CAMPOS_ABAST, prefixo: 'ab', inicial: el.dataset.v ? { veiculoId: el.dataset.v } : null, antesDeSalvar: (a, antes) => { completarTres(a); if (!antes) a.conferido = true; } }); ligarTres('fed'); ligarVinculo('fed'); },
    editarAbast: (el) => { editar({ titulo: 'Abastecimento', colecao: 'abastecimentos', campos: CAMPOS_ABAST, doc: S().abastecimentos.find((x) => x.id === el.dataset.id), antesDeSalvar: (a) => { completarTres(a); } }); ligarTres('fed'); ligarVinculo('fed'); },
    novaDespesa: (el) => {
      const tipos = [['combustivel', 'Combustível', 'fuel'], ...D.CATEGORIAS.map(([k, n]) => [k, n, 'receipt'])];
      modal({ title: 'Nova despesa', body: `<div class="tiny muted mb">Despesa de uma viagem? Lance pela página da viagem (Viagens › abrir).</div><div class="grid g2" style="gap:10px">${tipos.map(([k, n, ic]) => `<button class="acao-grande" data-act="tipo" data-k="${k}"><span class="ic">${icon(ic)}</span><span class="grow"><div class="t">${n}</div></span></button>`).join('')}</div>`,
        handlers: { tipo: (b) => {
          closeModal();
          if (b.dataset.k === 'combustivel') return ACOES.novoAbast({ dataset: { v: el?.dataset?.v || '' } });
          editar({ titulo: D.nomeCategoria(b.dataset.k), colecao: 'despesas', campos: CAMPOS_DESPESA.filter((c) => c.k !== 'categoria'), prefixo: 'dp', antesDeSalvar: (d, antes) => { d.categoria = b.dataset.k; if (!antes) d.conferido = true; } }); ligarVinculo('fed');
        } } });
    },
    editarDespesa: (el) => editar({ titulo: 'Despesa', colecao: 'despesas', campos: CAMPOS_DESPESA, doc: S().despesas.find((x) => x.id === el.dataset.id) }),
    novaManut: (el) => editar({ titulo: 'Manutenção', colecao: 'manutencoes', campos: CAMPOS_MANUT, prefixo: 'mn', inicial: el.dataset.v ? { veiculoId: el.dataset.v, km: D.kmAtual(S(), el.dataset.v) } : null }),
    editarManut: (el) => editar({ titulo: 'Manutenção', colecao: 'manutencoes', campos: CAMPOS_MANUT, doc: S().manutencoes.find((x) => x.id === el.dataset.id) }),
    novoVeiculo: () => editarVeiculo(null),
    editarVeiculo: (el) => editarVeiculo(S().veiculos.find((v) => v.id === el.dataset.id)),
    novoMotorista: () => editar({ titulo: 'Motorista', colecao: 'motoristas', campos: CAMPOS_MOTORISTA, prefixo: 'mo', onSalvo: (m, novo) => { if (novo) toast('Gere o acesso ao app em Configurações › Acesso dos motoristas'); } }),
    editarMotorista: (el) => editar({ titulo: 'Motorista', colecao: 'motoristas', campos: CAMPOS_MOTORISTA, doc: S().motoristas.find((x) => x.id === el.dataset.id) }),
    novoCliente: () => editar({ titulo: 'Cliente', colecao: 'clientes', campos: CAMPOS_CLIENTE, prefixo: 'cl' }),
    editarCliente: (el) => editar({ titulo: 'Cliente', colecao: 'clientes', campos: CAMPOS_CLIENTE, doc: S().clientes.find((x) => x.id === el.dataset.id) }),
    grupo: (el, e) => { if (e?.target.closest('button')) return; const c = el.closest('.grupo'); c.classList.toggle('aberto'); if (c.classList.contains('aberto')) gruposAbertos.add(el.dataset.id); else gruposAbertos.delete(el.dataset.id); },
    expandirTudo: () => document.querySelectorAll('.grupo').forEach((g) => { g.classList.add('aberto'); const id = g.querySelector('[data-act=grupo]')?.dataset.id; if (id != null) gruposAbertos.add(id); }),
    recolherTudo: () => { document.querySelectorAll('.grupo').forEach((g) => g.classList.remove('aberto')); gruposAbertos.clear(); },
    conferirGrupo: (el) => {
      const id = el.dataset.id; gruposAbertos.add(id);
      A.store.commit((s) => { if (id) { for (const { col, x } of D.lancamentosDa(s, id)) s[col].find((y) => y.id === x.id).conferido = true; } else for (const x of D.aConferir(s)) { const col = colDe(x); if (col !== 'viagens' && !x.viagemId) s[col].find((y) => y.id === x.id).conferido = true; } });
    },
    // ✓ liga e desliga (dá para desmarcar até fechar a viagem)
    conferir: (el) => { const [col, id] = el.dataset.ref.split(':'); const x0 = S()[col].find((x) => x.id === id); if (x0?.viagemId) gruposAbertos.add(x0.viagemId); A.store.commit((s) => { const x = s[col].find((y) => y.id === id); x.conferido = !x.conferido; }); },
    conferirTudo: async () => {
      const itens = D.aConferir(S());
      if (!(await confirmar(`Marcar ${plural(itens.length, 'lançamento')} como conferido? Depois disso os motoristas não alteram mais.`, { ok: 'Conferir tudo' }))) return;
      A.store.commit((s) => { for (const c of ['viagens', ...D.LANC_VIAGEM]) for (const x of s[c] || []) if (!x.conferido && x.motoristaId && (c !== 'viagens' || x.status === 'concluida')) x.conferido = true; });
      toast('Tudo conferido');
    },
    exportar: (el) => exportarPeriodo(el.dataset.p),
  }),
});

const segPeriodo = (rota, p, extra = '') => `<div class="seg mb" style="max-width:100%;overflow-x:auto">${[['30d', '30 dias'], ['mes', 'Este mês'], ['ant', 'Mês passado'], ['ano', 'Este ano']].map(([v, n]) => `<button class="${p === v ? 'on' : ''}" data-act="goto" data-h="#/${rota}?p=${v}${extra}">${n}</button>`).join('')}</div>`;
const conferidoBadge = (x) => (x.motoristaId && !x.conferido ? badge('A conferir', 'warn') : '');

// ---------- Painel ----------
const CORES_CUSTO = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--ink-3)', 'var(--destaque)', 'var(--primaria)'];
const kpiClick = (k, p, ...args) => `<div class="click" data-act="detalhe" data-k="${k}" data-p="${p}" title="Ver detalhamento">${kpi(...args)}</div>`;
function custosPorCategoria(s, de, ate) {
  const itens = D.itensCusto(s, de, ate);
  const g = {};
  for (const x of itens) (g[x.cat] ||= { cat: x.cat, label: D.CATS_CUSTO[x.cat] || x.cat, valor: 0, n: 0 }), (g[x.cat].valor += x.valor), g[x.cat].n++;
  return sortBy(Object.values(g), (x) => -x.valor);
}
const viagensPeriodo = (s, de, ate) => s.viagens.filter((v) => v.status === 'concluida' && D.dataViagem(v) >= de && D.dataViagem(v) <= ate);

function vPainel({ query }) {
  const s = S();
  const p = query.p || '30d';
  const [de, ate, nome] = D.periodo(p);
  const r = D.resultado(s, de, ate);
  const hist = D.historico(s, 6);
  const al = D.alertas(s);
  const rec = D.aReceber(s);
  const cats = custosPorCategoria(s, de, ate);
  const vs = viagensPeriodo(s, de, ate);
  const rv = sortBy(vs.map((v) => ({ v, r: D.resultadoViagem(s, v) })), (x) => D.dataViagem(x.v));
  const porMot = sortBy(s.motoristas.map((m) => ({ m, vs: vs.filter((v) => v.motoristaId === m.id) })).filter((x) => x.vs.length).map((x) => ({ ...x, fat: sum(x.vs, (v) => +v.valorFrete), lucro: sum(x.vs, (v) => D.resultadoViagem(s, v).lucro) })), (x) => -x.fat);
  const rotas = {}; for (const { v, r: q } of rv) { const k = `${v.origem} → ${v.destino}`; (rotas[k] ||= { k, n: 0, lucro: 0, fat: 0 }); rotas[k].n++; rotas[k].lucro += q.lucro; rotas[k].fat += q.frete; }
  const formas = {}; for (const v of vs) for (const x of D.recebimentos(v, s)) formas[x.forma] = (formas[x.forma] || 0) + +x.valor;
  const consumo = s.veiculos.map((v) => ({ v, c: D.consumoGeral(s, v.id, de, ate) })).filter((x) => x.c);
  const kml = (() => { const l = r.litros; return l > 0 && r.km ? r.km / l : 0; })();
  return A.tela('Painel', `
    ${A.pageHead('Painel', `${nome} · ${date(de)} a ${date(ate)}`, `<button class="btn ghost" data-act="exportar" data-p="${p}">${icon('download')} Exportar</button><button class="btn" data-act="novaViagem">${icon('plus')} Viagem</button>`)}
    ${segPeriodo('painel', p)}
    <div class="grid g4">
      ${kpiClick('faturamento', p, 'Faturamento', money0(r.faturamento), `${plural(r.viagens, 'viagem', 'viagens')} concluídas`)}
      ${kpiClick('custos', p, 'Custos', money0(r.custos), `combustível ${percent(r.faturamento ? r.combustivel / r.faturamento : 0)} do faturamento`)}
      ${kpiClick('resultado', p, 'Resultado', `<span class="${r.resultado >= 0 ? 'up' : 'down'}">${money0(r.resultado)}</span>`, `margem ${percent(r.margem)}`)}
      ${kpiClick('km', p, 'Rodado', km(r.km), r.km ? `custo ${money(r.custoKm)}/km · receita ${money(r.receitaKm)}/km` : '—')}
    </div>
    <div class="grid g4 mt-s">
      ${kpiClick('faturamento', p, 'Frete médio', r.viagens ? money0(r.faturamento / r.viagens) : '—', 'por viagem')}
      ${kpiClick('resultado', p, 'Lucro por viagem', r.viagens ? `<span class="${r.resultado >= 0 ? 'up' : 'down'}">${money0(r.resultado / r.viagens)}</span>` : '—', r.km ? `${money(r.resultado / r.km)} por km` : '')}
      ${kpiClick('acertos', p, 'Acertos dos motoristas', money0(sum(s.motoristas, (m) => Math.abs(D.acerto(s, m.id, de, ate).saldo))), 'clique para ver quem deve a quem')}
      ${kpiClick('km', p, 'Consumo médio', kml ? kml.toFixed(2).replace('.', ',') + ' km/l' : '—', r.litros ? `${int(r.litros)} litros` : 'informe os litros nas viagens')}
    </div>
    ${al.length ? `<div class="card mt"><div class="head"><h2>Atenção</h2><span class="muted small">${al.length}</span></div><div class="col">${al.slice(0, 8).map(insightCard).join('')}</div></div>` : ''}
    <div class="grid g-2-1 mt">
      <div class="card"><div class="head"><h2>Resultado por mês</h2></div>
        ${legend([['Faturamento', 'var(--s1)'], ['Custos', 'var(--s2)'], ['Resultado', 'var(--ink-3)']])}
        ${chart({ type: 'line', height: 220, labels: hist.map((h) => monthLabel(h.mes)), series: [{ name: 'Faturamento', color: 'var(--s1)', values: hist.map((h) => h.faturamento) }, { name: 'Custos', color: 'var(--s2)', values: hist.map((h) => h.custos), dash: true }, { name: 'Resultado', color: 'var(--ink-3)', values: hist.map((h) => Math.max(0, h.resultado)) }], fmt: moneyK })}</div>
      <div class="card"><div class="head"><h2>Para onde vai o dinheiro</h2><span class="muted small">clique para ver o extrato</span></div>
        ${cats.length ? hbars(cats.map((c, i) => ({ label: c.label, value: c.valor, color: CORES_CUSTO[i % CORES_CUSTO.length], sub: `${percent(c.valor / r.custos)} dos custos · ${plural(c.n, 'lançamento')}`, attrs: `data-act="detalhe" data-k="categoria" data-cat="${c.cat}" data-p="${p}"` })), money0) : empty('Sem custos no período.', 'money')}
        <div class="small ink2 mt">A receber: <b>${money0(sum(rec, (v) => D.fechamento(s, v).faltaReceber || v.valorFrete))}</b> em ${plural(rec.length, 'frete')} <a href="#/viagens?f=receber">ver</a></div></div>
    </div>
    <div class="grid g2 mt">
      <div class="card"><div class="head"><h2>Lucro por viagem</h2><span class="muted small">${plural(rv.length, 'viagem', 'viagens')}</span></div>
        ${rv.length ? chart({ type: 'columns', height: 210, fmt: moneyK, data: rv.slice(-20).map(({ v, r: q }) => ({ label: '#' + v.numero, value: Math.max(0, q.lucro), color: q.lucro >= 0 ? 'var(--s1)' : 'var(--crit)',
          tip: `<b>#${v.numero} ${esc(v.origem)} → ${esc(v.destino)}</b><br>${esc(D.veiculo(s, v.veiculoId)?.placa || '')} · ${esc(D.motorista(s, v.motoristaId)?.nome || '')}<br>Frete ${money0(q.frete)}<br>Lucro ${money0(q.lucro)} (${percent(q.margem)})` })) }) : empty('Nenhuma viagem concluída no período.', 'map')}</div>
      <div class="card"><div class="head"><h2>Margem por mês</h2><span class="muted small">lucro ÷ faturamento</span></div>
        ${chart({ type: 'columns', height: 210, fmt: (x) => Math.round(x) + '%', data: hist.map((h) => ({ label: monthLabel(h.mes), value: Math.max(0, h.margem * 100), tip: `<b>${monthLabel(h.mes)}</b><br>Margem ${percent(h.margem)}<br>Resultado ${money0(h.resultado)}` })) })}</div>
    </div>
    <div class="grid g3 mt">
      <div class="card"><div class="head"><h2>Faturamento por motorista</h2></div>${porMot.length ? hbars(porMot.map((x) => ({ label: x.m.nome, value: x.fat, sub: `${plural(x.vs.length, 'viagem', 'viagens')} · lucro ${money0(x.lucro)}`, attrs: `data-act="goto" data-h="#/motorista/${x.m.id}"` })), money0) : empty('—', 'users')}</div>
      <div class="card"><div class="head"><h2>Rotas mais rentáveis</h2></div>${Object.keys(rotas).length ? hbars(sortBy(Object.values(rotas), (x) => -x.lucro).slice(0, 6).map((x) => ({ label: x.k, value: Math.max(0, x.lucro), vtxt: money0(x.lucro), sub: `${plural(x.n, 'viagem', 'viagens')} · frete ${money0(x.fat)}` })), money0, { color: 'var(--s1)' }) : empty('—', 'map')}</div>
      <div class="card"><div class="head"><h2>Como o frete foi recebido</h2></div>${Object.keys(formas).length ? hbars(sortBy(Object.entries(formas), (x) => -x[1]).map(([k, val]) => ({ label: D.nomeForma(k), value: val })), money0, { color: 'var(--s2)' }) : `<div class="small muted">Informe no <b>fechamento</b> de cada viagem como o frete foi recebido (PIX, carta frete, dinheiro com o motorista…).</div>`}</div>
    </div>
    ${consumo.length ? `<div class="card mt"><div class="head"><h2>Consumo por caminhão</h2><span class="muted small">km/l</span></div>${hbars(sortBy(consumo, (x) => -x.c).map((x) => ({ label: D.nomeVeiculo(x.v), value: x.c, vtxt: x.c.toFixed(2).replace('.', ',') + ' km/l', attrs: `data-act="goto" data-h="#/veiculo/${x.v.id}"` })), (v) => v.toFixed(2), { color: 'var(--s3)' })}</div>` : ''}
    <div class="card pad-0 mt"><div style="padding:16px 16px 0" class="row between"><h2>Resultado por veículo</h2><span class="muted small">clique para detalhar</span></div><div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Veículo</th><th class="r">Viagens</th><th class="r hide-m">Km</th><th class="r hide-m">Consumo</th><th class="r">Faturamento</th><th class="r hide-m">Custos</th><th class="r">Resultado</th><th class="r hide-m">R$/km</th></tr></thead>
      <tbody>${sortBy(r.porVeiculo, (x) => -x.resultado).map((x) => { const c = D.consumoGeral(s, x.v.id, de, ate); return `<tr class="click" data-act="goto" data-h="#/veiculo/${x.v.id}"><td><b>${esc(x.v.placa)}</b><div class="tiny muted">${esc(x.v.apelido || x.v.modelo || '')}</div></td><td class="r">${x.viagens}</td><td class="r hide-m">${int(x.km)}</td><td class="r hide-m">${c ? c.toFixed(2) + ' km/l' : '—'}</td><td class="r">${money0(x.faturamento)}</td><td class="r hide-m">${money0(x.custos)}</td><td class="r"><b class="${x.resultado >= 0 ? 'up' : 'down'}">${money0(x.resultado)}</b></td><td class="r hide-m">${x.km ? money(x.resultado / x.km) : '—'}</td></tr>`; }).join('') || `<tr><td colspan="8">${empty('Cadastre o primeiro veículo.', 'truck')}</td></tr>`}</tbody>
      <tfoot><tr><td>Total</td><td class="r">${r.viagens}</td><td class="r hide-m">${int(r.km)}</td><td class="hide-m"></td><td class="r">${money0(r.faturamento)}</td><td class="r hide-m">${money0(r.custos)}</td><td class="r">${money0(r.resultado)}</td><td class="r hide-m">${r.km ? money(r.resultado / r.km) : '—'}</td></tr></tfoot></table></div></div>
    <div class="tiny muted mt-s">Resultado = fretes das viagens concluídas − combustível − despesas − manutenção − comissões dos motoristas. Despesas gerais (sem veículo, ex.: seguro da frota) entram no total, não nos veículos.</div>`);
}

// ---------- Detalhamento (tela sobreposta) ----------
const abrirOrigem = (col, id) => {
  closeModal();
  if (col === 'viagens') { location.hash = '#/viagem/' + id; return; }
  const fake = { dataset: { id } };
  ({ abastecimentos: ACOES.editarAbast, despesas: ACOES.editarDespesa, manutencoes: ACOES.editarManut })[col]?.(fake);
};
const tabela = (cab, linhas, rodape = '') => `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cab.map((c) => `<th class="${c.startsWith('>') ? 'r' : ''}">${c.replace('>', '')}</th>`).join('')}</tr></thead><tbody>${linhas.join('') || `<tr><td colspan="${cab.length}">${empty('Nada no período.')}</td></tr>`}</tbody>${rodape}</table></div>`;
const linhaItem = (s, x) => `<tr class="click" data-act="origem" data-col="${x.col}" data-id="${x.id}"><td>${dateShort(x.data)}</td><td class="small">${esc(x.descricao)}</td><td class="small hide-m">${esc(D.veiculo(s, x.veiculoId)?.placa || 'geral')}${x.motoristaId ? ' · ' + esc(D.motorista(s, x.motoristaId)?.nome || '') : ''}</td><td class="r">${money(x.valor)}</td></tr>`;
const linhaViagem = (s, v, extra) => `<tr class="click" data-act="origem" data-col="viagens" data-id="${v.id}"><td>${dateShort(D.dataViagem(v))}</td><td class="small">#${v.numero} ${esc(v.origem)} → ${esc(v.destino)}</td><td class="small hide-m">${esc(D.veiculo(s, v.veiculoId)?.placa || '')} · ${esc(D.motorista(s, v.motoristaId)?.nome || '')}</td>${extra}</tr>`;

function abrirDetalhe(k, p = '30d', cat) {
  const s = S();
  const [de, ate, nome] = D.periodo(p);
  const r = D.resultado(s, de, ate);
  const vs = sortBy(viagensPeriodo(s, de, ate), (v) => D.dataViagem(v), true);
  const itens = D.itensCusto(s, de, ate);
  const porVeic = (f) => hbars(sortBy(r.porVeiculo.filter((x) => f(x)), (x) => -f(x)).map((x) => ({ label: D.nomeVeiculo(x.v), value: Math.max(0, f(x)), vtxt: money0(f(x)) })), money0);
  let titulo = '', corpo = '';
  if (k === 'faturamento') {
    titulo = `Faturamento · ${money0(r.faturamento)}`;
    corpo = `<div class="grid g2"><div><h3>Por caminhão</h3>${porVeic((x) => x.faturamento)}</div><div><h3>Por motorista</h3>${hbars(sortBy(s.motoristas.map((m) => ({ label: m.nome, value: sum(vs.filter((v) => v.motoristaId === m.id), (v) => +v.valorFrete) })).filter((x) => x.value), (x) => -x.value), money0)}</div></div>
      <h3 class="mt">Viagens</h3>${tabela(['Data', 'Viagem', 'Caminhão · motorista', '>Frete'], sortBy(vs, (v) => -v.valorFrete).map((v) => linhaViagem(s, v, `<td class="r">${money(v.valorFrete)}</td>`)), `<tfoot><tr><td></td><td>Total</td><td class="hide-m"></td><td class="r">${money(r.faturamento)}</td></tr></tfoot>`)}`;
  } else if (k === 'custos' || k === 'categoria') {
    const lista = sortBy(k === 'categoria' ? itens.filter((x) => x.cat === cat) : itens, (x) => -x.valor);
    const tot = sum(lista, (x) => x.valor);
    titulo = k === 'categoria' ? `Extrato · ${D.CATS_CUSTO[cat] || cat} · ${money0(tot)}` : `Custos · ${money0(r.custos)}`;
    corpo = `${k === 'custos' ? hbars(custosPorCategoria(s, de, ate).map((c, i) => ({ label: c.label, value: c.valor, color: CORES_CUSTO[i % CORES_CUSTO.length], sub: percent(c.valor / (r.custos || 1)) + ' dos custos', attrs: `data-act="cat" data-cat="${c.cat}"` })), money0) : ''}
      <h3 class="mt">${k === 'custos' ? 'Todos os lançamentos' : 'Lançamentos'} <span class="muted small">do maior para o menor · clique para abrir</span></h3>
      ${tabela(['Data', 'Descrição', 'Caminhão · motorista', '>Valor'], lista.map((x) => linhaItem(s, x)), `<tfoot><tr><td></td><td>Total</td><td class="hide-m"></td><td class="r">${money(tot)}</td></tr></tfoot>`)}`;
  } else if (k === 'resultado') {
    const rv = sortBy(vs.map((v) => ({ v, q: D.resultadoViagem(s, v) })), (x) => -x.q.lucro);
    titulo = `Resultado · ${money0(r.resultado)} (${percent(r.margem)})`;
    corpo = `<div class="grid g4">${kpi('Faturamento', money0(r.faturamento))}${kpi('Combustível', money0(r.combustivel))}${kpi('Despesas + manutenção', money0(r.despesas + r.manutencao))}${kpi('Comissões', money0(r.comissoes))}</div>
      <h3 class="mt">Por caminhão</h3>${porVeic((x) => x.resultado)}
      <h3 class="mt">Por viagem</h3>${tabela(['Data', 'Viagem', 'Caminhão · motorista', '>Frete', '>Custos', '>Lucro'], rv.map(({ v, q }) => linhaViagem(s, v, `<td class="r">${money0(q.frete)}</td><td class="r">${money0(q.custos)}</td><td class="r"><b class="${q.lucro >= 0 ? 'up' : 'down'}">${money0(q.lucro)}</b><div class="tiny muted">${percent(q.margem)}</div></td>`)))}
      <div class="tiny muted mt-s">Despesas gerais sem viagem (ex.: seguro) entram no total do período, não nas viagens.</div>`;
  } else if (k === 'km') {
    titulo = `Rodado · ${km(r.km)}`;
    corpo = `<div class="grid g3">${kpi('Custo por km', r.km ? money(r.custoKm) : '—')}${kpi('Receita por km', r.km ? money(r.receitaKm) : '—')}${kpi('Lucro por km', r.km ? money(r.resultado / r.km) : '—')}</div>
      <h3 class="mt">Por caminhão</h3>${hbars(sortBy(r.porVeiculo.filter((x) => x.km), (x) => -x.km).map((x) => { const c = D.consumoGeral(s, x.v.id, de, ate); return { label: D.nomeVeiculo(x.v), value: x.km, vtxt: km(x.km), sub: `${c ? c.toFixed(2) + ' km/l · ' : ''}${money(x.custoKm)}/km` }; }), int)}
      <h3 class="mt">Por viagem</h3>${tabela(['Data', 'Viagem', 'Caminhão · motorista', '>Km', '>Km/l', '>R$/km'], sortBy(vs, (v) => -D.kmViagem(v)).map((v) => { const q = D.resultadoViagem(s, v); return linhaViagem(s, v, `<td class="r">${int(q.km)}</td><td class="r">${q.kml ? q.kml.toFixed(2).replace('.', ',') : '—'}</td><td class="r">${q.km ? money(q.frete / q.km) : '—'}</td>`); }))}`;
  } else if (k === 'acertos') {
    titulo = `Acertos dos motoristas · ${nome}`;
    corpo = tabela(['Motorista', '>Comissões', '>Pagou', '>Ficou com ele', '>Saldo'], s.motoristas.map((m) => ({ m, a: D.acerto(s, m.id, de, ate) })).filter((x) => x.a.viagens.length || x.a.saldo).map(({ m, a }) =>
      `<tr class="click" data-act="mot" data-id="${m.id}"><td>${esc(m.nome)}</td><td class="r">${money0(a.comissoes)}</td><td class="r">${money0(a.reembolsos)}</td><td class="r">${money0(a.emEspecie + a.adiantamentos)}</td><td class="r"><b>${a.saldo >= 0 ? 'empresa paga ' + money0(a.saldo) : 'devolve ' + money0(-a.saldo)}</b></td></tr>`));
  }
  modal({ title: titulo, wide: true, body: `<div class="small muted mb">${nome} · ${date(de)} a ${date(ate)}</div>${corpo}`,
    handlers: { origem: (el) => abrirOrigem(el.dataset.col, el.dataset.id), cat: (el) => abrirDetalhe('categoria', p, el.dataset.cat), mot: (el) => { closeModal(); location.hash = `#/motorista/${el.dataset.id}`; } } });
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
    <div class="card pad-0"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Viagem</th><th class="hide-m">Veículo · motorista</th><th>Saída</th><th>Situação</th><th class="r">Frete</th><th class="r hide-m">Lucro</th><th class="r hide-m">Km</th><th></th></tr></thead>
    <tbody>${lista.slice(0, 300).map((v) => { const st = D.STATUS_VIAGEM[v.status]; const ve = D.veiculo(s, v.veiculoId), mo = D.motorista(s, v.motoristaId), cl = D.cliente(s, v.clienteId);
      return `<tr data-busca="${esc(`${v.numero} ${v.origem} ${v.destino} ${ve?.placa} ${mo?.nome} ${cl?.nome} ${v.carga}`)}"><td class="click" data-act="abrirViagem" data-id="${v.id}"><b>#${v.numero || ''} ${esc(v.origem)} → ${esc(v.destino)}</b><div class="tiny muted">${esc(cl?.nome || 'sem cliente')}${v.carga ? ' · ' + esc(v.carga) : ''}</div></td>
        <td class="hide-m small">${esc(ve?.placa || '—')} · ${esc(mo?.nome || '—')}</td><td>${dateShort(v.dataSaida)}</td>
        <td>${badge(st?.label || v.status, st?.tom)} ${conferidoBadge(v)}${v.status === 'concluida' && +v.valorFrete > 0 ? (v.recebido ? ' ' + badge('Recebido', 'ok') : '') : ''}</td>
        <td class="r">${+v.valorFrete ? money0(v.valorFrete) : '<span class="muted">definir</span>'}</td>${(() => { const r = D.resultadoViagem(s, v); return `<td class="r hide-m">${+v.valorFrete ? `<b class="${r.lucro >= 0 ? 'up' : 'down'}">${money0(r.lucro)}</b><div class="tiny muted">${percent(r.margem)} do frete</div>` : '—'}</td>`; })()}<td class="r hide-m">${D.kmViagem(v) ? int(D.kmViagem(v)) : '—'}</td>
        <td class="r" style="white-space:nowrap">${v.status === 'concluida' && !v.recebido && +v.valorFrete > 0 ? `<button class="btn ghost sm" data-act="receber" data-id="${v.id}">Recebido</button> ` : ''}<button class="btn ${v.fechadoEm || v.status !== 'concluida' ? 'ghost' : ''} sm" data-act="abrirViagem" data-id="${v.id}" title="Abrir a viagem">${v.fechadoEm ? icon('check') + ' Fechada' : v.status === 'concluida' ? icon('money') + ' Fechar' : 'Abrir'}</button> <button class="iconbtn" data-act="excluirViagem" data-id="${v.id}" aria-label="Excluir viagem" title="Excluir viagem">${icon('trash')}</button></td></tr>`; }).join('') || `<tr><td colspan="8">${empty('Nenhuma viagem aqui.', 'map')}</td></tr>`}</tbody></table></div></div>`);
}

// ---------- Viagem: tudo o que aconteceu nela e o fechamento ----------
function vViagem({ id }) {
  const s = S();
  const v = s.viagens.find((x) => x.id === id);
  if (!v) return A.tela('Viagem', empty('Viagem não encontrada'), { back: true });
  const f = D.fechamento(s, v);
  const st = D.STATUS_VIAGEM[v.status];
  const ve = D.veiculo(s, v.veiculoId), mo = D.motorista(s, v.motoristaId), cl = D.cliente(s, v.clienteId);
  const recDocs = sortBy((s.recebimentos || []).filter((x) => x.viagemId === id), (x) => x.data);
  const recAntigos = Array.isArray(v.recebimentos) ? v.recebimentos.filter((x) => +x.valor > 0) : [];
  const desp = sortBy(D.lancamentosDa(s, id).filter((l) => l.col !== 'recebimentos'), (l) => l.x.data);
  const custosNaViagem = D.CUSTOS_VIAGEM.filter(([k]) => +v[k] > 0);
  const fechada = !!v.fechadoEm;
  const pend = (x) => (x.motoristaId && !x.conferido ? ' ' + badge('lançado pelo motorista', 'warn') : '');
  const linhaD = ({ col, x }) => `<div class="li click" data-act="${col === 'abastecimentos' ? 'editarAbast' : 'editarDespesa'}" data-id="${x.id}"><div class="avatar">${icon(col === 'abastecimentos' ? 'fuel' : 'receipt')}</div>
    <div class="grow"><div class="t small">${col === 'abastecimentos' ? `Combustível${+x.litros ? ' · ' + (+x.litros).toLocaleString('pt-BR') + ' l' : ''}${x.posto ? ' · ' + esc(x.posto) : ''}` : esc(D.nomeCategoria(x.categoria)) + (x.descricao ? ' · ' + esc(x.descricao) : '')}${pend(x)}</div>
    <div class="s">${dateShort(x.data)} · ${x.pagoPeloMotorista ? '<b>pago pelo motorista</b>' : 'pago pela empresa'}</div></div><b class="num small">${money(x.valor)}</b></div>`;
  const linhaR = (x, antigo) => `<div class="li ${antigo ? '' : 'click'}" ${antigo ? '' : `data-act="editarReceita" data-id="${x.id}"`}><div class="avatar">${icon('money')}</div>
    <div class="grow"><div class="t small">${esc(D.nomeForma(x.forma))}${x.obs ? ' · ' + esc(x.obs) : ''}${pend(x)}</div><div class="s">${x.data ? dateShort(x.data) + ' · ' : ''}ficou com ${x.com === 'motorista' ? '<b>o motorista</b>' : 'o dono'}</div></div><b class="num small">${money(x.valor)}</b></div>`;
  const acoes = `<button class="btn ghost" data-act="editarViagem" data-id="${id}">${icon('edit')} Dados</button><button class="btn ghost" data-act="pdfViagem" data-id="${id}">${icon('download')} Relatório</button>${mo?.telefone ? `<button class="btn ghost" data-act="whatsViagem" data-id="${id}">${icon('whatsapp')}</button>` : ''}`
    + (fechada ? `<button class="btn ghost" data-act="reabrirViagem" data-id="${id}">Reabrir</button>` : `<button class="btn" data-act="fecharViagem" data-id="${id}">${icon('check')} Fechar viagem</button>`);
  return A.tela(`Viagem #${v.numero || ''}`, `${A.pageHead(`#${v.numero || ''} ${esc(v.origem)} → ${esc(v.destino)}`,
      `${badge(st?.label || v.status, st?.tom)}${fechada ? ' ' + badge('Fechada em ' + date(v.fechadoEm), 'ok') : ''} · ${esc(D.nomeVeiculo(ve))} · ${esc(mo?.nome || '—')} · ${date(v.dataSaida)}${v.dataChegada ? ' a ' + date(v.dataChegada) : ''}${D.kmViagem(v) ? ' · ' + km(D.kmViagem(v)) : ''}${cl ? ' · ' + esc(cl.nome) : ''}${v.carga ? ' · ' + esc(v.carga) : ''}`, acoes)}
    <div class="grid g4">${kpi('Frete', money0(f.frete), f.faltaReceber ? `falta receber ${money0(f.faltaReceber)}` : f.frete ? 'todo recebido' : '<b>defina o valor</b>')}${kpi('Custos', money0(f.custosTotal), `${plural(desp.length + custosNaViagem.length, 'lançamento')}`)}${kpi(`Comissão ${f.pct}%`, money0(f.comissao), esc(mo?.nome || ''))}${kpi('Lucro', `<span class="${f.lucro >= 0 ? 'up' : 'down'}">${money0(f.lucro)}</span>`, percent(f.margem) + ' do frete')}</div>
    <div class="grid g2 mt">
      <div class="card"><div class="head"><h2>Receitas</h2><button class="btn sm" data-act="lancarReceita" data-id="${id}">${icon('plus')} Receita</button></div>
        <div class="list">${[...recAntigos.map((x) => linhaR(x, true)), ...recDocs.map((x) => linhaR(x))].join('') || empty('Lance como o frete foi recebido: PIX ao dono, carta frete, dinheiro com o motorista…', 'money')}</div></div>
      <div class="card"><div class="head"><h2>Despesas</h2><button class="btn sm" data-act="lancarDespesa" data-id="${id}">${icon('plus')} Despesa</button></div>
        <div class="list">${custosNaViagem.map(([k, n]) => `<div class="li"><div class="avatar">${icon('receipt')}</div><div class="grow"><div class="t small">${n}</div><div class="s">${(v.pagoMotorista || {})[k] ? '<b>pago pelo motorista</b>' : 'pago pela empresa'}</div></div><b class="num small">${money(v[k])}</b></div>`).join('')}${desp.map(linhaD).join('') || (custosNaViagem.length ? '' : empty('Combustível, pedágio, alimentação… lançados pelo motorista ou aqui.', 'receipt'))}</div></div>
    </div>
    <div class="mt">${resumoHTML(f)}</div>
    <div class="row between mt"><span class="tiny muted">Para mudar frete, comissão ou adiantamento, use <b>Dados</b>. Ao fechar, tudo fica conferido.</span><button class="btn ghost sm" data-act="excluirViagem" data-id="${id}" style="color:var(--crit)">${icon('trash')} Excluir viagem</button></div>`, { back: true });
}

// ---------- Conferir lançamentos dos motoristas ----------
const gruposAbertos = new Set();
const colDe = (x) => (x.origem !== undefined && x.destino !== undefined ? 'viagens' : x.forma !== undefined ? 'recebimentos' : x.litros !== undefined ? 'abastecimentos' : 'despesas');
// Conferir: cada viagem ainda não fechada com os lançamentos dela. Vai marcando ✓; com tudo conferido, "Fechar viagem" gera o relatório.
function vConferir() {
  const s = S();
  const pendentes = D.aConferir(s);
  const comPend = new Set(pendentes.map((x) => (colDe(x) === 'viagens' ? x.id : x.viagemId)).filter(Boolean));
  const viagens = sortBy(s.viagens.filter((v) => !v.fechadoEm && (v.status === 'concluida' || comPend.has(v.id))), (v) => (v.status === 'concluida' ? '1' : '0') + (v.dataChegada || v.dataSaida), true);
  const soltos = pendentes.filter((x) => colDe(x) !== 'viagens' && !x.viagemId);
  const desc = (col, x) => col === 'abastecimentos' ? `Combustível · ${(+x.litros || 0).toLocaleString('pt-BR')} l${x.km ? ' · ' + int(x.km) + ' km' : ''}${x.posto ? ' · ' + esc(x.posto) : ''}` : col === 'recebimentos' ? `Receita · ${esc(D.nomeForma(x.forma))} · ficou com ${x.com === 'motorista' ? 'o motorista' : 'o dono'}` : `${esc(D.nomeCategoria(x.categoria))}${x.descricao ? ' · ' + esc(x.descricao) : ''}`;
  const act = { abastecimentos: 'editarAbast', despesas: 'editarDespesa', recebimentos: 'editarReceita' };
  const linha = ({ col, x }) => `<div class="li"><button class="check ${x.conferido ? 'on' : ''}" data-act="conferir" data-ref="${col}:${x.id}" aria-label="${x.conferido ? 'Conferido' : 'Conferir'}" title="${x.conferido ? 'Conferido (clique para desmarcar)' : 'Clique para conferir'}">${icon('check')}</button>
      <div class="grow click" data-act="${act[col]}" data-id="${x.id}"><div class="t small">${desc(col, x)}</div><div class="s">${dateShort(x.data)}${col !== 'recebimentos' ? (x.pagoPeloMotorista ? ' · <b>pago pelo motorista</b>' : ' · pago pela empresa') : ''}${x.motoristaId && !x.conferido ? ' · lançado pelo motorista' : ''}</div></div>
      <b class="num ${col === 'recebimentos' ? 'up' : ''}">${money(x.valor)}</b></div>`;
  const grupo = (v) => {
    const its = sortBy(D.lancamentosDa(s, v.id), (l) => (l.col === 'recebimentos' ? '0' : '1') + l.x.data);
    const ok = its.filter((l) => l.x.conferido).length, tudo = ok === its.length;
    const mo = D.motorista(s, v.motoristaId), ve = D.veiculo(s, v.veiculoId), f = D.fechamento(s, v);
    const podeFechar = tudo && v.status === 'concluida';
    return `<div class="card pad-0 grupo ${gruposAbertos.has(v.id) || viagens.length === 1 ? 'aberto' : ''}">
      <div class="grupo-cab click" data-act="grupo" data-id="${v.id}"><span class="grupo-seta">▸</span>
        <div class="grow"><div class="t"><b>#${v.numero || ''} ${esc(v.origem)} → ${esc(v.destino)}</b> ${badge(D.STATUS_VIAGEM[v.status]?.label || '', D.STATUS_VIAGEM[v.status]?.tom)}</div>
        <div class="s small muted">${esc(mo?.nome || '—')} · ${esc(ve?.placa || '—')} · ${dateShort(v.dataSaida)}${v.dataChegada ? ' a ' + dateShort(v.dataChegada) : ''} · frete ${money0(f.frete)}</div></div>
        <div class="r"><div class="small ${tudo ? 'up' : ''}"><b>${ok} de ${its.length}</b> conferidos</div><div class="tiny muted">${esc(quemDeveTxt(f))}</div></div></div>
      <div class="itens"><div class="list">${its.map(linha).join('') || '<div class="small muted" style="padding:12px 0">Nenhum lançamento nesta viagem.</div>'}</div>
        <div class="row between gap-s wrap" style="padding:12px 0 14px"><div class="row gap-s">${its.length && !tudo ? `<button class="btn ghost sm" data-act="conferirGrupo" data-id="${v.id}">${icon('check')} Marcar todos</button>` : ''}<button class="btn ghost sm" data-act="abrirViagem" data-id="${v.id}">Abrir viagem</button></div>
          ${podeFechar ? `<button class="btn" data-act="fecharViagem" data-id="${v.id}">${icon('check')} Fechar viagem e gerar relatório</button>` : `<span class="small muted">${v.status !== 'concluida' ? 'Viagem em andamento: feche depois da chegada' : 'Confira todos os lançamentos para fechar'}</span>`}</div></div></div>`;
  };
  return A.tela('Conferir', `${A.pageHead('Conferir e fechar viagens', 'Clique na viagem, marque ✓ em cada lançamento e, com tudo conferido, feche a viagem: o relatório sai em PDF e fica no app do motorista.',
      `<button class="btn ghost sm" data-act="expandirTudo">Expandir tudo</button><button class="btn ghost sm" data-act="recolherTudo">Recolher tudo</button>`)}
    <div class="col" style="gap:12px">${viagens.map(grupo).join('')}
    ${soltos.length ? `<div class="card pad-0 grupo ${gruposAbertos.has('') ? 'aberto' : ''}"><div class="grupo-cab click" data-act="grupo" data-id=""><span class="grupo-seta">▸</span><div class="grow"><b>Lançamentos sem viagem</b><div class="s small muted">${plural(soltos.length, 'item', 'itens')} para conferir</div></div></div>
      <div class="itens"><div class="list">${soltos.map((x) => linha({ col: colDe(x), x })).join('')}</div><div style="padding:10px 0 14px"><button class="btn ghost sm" data-act="conferirGrupo" data-id="">${icon('check')} Marcar todos</button></div></div></div>` : ''}
    ${viagens.length || soltos.length ? '' : `<div class="card">${empty('Nada para conferir. Todas as viagens estão fechadas. 👍', 'check')}</div>`}</div>`);
}

// ---------- Despesas (combustível é uma das categorias) ----------
function vDespesas({ query }) {
  const s = S();
  const p = query.p || '30d', c = query.c || '';
  const [de, ate, nome] = D.periodo(p);
  const dentro = (d) => d >= de && d <= ate;
  const todos = [
    ...s.abastecimentos.filter((a) => dentro(a.data)).map((a) => ({ x: a, col: 'abastecimentos', cat: 'combustivel', desc: `${(+a.litros || 0).toLocaleString('pt-BR')} l${a.litros ? ' · ' + money(a.valor / a.litros) + '/l' : ''}${a.posto ? ' · ' + a.posto : ''}` })),
    ...s.despesas.filter((d) => dentro(d.data)).map((d) => ({ x: d, col: 'despesas', cat: d.categoria || 'outros', desc: d.descricao || '' })),
  ];
  const lista = sortBy(todos.filter((i) => !c || i.cat === c), (i) => i.x.data + i.x.id, true);
  const nomeCat = (k) => (k === 'combustivel' ? 'Combustível' : D.nomeCategoria(k));
  const cats = sortBy(Object.values(todos.reduce((g, i) => { (g[i.cat] ||= { k: i.cat, v: 0, n: 0 }).v += +i.x.valor || 0; g[i.cat].n++; return g; }, {})), (x) => -x.v);
  const ab = lista.filter((i) => i.col === 'abastecimentos'), litros = sum(ab, (i) => +i.x.litros || 0), vAb = sum(ab, (i) => +i.x.valor);
  const man = s.manutencoes.filter((m) => dentro(m.data));
  const porV = s.veiculos.map((v) => ({ v, c: D.consumoGeral(s, v.id, de, ate) })).filter((x) => x.c);
  const qs = (o) => `#/despesas?p=${o.p ?? p}${(o.c ?? c) ? '&c=' + (o.c ?? c) : ''}`;
  const vg = (x) => x.viagemId && s.viagens.find((v) => v.id === x.viagemId);
  return A.tela('Despesas', `${A.pageHead('Despesas', `${nome} · combustível, pedágio, alimentação e o resto (manutenção de oficina fica em cada veículo)`, `<button class="btn" data-act="novaDespesa">${icon('plus')} Despesa</button>`)}
    <div class="seg mb" style="max-width:100%;overflow-x:auto">${[['30d', '30 dias'], ['mes', 'Este mês'], ['ant', 'Mês passado'], ['ano', 'Este ano']].map(([v, n]) => `<button class="${p === v ? 'on' : ''}" data-act="goto" data-h="${qs({ p: v })}">${n}</button>`).join('')}</div>
    <div class="grid g4">${kpi(c ? nomeCat(c) : 'Total', money0(sum(lista, (i) => +i.x.valor)), plural(lista.length, 'lançamento'))}${kpi('Combustível', money0(sum(todos.filter((i) => i.cat === 'combustivel'), (i) => +i.x.valor)), litros ? `${int(litros)} l · média ${money(vAb / litros)}/l` : '—')}
      ${kpi('Pago pelos motoristas', money0(sum(lista.filter((i) => i.x.pagoPeloMotorista), (i) => +i.x.valor)), 'entra no acerto')}${kpi('Manutenção (oficina)', money0(sum(man, (m) => +m.valor)), plural(man.length, 'serviço'))}</div>
    <div class="grid g-2-1 mt"><div class="card"><div class="head"><h2>Por categoria</h2><span class="muted small">clique para filtrar</span></div>
      ${cats.length ? hbars(cats.map((x) => ({ label: nomeCat(x.k), value: x.v, sub: plural(x.n, 'lançamento'), color: x.k === c ? 'var(--destaque)' : undefined, attrs: `data-act="goto" data-h="${qs({ c: x.k === c ? '' : x.k })}"` })), money0) : empty('Nenhuma despesa no período.', 'receipt')}
      ${c ? `<div class="mt-s"><a class="btn ghost sm" href="${qs({ c: '' })}">${esc(nomeCat(c))} ✕</a></div>` : ''}</div>
      <div class="card"><div class="head"><h2>Consumo por caminhão</h2><span class="muted small">km/l</span></div>${porV.length ? hbars(sortBy(porV, (x) => -x.c).map((x) => ({ label: D.nomeVeiculo(x.v), value: x.c, vtxt: x.c.toFixed(2).replace('.', ',') + ' km/l', attrs: `data-act="goto" data-h="#/veiculo/${x.v.id}"` })), (v) => v.toFixed(2), { color: 'var(--s3)' }) : empty('Lance litros e km para ver o consumo.', 'fuel')}</div></div>
    <div class="card pad-0 mt"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th>Categoria</th><th class="hide-m">Detalhe</th><th class="hide-m">Viagem · caminhão</th><th class="r">Valor</th><th></th></tr></thead>
      <tbody>${lista.map((i) => { const v = vg(i.x); return `<tr class="click" data-act="${i.col === 'abastecimentos' ? 'editarAbast' : 'editarDespesa'}" data-id="${i.x.id}"><td>${dateShort(i.x.data)}</td><td>${esc(nomeCat(i.cat))}</td><td class="hide-m small">${esc(i.desc)}${i.x.pagoPeloMotorista ? ' · <b>pago pelo motorista</b>' : ''}</td>
        <td class="hide-m small">${v ? `#${v.numero || ''} ${esc(v.destino)} · ` : ''}${esc(D.veiculo(s, i.x.veiculoId)?.placa || 'geral')}${i.x.motoristaId ? ' · ' + esc(D.motorista(s, i.x.motoristaId)?.nome || '') : ''}</td><td class="r">${money(i.x.valor)}</td><td>${conferidoBadge(i.x)}</td></tr>`; }).join('') || `<tr><td colspan="6">${empty('—')}</td></tr>`}</tbody></table></div></div>`);
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
      return `<a class="card col ${v.ativo === false ? 'li off' : ''}" href="#/veiculo/${v.id}" style="color:inherit;gap:8px"><div class="row between"><div><div style="font-family:var(--font-t);font-size:20px">${esc(v.placa)}</div><div class="small muted">${esc([v.apelido, v.modelo].filter(Boolean).join(' · '))}${v.ano ? ' · ' + v.ano : ''}</div></div>${emViagem ? badge('Em viagem', 'warn') : v.ativo === false ? badge('Parado') : badge('Disponível', 'ok')}</div>
        <div class="small ink2">${km(D.kmAtual(s, v.id))} · ${D.consumoGeral(s, v.id)?.toFixed(2) || '—'} km/l</div>
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
  return A.tela(v.placa, `${A.pageHead(`${esc(v.placa)} <span class="muted" style="font-size:16px">${esc([v.apelido, v.modelo].filter(Boolean).join(' · '))}</span>`, `${esc(D.TIPOS_VEICULO.find((t) => t[0] === v.tipo)?.[1] || '')}${v.ano ? ' · ' + v.ano : ''} · ${km(D.kmAtual(s, id))}`,
      `<button class="btn ghost" data-act="editarVeiculo" data-id="${id}">${icon('edit')} Editar</button><button class="btn ghost" data-act="novoAbast" data-v="${id}">${icon('fuel')} Abastecimento</button><button class="btn" data-act="novaManut" data-v="${id}">${icon('wrench')} Manutenção</button>`)}
    ${al.length ? `<div class="col mb">${al.map(insightCard).join('')}</div>` : ''}
    <div class="grid g4">${kpi('Resultado no ano', money0(ano.resultado || 0), `margem ${percent(ano.margem || 0)}`)}${kpi('Faturamento no ano', money0(ano.faturamento || 0), plural(ano.viagens || 0, 'viagem', 'viagens'))}${kpi('Consumo médio', D.consumoGeral(s, id) ? D.consumoGeral(s, id).toFixed(2) + ' km/l' : '—', 'viagens e abastecimentos')}${kpi('Custo por km', ano.km ? money(ano.custoKm) : '—', `${int(ano.km || 0)} km no ano`)}</div>
    <div class="card mt"><div class="head"><h2>Resultado por mês</h2></div>${chart({ type: 'columns', height: 190, data: hist.map((h) => ({ label: monthLabel(h.mes), value: Math.max(0, h.resultado || 0), tip: `<b>${monthLabel(h.mes)}</b><br>Faturamento ${money0(h.faturamento || 0)}<br>Custos ${money0(h.custos || 0)}<br>Resultado ${money0(h.resultado || 0)}` })), fmt: moneyK })}</div>
    <div class="grid g2 mt">
      <div class="card"><div class="head"><h2>Documentos</h2></div><div class="list">${D.VENCIMENTOS.map(([k, n]) => `<div class="li"><div class="grow t small">${n}</div>${v.venc?.[k] ? badge(date(v.venc[k]), v.venc[k] < today() ? 'crit' : '') : '<span class="muted small">não informado</span>'}</div>`).join('')}</div>
        <div class="tiny muted mt-s">Óleo a cada ${v.oleoCadaKm ? km(v.oleoCadaKm) : '—'} · revisão a cada ${v.revisaoCadaKm ? km(v.revisaoCadaKm) : '—'}</div></div>
      <div class="card"><div class="head"><h2>Manutenções</h2></div><div class="list">${man.map((m) => `<a class="li" href="#" data-act="editarManut" data-id="${m.id}"><div class="grow"><div class="t small">${esc(D.nomeManut(m.tipo))}${m.descricao ? ' · ' + esc(m.descricao) : ''}</div><div class="s">${date(m.data)}${m.km ? ' · ' + km(m.km) : ''}${m.oficina ? ' · ' + esc(m.oficina) : ''}</div></div><b class="num small">${money0(m.valor)}</b></a>`).join('') || empty('Nenhuma manutenção registrada.', 'wrench')}</div></div>
    </div>
    <div class="card pad-0 mt"><div style="padding:16px 16px 0"><h2>Últimas viagens</h2></div><div class="tbl-wrap"><table class="tbl"><tbody>${vgs.map((x) => `<tr class="click" data-act="abrirViagem" data-id="${x.id}"><td>${dateShort(x.dataSaida)}</td><td>#${x.numero} ${esc(x.origem)} → ${esc(x.destino)}</td><td class="hide-m small">${esc(D.motorista(s, x.motoristaId)?.nome || '')}</td><td class="r">${money0(x.valorFrete)}</td></tr>`).join('') || `<tr><td>${empty('—')}</td></tr>`}</tbody></table></div></div>`, { back: true });
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
  const texto = `Acerto ${nome.toLowerCase()} (${date(de)} a ${date(ate)}) — ${m.nome}\n\nComissões: ${money(ac.comissoes)} (${ac.viagens.length} viagens)\nVocê pagou: ${money(ac.reembolsos)}\nAdiantamentos: −${money(ac.adiantamentos)}\nFrete que ficou com você: −${money(ac.emEspecie)}\n${ac.saldo >= 0 ? 'A receber da empresa' : 'Devolver à empresa'}: ${money(Math.abs(ac.saldo))}`;
  return A.tela(m.nome, `${A.pageHead(esc(m.nome), `${esc(D.veiculo(s, m.veiculoId)?.placa || 'sem veículo habitual')} · CNH ${esc(m.cnhCategoria || '—')} até ${date(m.cnhValidade)} · comissão ${m.comissaoPct || 0}%`,
      `<a class="btn ghost" target="_blank" rel="noopener" href="${waLink(m.telefone, texto)}">${icon('whatsapp')} Enviar acerto</a><button class="btn ghost" data-act="editarMotorista" data-id="${id}">${icon('edit')} Editar</button>`)}
    ${segPeriodo(`motorista/${id}`, p)}
    <div class="grid g4">${kpi('Comissões', money0(ac.comissoes), plural(ac.viagens.length, 'viagem', 'viagens'))}${kpi('Pagou na estrada', money0(ac.reembolsos), 'gastos pagos por ele')}${kpi('Ficou com ele', money0(ac.adiantamentos + ac.emEspecie), 'adiantamento + frete em espécie')}${kpi('Saldo do acerto', `<span class="${ac.saldo >= 0 ? '' : 'down'}">${money0(Math.abs(ac.saldo))}</span>`, ac.saldo >= 0 ? 'a empresa paga ao motorista' : 'o motorista devolve à empresa')}</div>
    <div class="row between mt"><h2>Acerto por viagem</h2><div class="row gap-s"><button class="btn ghost sm" data-act="expandirTudo">Expandir tudo</button><button class="btn ghost sm" data-act="recolherTudo">Recolher tudo</button></div></div>
    <div class="col mt-s" style="gap:10px">${ac.porViagem.map((x) => { const its = sortBy(D.lancamentosDa(s, x.v.id), (l) => l.x.data); return `<div class="card pad-0 grupo">
      <div class="grupo-cab click" data-act="grupo" data-id="m${x.v.id}"><span class="grupo-seta">▸</span><div class="grow"><b>#${x.v.numero || ''} ${esc(x.v.origem)} → ${esc(x.v.destino)}</b> ${x.v.fechadoEm ? badge('Fechada', 'ok') : badge('Aberta', 'warn')}
        <div class="s small muted">${dateShort(x.v.dataSaida)} a ${dateShort(x.v.dataChegada)} · frete ${money0(x.v.valorFrete)} · comissão ${D.pctViagem(x.v, s)}% ${money0(x.comissao)} · pagou ${money0(x.pagou)} · ficou com ele ${money0(x.ficou)}</div></div>
        <div class="r"><b class="${x.saldo >= 0 ? 'up' : 'down'}">${x.saldo >= 0 ? 'receber ' : 'devolve '}${money(Math.abs(x.saldo))}</b></div></div>
      <div class="itens"><div class="list">${its.map(({ col, x: l }) => `<div class="li click" data-act="${col === 'abastecimentos' ? 'editarAbast' : col === 'recebimentos' ? 'editarReceita' : 'editarDespesa'}" data-id="${l.id}"><div class="avatar">${icon(col === 'abastecimentos' ? 'fuel' : col === 'recebimentos' ? 'money' : 'receipt')}</div><div class="grow"><div class="t small">${col === 'abastecimentos' ? 'Combustível' : col === 'recebimentos' ? 'Receita · ' + esc(D.nomeForma(l.forma)) : esc(D.nomeCategoria(l.categoria))}${l.descricao || l.obs ? ' · ' + esc(l.descricao || l.obs) : ''}</div><div class="s">${dateShort(l.data)} · ${col === 'recebimentos' ? (l.com === 'motorista' ? 'ficou com ele' : 'foi para o dono') : l.pagoPeloMotorista ? 'pago por ele' : 'pago pela empresa'}</div></div><b class="num small ${col === 'recebimentos' ? 'up' : ''}">${money(l.valor)}</b></div>`).join('') || '<div class="small muted" style="padding:10px 0">Nenhum lançamento.</div>'}</div>
        <div style="padding:10px 0 14px"><button class="btn ghost sm" data-act="abrirViagem" data-id="${x.v.id}">Abrir viagem</button></div></div></div>`; }).join('') || `<div class="card">${empty('Nenhuma viagem concluída no período.', 'map')}</div>`}
    ${ac.foraDeViagem.length ? `<div class="card pad-0"><div class="list" style="padding:0 16px">${ac.foraDeViagem.map((x) => `<div class="li"><div class="grow"><div class="t small">${esc(x.descricao)}</div><div class="s">${dateShort(x.data)} · fora de viagem</div></div><b class="num small ${x.sinal > 0 ? 'up' : 'down'}">${x.sinal > 0 ? '' : '−'}${money(x.valor)}</b></div>`).join('')}</div></div>` : ''}
    <div class="card row between"><b>Total do período</b><b>${ac.saldo >= 0 ? 'empresa paga ' : 'devolve '}${money(Math.abs(ac.saldo))}</b></div></div>`, { back: true });
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
