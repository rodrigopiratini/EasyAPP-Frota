// EasyAPP Frota — app do Motorista (celular)
import { criarApp } from '../core/app.js';
import { formHTML, lerCampos } from '../core/form.js';
import * as D from '../dominio.js';
import { money, money0, date, dateShort, today, esc, sortBy, uid, plural, diffDays, sum } from '../core/fmt.js';
import { icon, badge, empty, modal, closeModal, toast, confirmar } from '../core/ui.js';
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
  { k: 'veiculoId', label: 'Caminhão', tipo: 'select', obrig: true, opcoes: opVeiculos, col: 2, se: (d) => !d.emViagem },
  { k: 'valor', label: 'Quanto pagou?', tipo: 'money', obrig: true, col: 2 },
  { k: 'litros', label: 'Litros', tipo: 'number', obrig: true },
  { k: 'precoLitro', label: 'Preço do litro', tipo: 'money' },
  { k: 'km', label: 'Km do painel', tipo: 'inteiro', obrig: true, col: 2 },
  { k: 'pagoPeloMotorista', label: 'Paguei com o dinheiro da viagem', tipo: 'checkbox', col: 2 },
];
const camposDespesa = (tipo) => [
  { k: 'veiculoId', label: 'Caminhão', tipo: 'select', opcoes: opVeiculos, col: 2, se: (d) => !d.emViagem },
  { k: 'valor', label: 'Quanto?', tipo: 'money', obrig: true, col: 2 },
  ...(tipo === 'outros' ? [{ k: 'descricao', label: 'O que foi?', obrig: true, col: 2 }] : []),
  tipo === 'pedagio'
    ? { k: 'pagoCom', label: 'Como pagou?', tipo: 'select', obrig: true, padrao: 'tag', opcoes: [['tag', 'Passou no tag do caminhão'], ['motorista', 'Paguei com o dinheiro da viagem']], col: 2 }
    : { k: 'pagoPeloMotorista', label: 'Paguei com o dinheiro da viagem', tipo: 'checkbox', padrao: true, col: 2 },
];
// os tipos em quadrados grandes, com desenho
const SVG = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const TRES_PONTOS = SVG('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>');
const TIPOS_DESP = [
  ['pedagio', 'Pedágio', SVG('<path d="M4 20h16M6 20V9l6-5 6 5v11M10 20v-5h4v5"/>')],
  ['alimentacao', 'Comida', SVG('<path d="M4 11h16M5 11a7 7 0 0 0 14 0M8 4v3M12 3v4M16 4v3"/>')],
  ['pneu', 'Borracharia', SVG('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>')],
  ['manutencao', 'Oficina', icon('wrench')],
  ['hospedagem', 'Pernoite', SVG('<path d="M3 18v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8M3 14h18M7 11h3"/>')],
  ['outros', 'Outro', TRES_PONTOS],
];
const TIPOS_RECEB = [['especie', 'Dinheiro', icon('money')], ['carta_frete', 'Carta frete', icon('file')], ['pix', 'Cliente pagou à empresa', icon('building')], ['outro', 'Outro', TRES_PONTOS]];
// escolha do tipo: quadrados grandes; tocou, abre o valor
function escolherTipo(titulo, tipos, aoEscolher) {
  modal({ title: titulo, body: `<div class="tipos-grandes">${tipos.map(([k, n, ic]) => `<button class="tipo" data-act="tipo" data-k="${k}">${ic}<span>${n}</span></button>`).join('')}</div>`,
    handlers: { tipo: (b) => { closeModal(); aoEscolher(b.dataset.k, tipos.find((x) => x[0] === b.dataset.k)[1]); } } });
}
// confirmação: tela verde que some sozinha; Desfazer apaga o que acabou de ser lançado
function lancado(texto, col, id) {
  const el = document.createElement('div'); el.className = 'feito';
  el.innerHTML = `<div class="ok">${icon('check')}</div><b>Lançado</b><span>${texto}</span><button class="desf">Desfazer</button>`;
  document.body.appendChild(el);
  const fim = setTimeout(() => el.remove(), 2200);
  el.onclick = (e) => {
    if (e.target.closest('.desf') && col) { A.store.commit((s) => { s[col] = s[col].filter((x) => x.id !== id); }); toast('Desfeito'); }
    clearTimeout(fim); el.remove();
  };
}
const CAMPOS_INICIAR = [
  { k: 'veiculoId', label: 'Veículo', tipo: 'select', obrig: true, opcoes: opVeiculos, col: 2 },
  { k: 'origem', label: 'Saindo de', obrig: true, ph: 'Cidade/UF' },
  { k: 'destino', label: 'Indo para', obrig: true, ph: 'Cidade/UF' },
  { k: 'dataSaida', label: 'Data de saída', tipo: 'date', obrig: true, padrao: today },
  { k: 'kmInicio', label: 'Km no painel agora', tipo: 'inteiro', obrig: true },
  { k: 'carga', label: 'Carga' },
];
const camposReceb = (forma) => [
  { k: 'valor', label: 'Quanto?', tipo: 'money', obrig: true, col: 2 },
  ...(forma === 'outro' ? [{ k: 'obs', label: 'O que foi?', obrig: true, col: 2 }] : []),
];
// viagem em que os lançamentos entram: a em andamento ou, depois de chegar, a última ainda não fechada
const viagemLanc = () => viagemAtual() || sortBy(meus('viagens').filter((v) => v.status === 'concluida' && !v.fechadoEm), (v) => v.dataChegada || v.dataSaida, true)[0];
const naViagem = () => { const v = viagemLanc(); return v ? { emViagem: true, veiculoId: v.veiculoId } : { veiculoId: veiculoPadrao() }; };
document.documentElement.classList.add('app-motorista');

