# Situação — EasyApp Frota (03/11/2026)

- **No ar:** https://rodrigopiratini.github.io/EasyAPP-Frota/ · Gestão `/gestao/` · Motorista `/usuario/` · demo `?demo=1` (Gestão PIN 0000; Motorista JOAO/1234)
- **Banco:** Supabase, organização EasyAPP › projeto **EasyAPP-Fábrica** (`sizbmkvzcqiukprdlxxr`, São Paulo), pasta **`frota`** (Exposed schemas: frota).
- **Molde:** feito a partir do EasyAPP-Base. Núcleo (`src/js/core`, `supabase/base.sql`, `scripts`, workflow) vem de lá: não editar aqui.
- **Publicação:** push na `main` (GitHub Pages por Actions).
- **Assinatura:** teste de 30 dias por empresa; o dono da plataforma gerencia em Gestão › Plataforma (e-mail em `frota.plataforma_admins`).

## TR EDU (Ducairo, primeiro cliente real) — trazido do Financial em 03/11/2026
- Empresa **TR EDU** (`b6f1d0a2-4c1e-4a7e-9d3b-0d0cca1e0001`), dono = o login do Ducairo copiado do Financial (mesmo id, e-mail e senha).
- Veio do módulo **Acertos** que o assistente do Financial criou para ele (`registros` caminhoes/motoristas/acertos). No Financial nada foi apagado.
- Os campos do app dele agora existem no Frota e receberam os valores: caminhão → `veiculos` (placa, **apelido**, motorista);
  motorista → `motoristas`; cada acerto → uma `viagem` concluída com saída, chegada, caminhão, motorista, origem, destino, **km rodado**,
  valor faturado (`valorFrete`), **combustível**, **litros**, **preço por litro** (calculado), **pedágio**, comissão %, **manutenção**, **outros** e observação.
  O campo `lancado` (lançar no financeiro do Financial) não tem par no Frota. Fretes marcados como recebidos.
- Valores com máscara de R$; "preencha 2 de 3" (combustível, litros, preço por litro) na viagem e no abastecimento (`src/js/tres.js`).
- Resultado, lucro e margem por viagem conferidos: batem com o módulo dele.

## Próximos passos
- Avisar o Ducairo: ele entra em `/gestao/` com o mesmo e-mail e senha do Financial. Antes, conferir pelo painel (Apps da fábrica › 👁 ver).
- Com ele: cadastrar os acessos (código + PIN) dos motoristas, o km atual de cada caminhão e os vencimentos.
- Roteiro: foto de comprovante, checklist de saída, cobrança do frete, importação de cartão-frota (docs/PROPOSTA.md).
