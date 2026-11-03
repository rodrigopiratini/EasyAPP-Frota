// EasyApp Frota — app do Motorista (celular)
import { criarApp } from '../core/app.js';
import { formHTML, lerCampos } from '../core/form.js';
import * as D from '../dominio.js';
import { money, money0, date, dateShort, today, esc, sortBy, uid, plural, diffDays } from '../core/fmt.js';
import { icon, badge, empty, modal, closeModal, toast, kpi, confirmar } from '../core/ui.js';
import { ligarTres, completarTres } from '../tres.js';

const S = () => A.S();
const eu = () => S().motoristas.find((m) => m.id === A.store.meuRef());
const meus = (col) => S()[col].filter((x) => x.motoristaId === A.store.meuRef());
const viagemAtual = () => meus('viagens').find((v) => v.status === 'em_viagem');
const veiculoPadrao = () => viagemAtual()?.veiculoId || eu()?.veiculoId || S().veiculos.find((v) => v.ativo !== false)?.id;
const opVeiculos = (s) => s.veiculos.filter((v) => v.ativo !== false).map((v) => [v.id, D.nomeVeiculo(v)]);
const km = (v) => (+v || 0).toLocaleString('pt-BR') + ' km';

const CAMPOS_ABAST = [
  { k: 'veiculoId', label: 'Veículo', tipo: 'select', obrig: true, opcoes: opVeiculos, col: 2 },
  { k: 'km', label: 'Km no painel', tipo: 'number', obrig: true },
  { k: 'litros', label: 'Litros', tipo: 'number', obrig: true },
  { k: 'valor', label: 'Valor total', tipo: 'money', obrig: true },
  { k: 'precoLitro', label: 'Preço por litro', tipo: 'money', dica: 'Preencha 2 de 3: o terceiro é calculado.' },
  { k: 'posto', label: 'Posto' },
  { k: 'tanqueCheio', label: 'Completei o tanque', tipo: 'checkbox', padrao: true },
  { k: 'pagoPeloMotorista', label: 'Paguei do meu bolso (reembolso no acerto)', tipo: 'checkbox', col: 2 },
];
const CAMPOS_DESPESA = [
  { k: 'categoria', label: 'O que foi', tipo: 'select', obrig: true, opcoes: D.CATEGORIAS.filter(([k]) => k !== 'seguro'), col: 2 },
  { k: 'valor', label: 'Valor', tipo: 'money', obrig: true },
  { k: 'veiculoId', label: 'Veículo', tipo: 'select', opcoes: opVeiculos },
  { k: 'descricao', label: 'Detalhe (opcional)', col: 2 },
  { k: 'pagoPeloMotorista', label: 'Paguei do meu bolso (reembolso no acerto)', tipo: 'checkbox', padrao: true, col: 2 },
];
const CAMPOS_INICIAR = [
  { k: 'veiculoId', label: 'Veículo', tipo: 'select', obrig: true, opcoes: opVeiculos, col: 2 },
  { k: 'origem', label: 'Saindo de', obrig: true, ph: 'Cidade/UF' },
  { k: 'destino', label: 'Indo para', obrig: true, ph: 'Cidade/UF' },
  { k: 'kmInicio', label: 'Km no painel agora', tipo: 'number', obrig: true },
  { k: 'carga', label: 'Carga (opcional)' },
];

function formulario(titulo, campos, inicial, salvar, botao = 'Salvar') {
  modal({ title: titulo, body: formHTML('fmo', campos, inicial),
    foot: `<button class="btn ghost" data-act="close">Cancelar</button><button class="btn" data-act="ok">${botao}</button>`,
    handlers: { ok: () => { const { dados, erro } = lerCampos('fmo', campos); if (erro) return toast(erro); const msg = salvar(dados); if (typeof msg === 'string') return toast(msg); closeModal(); } } });
}
const avisoKm = (vid, kmNovo) => { const atual = D.kmAtual(S(), vid); return kmNovo < atual - 5 ? `O km informado (${km(kmNovo)}) é menor que o último registrado (${km(atual)}). Confira o painel.` : null; };

