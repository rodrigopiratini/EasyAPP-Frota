# EasyApp Frota — instruções para o Claude

- App de segmento criado a partir do molde `easyapp-base` (veja `docs/FABRICA.md`).
  **Não edite o núcleo aqui** (`src/js/core/`, `supabase/base.sql`, `sw.js`, `.github/workflows/pages.yml`, `scripts/`):
  mude no `easyapp-base` e traga com `bash scripts/atualizar-base.sh ../easyapp-frota` (rodado a partir do easyapp-base).
- O que é da frota: `src/js/segmento.js` (coleções e regras de acesso), `src/js/dominio.js` (cálculos),
  `src/js/gestao/app.js`, `src/js/usuario/app.js` (telas), `src/js/seed.js` (demonstração), `src/css/segmento.css`, `supabase/segmento.sql`.
- Banco: depois de mudar `segmento.sql` ou as coleções do `segmento.js`, rode `node supabase/gerar.mjs` (gera o `supabase/instalar.sql`,
  que o dono cola no SQL Editor do Supabase; é idempotente).
- Nome, cores ou ícone mudaram: `node scripts/aplicar-segmento.mjs`.
- **Sempre publicar**: commit, push na branch de trabalho e na `main` (o GitHub Pages publica a partir da `main`).
- Nunca coloque e-mail, telefone ou chave secreta em arquivo do repositório.
