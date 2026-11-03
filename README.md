# EasyApp Frota

Gestão de frota para **pequenas transportadoras**, em dois apps que funcionam no iPhone, Android e computador:

| App | Para quem | Caminho |
|---|---|---|
| **EasyApp Frota Gestão** | Dono da frota / escritório | `/gestao/` · demo: `/gestao/?demo=1` (PIN `0000`) |
| **EasyApp Frota Motorista** | Motoristas | `/usuario/` · demo: `/usuario/?demo=1` (código `JOAO`, PIN `1234`) |

## O que faz
- **Painel**: faturamento, custos, resultado e margem; custo e receita por km; resultado por caminhão; para onde vai o dinheiro; alertas.
- **Viagens**: planejar, acompanhar (em viagem / concluída), frete, comissão, adiantamento, **a receber** dos clientes.
- **Motorista no celular**: inicia e encerra a viagem com o km do painel, lança **abastecimento** e **despesa** na hora (pedágio, refeição, borracharia…), vê o próprio **acerto**.
- **Conferir**: tudo o que os motoristas lançam passa pela conferência; depois de conferido, o motorista não altera mais.
- **Combustível**: consumo km/l por veículo (tanque cheio), preço médio, o que foi pago pelo motorista.
- **Veículos**: km atual automático, documentos com vencimento (licenciamento, seguro, tacógrafo, ANTT), manutenções, troca de óleo e revisão por km.
- **Motoristas**: CNH com validade, comissão, **acerto** do período (comissões + reembolsos − adiantamentos) com envio pelo WhatsApp.
- **Exportar** o período em CSV (para o contador ou planilha).
- Várias transportadoras no mesmo sistema, cada uma só vê os próprios dados; teste grátis de 30 dias e assinatura.

Feito a partir do molde [`easyapp-base`](https://github.com/rodrigopiratini/easyapp-base) (veja `docs/FABRICA.md`).
Colocar no ar: [`docs/INSTALACAO.md`](docs/INSTALACAO.md) · Proposta comercial: [`docs/PROPOSTA.md`](docs/PROPOSTA.md).

## Rodar localmente
```bash
python3 -m http.server 8080
```
