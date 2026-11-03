// Fechamento da viagem (gestão): como o frete foi recebido, o que o motorista pagou com o dinheiro da viagem,
// a comissão e quem deve a quem. Tudo ajustável aqui; o relatório sai em PDF (imprimir → salvar como PDF).
import * as D from '../dominio.js';
import { money, date, esc, today } from '../core/fmt.js';
import { modal, closeModal, toast, moneyInput, parseMoney, icon, waLink } from '../core/ui.js';

const linhaReceb = (r, i) => `<div class="row gap-s wrap rec" data-i="${i}" style="margin-bottom:8px">
  <select class="input" name="forma" style="flex:1 1 180px">${D.FORMAS_RECEB.map(([k, n]) => `<option value="${k}" ${k === r.forma ? 'selected' : ''}>${n}</option>`).join('')}</select>
  ${moneyInput('valor', r.valor || 0, { width: 150 })}
  <select class="input" name="com" style="flex:0 1 170px"><option value="dono" ${r.com !== 'motorista' ? 'selected' : ''}>Ficou com o dono</option><option value="motorista" ${r.com === 'motorista' ? 'selected' : ''}>Ficou com o motorista</option></select>
  <button class="iconbtn" data-act="tirarReceb" data-i="${i}" aria-label="Tirar">${icon('trash')}</button></div>`;

function corpo(s, v) {
  const f = D.fechamento(s, v);
  const ve = D.veiculo(s, v.veiculoId), mo = D.motorista(s, v.motoristaId);
  const pm = v.pagoMotorista || {};
  return `<div class="small ink2 mb">${esc(D.nomeVeiculo(ve))} · ${esc(mo?.nome || '—')} · ${date(v.dataSaida)} a ${date(v.dataChegada)}${D.kmViagem(v) ? ' · ' + D.kmViagem(v).toLocaleString('pt-BR') + ' km' : ''}</div>
  <form id="ffe" onsubmit="return false">
    <div class="grid g3" style="gap:12px">
      <label class="field"><span>Valor faturado (frete)</span>${moneyInput('valorFrete', v.valorFrete || 0, { width: '100%' })}</label>
      <label class="field"><span>Comissão do motorista (%)</span><input class="input num" type="number" inputmode="decimal" step="any" name="comissaoPct" value="${esc(v.comissaoPct ?? '')}"></label>
      <label class="field"><span>Adiantamento ao motorista</span>${moneyInput('adiantamento', v.adiantamento || 0, { width: '100%' })}</label>
    </div>
    <h3 class="mt">Como o frete foi recebido</h3>
    <div id="recs">${(D.recebimentos(v).length ? D.recebimentos(v) : [{ forma: 'pix', valor: 0, com: 'dono' }]).map(linhaReceb).join('')}</div>
    <button class="btn ghost sm" data-act="maisReceb">${icon('plus')} Recebimento</button>
    <h3 class="mt">Custos da viagem</h3>
    <div class="tiny muted mb">Marque o que o motorista pagou com o dinheiro da viagem (sai do que ficou com ele).</div>
    ${D.CUSTOS_VIAGEM.map(([k, n]) => `<div class="row gap-s" style="margin-bottom:8px"><span style="flex:1">${n}</span>${moneyInput('c_' + k, v[k] || 0, { width: 150 })}
      <label class="row small" style="flex:0 0 150px"><input type="checkbox" name="pm_${k}" ${pm[k] ? 'checked' : ''}> pago pelo motorista</label></div>`).join('')}
    ${f.custos.filter((c) => c.origem !== 'viagem').map((c) => `<div class="row gap-s small" style="margin-bottom:6px"><span style="flex:1">${esc(c.label)} <span class="muted">(lançado no app)</span></span><b class="num">${money(c.valor)}</b><span style="flex:0 0 150px" class="muted">${c.pagoMotorista ? 'pago pelo motorista' : 'pago pela empresa'}</span></div>`).join('')}
    <label class="field mt"><span>Observações do fechamento</span><textarea class="input" name="obsFechamento">${esc(v.obsFechamento || '')}</textarea></label>
  </form>
  <div id="resumoFe" class="mt">${resumo(f)}</div>`;
}

