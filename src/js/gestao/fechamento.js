// Fechamento da viagem: o resumo (quem deve a quem), o relatório para conferência (PDF) e o texto do WhatsApp.
// Os números saem dos lançamentos da viagem (despesas, abastecimentos e recebimentos) — ver D.fechamento.
import * as D from '../dominio.js';
import { money, date, esc, today } from '../core/fmt.js';

export const quemDeve = (f) => (f.saldo > 0.004 ? `Motorista devolve ${money(f.saldo)}` : f.saldo < -0.004 ? `Empresa paga ao motorista ${money(-f.saldo)}` : 'Acerto zerado');

export function resumoHTML(f) {
  const l = (a, b, cls = '') => `<tr><td>${a}</td><td class="r ${cls}">${b}</td></tr>`;
  return `<div class="card dark col"><div class="label">Acerto com o motorista</div><div class="grande" style="font-size:22px">${quemDeve(f)}</div>
    <div class="small">Ficou com ele ${money(f.dinheiroMotorista)} − pagou ${money(f.gastosMotorista)} − comissão ${money(f.comissao)} (${f.pct}%)</div></div>
    <div class="tbl-wrap mt-s"><table class="tbl"><tbody>
      ${l('Frete bruto', money(f.frete))}${l('Recebido pela empresa', money(f.recebidoDono))}${l('Ficou com o motorista (frete)', money(f.comMotorista))}${l('Adiantamento ao motorista', money(f.adiantamento))}
      ${f.faltaReceber ? l('Falta receber do cliente', money(f.faltaReceber), 'down') : ''}
      ${l('Custos da viagem', money(f.custosTotal))}${l(`Comissão (${f.pct}%)`, money(f.comissao))}
      ${l('<b>Lucro da viagem</b>', `<b class="${f.lucro >= 0 ? 'up' : 'down'}">${money(f.lucro)} (${(f.margem * 100).toFixed(1).replace('.', ',')}%)</b>`)}
    </tbody></table></div>`;
}

export function textoWhats(s, v) {
  const f = D.fechamento(s, v);
  return `Fechamento viagem #${v.numero || ''} ${v.origem} → ${v.destino}\nFrete: ${money(f.frete)}\nFicou com você: ${money(f.dinheiroMotorista)}\nVocê pagou: ${money(f.gastosMotorista)}\nComissão (${f.pct}%): ${money(f.comissao)}\n${f.saldo > 0.004 ? 'Devolver à empresa: ' + money(f.saldo) : f.saldo < -0.004 ? 'A receber da empresa: ' + money(-f.saldo) : 'Acerto zerado'}`;
}

