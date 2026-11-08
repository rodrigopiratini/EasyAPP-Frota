// EasyAPP Frota — app do Motorista (celular)
import { criarApp } from '../core/app.js';
import { formHTML, lerCampos } from '../core/form.js';
import * as D from '../dominio.js';
import { money, money0, date, dateShort, today, esc, sortBy, uid, plural, diffDays, sum } from '../core/fmt.js';
import { icon, badge, empty, modal, closeModal, toast, kpi, confirmar } from '../core/ui.js';
import { ligarTres, completarTres } from '../tres.js';
import { relatorio } from '../gestao/fechamento.js';

const S = () => A.S();
const eu = () => S().motoristas.find((m) => m.id === A.store.meuRef());
const meus = (col) => S()[col].filter((x) => x.motoristaId === A.store.meuRef());
const viagemAtual = () => meus('viagens').find((v) => v.status === 'em_viagem');
const veiculoPadrao = () => viagemAtual()?.veiculoId || eu()?.veiculoId || S().veiculos.find((v) => v.ativo !== false)?.id;
const opVeiculos = (s) => s.veiculos.filter((v) => v.ativo !== false).map((v) => [v.id, D.nomeVeiculo(v)]);
const km = (v) => (+v || 0).toLocaleString('pt-BR') + ' km';

const CAMPOS_ABAST = [
  { k: 'veiculoId', label: 'Veículo', tipo: 'select', obrig: true, opcoes: opVeiculos, col: 2, se: (d) => !d.emViagem },
  { k: 'km', label: 'Km no painel', tipo: 'inteiro', obrig: true },
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
  { k: 'veiculoId', label: 'Veículo', tipo: 'select', opcoes: opVeiculos, se: (d) => !d.emViagem },
  { k: 'descricao', label: 'Detalhe (opcional)', col: 2 },
  { k: 'pagoPeloMotorista', label: 'Paguei do meu bolso (reembolso no acerto)', tipo: 'checkbox', padrao: true, col: 2 },
];
const CAMPOS_INICIAR = [
  { k: 'veiculoId', label: 'Veículo', tipo: 'select', obrig: true, opcoes: opVeiculos, col: 2 },
  { k: 'origem', label: 'Saindo de', obrig: true, ph: 'Cidade/UF' },
  { k: 'destino', label: 'Indo para', obrig: true, ph: 'Cidade/UF' },
  { k: 'dataSaida', label: 'Data de saída', tipo: 'date', obrig: true, padrao: today },
  { k: 'kmInicio', label: 'Km no painel agora', tipo: 'inteiro', obrig: true },
  { k: 'carga', label: 'Carga (opcional)' },
];
const FORMAS_MOT = D.FORMAS_RECEB.filter(([k]) => ['especie', 'carta_frete', 'pix', 'deposito', 'cheque', 'outro'].includes(k)).map(([k, n]) => [k, k === 'pix' ? 'Cliente pagou ao dono (PIX)' : n]);
const CAMPOS_RECEB = [
  { k: 'forma', label: 'O que recebi', tipo: 'select', obrig: true, opcoes: FORMAS_MOT, col: 2 },
  { k: 'valor', label: 'Valor', tipo: 'money', obrig: true },
  { k: 'data', label: 'Data', tipo: 'date', obrig: true, padrao: today },
  { k: 'obs', label: 'Observação (opcional)', col: 2 },
];
// viagem em que os lançamentos entram: a em andamento ou, depois de chegar, a última ainda não fechada
const viagemLanc = () => viagemAtual() || sortBy(meus('viagens').filter((v) => v.status === 'concluida' && !v.fechadoEm), (v) => v.dataChegada || v.dataSaida, true)[0];
const naViagem = () => { const v = viagemLanc(); return v ? { emViagem: true, veiculoId: v.veiculoId } : { veiculoId: veiculoPadrao() }; };
const tituloV = (t) => { const v = viagemLanc(); return v ? `${t} · ${esc(D.veiculo(S(), v.veiculoId)?.placa || '')} · ${esc(v.destino)}` : t; };