const A = criarApp({
  tipo: 'usuario',
  inicio: '#/inicio',
  nav: [['#/inicio', 'home', 'Início'], ['#/lancamentos', 'list', 'Lançamentos'], ['#/acerto', 'money', 'Meu acerto']],
  tabs: [['#/inicio', 'home', 'Início'], ['#/lancamentos', 'list', 'Lançamentos'], ['#/acerto', 'money', 'Acerto'], ['#/conta', 'user', 'Conta']],
  rotas: [['/inicio', vInicio], ['/lancamentos', vLancamentos], ['/acerto', vAcerto]],
  nomeUsuario: () => eu()?.nome || '',
  dicaDemo: 'Demonstração: código JOAO, PIN 1234',
  contaExtra: () => { const m = eu(); if (!m) return ''; const d = m.cnhValidade ? diffDays(m.cnhValidade, today()) : null;
    return `<div class="small ink2">CNH ${esc(m.cnhCategoria || '')} válida até <b>${date(m.cnhValidade)}</b> ${d != null && d < 0 ? badge('Vencida', 'crit') : d != null && d <= 30 ? badge('Renove logo', 'warn') : ''}<br>Comissão: ${m.comissaoPct || 0}% do frete · veículo: ${esc(D.veiculo(S(), m.veiculoId)?.placa || '—')}</div>`; },
  acoes: {
    abastecer: () => { formulario('Abastecimento', CAMPOS_ABAST, { veiculoId: veiculoPadrao() }, (d) => {
      completarTres(d);
      if (d.litros <= 0 || d.litros > 1500) return 'Confira os litros';
      const aviso = avisoKm(d.veiculoId, d.km);
      const salvar = () => A.store.commit((s) => s.abastecimentos.push({ id: uid('ab'), data: today(), motoristaId: A.store.meuRef(), viagemId: viagemAtual()?.id || null, conferido: false, ...d }));
      if (aviso) { confirmar(aviso + ' Salvar assim mesmo?', { ok: 'Salvar' }).then((y) => { if (y) { salvar(); toast('Abastecimento lançado'); } }); return; }
      salvar(); toast(`Abastecimento lançado: ${money(d.valor)}`);
    }); ligarTres('fmo'); },
    despesa: () => formulario('Despesa', CAMPOS_DESPESA, { veiculoId: veiculoPadrao() }, (d) => {
      A.store.commit((s) => s.despesas.push({ id: uid('dp'), data: today(), motoristaId: A.store.meuRef(), viagemId: viagemAtual()?.id || null, conferido: false, ...d }));
      toast(`Despesa lançada: ${money(d.valor)}`);
    }),
    novaViagem: () => formulario('Iniciar viagem', CAMPOS_INICIAR, { veiculoId: veiculoPadrao(), kmInicio: D.kmAtual(S(), veiculoPadrao()) || '' }, (d) => {
      const aviso = avisoKm(d.veiculoId, d.kmInicio); if (aviso) return aviso;
      A.store.commit((s) => s.viagens.push({ id: uid('vg'), motoristaId: A.store.meuRef(), dataSaida: today(), status: 'em_viagem', conferido: false, ...d }));
      toast('Boa viagem!');
    }, 'Iniciar'),
    iniciarPlanejada: (el) => { const v = S().viagens.find((x) => x.id === el.dataset.id);
      formulario(`Iniciar viagem para ${v.destino}`, [{ k: 'kmInicio', label: 'Km no painel agora', tipo: 'number', obrig: true }], { kmInicio: D.kmAtual(S(), v.veiculoId) || '' }, (d) => {
        A.store.commit((s) => Object.assign(s.viagens.find((x) => x.id === v.id), { status: 'em_viagem', dataSaida: today(), kmInicio: d.kmInicio })); toast('Boa viagem!');
      }, 'Iniciar'); },
    encerrar: (el) => { const v = S().viagens.find((x) => x.id === el.dataset.id);
      formulario('Cheguei ao destino', [{ k: 'kmFim', label: 'Km no painel na chegada', tipo: 'number', obrig: true }, { k: 'obs', label: 'Observações (opcional)', tipo: 'textarea', col: 2 }], { kmFim: D.kmAtual(S(), v.veiculoId) || '' }, (d) => {
        if (v.kmInicio && d.kmFim < v.kmInicio) return `O km de chegada precisa ser maior que o de saída (${km(v.kmInicio)})`;
        A.store.commit((s) => Object.assign(s.viagens.find((x) => x.id === v.id), { status: 'concluida', dataChegada: today(), kmFim: d.kmFim, obs: d.obs || v.obs || '' }));
        toast(`Viagem encerrada: ${km(d.kmFim - (v.kmInicio || d.kmFim))} rodados`);
      }, 'Encerrar viagem'); },
    apagarLanc: async (el) => {
      if (!(await confirmar('Apagar este lançamento?', { ok: 'Apagar' }))) return;
      const [col, id] = el.dataset.ref.split(':');
      A.store.commit((s) => { s[col] = s[col].filter((x) => x.id !== id); }); toast('Apagado');
    },
  },
});

