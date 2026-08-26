import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchProfessionalBySlug } from "@/services/publicService";
import { Loader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { CircleCheck, Calendar, Clock3 } from "lucide-react";
import { COLOR_PRESETS, DEFAULT_COLOR } from "@/constants/appearance";

export const BookingConfirmation = () => {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const date = searchParams.get("date");
  const time = searchParams.get("time");
  const clientName = searchParams.get("name");

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["publicProfile", code],
    queryFn: () => fetchProfessionalBySlug(code),
    // I 4 step del flusso rimontano la stessa query: senza questo il profilo
    // viene rifetchato a ogni passaggio di pagina.
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Loader />;

  const freelancer = profileData?.data?.freelancer;
  const fullName = freelancer
    ? [freelancer.first_name, freelancer.last_name].filter(Boolean).join(" ")
    : "";

  const primaryColor = COLOR_PRESETS.find(c => c.key === (freelancer?.booking_page_color ?? DEFAULT_COLOR))?.hex ?? COLOR_PRESETS[0].hex;

  const formattedDate = date
    ? new Date(date + "T00:00:00").toLocaleDateString("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div style={{ "--primary": primaryColor, "--ring": primaryColor }} className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="bg-background border rounded-2xl p-8 shadow-sm space-y-5">
          <div className="flex justify-center">
            <CircleCheck className="w-16 h-16 text-green-500" strokeWidth={1.5} />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Prenotazione confermata!</h1>
            {clientName && (
              <p className="text-muted-foreground">
                Grazie <span className="font-medium text-foreground">{clientName}</span>, il tuo appuntamento è stato registrato.
              </p>
            )}
          </div>

          {(formattedDate || time || fullName) && (
            <div className="border rounded-xl p-4 space-y-2 text-sm text-left">
              {fullName && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-medium text-foreground">Con:</span>
                  {fullName}
                </div>
              )}
              {formattedDate && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="capitalize">{formattedDate}</span>
                </div>
              )}
              {time && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock3 className="w-3.5 h-3.5" />
                  <span>Ore {time}</span>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Riceverai una conferma all'indirizzo email che hai fornito.
          </p>
        </div>

        <Button variant="outline" onClick={() => navigate(`/book/${code}`)}>
          Prenota un altro appuntamento
        </Button>
      </div>
    </div>
  );
};