function formulario(titulo, campos, inicial, salvar, botao = 'Salvar') {
  modal({ title: titulo, body: formHTML('fmo', campos, inicial),
    foot: `<button class="btn ghost" data-act="close">Cancelar</button><button class="btn" data-act="ok">${botao}</button>`,
    handlers: { ok: () => { const { dados, erro } = lerCampos('fmo', campos); if (erro) return toast(erro); const msg = salvar(dados); if (typeof msg === 'string') return toast(msg); if (msg === false) return; closeModal(); } } });
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
  mais: () => {
    const v = viagemAtual();
    return [
      { icone: 'fuel', texto: 'Abastecimento', act: 'abastecer' },
      { icone: 'receipt', texto: 'Despesa', act: 'despesa' },
      v ? { icone: 'money', texto: 'Recebi do frete', act: 'receber' } : null,
      v ? { icone: 'check', texto: 'Cheguei ao destino', act: 'encerrar', dados: { id: v.id } } : { icone: 'map', texto: 'Iniciar viagem', act: 'novaViagem' },
    ];
  },
  sugestoes: (rota) => rota === '/acerto' ? ['Explique o meu acerto', 'Quanto eu tenho para receber?'] : ['Quanto gastei nesta viagem?', 'Qual foi o meu consumo de diesel?'],
  iaExtras: (s) => ({ fechamento_viagens: { nome: 'Fechamento das minhas viagens (calculado)', docs: s.viagens.filter((v) => v.motoristaId === A.store.meuRef()).map((v) => {
    const f = D.fechamento(s, v), r = (x) => Math.round((+x || 0) * 100) / 100;
    return { id: 'fv_' + v.id, viagemId: v.id, numero: v.numero || null, destino: v.destino, status: v.status, dataSaida: v.dataSaida, fechadoEm: v.fechadoEm || null,
      comissao: r(f.comissao), adiantamento: r(f.adiantamento), gastosPagosPeloMotorista: r(f.gastosMotorista), freteComMotorista: r(f.comMotorista), saldoMotorista: r(f.saldo) };
  }) } }),
  contaExtra: () => { const m = eu(); if (!m) return ''; const d = m.cnhValidade ? diffDays(m.cnhValidade, today()) : null;
    return `<div class="small ink2">CNH ${esc(m.cnhCategoria || '')} válida até <b>${date(m.cnhValidade)}</b> ${d != null && d < 0 ? badge('Vencida', 'crit') : d != null && d <= 30 ? badge('Renove logo', 'warn') : ''}<br>Comissão: ${m.comissaoPct || 0}% do frete · veículo: ${esc(D.veiculo(S(), m.veiculoId)?.placa || '—')}</div>`; },
  acoes: {
    abastecer: () => { formulario(tituloV('Abastecimento'), CAMPOS_ABAST, naViagem(), (d) => {
      completarTres(d); d.veiculoId ||= viagemLanc()?.veiculoId;
      if (d.litros <= 0 || d.litros > 1500) return 'Confira os litros';
      const aviso = avisoKm(d.veiculoId, d.km);
      const salvar = () => A.store.commit((s) => s.abastecimentos.push({ id: uid('ab'), data: today(), motoristaId: A.store.meuRef(), viagemId: viagemLanc()?.id || null, conferido: false, ...d }));
      if (aviso) { confirmar(aviso + ' Salvar assim mesmo?', { ok: 'Salvar' }).then((y) => { if (y && salvar() !== false) toast('Abastecimento lançado'); }); return; }
      if (salvar() === false) return false;
      toast(`Abastecimento lançado: ${money(d.valor)}`);
    }); ligarTres('fmo'); },
    despesa: () => formulario(tituloV('Despesa'), CAMPOS_DESPESA, { ...naViagem(), pagoPeloMotorista: true }, (d) => {
      d.veiculoId ||= viagemLanc()?.veiculoId;
      if (A.store.commit((s) => s.despesas.push({ id: uid('dp'), data: today(), motoristaId: A.store.meuRef(), viagemId: viagemLanc()?.id || null, conferido: false, ...d })) === false) return false;
      toast(`Despesa lançada: ${money(d.valor)}`);
    }),
    novaViagem: () => formulario('Iniciar viagem', CAMPOS_INICIAR, { veiculoId: veiculoPadrao(), kmInicio: D.kmAtual(S(), veiculoPadrao()) || '' }, (d) => {
      const aviso = avisoKm(d.veiculoId, d.kmInicio); if (aviso) return aviso;
      if (A.store.commit((s) => s.viagens.push({ id: uid('vg'), motoristaId: A.store.meuRef(), status: 'em_viagem', conferido: false, ...d })) === false) return false;
      toast('Boa viagem!');
    }, 'Iniciar'),
    iniciarPlanejada: (el) => { const v = S().viagens.find((x) => x.id === el.dataset.id);
      formulario(`Iniciar viagem para ${esc(v.destino)}`, [{ k: 'dataSaida', label: 'Data de saída', tipo: 'date', obrig: true }, { k: 'kmInicio', label: 'Km no painel agora', tipo: 'inteiro', obrig: true }], { dataSaida: today(), kmInicio: D.kmAtual(S(), v.veiculoId) || '' }, (d) => {
        if (A.store.commit((s) => Object.assign(s.viagens.find((x) => x.id === v.id), { status: 'em_viagem', dataSaida: d.dataSaida, kmInicio: d.kmInicio })) === false) return false;
        toast('Boa viagem!');
      }, 'Iniciar'); },
    encerrar: (el) => { const v = S().viagens.find((x) => x.id === el.dataset.id);
      formulario('Cheguei ao destino', [{ k: 'dataChegada', label: 'Data de chegada', tipo: 'date', obrig: true }, { k: 'kmFim', label: 'Km no painel na chegada', tipo: 'inteiro', obrig: true }, { k: 'obs', label: 'Observações (opcional)', tipo: 'textarea', col: 2 }], { dataChegada: today(), kmFim: D.kmAtual(S(), v.veiculoId) || '' }, (d) => {
        if (v.kmInicio && d.kmFim < v.kmInicio) return `O km de chegada precisa ser maior que o de saída (${km(v.kmInicio)})`;
        if (d.dataChegada < v.dataSaida) return 'A chegada está antes da saída';
        if (d.dataChegada > today()) return 'A data de chegada não pode ser depois de hoje';
        if (A.store.commit((s) => Object.assign(s.viagens.find((x) => x.id === v.id), { status: 'concluida', dataChegada: d.dataChegada, kmFim: d.kmFim, obs: d.obs || v.obs || '' })) === false) return false;
        toast(`Viagem encerrada: ${km(d.kmFim - (v.kmInicio || d.kmFim))} rodados`);
      }, 'Encerrar viagem'); },
    receber: () => {
      const v = viagemLanc();
      if (!v) return toast('Inicie a viagem para lançar o que recebeu');
      formulario(tituloV('Recebi'), CAMPOS_RECEB, { forma: 'especie' }, (d) => {
        if (A.store.commit((s) => s.recebimentos.push({ id: uid('rc'), motoristaId: A.store.meuRef(), viagemId: v.id, veiculoId: v.veiculoId, com: D.comPadrao(d.forma), conferido: false, ...d })) === false) return false;
        toast(`Recebimento lançado: ${money(d.valor)}`);
      });
    },
    grupo: (el, e) => { if (e?.target.closest('button')) return; el.closest('.grupo').classList.toggle('aberto'); },
    expandirTudo: () => document.querySelectorAll('.grupo').forEach((g) => g.classList.add('aberto')),
    recolherTudo: () => document.querySelectorAll('.grupo').forEach((g) => g.classList.remove('aberto')),
    relatorio: (el) => {
      const v = S().viagens.find((x) => x.id === el.dataset.id); if (!v) return;
      const w = window.open('', '_blank'); if (!w) return toast('Libere as janelas (pop-up) para ver o relatório');
      w.document.write(relatorio(S(), v, S().meta.empresa, { paraMotorista: true })); w.document.close();
    },
    apagarLanc: async (el) => {
      if (!(await confirmar('Apagar este lançamento?', { ok: 'Apagar' }))) return;
      const [col, id] = el.dataset.ref.split(':');
      if (A.store.commit((s) => { s[col] = s[col].filter((x) => x.id !== id); }) !== false) toast('Apagado');
    },
  },
});

