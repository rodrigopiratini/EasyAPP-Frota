# Situação — EasyApp Frota (03/11/2026)

- **No ar:** https://rodrigopiratini.github.io/EasyAPP-Frota/ · Gestão `/gestao/` · Motorista `/usuario/` · demo `?demo=1` (Gestão PIN 0000; Motorista JOAO/1234)
- **Banco:** Supabase, organização EasyAPP › projeto **EasyAPP-Fábrica** (`sizbmkvzcqiukprdlxxr`, São Paulo), pasta **`frota`** (Exposed schemas: frota).
- **Molde:** feito a partir do EasyAPP-Base. Núcleo (`src/js/core`, `supabase/base.sql`, `scripts`, workflow) vem de lá: não editar aqui.
- **Publicação:** push na `main` (GitHub Pages por Actions).
- **Assinatura:** teste de 30 dias por empresa; o dono da plataforma gerencia em Gestão › Plataforma (e-mail em `frota.plataforma_admins`).

## Ducairo (primeiro cliente real) — trazido do Financial em 03/11/2026
- Empresa **Transportes Ducairo** (`b6f1d0a2-4c1e-4a7e-9d3b-0d0cca1e0001`), dono = o login dele copiado do Financial (mesmo id, e-mail e senha).
- Veio do módulo **Acertos** que o assistente do Financial criou para ele (`registros` caminhoes/motoristas/acertos). No Financial nada foi apagado.
- Mapeamento: caminhão → `veiculos` (placa; "FH540" → modelo Volvo FH540, cavalo); motorista → `motoristas` (comissão 12%, veículo vinculado);
  cada acerto → `viagens` concluída e conferida (frete, comissão %, origem/destino, datas; o km da viagem foi em km final, com km inicial 0,
  porque ele não anotava hodômetro), combustível → `abastecimentos` (valor e litros), pedágio/manutenção/outros → `despesas` da viagem.
  Os fretes ficaram como recebidos (o módulo dele não controlava recebimento). Resultado e comissões conferidos: batem com o módulo.

## Próximos passos
- Avisar o Ducairo: ele entra em `/gestao/` com o mesmo e-mail e senha do Financial. Antes, conferir pelo painel (Apps da fábrica › 👁 ver).
- Com ele: cadastrar os acessos (código + PIN) dos motoristas, o km atual de cada caminhão e os vencimentos.
- Roteiro: foto de comprovante, checklist de saída, cobrança do frete, importação de cartão-frota (docs/PROPOSTA.md).