function resumo(f) {
  const l = (a, b, cls = '') => `<tr><td>${a}</td><td class="r ${cls}">${b}</td></tr>`;
  const quem = f.saldo > 0.004 ? `<b>Motorista devolve ${money(f.saldo)}</b>` : f.saldo < -0.004 ? `<b>Empresa paga ao motorista ${money(-f.saldo)}</b>` : '<b>Acerto zerado</b>';
  return `<div class="card dark col"><div class="label">Acerto com o motorista</div><div class="grande" style="font-size:22px">${quem}</div>
    <div class="small">Ficou com ele ${money(f.dinheiroMotorista)} − pagou ${money(f.gastosMotorista)} − comissão ${money(f.comissao)}</div></div>
    <div class="tbl-wrap mt-s"><table class="tbl"><tbody>
      ${l('Frete bruto', money(f.frete))}${l('Recebido pelo dono', money(f.recebidoDono))}${l('Ficou com o motorista (frete)', money(f.comMotorista))}${l('Adiantamento', money(f.adiantamento))}
      ${f.faltaReceber ? l('Falta receber do cliente', money(f.faltaReceber), 'down') : ''}
      ${l('Custos da viagem', money(f.custosTotal))}${l('Comissão', money(f.comissao))}
      ${l('<b>Lucro da viagem</b>', `<b class="${f.lucro >= 0 ? 'up' : 'down'}">${money(f.lucro)} (${(f.margem * 100).toFixed(1).replace('.', ',')}%)</b>`)}
    </tbody></table></div>`;
}

// Lê o formulário e devolve a viagem como ficaria salva
function lerForm(v) {
  const f = document.getElementById('ffe');
  const recs = [...f.querySelectorAll('.rec')].map((el) => ({ forma: el.querySelector('[name=forma]').value, valor: parseMoney(el.querySelector('[name=valor]').value), com: el.querySelector('[name=com]').value }));
  const n = { ...v, valorFrete: parseMoney(f.elements.valorFrete.value), comissaoPct: f.elements.comissaoPct.value === '' ? null : +String(f.elements.comissaoPct.value).replace(',', '.'),
    adiantamento: parseMoney(f.elements.adiantamento.value), recebimentos: recs, pagoMotorista: {}, obsFechamento: f.elements.obsFechamento.value.trim() };
  for (const [k] of D.CUSTOS_VIAGEM) { n[k] = parseMoney(f.elements['c_' + k].value); n.pagoMotorista[k] = f.elements['pm_' + k].checked; }
  return n;
}