function vInicio() {
  const s = S();
  const m = eu();
  const atual = viagemAtual();
  const planejadas = sortBy(meus('viagens').filter((v) => v.status === 'planejada'), (v) => v.dataSaida);
  const ultimos = sortBy([...meus('abastecimentos'), ...meus('despesas')], (x) => x.data + x.id, true).slice(0, 5);
  const cnh = m?.cnhValidade ? diffDays(m.cnhValidade, today()) : null;
  return A.tela('Início', `
    ${A.pageHead(`Olá, ${esc((m?.nome || '').split(' ')[0])}`, esc(s.meta.empresa || ''))}
    ${cnh != null && cnh <= 30 ? `<div class="aviso ${cnh < 0 ? 'crit' : ''}">${icon('alert')}<span>Sua CNH ${cnh < 0 ? 'venceu' : 'vence'} em ${date(m.cnhValidade)}.</span></div>` : ''}
    ${atual ? `<div class="card dark col"><div class="label">Em viagem</div><div class="grande" style="font-size:22px">${esc(atual.origem)} → ${esc(atual.destino)}</div>
        <div class="small">${esc(D.veiculo(s, atual.veiculoId)?.placa || '')} · saída ${dateShort(atual.dataSaida)} · ${km(atual.kmInicio)}${atual.carga ? ' · ' + esc(atual.carga) : ''}</div>
        <button class="btn light block" data-act="encerrar" data-id="${atual.id}">${icon('flag')} Cheguei ao destino</button></div>`
      : planejadas.length ? planejadas.map((v) => `<div class="card col"><div class="row between"><b>${esc(v.origem)} → ${esc(v.destino)}</b>${badge('Planejada', 'info')}</div><div class="small muted">${esc(D.veiculo(s, v.veiculoId)?.placa || '')} · ${date(v.dataSaida)}${v.carga ? ' · ' + esc(v.carga) : ''}</div><button class="btn block" data-act="iniciarPlanejada" data-id="${v.id}">${icon('play')} Iniciar esta viagem</button></div>`).join('')
      : `<button class="acao-grande" data-act="novaViagem"><span class="ic">${icon('play')}</span><span class="grow"><div class="t">Iniciar viagem</div><div class="s">Informe destino e km do painel</div></span></button>`}
    <div class="grid g2 mt" style="gap:12px">
      <button class="acao-grande" data-act="abastecer"><span class="ic">${icon('fuel')}</span><span class="grow"><div class="t">Abastecer</div><div class="s">Litros, valor e km</div></span></button>
      <button class="acao-grande" data-act="despesa"><span class="ic" style="background:var(--destaque)">${icon('receipt')}</span><span class="grow"><div class="t">Despesa</div><div class="s">Pedágio, refeição, borracharia…</div></span></button>
    </div>
    <h2 class="mt">Últimos lançamentos</h2>
    <div class="card pad-0 mt-s"><div class="list" style="padding:0 16px">${ultimos.map(linha).join('') || empty('Seus abastecimentos e despesas aparecem aqui.', 'list')}</div></div>`);
}

