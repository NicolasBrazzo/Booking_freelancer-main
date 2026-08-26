-- ============================================
-- 007 — Eccezioni alla disponibilità: ferie e chiusure straordinarie
-- Eseguire nell'SQL Editor della dashboard Supabase
-- ============================================
--
-- bf_availability descrive la settimana ricorrente (una riga per fascia oraria
-- di un giorno, vedi 006). Questa tabella è il secondo livello: le eccezioni
-- legate a una data precisa.
--
-- Stesse colonne di bf_availability, con date al posto di day_of_week:
--   start_time / end_time NULL -> chiuso tutta la giornata
--   start_time / end_time valorizzati -> orario straordinario per quella data
--
-- Oggi le schermate producono solo il primo caso. Il secondo è previsto dallo
-- schema apposta: aggiungerlo non richiederà un'altra migrazione.
--
-- Regola di risoluzione (server/utils/slots.js):
--   esiste una chiusura per quella data? -> zero slot
--   altrimenti -> orari standard di bf_availability per quel day_of_week
--
-- Cancellare la riga è l'unico modo per tornare allo standard: per questo non
-- c'è nessun is_active e nessun flag is_closed, e un giorno normale non occupa
-- righe. Ferie di due settimane = 14 righe.
--
-- Come la 006, lo script è ri-eseguibile.
-- ============================================

create table if not exists bf_availability_exceptions (
  id               uuid primary key default uuid_generate_v4(),
  professional_id  uuid not null references bf_freelancers(id) on delete cascade,
  date             date not null,
  start_time       text,          -- null = chiuso tutto il giorno
  end_time         text,          -- null = chiuso tutto il giorno
  note             text,          -- "Ferie", "Chiusura straordinaria"
  created_at       timestamptz default now(),
  constraint bf_exceptions_times_together check ((start_time is null) = (end_time is null)),
  constraint bf_exceptions_time_order     check (start_time is null or end_time > start_time),
  constraint bf_exceptions_unique_fascia  unique (professional_id, date, start_time)
);

-- Una sola riga "chiuso" per data: nel unique qui sopra i NULL sarebbero tutti
-- distinti fra loro, quindi da solo non impedirebbe di chiudere due volte la
-- stessa giornata.
create unique index if not exists idx_exceptions_closed_once
  on bf_availability_exceptions(professional_id, date)
  where start_time is null;

-- Le eccezioni si leggono sempre per (professionista, data) o per intervallo di date.
create index if not exists idx_exceptions_professional_date
  on bf_availability_exceptions(professional_id, date);