function relatorio(s, v, nomeEmpresa) {
  const f = D.fechamento(s, v);
  const ve = D.veiculo(s, v.veiculoId), mo = D.motorista(s, v.motoristaId);
  const l = (a, b, bold) => `<tr><td>${a}</td><td style="text-align:right;${bold ? 'font-weight:700' : ''}">${b}</td></tr>`;
  const l3 = (a, b, bold) => `<tr><td colspan="2">${a}</td><td style="text-align:right;${bold ? 'font-weight:700' : ''}">${b}</td></tr>`;
  const quem = f.saldo > 0.004 ? `Motorista devolve à empresa: ${money(f.saldo)}` : f.saldo < -0.004 ? `Empresa paga ao motorista: ${money(-f.saldo)}` : 'Acerto zerado';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Fechamento viagem #${v.numero} · ${esc(mo?.nome || '')}</title>
  <style>body{font:14px/1.45 system-ui,sans-serif;color:#111;margin:28px}h1{font-size:20px;margin:0}h2{font-size:15px;margin:18px 0 6px;border-bottom:2px solid #111;padding-bottom:3px}
  table{width:100%;border-collapse:collapse}td,th{padding:5px 4px;border-bottom:1px solid #ddd;text-align:left}th{font-size:12px;color:#555}.tot{font-size:17px;font-weight:700;border:2px solid #111;padding:10px;margin-top:14px}
  .sig{margin-top:56px;display:flex;gap:40px}.sig div{flex:1;border-top:1px solid #111;padding-top:4px;text-align:center;font-size:12px}@media print{button{display:none}}</style></head><body>
  <button onclick="print()" style="float:right;padding:8px 14px">Imprimir / salvar PDF</button>
  <h1>${esc(nomeEmpresa || '')} · Fechamento da viagem #${v.numero}</h1>
  <div>${esc(v.origem)} → ${esc(v.destino)} · ${date(v.dataSaida)} a ${date(v.dataChegada)}${D.kmViagem(v) ? ' · ' + D.kmViagem(v).toLocaleString('pt-BR') + ' km' : ''}<br>Caminhão: ${esc(D.nomeVeiculo(ve))} · Motorista: <b>${esc(mo?.nome || '—')}</b></div>
  <h2>Recebimento do frete</h2><table><tr><th>Forma</th><th>Ficou com</th><th style="text-align:right">Valor</th></tr>
  ${f.recs.map((r) => `<tr><td>${esc(D.nomeForma(r.forma))}</td><td>${r.com === 'motorista' ? 'Motorista' : 'Dono'}</td><td style="text-align:right">${money(r.valor)}</td></tr>`).join('') || '<tr><td colspan="3">Nenhum recebimento informado</td></tr>'}
  ${l3('<b>Frete bruto</b>', money(f.frete), 1)}${f.faltaReceber ? l3('Falta receber do cliente', money(f.faltaReceber)) : ''}</table>
  <h2>Custos da viagem</h2><table><tr><th>Item</th><th>Pago por</th><th style="text-align:right">Valor</th></tr>
  ${f.custos.map((c) => `<tr><td>${esc(c.label)}</td><td>${c.pagoMotorista ? 'Motorista' : 'Empresa'}</td><td style="text-align:right">${money(c.valor)}</td></tr>`).join('') || '<tr><td colspan="3">—</td></tr>'}
  ${l3('<b>Total de custos</b>', money(f.custosTotal), 1)}</table>
  <h2>Acerto com o motorista</h2><table>
  ${l('Dinheiro do frete que ficou com o motorista', money(f.comMotorista))}${l('Adiantamento recebido', money(f.adiantamento))}
  ${l('(−) Custos pagos pelo motorista', money(f.gastosMotorista))}${l(`(−) Comissão ${v.comissaoPct || 0}% sobre ${money(f.frete)}`, money(f.comissao))}</table>
  <div class="tot">${quem}</div>
  <h2>Resultado da viagem</h2><table>${l('Frete', money(f.frete))}${l('(−) Custos', money(f.custosTotal))}${l('(−) Comissão', money(f.comissao))}${l('Lucro', `${money(f.lucro)} (${(f.margem * 100).toFixed(1).replace('.', ',')}% do frete)`, 1)}</table>
  ${v.obsFechamento ? `<p><b>Obs.:</b> ${esc(v.obsFechamento)}</p>` : ''}
  <div class="sig"><div>${esc(mo?.nome || 'Motorista')}</div><div>${esc(nomeEmpresa || 'Empresa')}</div></div>
  <p style="font-size:11px;color:#777;margin-top:24px">Gerado em ${date(today())} pelo EasyApp Frota.</p></body></html>`;
}

export function abrirFechamento({ id, S, store }) {
  let v = S().viagens.find((x) => x.id === id);
  if (!v) return;
  const salvar = (fechar) => {
    const n = lerForm(v);
    if (fechar) n.fechadoEm = today();
    if (D.fechamento(S(), n).faltaReceber === 0 && n.valorFrete > 0) { n.recebido = true; n.recebidoEm ||= today(); }
    const ok = store.commit((s) => { const i = s.viagens.findIndex((x) => x.id === id); if (i >= 0) s.viagens[i] = n; });
    if (ok === false) return null;
    v = n;
    return n;
  };
  const el = modal({
    title: `Fechamento · viagem #${v.numero} ${esc(v.origem)} → ${esc(v.destino)}`, wide: true, body: corpo(S(), v),
    foot: `<button class="btn ghost" data-act="pdf" style="margin-right:auto">${icon('download')} Relatório (PDF)</button><button class="btn ghost" data-act="whats">${icon('whatsapp')}</button><button class="btn ghost" data-act="salvar">Salvar</button><button class="btn" data-act="fechar">${icon('check')} Fechar viagem</button>`,
    handlers: {
      maisReceb: () => { const box = document.getElementById('recs'); box.insertAdjacentHTML('beforeend', linhaReceb({ forma: 'especie', valor: 0, com: 'motorista' }, box.children.length)); },
      tirarReceb: (b) => { b.closest('.rec').remove(); atualizar(); },
      salvar: () => { if (salvar(false)) { toast('Fechamento salvo'); closeModal(); } },
      fechar: () => { if (salvar(true)) { toast('Viagem fechada'); closeModal(); } },
      pdf: () => {
        const n = salvar(false); if (!n) return;
        const w = window.open('', '_blank');
        if (!w) return toast('Libere as janelas (pop-up) para gerar o relatório');
        w.document.write(relatorio(S(), n, S().meta.empresa)); w.document.close(); setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 400);
      },
      whats: () => {
        const n = lerForm(v), f = D.fechamento(S(), n), mo = D.motorista(S(), n.motoristaId);
        const txt = `Fechamento viagem #${n.numero} ${n.origem} → ${n.destino}\nFrete: ${money(f.frete)}\nFicou com você: ${money(f.dinheiroMotorista)}\nVocê pagou: ${money(f.gastosMotorista)}\nComissão: ${money(f.comissao)}\n${f.saldo > 0.004 ? 'Devolver à empresa: ' + money(f.saldo) : f.saldo < -0.004 ? 'A receber da empresa: ' + money(-f.saldo) : 'Acerto zerado'}`;
        window.open(waLink(mo?.telefone, txt), '_blank', 'noopener');
      },
    },
  });
  // forma escolhida sugere com quem o dinheiro ficou; qualquer mudança refaz o resumo
  const atualizar = () => { document.getElementById('resumoFe').innerHTML = resumo(D.fechamento(S(), lerForm(v))); };
  el.addEventListener('change', (e) => { if (e.target.name === 'forma') e.target.closest('.rec').querySelector('[name=com]').value = D.comPadrao(e.target.value); atualizar(); });
  el.addEventListener('input', () => setTimeout(atualizar, 0));
}