function vInicio() {
  const s = S();
  const m = eu();
  const atual = viagemAtual();
  const planejadas = sortBy(meus('viagens').filter((v) => v.status === 'planejada'), (v) => v.dataSaida);
  const vl = viagemLanc();
  const ultimos = sortBy([...meus('abastecimentos'), ...meus('despesas'), ...meus('recebimentos')].filter((x) => (vl ? x.viagemId === vl.id : true)), (x) => x.data + x.id, true).slice(0, vl ? 50 : 5);
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
      <button class="acao-grande" data-act="receber" style="grid-column:1/-1"><span class="ic" style="background:var(--s1)">${icon('money')}</span><span class="grow"><div class="t">Recebi</div><div class="s">Dinheiro, carta frete ou pagamento do frete</div></span></button>
    </div>
    <h2 class="mt">${vl ? `Lançamentos da viagem ${esc(vl.origem)} → ${esc(vl.destino)}` : 'Últimos lançamentos'}</h2>
    <div class="card pad-0 mt-s"><div class="list" style="padding:0 16px">${ultimos.map(linha).join('') || empty('Seus abastecimentos e despesas aparecem aqui.', 'list')}</div></div>`);
}

const linha = (x) => {
  const ab = x.litros !== undefined, rc = x.forma !== undefined;
  const col = rc ? 'recebimentos' : ab ? 'abastecimentos' : 'despesas';
  return `<div class="li"><div class="avatar">${icon(rc ? 'money' : ab ? 'fuel' : 'receipt')}</div><div class="grow"><div class="t small">${rc ? `Recebi · ${esc(D.nomeForma(x.forma))}` : ab ? `Abastecimento · ${(+x.litros).toLocaleString('pt-BR')} l` : esc(D.nomeCategoria(x.categoria))}${x.descricao || x.obs ? ' · ' + esc(x.descricao || x.obs) : ''}</div>
    <div class="s">${dateShort(x.data)} · ${esc(D.veiculo(S(), x.veiculoId)?.placa || '')}${x.pagoPeloMotorista ? ' · pago por mim' : ''}${rc ? (x.com === 'motorista' ? ' · ficou comigo' : ' · foi para a empresa') : ''}</div></div><b class="num small ${rc ? 'up' : ''}">${money(x.valor)}</b>
    ${x.conferido ? badge('Conferido', 'ok') : `<button class="iconbtn" data-act="apagarLanc" data-ref="${col}:${x.id}" aria-label="Apagar">${icon('trash')}</button>`}</div>`;
};

// Lançamentos agrupados por viagem (os sem viagem ficam no fim)
const cabViagem = (v, extra = '') => {
  const st = D.STATUS_VIAGEM[v.status];
  return `<div class="grupo-cab click" data-act="grupo"><span class="grupo-seta">▸</span><div class="grow"><b>${esc(v.origem)} → ${esc(v.destino)}</b><div class="small muted">${dateShort(v.dataSaida)}${v.dataChegada ? ' a ' + dateShort(v.dataChegada) : ''}${D.kmViagem(v) ? ' · ' + km(D.kmViagem(v)) : ''} · ${esc(D.veiculo(S(), v.veiculoId)?.placa || '')}${extra}</div></div>
    <div class="row gap-s">${v.fechadoEm ? `<button class="btn ghost sm" data-act="relatorio" data-id="${v.id}">${icon('download')} Relatório</button>` + badge('Fechada', 'ok') : badge(st?.label || '', st?.tom)}</div></div>`;
};
const botoesGrupo = `<div class="row gap-s mb"><button class="btn ghost sm" data-act="expandirTudo">Expandir tudo</button><button class="btn ghost sm" data-act="recolherTudo">Recolher tudo</button></div>`;
function vLancamentos() {
  const lanc = [...meus('abastecimentos'), ...meus('despesas'), ...meus('recebimentos')];
  const ids = new Set(lanc.map((x) => x.viagemId).filter(Boolean));
  const viagens = sortBy(meus('viagens'), (v) => v.dataSaida, true).slice(0, 40);
  const soltos = sortBy(lanc.filter((x) => !x.viagemId || !viagens.some((v) => v.id === x.viagemId)), (x) => x.data + x.id, true);
  const bloco = (v) => {
    const its = sortBy(lanc.filter((x) => x.viagemId === v.id), (x) => x.data + x.id, true);
    const desp = sum(its.filter((x) => x.forma === undefined), (x) => +x.valor), rec = sum(its.filter((x) => x.forma !== undefined), (x) => +x.valor);
    const aberta = v.id === viagemLanc()?.id;
    return `<div class="card pad-0 mt-s grupo ${aberta ? 'aberto' : ''}">${cabViagem(v, ` · ${plural(its.length, 'lançamento')}`)}<div class="itens"><div class="list">${its.map(linha).join('') || '<div class="small muted" style="padding:10px 0">Nada lançado nesta viagem.</div>'}</div>
      ${its.length ? `<div class="small ink2" style="padding:8px 0 14px">Despesas ${money(desp)} · recebido ${money(rec)}</div>` : ''}</div></div>`;
  };
  return A.tela('Lançamentos', `${A.pageHead('Minhas viagens e lançamentos', 'Clique na viagem para ver os lançamentos. Viagens fechadas têm o relatório do acerto.')}${botoesGrupo}
    ${viagens.map(bloco).join('') || `<div class="card">${empty('Nenhuma viagem ainda.', 'map')}</div>`}
    ${soltos.length ? `<h2 class="mt">Fora de viagem</h2><div class="card pad-0 mt-s"><div class="list" style="padding:0 16px">${soltos.map(linha).join('')}</div></div>` : ''}`);
}

function vAcerto({ query }) {
  const p = query.p || 'mes';
  const [de, ate, nome] = D.periodo(p);
  const ac = D.acerto(S(), A.store.meuRef(), de, ate);
  const atual = viagemLanc();
  const parcial = atual && atual.status !== 'concluida' ? D.fechamento(S(), atual) : null;
  const linhaV = (x) => `<div class="card pad-0 mt-s grupo">${cabViagem(x.v, ` · <b>${x.saldo >= 0 ? 'receber' : 'devolver'} ${money(Math.abs(x.saldo))}</b>`)}<div class="itens"><div class="tbl-wrap"><table class="tbl"><tbody>
      <tr><td>Comissão ${x.f.pct}% sobre ${money(x.f.frete)}</td><td class="r up">${money(x.comissao)}</td></tr>
      <tr><td>O que paguei na viagem</td><td class="r up">${money(x.pagou)}</td></tr>
      <tr><td>O que ficou comigo (frete + adiantamento)</td><td class="r down">−${money(x.ficou)}</td></tr>
    </tbody><tfoot><tr><td>${x.saldo >= 0 ? 'A receber da empresa' : 'A devolver à empresa'}</td><td class="r"><b>${money(Math.abs(x.saldo))}</b></td></tr></tfoot></table></div></div></div>`;
  return A.tela('Meu acerto', `${A.pageHead('Meu acerto', `${nome} · ${date(de)} a ${date(ate)}`)}
    <div class="seg mb">${[['mes', 'Este mês'], ['ant', 'Mês passado']].map(([v, n]) => `<button class="${p === v ? 'on' : ''}" data-act="goto" data-h="#/acerto?p=${v}">${n}</button>`).join('')}</div>
    <div class="card dark col"><div class="label">Saldo do período</div><div class="grande">${money(Math.abs(ac.saldo))}</div><div class="small">${ac.saldo >= 0 ? 'a receber da empresa' : 'a devolver à empresa'} · ${plural(ac.porViagem.length, 'viagem', 'viagens')} · valores confirmados no fechamento com a empresa</div></div>
    ${parcial ? `<h2 class="mt">Viagem em andamento</h2><div class="card pad-0 mt-s grupo aberto">${cabViagem(atual)}<div class="itens"><div class="small" style="padding:10px 0 14px">Até agora: ficou comigo ${money(parcial.dinheiroMotorista)} · paguei ${money(parcial.gastosMotorista)} · comissão prevista ${money(parcial.comissao)}</div></div></div>` : ''}
    <div class="row between mt"><h2>Por viagem</h2>${botoesGrupo.replace(' mb', '')}</div>${ac.porViagem.map(linhaV).join('') || `<div class="card mt-s">${empty('Nenhuma viagem concluída no período.', 'map')}</div>`}
    ${ac.foraDeViagem.length ? `<h2 class="mt">Fora de viagem</h2><div class="card pad-0 mt-s"><div class="list" style="padding:0 16px">${ac.foraDeViagem.map((x) => `<div class="li"><div class="grow"><div class="t small">${esc(x.descricao)}</div><div class="s">${dateShort(x.data)}</div></div><b class="num small">${x.sinal > 0 ? '' : '−'}${money(x.valor)}</b></div>`).join('')}</div></div>` : ''}
    <div class="tiny muted mt">A comissão aparece quando a empresa informa o valor do frete da viagem.</div>`);
}

A.iniciar();