// paraMotorista: a cópia do motorista não mostra o resultado (lucro) da empresa
export function relatorio(s, v, nomeEmpresa, { paraMotorista = false } = {}) {
  const f = D.fechamento(s, v);
  const ve = D.veiculo(s, v.veiculoId), mo = D.motorista(s, v.motoristaId);
  const l = (a, b, bold) => `<tr><td>${a}</td><td style="text-align:right;${bold ? 'font-weight:700' : ''}">${b}</td></tr>`;
  const l3 = (a, b, bold) => `<tr><td colspan="2">${a}</td><td style="text-align:right;${bold ? 'font-weight:700' : ''}">${b}</td></tr>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Fechamento viagem #${v.numero || ''} · ${esc(mo?.nome || '')}</title>
  <style>body{font:14px/1.45 system-ui,sans-serif;color:#111;margin:28px}h1{font-size:20px;margin:0}h2{font-size:15px;margin:18px 0 6px;border-bottom:2px solid #111;padding-bottom:3px}
  table{width:100%;border-collapse:collapse}td,th{padding:5px 4px;border-bottom:1px solid #ddd;text-align:left}th{font-size:12px;color:#555}.tot{font-size:17px;font-weight:700;border:2px solid #111;padding:10px;margin-top:14px}
  .sig{margin-top:56px;display:flex;gap:40px}.sig div{flex:1;border-top:1px solid #111;padding-top:4px;text-align:center;font-size:12px}@media print{button{display:none}}</style></head><body>
  <button onclick="print()" style="float:right;padding:8px 14px">Imprimir / salvar PDF</button>
  <h1>${esc(nomeEmpresa || '')} · Fechamento da viagem #${v.numero || ''}</h1>
  <div>${esc(v.origem)} → ${esc(v.destino)} · ${date(v.dataSaida)} a ${date(v.dataChegada)}${D.kmViagem(v) ? ' · ' + D.kmViagem(v).toLocaleString('pt-BR') + ' km' : ''}${v.carga ? ' · ' + esc(v.carga) : ''}<br>Caminhão: ${esc(D.nomeVeiculo(ve))} · Motorista: <b>${esc(mo?.nome || '—')}</b></div>
  <h2>Recebimento do frete</h2><table><tr><th>Forma</th><th>Ficou com</th><th style="text-align:right">Valor</th></tr>
  ${f.recs.map((r) => `<tr><td>${esc(D.nomeForma(r.forma))}${r.obs ? ' · ' + esc(r.obs) : ''}</td><td>${r.com === 'motorista' ? 'Motorista' : 'Empresa'}</td><td style="text-align:right">${money(r.valor)}</td></tr>`).join('') || '<tr><td colspan="3">Nenhum recebimento lançado</td></tr>'}
  ${l3('<b>Frete bruto</b>', money(f.frete), 1)}${f.faltaReceber ? l3('Falta receber do cliente', money(f.faltaReceber)) : ''}</table>
  <h2>Custos da viagem</h2><table><tr><th>Item</th><th>Pago por</th><th style="text-align:right">Valor</th></tr>
  ${f.custos.map((c) => `<tr><td>${esc(c.label)}</td><td>${c.pagoMotorista ? 'Motorista' : c.meio === 'tag' ? 'Tag do pedágio' : 'Empresa'}</td><td style="text-align:right">${money(c.valor)}</td></tr>`).join('') || '<tr><td colspan="3">—</td></tr>'}
  ${l3('<b>Total de custos</b>', money(f.custosTotal), 1)}</table>
  <h2>Acerto com o motorista</h2><table>
  ${l('Dinheiro do frete que ficou com o motorista', money(f.comMotorista))}${l('Adiantamento recebido', money(f.adiantamento))}
  ${l('(−) Custos pagos pelo motorista', money(f.gastosMotorista))}${l(`(−) Comissão ${f.pct}% sobre ${money(f.frete)}`, money(f.comissao))}</table>
  <div class="tot">${quemDeve(f)}</div>
  ${paraMotorista ? '' : `<h2>Resultado da viagem</h2><table>${l('Frete', money(f.frete))}${l('(−) Custos', money(f.custosTotal))}${l('(−) Comissão', money(f.comissao))}${l('Lucro', `${money(f.lucro)} (${(f.margem * 100).toFixed(1).replace('.', ',')}% do frete)`, 1)}</table>`}
  ${v.fechadoEm ? `<p style="font-size:12px">Viagem fechada em ${date(v.fechadoEm)}.</p>` : ''}
  ${v.obsFechamento || v.obs ? `<p><b>Obs.:</b> ${esc(v.obsFechamento || v.obs)}</p>` : ''}
  <div class="sig"><div>${esc(mo?.nome || 'Motorista')}</div><div>${esc(nomeEmpresa || 'Empresa')}</div></div>
  <p style="font-size:11px;color:#777;margin-top:24px">Gerado em ${date(today())} pelo EasyAPP Frota.</p></body></html>`;
}

