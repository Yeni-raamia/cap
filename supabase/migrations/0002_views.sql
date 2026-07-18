-- ==================================================================
-- 0002_views.sql — Vues relances & scores (cf. §5.2)
-- Utilisées par le moteur de relance (Phase 3).
-- ==================================================================
create or replace view v_item_reminders as
select i.*, t.sla_relance, t.sla_escalade,
  floor(extract(epoch from (now() - i.date_maj))/86400)::int as days_since,
  case
    when i.statut = 'Clôturé' then 'none'
    when i.statut = 'Bloqué'  then 'bloque'
    when t.sla_relance is null then 'none'
    when extract(epoch from (now() - i.date_maj))/86400 >= t.sla_escalade then 'escalade'
    when extract(epoch from (now() - i.date_maj))/86400 >= t.sla_relance  then 'relance'
    else 'ok'
  end as reminder_level
from items i join ref_types t on t.code = i.type_code;

create or replace view v_scores as
select p.id, p.full_name, p.initials,
  count(*) filter (where i.statut='Clôturé')                                                as closures,
  coalesce(sum(i.relances_count),0)                                                          as relances,
  count(*) filter (where exists(select 1 from events e where e.item_id=i.id and e.kind='reponse')) as reponses,
  count(*) filter (where r.reminder_level='escalade')                                        as retard,
  greatest(0,
      count(*) filter (where i.statut='Clôturé')*10
    + coalesce(sum(i.relances_count),0)*5
    + count(*) filter (where exists(select 1 from events e where e.item_id=i.id and e.kind='reponse'))*8
    - count(*) filter (where r.reminder_level='escalade')*4
  ) as score
from profiles p
left join items i           on i.owner_id = p.id
left join v_item_reminders r on r.id = i.id
where p.role = 'agent'
group by p.id, p.full_name, p.initials;
