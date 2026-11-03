-- Regras específicas do EasyAPP Frota.
-- As coleções e regras de acesso ficam em src/js/segmento.js (o gerar.mjs grava na tabela colecoes).

-- Motorista: viagem lançada por ele fica com o próprio motoristaId e começa sem valores financeiros
-- (os campos protegidos já são limpos pelo banco). Aqui só garantimos uma situação válida.
create or replace function public.frota_viagem() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.colecao = 'viagens' and coalesce(new.data->>'status', '') not in ('planejada', 'em_viagem', 'concluida') then
    raise exception 'Situação de viagem inválida';
  end if;
  return new;
end $$;
drop trigger if exists tg_frota_viagem on public.docs;
create trigger tg_frota_viagem before insert or update on public.docs for each row when (new.colecao = 'viagens') execute function public.frota_viagem();