// Acerto de várias viagens do mesmo motorista num relatório só (resumo por viagem + a conta somada)
export function relatorioConjunto(s, vs, nomeEmpresa) {
  const fs = vs.map((v) => ({ v, f: D.fechamento(s, v) }));
  const soma = (k) => fs.reduce((a, x) => a + (+x.f[k] || 0), 0);
  const tot = { frete: soma('frete'), comissao: soma('comissao'), gastos: soma('gastosMotorista'), ficou: soma('comMotorista'), adiant: soma('adiantamento'), saldo: soma('saldo') };
  const mo = D.motorista(s, vs[0]?.motoristaId);
  const quem = tot.saldo > 0.004 ? `Motorista devolve à empresa: ${money(tot.saldo)}` : tot.saldo < -0.004 ? `Empresa paga ao motorista: ${money(-tot.saldo)}` : 'Acerto zerado';
  const td = (x, r) => `<td${r ? ' style="text-align:right"' : ''}>${x}</td>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Acerto de ${esc(mo?.nome || '')} · ${vs.length} viagens</title>
  <style>body{font:13.5px/1.45 system-ui,sans-serif;color:#111;margin:28px}h1{font-size:20px;margin:0}h2{font-size:15px;margin:18px 0 6px;border-bottom:2px solid #111;padding-bottom:3px}
  table{width:100%;border-collapse:collapse}td,th{padding:5px 4px;border-bottom:1px solid #ddd;text-align:left}th{font-size:11.5px;color:#555}.tot{font-size:17px;font-weight:700;border:2px solid #111;padding:10px;margin-top:14px}
  .sig{margin-top:56px;display:flex;gap:40px}.sig div{flex:1;border-top:1px solid #111;padding-top:4px;text-align:center;font-size:12px}small{color:#666}@media print{button{display:none}}</style></head><body>
  <button onclick="print()" style="float:right;padding:8px 14px">Imprimir / salvar PDF</button>
  <h1>${esc(nomeEmpresa || '')} · Acerto de ${esc(mo?.nome || '')}</h1><div>${vs.length} viagens · ${date(vs.map((v) => v.dataSaida).sort()[0])} a ${date(vs.map((v) => v.dataChegada || v.dataSaida).sort().pop())}</div>
  <h2>Viagens</h2><table><tr><th>Viagem</th><th style="text-align:right">Frete</th><th style="text-align:right">Comissão</th><th style="text-align:right">Pagou</th><th style="text-align:right">Ficou com ele</th><th style="text-align:right">Saldo</th></tr>
  ${fs.map(({ v, f }) => `<tr>${td(`#${v.numero || ''} ${esc(v.origem)} → ${esc(v.destino)}<br><small>${date(v.dataSaida)} a ${date(v.dataChegada)}</small>`)}${td(money(f.frete), 1)}${td(money(f.comissao), 1)}${td(money(f.gastosMotorista), 1)}${td(money(f.comMotorista + f.adiantamento), 1)}${td((f.saldo > 0.004 ? '− ' : '') + money(Math.abs(f.saldo)), 1)}</tr>`).join('')}
  <tr style="font-weight:700">${td('Total')}${td(money(tot.frete), 1)}${td(money(tot.comissao), 1)}${td(money(tot.gastos), 1)}${td(money(tot.ficou + tot.adiant), 1)}${td((tot.saldo > 0.004 ? '− ' : '') + money(Math.abs(tot.saldo)), 1)}</tr></table>
  <h2>Conta</h2><table>
  <tr><td>(+) Comissões</td><td style="text-align:right">${money(tot.comissao)}</td></tr><tr><td>(+) Ele pagou na estrada</td><td style="text-align:right">${money(tot.gastos)}</td></tr>
  <tr><td>(−) Frete que ficou com ele</td><td style="text-align:right">${money(tot.ficou)}</td></tr><tr><td>(−) Adiantamentos</td><td style="text-align:right">${money(tot.adiant)}</td></tr></table>
  <div class="tot">${quem}</div>
  <h2>O que ele pagou</h2><table>${fs.flatMap(({ v, f }) => f.custos.filter((c) => c.pagoMotorista).map((c) => `<tr>${td(`#${v.numero || ''} · ${esc(c.label)}`)}${td(money(c.valor), 1)}</tr>`)).join('') || '<tr><td>Nada</td></tr>'}</table>
  <h2>Frete que ficou com ele</h2><table>${fs.flatMap(({ v, f }) => f.recs.filter((r) => r.com === 'motorista').map((r) => `<tr>${td(`#${v.numero || ''} · ${esc(D.nomeForma(r.forma))}`)}${td(money(r.valor), 1)}</tr>`)).join('') || '<tr><td>Nada</td></tr>'}</table>
  <div class="sig"><div>${esc(mo?.nome || 'Motorista')}</div><div>${esc(nomeEmpresa || 'Empresa')}</div></div>
  <p style="font-size:11px;color:#777;margin-top:24px">Gerado em ${date(today())} pelo EasyAPP Frota.</p></body></html>`;
}
