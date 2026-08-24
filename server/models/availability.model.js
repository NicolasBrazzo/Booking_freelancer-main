const supabase = require("../config/db_connection");

const TABLE = "bf_availability";

// Una riga = una fascia oraria di un giorno: un giorno a orario spezzato ha più
// righe con lo stesso day_of_week, uno a orario continuato una sola.

// Tutte le fasce della settimana di un professionista
const findByProfessionalId = async (professionalId) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("professional_id", professionalId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw new Error("DB_FIND_AVAILABILITY_ERROR");
  return data;
};

// Le fasce di un giorno specifico, in ordine di orario
const findByDay = async (professionalId, dayOfWeek) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("professional_id", professionalId)
    .eq("day_of_week", dayOfWeek)
    .order("start_time", { ascending: true });

  if (error) throw new Error("DB_FIND_AVAILABILITY_BY_DAY_ERROR");
  return data;
};

// Sostituisce l'intera settimana con le fasce passate.
//
// Prima si scrivono le nuove fasce, poi si cancellano quelle rimaste fuori: dal
// client Supabase non abbiamo transazioni, e un "delete all + insert" con
// l'insert fallito lascerebbe il professionista senza disponibilità e la pagina
// pubblica senza slot. In questo ordine il caso peggiore è qualche fascia di
// troppo, che il salvataggio successivo ripulisce.
const replaceForProfessional = async (professionalId, rows) => {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(rows, { onConflict: "professional_id,day_of_week,start_time" })
    .select();

  if (error) throw new Error("DB_UPSERT_AVAILABILITY_ERROR");

  const keptIds = data.map((row) => row.id);
  if (keptIds.length === 0) return data;

  const { error: deleteError } = await supabase
    .from(TABLE)
    .delete()
    .eq("professional_id", professionalId)
    .not("id", "in", `(${keptIds.join(",")})`);

  if (deleteError) throw new Error("DB_DELETE_AVAILABILITY_ERROR");
  return data;
};

module.exports = {
  findByProfessionalId,
  findByDay,
  replaceForProfessional,
};
