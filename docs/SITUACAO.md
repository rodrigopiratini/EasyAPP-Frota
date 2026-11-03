# Situação — EasyApp Frota (03/11/2026)

- **No ar:** https://rodrigopiratini.github.io/EasyAPP-Frota/ · Gestão `/gestao/` · Motorista `/usuario/` · demo `?demo=1` (Gestão PIN 0000; Motorista JOAO/1234)
- **Banco:** Supabase, organização EasyAPP › projeto **EasyAPP-Fábrica** (`sizbmkvzcqiukprdlxxr`, São Paulo), pasta **`frota`** (Exposed schemas: frota).
- **Molde:** feito a partir do EasyAPP-Base. Núcleo (`src/js/core`, `supabase/base.sql`, `scripts`, workflow) vem de lá: não editar aqui.
- **Publicação:** push na `main` (GitHub Pages por Actions).
- **Assinatura:** teste de 30 dias por empresa; o dono da plataforma gerencia em Gestão › Plataforma (e-mail em `frota.plataforma_admins`).

## Próximos passos
- Primeiro cliente real (o amigo da frota): criar conta, empresa, caminhões, motoristas e acessos.
- Trazer os dados de frota do Ducairo (hoje dentro do EasyApp Financial).
- Roteiro: foto de comprovante, checklist de saída, cobrança do frete, importação de cartão-frota (docs/PROPOSTA.md).
