// "Preencha 2 de 3": valor total (R$), litros e preço por litro (R$/l).
// Os dois últimos campos digitados mandam; o terceiro é calculado na hora.
// ligarTres(formId, { total, litros, preco }) depois de abrir o formulário; completarTres(dados, nomes) ao salvar.
import { parseMoney, fmtMoneyInput } from './core/ui.js';

const ler = (el) => (!el ? 0 : el.matches('[data-money]') ? parseMoney(el.value) : +String(el.value || '').replace(',', '.') || 0);
const escrever = (el, v) => { if (el) el.value = el.matches('[data-money]') ? fmtMoneyInput(v) : String(Math.round(v * 100) / 100); };
const r2 = (v) => Math.round(v * 100) / 100;

export function ligarTres(formId, nomes = { total: 'valor', litros: 'litros', preco: 'precoLitro' }) {
  const f = document.getElementById(formId);
  if (!f) return;
  const el = (k) => f.elements[nomes[k]];
  if (!el('total') || !el('litros') || !el('preco')) return;
  // na edição, o preço por litro vem do total ÷ litros
  if (!ler(el('preco')) && ler(el('total')) > 0 && ler(el('litros')) > 0) escrever(el('preco'), ler(el('total')) / ler(el('litros')));
  let ordem = ler(el('total')) && ler(el('litros')) ? ['total', 'litros'] : [];
  f.addEventListener('input', (e) => {
    const k = Object.keys(nomes).find((x) => el(x) === e.target);
    if (!k) return;
    ordem = ordem.filter((x) => x !== k).concat(k);
    if (ordem.length < 2) return;
    const alvo = ['total', 'litros', 'preco'].find((x) => !ordem.slice(-2).includes(x));
    const t = ler(el('total')), l = ler(el('litros')), p = ler(el('preco'));
    if (alvo === 'preco' && t > 0 && l > 0) escrever(el('preco'), t / l);
    else if (alvo === 'total' && l > 0 && p > 0) escrever(el('total'), l * p);
    else if (alvo === 'litros' && t > 0 && p > 0) escrever(el('litros'), t / p);
  });
}

// Ao salvar: completa o que faltar e não grava o preço por litro (ele sai do total ÷ litros)
export function completarTres(d, nomes = { total: 'valor', litros: 'litros', preco: 'precoLitro' }) {
  const t = +d[nomes.total] || 0, l = +d[nomes.litros] || 0, p = +d[nomes.preco] || 0;
  if (!t && l && p) d[nomes.total] = r2(l * p);
  else if (t && !l && p) d[nomes.litros] = r2(t / p);
  delete d[nomes.preco];
  return d;
}