const linha = (x) => {
  const ab = x.litros !== undefined;
  const col = ab ? 'abastecimentos' : 'despesas';
  return `<div class="li"><div class="avatar">${icon(ab ? 'fuel' : 'receipt')}</div><div class="grow"><div class="t small">${ab ? `Abastecimento · ${(+x.litros).toLocaleString('pt-BR')} l` : esc(D.nomeCategoria(x.categoria))}${x.descricao ? ' · ' + esc(x.descricao) : ''}</div>
    <div class="s">${dateShort(x.data)} · ${esc(D.veiculo(S(), x.veiculoId)?.placa || '')}${x.pagoPeloMotorista ? ' · pago por mim' : ''}</div></div><b class="num small">${money(x.valor)}</b>
    ${x.conferido ? badge('Conferido', 'ok') : `<button class="iconbtn" data-act="apagarLanc" data-ref="${col}:${x.id}" aria-label="Apagar">${icon('trash')}</button>`}</div>`;
};

function vLancamentos() {
  const viagens = sortBy(meus('viagens'), (v) => v.dataSaida, true).slice(0, 30);
  const lanc = sortBy([...meus('abastecimentos'), ...meus('despesas')], (x) => x.data + x.id, true).slice(0, 80);
  return A.tela('Lançamentos', `${A.pageHead('Meus lançamentos', 'Depois de conferido pela empresa, o lançamento não pode mais ser alterado.')}
    <div class="card pad-0"><div class="list" style="padding:0 16px">${lanc.map(linha).join('') || empty('Nada lançado ainda.', 'list')}</div></div>
    <h2 class="mt">Minhas viagens</h2>
    <div class="card pad-0 mt-s"><div class="list" style="padding:0 16px">${viagens.map((v) => `<div class="li"><div class="avatar">${icon('map')}</div><div class="grow"><div class="t small">${esc(v.origem)} → ${esc(v.destino)}</div><div class="s">${dateShort(v.dataSaida)}${v.dataChegada ? ' a ' + dateShort(v.dataChegada) : ''} · ${D.kmViagem(v) ? km(D.kmViagem(v)) : esc(D.STATUS_VIAGEM[v.status]?.label || '')}</div></div>${v.conferido ? badge('Conferida', 'ok') : badge(D.STATUS_VIAGEM[v.status]?.label || '', D.STATUS_VIAGEM[v.status]?.tom)}</div>`).join('') || empty('—', 'map')}</div></div>`);
}

function vAcerto({ query }) {
  const p = query.p || 'mes';
  const [de, ate, nome] = D.periodo(p);
  const ac = D.acerto(S(), A.store.meuRef(), de, ate);
  return A.tela('Meu acerto', `${A.pageHead('Meu acerto', `${nome} · ${date(de)} a ${date(ate)}`)}
    <div class="seg mb">${[['mes', 'Este mês'], ['ant', 'Mês passado']].map(([v, n]) => `<button class="${p === v ? 'on' : ''}" data-act="goto" data-h="#/acerto?p=${v}">${n}</button>`).join('')}</div>
    <div class="card dark col"><div class="label">Saldo previsto</div><div class="grande">${money(ac.saldo)}</div><div class="small">${ac.saldo >= 0 ? 'a receber da empresa' : 'a devolver à empresa'} · valores confirmados no fechamento com a empresa</div></div>
    <div class="grid g2 mt" style="gap:12px">${kpi('Comissões', money0(ac.comissoes), plural(ac.viagens.length, 'viagem', 'viagens'))}${kpi('Reembolsos', money0(ac.reembolsos), 'o que paguei')}${kpi('Adiantamentos', money0(ac.adiantamentos), 'já recebidos')}</div>
    <div class="tiny muted mt">A comissão aparece quando a empresa informa o valor do frete da viagem.</div>`);
}

A.iniciar();