function formulario(titulo, campos, inicial, salvar, botao = 'Salvar') {
  modal({ title: titulo, body: formHTML('fmo', campos, inicial),
    foot: `<button class="btn ghost" data-act="close">Cancelar</button><button class="btn" data-act="ok">${botao}</button>`,
    handlers: { ok: () => { const { dados, erro } = lerCampos('fmo', campos); if (erro) return toast(erro); const msg = salvar(dados); if (typeof msg === 'string') return toast(msg); if (msg === false) return; closeModal(); } } });
}
const avisoKm = (vid, kmNovo) => { const atual = D.kmAtual(S(), vid); return kmNovo < atual - 5 ? `O km informado (${km(kmNovo)}) é menor que o último registrado (${km(atual)}). Confira o painel.` : null; };

const A = criarApp({
  tipo: 'usuario',
  inicio: '#/inicio',
  nav: [['#/inicio', 'home', 'Início'], ['#/lancamentos', 'map', 'Minhas viagens'], ['#/acerto', 'money', 'Meu acerto']],
  tabs: [['#/inicio', 'home', 'Início'], ['#/lancamentos', 'map', 'Viagens'], ['#/acerto', 'money', 'Acerto']],
  topoDireita: () => `<a href="#/conta" aria-label="Minha conta" style="color:#fff;display:inline-grid;place-items:center;width:36px;height:36px">${icon('user')}</a>`,
  rotas: [['/inicio', vInicio], ['/lancamentos', vLancamentos], ['/acerto', vAcerto]],
  nomeUsuario: () => eu()?.nome || '',
  dicaDemo: 'Demonstração: código JOAO, PIN 1234',
  sugestoes: (rota) => rota === '/acerto' ? ['Explique o meu acerto', 'Quanto eu tenho para receber?'] : ['Quanto gastei nesta viagem?', 'Qual foi o meu consumo de diesel?'],
  iaExtras: (s) => ({ fechamento_viagens: { nome: 'Fechamento das minhas viagens (calculado)', docs: s.viagens.filter((v) => v.motoristaId === A.store.meuRef()).map((v) => {
    const f = D.fechamento(s, v), r = (x) => Math.round((+x || 0) * 100) / 100;
    return { id: 'fv_' + v.id, viagemId: v.id, numero: v.numero || null, destino: v.destino, status: v.status, dataSaida: v.dataSaida, fechadoEm: v.fechadoEm || null,
      comissao: r(f.comissao), adiantamento: r(f.adiantamento), gastosPagosPeloMotorista: r(f.gastosMotorista), freteComMotorista: r(f.comMotorista), saldoMotorista: r(f.saldo) };
  }) } }),
  contaExtra: () => { const m = eu(); if (!m) return ''; const d = m.cnhValidade ? diffDays(m.cnhValidade, today()) : null;
    return `<div class="small ink2">CNH ${esc(m.cnhCategoria || '')} válida até <b>${date(m.cnhValidade)}</b> ${d != null && d < 0 ? badge('Vencida', 'crit') : d != null && d <= 30 ? badge('Renove logo', 'warn') : ''}<br>Comissão: ${m.comissaoPct || 0}% do frete · veículo: ${esc(D.veiculo(S(), m.veiculoId)?.placa || '—')}</div>`; },
  acoes: {
    abastecer: () => { formulario('Abasteci', CAMPOS_ABAST, naViagem(), (d) => {
      completarTres(d); d.veiculoId ||= viagemLanc()?.veiculoId;
      if (d.litros <= 0 || d.litros > 1500) return 'Confira os litros';
      const aviso = avisoKm(d.veiculoId, d.km);
      const id = uid('ab');
      const salvar = () => A.store.commit((s) => s.abastecimentos.push({ id, data: today(), motoristaId: A.store.meuRef(), viagemId: viagemLanc()?.id || null, conferido: false, tanqueCheio: true, ...d }));
      if (aviso) { confirmar(aviso + ' Salvar assim mesmo?', { ok: 'Salvar' }).then((y) => { if (y && salvar() !== false) lancado(`Abastecimento · ${money(d.valor)}`, 'abastecimentos', id); }); return; }
      if (salvar() === false) return false;
      setTimeout(() => lancado(`Abastecimento · ${money(d.valor)}`, 'abastecimentos', id), 50);
    }); ligarTres('fmo'); },
    despesa: () => escolherTipo('Paguei', TIPOS_DESP, (tipo, nome) => formulario(nome, camposDespesa(tipo), { ...naViagem(), pagoPeloMotorista: true }, (d) => {
      d.veiculoId ||= viagemLanc()?.veiculoId;
      if (d.pagoCom !== undefined) { d.pagoPeloMotorista = d.pagoCom === 'motorista'; if (d.pagoCom === 'tag') d.meio = 'tag'; delete d.pagoCom; }
      const id = uid('dp');
      if (A.store.commit((s) => s.despesas.push({ id, data: today(), categoria: tipo, motoristaId: A.store.meuRef(), viagemId: viagemLanc()?.id || null, conferido: false, ...d })) === false) return false;
      setTimeout(() => lancado(`${nome} · ${money(d.valor)}`, 'despesas', id), 50);
    })),
    novaViagem: () => formulario('Começar viagem', CAMPOS_INICIAR, { veiculoId: veiculoPadrao(), kmInicio: D.kmAtual(S(), veiculoPadrao()) || '' }, (d) => {
      const aviso = avisoKm(d.veiculoId, d.kmInicio); if (aviso) return aviso;
      if (A.store.commit((s) => s.viagens.push({ id: uid('vg'), motoristaId: A.store.meuRef(), status: 'em_viagem', conferido: false, ...d })) === false) return false;
      toast('Boa viagem!');
    }, 'Começar'),
    iniciarPlanejada: (el) => { const v = S().viagens.find((x) => x.id === el.dataset.id);
      formulario(`Começar viagem para ${esc(v.destino)}`, [{ k: 'dataSaida', label: 'Data de saída', tipo: 'date', obrig: true }, { k: 'kmInicio', label: 'Km no painel agora', tipo: 'inteiro', obrig: true }], { dataSaida: today(), kmInicio: D.kmAtual(S(), v.veiculoId) || '' }, (d) => {
        if (A.store.commit((s) => Object.assign(s.viagens.find((x) => x.id === v.id), { status: 'em_viagem', dataSaida: d.dataSaida, kmInicio: d.kmInicio })) === false) return false;
        toast('Boa viagem!');
      }, 'Começar'); },
    encerrar: (el) => { const v = S().viagens.find((x) => x.id === el.dataset.id);
      formulario('Cheguei ao destino', [{ k: 'dataChegada', label: 'Data de chegada', tipo: 'date', obrig: true }, { k: 'kmFim', label: 'Km no painel na chegada', tipo: 'inteiro', obrig: true }, { k: 'obs', label: 'Observação', tipo: 'textarea', col: 2 }], { dataChegada: today(), kmFim: D.kmAtual(S(), v.veiculoId) || '' }, (d) => {
        if (v.kmInicio && d.kmFim < v.kmInicio) return `O km de chegada precisa ser maior que o de saída (${km(v.kmInicio)})`;
        if (d.dataChegada < v.dataSaida) return 'A chegada está antes da saída';
        if (d.dataChegada > today()) return 'A data de chegada não pode ser depois de hoje';
        if (A.store.commit((s) => Object.assign(s.viagens.find((x) => x.id === v.id), { status: 'concluida', dataChegada: d.dataChegada, kmFim: d.kmFim, obs: d.obs || v.obs || '' })) === false) return false;
        toast(`Viagem encerrada: ${km(d.kmFim - (v.kmInicio || d.kmFim))} rodados`);
      }, 'Cheguei'); },
    receber: () => {
      const v = viagemLanc();
      if (!v) return toast('Comece a viagem primeiro');
      escolherTipo('Recebi', TIPOS_RECEB, (forma, nome) => formulario(nome, camposReceb(forma), {}, (d) => {
        const id = uid('rc');
        if (A.store.commit((s) => s.recebimentos.push({ id, forma, data: today(), motoristaId: A.store.meuRef(), viagemId: v.id, veiculoId: v.veiculoId, com: D.comPadrao(forma), conferido: false, ...d })) === false) return false;
        setTimeout(() => lancado(`${nome} · ${money(d.valor)}`, 'recebimentos', id), 50);
      }));
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

const botao = (act, cor, ic, texto, extra = '') => `<button class="bt-grande ${cor}" data-act="${act}" ${extra}><span class="ic">${ic}</span><span>${texto}</span></button>`;
function vInicio() {
  const s = S();
  const m = eu();
  const atual = viagemAtual();
  const planejadas = sortBy(meus('viagens').filter((v) => v.status === 'planejada'), (v) => v.dataSaida);
  const vl = viagemLanc();
  const daViagem = vl ? sortBy([...meus('abastecimentos'), ...meus('despesas'), ...meus('recebimentos')].filter((x) => x.viagemId === vl.id), (x) => x.data + x.id, true) : [];
  const cnh = m?.cnhValidade ? diffDays(m.cnhValidade, today()) : null;
  const placa = (v) => esc(D.veiculo(s, v.veiculoId)?.placa || '');
  return A.tela('Início', `
    <div class="ola">Olá, ${esc((m?.nome || '').split(' ')[0])}</div>
    ${cnh != null && cnh <= 30 ? `<div class="aviso ${cnh < 0 ? 'crit' : ''}">${icon('alert')}<span>CNH ${cnh < 0 ? 'vencida' : 'vence'} em ${date(m.cnhValidade)}</span></div>` : ''}
    ${atual ? `<div class="viagem-atual"><span class="rot">Em viagem</span><b>${esc(atual.origem)} → ${esc(atual.destino)}</b><span>${placa(atual)} · saiu ${dateShort(atual.dataSaida)}</span></div>
      <div class="grade-grande">${botao('abastecer', 'verde', icon('fuel'), 'Abasteci')}${botao('despesa', 'laranja', icon('receipt'), 'Paguei')}${botao('receber', 'azul', icon('money'), 'Recebi')}${botao('encerrar', 'escuro', icon('flag'), 'Cheguei', `data-id="${atual.id}"`)}</div>`
    : `${planejadas.map((v) => `<div class="viagem-marcada"><span class="rot">A empresa marcou para você</span><b>${esc(v.origem)} → ${esc(v.destino)}</b><span>${placa(v)} · ${dateShort(v.dataSaida)}${v.carga ? ' · ' + esc(v.carga) : ''}</span><button class="btn block" data-act="iniciarPlanejada" data-id="${v.id}">${icon('play')} Começar esta viagem</button></div>`).join('')}
      <div class="grade-grande">${botao('novaViagem', 'escuro largo', icon('play'), planejadas.length ? 'Começar outra viagem' : 'Começar viagem')}${botao('abastecer', 'verde', icon('fuel'), 'Abasteci')}${botao('despesa', 'laranja', icon('receipt'), 'Paguei')}${vl ? botao('receber', 'azul largo', icon('money'), 'Recebi') : ''}</div>`}
    ${daViagem.length ? `<div class="card pad-0 mt"><div class="list" style="padding:0 16px">${daViagem.map(linha).join('')}</div></div>` : ''}`);
}

const linha = (x) => {
  const ab = x.litros !== undefined, rc = x.forma !== undefined;
  const col = rc ? 'recebimentos' : ab ? 'abastecimentos' : 'despesas';
  return `<div class="li"><div class="avatar">${icon(rc ? 'money' : ab ? 'fuel' : 'receipt')}</div><div class="grow"><div class="t small">${rc ? `Recebi · ${esc(D.nomeForma(x.forma))}` : ab ? `Abastecimento · ${(+x.litros).toLocaleString('pt-BR')} l` : esc(D.nomeCategoria(x.categoria))}${x.descricao || x.obs ? ' · ' + esc(x.descricao || x.obs) : ''}</div>
    <div class="s">${dateShort(x.data)} · ${esc(D.veiculo(S(), x.veiculoId)?.placa || '')}${x.pagoPeloMotorista ? ' · pago por mim' : x.meio === 'tag' ? ' · tag do pedágio' : ''}${rc ? (x.com === 'motorista' ? ' · ficou comigo' : ' · foi para a empresa') : ''}</div></div><b class="num small ${rc ? 'up' : ''}">${money(x.valor)}</b>
    ${x.conferido ? badge('Conferido', 'ok') : `<button class="iconbtn" data-act="apagarLanc" data-ref="${col}:${x.id}" aria-label="Apagar">${icon('trash')}</button>`}</div>`;
};

// Lançamentos agrupados por viagem (os sem viagem ficam no fim)
const cabViagem = (v, extra = '') => {
  const st = D.STATUS_VIAGEM[v.status];
  return `<div class="grupo-cab click" data-act="grupo"><span class="grupo-seta">▸</span><div class="grow"><b>${esc(v.origem)} → ${esc(v.destino)}</b><div class="small muted">${dateShort(v.dataSaida)}${v.dataChegada ? ' a ' + dateShort(v.dataChegada) : ''}${D.kmViagem(v) ? ' · ' + km(D.kmViagem(v)) : ''} · ${esc(D.veiculo(S(), v.veiculoId)?.placa || '')}${extra}</div></div>
    <div class="row gap-s">${v.fechadoEm ? `<button class="btn ghost sm" data-act="relatorio" data-id="${v.id}">${icon('download')} Relatório</button>` + badge('Fechada', 'ok') : badge(st?.label || '', st?.tom)}</div></div>`;
};
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
  return A.tela('Minhas viagens', `${A.pageHead('Minhas viagens')}
    ${viagens.map(bloco).join('') || `<div class="card">${empty('Nenhuma viagem ainda.', 'map')}</div>`}
    ${soltos.length ? `<h2 class="mt">Sem viagem</h2><div class="card pad-0 mt-s"><div class="list" style="padding:0 16px">${soltos.map(linha).join('')}</div></div>` : ''}`);
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
    <div class="card dark col"><div class="label">Saldo do período</div><div class="grande">${money(Math.abs(ac.saldo))}</div><div class="small">${ac.saldo >= 0 ? 'a receber da empresa' : 'a devolver à empresa'}</div></div>
    ${parcial ? `<h2 class="mt">Viagem em andamento</h2><div class="card pad-0 mt-s grupo aberto">${cabViagem(atual)}<div class="itens"><div class="small" style="padding:10px 0 14px">Ficou comigo ${money(parcial.dinheiroMotorista)} · paguei ${money(parcial.gastosMotorista)} · comissão ${money(parcial.comissao)}</div></div></div>` : ''}
    <h2 class="mt">Por viagem</h2>${ac.porViagem.map(linhaV).join('') || `<div class="card mt-s">${empty('Nenhuma viagem concluída no período.', 'map')}</div>`}
    ${ac.foraDeViagem.length ? `<h2 class="mt">Sem viagem</h2><div class="card pad-0 mt-s"><div class="list" style="padding:0 16px">${ac.foraDeViagem.map((x) => `<div class="li"><div class="grow"><div class="t small">${esc(x.descricao)}</div><div class="s">${dateShort(x.data)}</div></div><b class="num small">${x.sinal > 0 ? '' : '−'}${money(x.valor)}</b></div>`).join('')}</div></div>` : ''}`);
}

A.iniciar();
