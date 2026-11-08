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
// ---------- Página dos relatórios ----------
// Uma página com barra (Fechar · Enviar PDF · Imprimir). O PDF é preparado assim que a página abre
// (html2pdf, carregado do cdnjs), para o "Enviar" abrir na hora a lista de compartilhar do celular (WhatsApp…);
// no computador ele baixa o arquivo. Cada parte (.bloco) fica inteira numa página: o total nunca fica sozinho.
const nomeArq = (txt) => String(txt).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') + '.pdf';
function paginaRel({ titulo, arquivo, texto, corpo }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(titulo)}</title>
  <style>
  body{font:13.5px/1.45 system-ui,-apple-system,sans-serif;color:#111;margin:0;background:#fff}
  #rel{max-width:760px;margin:0 auto;padding:16px 20px 28px}
  h1{font-size:19px;margin:0 0 4px}h2{font-size:14.5px;margin:0 0 6px;border-bottom:2px solid #111;padding-bottom:3px}
  .bloco{margin-top:16px;break-inside:avoid;page-break-inside:avoid}
  table{width:100%;border-collapse:collapse}td,th{padding:5px 4px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}th{font-size:11.5px;color:#555}
  td.v,th.v{text-align:right;white-space:nowrap}tr.b td{font-weight:700}small{color:#666}
  .tot{font-size:16.5px;font-weight:700;border:2px solid #111;padding:10px;margin-top:10px}
  .sig{margin-top:44px;display:flex;gap:40px}.sig div{flex:1;border-top:1px solid #111;padding-top:4px;text-align:center;font-size:12px}
  .rodape{font-size:11px;color:#777;margin-top:18px}
  .barra-rel{position:sticky;top:0;z-index:2;display:flex;gap:8px;background:#fff;padding:10px 12px;border-bottom:1px solid #ddd}
  .barra-rel button{font:600 15px system-ui,sans-serif;padding:10px 14px;border-radius:10px;border:1px solid #bbb;background:#fff;color:#111}
  .barra-rel .env{background:#1D5C4D;color:#fff;border-color:#1D5C4D;flex:1}
  .barra-rel button:disabled{opacity:.6}
  @media (max-width:600px){#rel{padding:12px 14px 24px}body{font-size:14px}#rel:not(.folha) table{table-layout:auto!important}}
  @page{size:A4;margin:12mm}
  @media print{.barra-rel{display:none}#rel{padding:0;max-width:none}}
  </style></head><body>
  <div class="barra-rel"><button id="bFechar">✕ Fechar</button><button class="env" id="bEnviar">Enviar PDF</button><button id="bImp">Imprimir</button></div>
  <div id="rel">${corpo}</div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <script>
  (function () {
    var ARQ = ${JSON.stringify(arquivo)}, TXT = ${JSON.stringify(texto || '')}, pdf = null, prep = null;
    document.getElementById('bFechar').onclick = function () { window.close(); setTimeout(function () { history.length > 1 ? history.back() : location.replace('about:blank'); }, 200); };
    document.getElementById('bImp').onclick = function () { print(); };
    function preparar() {
      if (prep) return prep;
      if (!window.html2pdf) return Promise.reject(new Error('sem internet para gerar o PDF'));
      // gera numa largura de folha (não na do celular), com cada .bloco inteiro na mesma página
      var c = document.getElementById('rel').cloneNode(true), box = document.createElement('div');
      box.style.cssText = 'position:fixed;left:-10000px;top:0;width:760px;background:#fff'; c.classList.add('folha'); c.style.maxWidth = 'none'; c.style.padding = '0'; box.appendChild(c); document.body.appendChild(box);
      prep = html2pdf().set({ margin: [12, 12, 14, 12], filename: ARQ, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, backgroundColor: '#fff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['css', 'legacy'], avoid: ['.bloco', 'tr'] } })
        .from(c).outputPdf('blob').then(function (b) { box.remove(); pdf = new File([b], ARQ, { type: 'application/pdf' }); return pdf; });
      prep.catch(function () { box.remove(); prep = null; });
      return prep;
    }
    function baixar(f) { var a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = ARQ; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
    function enviar(f) {
      if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: ARQ.replace(/\.pdf$/, ''), text: TXT }).catch(function (e) { if (e && e.name !== 'AbortError') baixar(f); });
      baixar(f);
    }
    var bt = document.getElementById('bEnviar');
    bt.onclick = function () {
      if (pdf) return enviar(pdf); // pronto: abre o compartilhar na hora
      bt.disabled = true; bt.textContent = 'Preparando…';
      preparar().then(function (f) { bt.disabled = false; bt.textContent = 'Enviar PDF'; enviar(f); }, function (e) { bt.disabled = false; bt.textContent = 'Enviar PDF'; alert('Não foi possível gerar o PDF: ' + e.message + '. Use Imprimir › Salvar como PDF.'); });
    };
    window.addEventListener('load', function () { setTimeout(function () { preparar().catch(function () {}); }, 300); });
  })();
  </script></body></html>`;
}
// Lista que pode passar de uma página: o título fica com as 3 primeiras linhas e o total com as 3 últimas
// (o meio pode quebrar entre linhas). Lista curta fica inteira numa página só.
function tabela(titulo, cab, linhas, fim = '', cols = '') {
  const cg = cols ? `<colgroup>${cols.split(' ').map((w) => `<col style="width:${w}">`).join('')}</colgroup>` : '';
  const tb = (rs) => `<table style="table-layout:${cols ? 'fixed' : 'auto'}">${cg}${rs}</table>`;
  if (linhas.length <= 14) return `<div class="bloco"><h2>${titulo}</h2>${tb(cab + linhas.join('') + fim)}</div>`;
  return `<div class="bloco"><h2>${titulo}</h2>${tb(cab + linhas.slice(0, 3).join(''))}</div>${tb(linhas.slice(3, -3).join(''))}<div class="bloco" style="margin-top:0">${tb(linhas.slice(-3).join('') + fim)}</div>`;
}
const linha = (a, b, cls = '') => `<tr class="${cls}"><td>${a}</td><td class="v">${b}</td></tr>`;
const linha3 = (a, b, cls = '') => `<tr class="${cls}"><td colspan="2">${a}</td><td class="v">${b}</td></tr>`;
const assinaturas = (mo, nomeEmpresa) => `<div class="bloco"><div class="sig"><div>${esc(mo?.nome || 'Motorista')}</div><div>${esc(nomeEmpresa || 'Empresa')}</div></div><p class="rodape">Gerado em ${date(today())} pelo EasyAPP Frota.</p></div>`;

export function relatorio(s, v, nomeEmpresa, { paraMotorista = false } = {}) {
  const f = D.fechamento(s, v);
  const ve = D.veiculo(s, v.veiculoId), mo = D.motorista(s, v.motoristaId);
  const corpo = `
  <div class="bloco" style="margin-top:0"><h1>${esc(nomeEmpresa || '')} · Fechamento da viagem #${v.numero || ''}</h1>
    <div>${esc(v.origem)} → ${esc(v.destino)} · ${date(v.dataSaida)} a ${date(v.dataChegada)}${D.kmViagem(v) ? ' · ' + D.kmViagem(v).toLocaleString('pt-BR') + ' km' : ''}${v.carga ? ' · ' + esc(v.carga) : ''}<br>Caminhão: ${esc(D.nomeVeiculo(ve))} · Motorista: <b>${esc(mo?.nome || '—')}</b></div></div>
  <div class="bloco"><h2>Recebimento do frete</h2><table><tr><th>Forma</th><th>Ficou com</th><th class="v">Valor</th></tr>
    ${f.recs.map((r) => `<tr><td>${esc(D.nomeForma(r.forma))}${r.obs ? ' · ' + esc(r.obs) : ''}</td><td>${r.com === 'motorista' ? 'Motorista' : 'Empresa'}</td><td class="v">${money(r.valor)}</td></tr>`).join('') || '<tr><td colspan="3">Nenhum recebimento lançado</td></tr>'}
    ${linha3('Frete bruto', money(f.frete), 'b')}${f.faltaReceber ? linha3('Falta receber do cliente', money(f.faltaReceber)) : ''}</table></div>
  ${tabela('Custos da viagem', '<tr><th>Item</th><th>Pago por</th><th class="v">Valor</th></tr>',
    f.custos.length ? f.custos.map((c) => `<tr><td>${esc(c.label)}</td><td>${c.pagoMotorista ? 'Motorista' : c.meio === 'tag' ? 'Tag do pedágio' : 'Empresa'}</td><td class="v">${money(c.valor)}</td></tr>`) : ['<tr><td colspan="3">—</td></tr>'],
    linha3('Total de custos', money(f.custosTotal), 'b'), '56% 22% 22%')}
  <div class="bloco"><h2>Acerto com o motorista</h2><table>
    ${linha('(+) Comissão ' + f.pct + '% sobre ' + money(f.frete), money(f.comissao))}${linha('(+) Custos pagos pelo motorista', money(f.gastosMotorista))}
    ${linha('(−) Frete que ficou com o motorista', money(f.comMotorista))}${linha('(−) Adiantamento recebido', money(f.adiantamento))}</table>
    <div class="tot">${quemDeve(f)}</div></div>
  ${paraMotorista ? '' : `<div class="bloco"><h2>Resultado da viagem</h2><table>${linha('Frete', money(f.frete))}${linha('(−) Custos', money(f.custosTotal))}${linha('(−) Comissão', money(f.comissao))}${linha('Lucro', `${money(f.lucro)} (${(f.margem * 100).toFixed(1).replace('.', ',')}% do frete)`, 'b')}</table></div>`}
  ${v.fechadoEm || v.obsFechamento || v.obs ? `<div class="bloco">${v.fechadoEm ? `<p style="font-size:12px;margin:0">Viagem fechada em ${date(v.fechadoEm)}.</p>` : ''}${v.obsFechamento || v.obs ? `<p><b>Obs.:</b> ${esc(v.obsFechamento || v.obs)}</p>` : ''}</div>` : ''}
  ${assinaturas(mo, nomeEmpresa)}`;
  return paginaRel({ titulo: `Fechamento viagem #${v.numero || ''} · ${mo?.nome || ''}`, arquivo: nomeArq(`Acerto viagem ${v.numero || ''} ${mo?.nome || ''}`),
    texto: `Acerto da viagem #${v.numero || ''} ${v.origem} → ${v.destino}: ${quemDeve(f)}`, corpo });
}

// Acerto de várias viagens do mesmo motorista num relatório só (resumo por viagem + a conta somada)
export function relatorioConjunto(s, vs, nomeEmpresa) {
  const fs = vs.map((v) => ({ v, f: D.fechamento(s, v) }));
  const soma = (k) => fs.reduce((a, x) => a + (+x.f[k] || 0), 0);
  const tot = { frete: soma('frete'), comissao: soma('comissao'), gastos: soma('gastosMotorista'), ficou: soma('comMotorista'), adiant: soma('adiantamento'), saldo: soma('saldo') };
  const mo = D.motorista(s, vs[0]?.motoristaId);
  const quem = tot.saldo > 0.004 ? `Motorista devolve à empresa: ${money(tot.saldo)}` : tot.saldo < -0.004 ? `Empresa paga ao motorista: ${money(-tot.saldo)}` : 'Acerto zerado';
  const corpo = `
  <div class="bloco" style="margin-top:0"><h1>${esc(nomeEmpresa || '')} · Acerto de ${esc(mo?.nome || '')}</h1><div>${vs.length} ${vs.length === 1 ? 'viagem' : 'viagens'} · ${date(vs.map((v) => v.dataSaida).sort()[0])} a ${date(vs.map((v) => v.dataChegada || v.dataSaida).sort().pop())}</div></div>
  <div class="bloco"><h2>Viagens</h2><table><tr><th>Viagem</th><th class="v">Frete</th><th class="v">Comissão</th><th class="v">Pagou</th><th class="v">Ficou c/ ele</th><th class="v">Saldo</th></tr>
    ${fs.map(({ v, f }) => `<tr><td>#${v.numero || ''} ${esc(v.origem)} → ${esc(v.destino)}<br><small>${date(v.dataSaida)} a ${date(v.dataChegada)}</small></td><td class="v">${money(f.frete)}</td><td class="v">${money(f.comissao)}</td><td class="v">${money(f.gastosMotorista)}</td><td class="v">${money(f.comMotorista + f.adiantamento)}</td><td class="v">${f.saldo > 0.004 ? '− ' : ''}${money(Math.abs(f.saldo))}</td></tr>`).join('')}
    <tr class="b"><td>Total</td><td class="v">${money(tot.frete)}</td><td class="v">${money(tot.comissao)}</td><td class="v">${money(tot.gastos)}</td><td class="v">${money(tot.ficou + tot.adiant)}</td><td class="v">${tot.saldo > 0.004 ? '− ' : ''}${money(Math.abs(tot.saldo))}</td></tr></table></div>
  <div class="bloco"><h2>Conta</h2><table>${linha('(+) Comissões', money(tot.comissao))}${linha('(+) Ele pagou na estrada', money(tot.gastos))}${linha('(−) Frete que ficou com ele', money(tot.ficou))}${linha('(−) Adiantamentos', money(tot.adiant))}</table>
    <div class="tot">${quem}</div></div>
  ${(() => { const ls = fs.flatMap(({ v, f }) => f.custos.filter((c) => c.pagoMotorista).map((c) => linha(`#${v.numero || ''} · ${esc(c.label)}`, money(c.valor)))); return tabela('O que ele pagou', '', ls.length ? ls : ['<tr><td>Nada</td></tr>'], '', '75% 25%'); })()}
  ${(() => { const ls = fs.flatMap(({ v, f }) => f.recs.filter((r) => r.com === 'motorista').map((r) => linha(`#${v.numero || ''} · ${esc(D.nomeForma(r.forma))}`, money(r.valor)))); return tabela('Frete que ficou com ele', '', ls.length ? ls : ['<tr><td>Nada</td></tr>'], '', '75% 25%'); })()}
  ${assinaturas(mo, nomeEmpresa)}`;
  return paginaRel({ titulo: `Acerto de ${mo?.nome || ''} · ${vs.length} viagens`, arquivo: nomeArq(`Acerto ${mo?.nome || ''} ${vs.length} viagens`), texto: `Acerto de ${vs.length} ${vs.length === 1 ? 'viagem' : 'viagens'}: ${quem}`, corpo });
}
