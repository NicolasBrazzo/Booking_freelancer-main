const supabase = require("../config/db_connection");

const TABLE = "bf_availability_exceptions";

// Eccezioni legate a una data precisa, secondo livello sopra bf_availability.
// Una riga con start_time/end_time NULL è una chiusura di giornata intera.

// Eccezioni di una data specifica
const findByDate = async (professionalId, date) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("professional_id", professionalId)
    .eq("date", date);

  if (error) throw new Error("DB_FIND_EXCEPTION_BY_DATE_ERROR", { cause: error });
  return data;
};

// Eccezioni comprese in un intervallo di date, estremi inclusi
const findByDateRange = async (professionalId, from, to) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("professional_id", professionalId)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (error) throw new Error("DB_FIND_EXCEPTIONS_ERROR", { cause: error });
  return data;
};

const createMany = async (rows) => {
  const { data, error } = await supabase.from(TABLE).insert(rows).select();

  if (error) throw new Error("DB_CREATE_EXCEPTIONS_ERROR", { cause: error });
  return data;
};

// Il filtro su professional_id non è ridondante: è il controllo di ownership,
// visto che RLS è disabilitato e la service key vede tutte le righe.
const deleteByDates = async (professionalId, dates) => {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("professional_id", professionalId)
    .in("date", dates);

  if (error) throw new Error("DB_DELETE_EXCEPTIONS_ERROR", { cause: error });
};

module.exports = {
  findByDate,
  findByDateRange,
  createMany,
  deleteByDates,
};
