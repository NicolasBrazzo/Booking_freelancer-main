-- ============================================
-- 006 — Orario spezzato: una riga per FASCIA, non per giorno
-- Eseguire nell'SQL Editor della dashboard Supabase
-- ============================================
--
-- Fino a qui bf_availability aveva unique(professional_id, day_of_week):
-- un giorno = una riga = una sola fascia oraria. Chi lavora a orario spezzato
-- (es. un parrucchiere 09:00-13:00 / 15:00-19:00) non poteva descrivere la
-- propria settimana, e la pausa pranzo finiva fra gli slot prenotabili.
--
-- Da adesso una riga = una fascia oraria di un giorno:
--   lunedì spezzato   -> 2 righe con day_of_week = 1
--   lunedì continuato -> 1 riga  con day_of_week = 1  (come prima)
--
-- Le righe esistenti sono già fasce singole valide: NESSUNA migrazione dati,
-- mantengono lo stesso id.
--
-- is_active resta per riga: un giorno spento ha tutte le sue fasce a false,
-- così spegnendo e riaccendendo il giorno gli orari scritti sono ancora lì.
--
-- Le sovrapposizioni fra fasce dello stesso giorno sono bloccate dal validator
-- (server/controllers/availability.controller.js, speculare al client), non da
-- un vincolo SQL: qui servirebbero btree_gist e un range type custom su time.
-- ============================================

-- Controllo preliminare: dev'essere vuota, il check più sotto la rifiuterebbe.
--   select * from bf_availability where end_time <= start_time;

-- Gli "if exists" e il drop prima di ogni add rendono lo script ri-eseguibile:
-- applicato a mano, capita di rilanciarlo per sicurezza.

alter table bf_availability
  drop constraint if exists bf_availability_professional_id_day_of_week_key;

alter table bf_availability
  drop constraint if exists bf_availability_unique_fascia;

alter table bf_availability
  add constraint bf_availability_unique_fascia
  unique (professional_id, day_of_week, start_time);

alter table bf_availability
  drop constraint if exists bf_availability_time_order;

alter table bf_availability
  add constraint bf_availability_time_order
  check (end_time > start_time);

-- Le fasce si leggono sempre per (professionista, giorno) ordinate per orario.
drop index if exists idx_availability_professional;

create index if not exists idx_availability_professional_day
  on bf_availability(professional_id, day_of_week, start_time);
