import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchProfessionalBySlug } from "@/services/publicService";
import { cn } from "@/utils/cnFunc";
import { Loader } from "@/components/Loader";
import { Clock } from "lucide-react";
import { BookingLayout } from "@/components/publicBooking/BookingLayout";
import { COLOR_PRESETS, DEFAULT_COLOR, DEFAULT_LAYOUT } from "@/constants/appearance";

export const BookingPublic = () => {
  const { code } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["publicProfile", code],
    queryFn: () => fetchProfessionalBySlug(code),
    // I 4 step del flusso rimontano la stessa query: senza questo il profilo
    // viene rifetchato a ogni passaggio di pagina.
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Loader />;

  if (isError || !data?.data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <p className="text-2xl font-semibold">Pagina non trovata</p>
          <p className="text-muted-foreground text-sm">
            Il link che hai usato non è valido o è scaduto.
          </p>
        </div>
      </div>
    );
  }

  const { freelancer, services } = data.data;
  const primaryColor = COLOR_PRESETS.find(c => c.key === (freelancer.booking_page_color ?? DEFAULT_COLOR))?.hex ?? COLOR_PRESETS[0].hex;
  const layout = freelancer.booking_page_layout ?? DEFAULT_LAYOUT;

  return (
    <BookingLayout layout={layout} primaryColor={primaryColor} freelancer={freelancer}>
      <div className="space-y-1 mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Seleziona un servizio</h1>
        <p className="text-sm text-muted-foreground">
          Scegli il tipo di appuntamento che vuoi prenotare.
        </p>
      </div>

      {services.length === 0 ? (
        <div className="bg-background border rounded-2xl p-8 text-center text-muted-foreground text-sm">
          Nessun servizio disponibile al momento.
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => navigate(`/book/${code}/date?serviceId=${service.id}`)}
              className={cn(
                "w-full text-left bg-background border rounded-2xl p-5",
                "flex items-center justify-between gap-4",
                "transition-all duration-150 shadow-sm",
                "hover:border-foreground/40 hover:shadow-md",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <div className="flex items-center gap-4 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: service.color ?? "#6b7280" }}
                />
                <div className="min-w-0">
                  <p className="font-medium leading-snug truncate">{service.name}</p>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                      {service.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                    <Clock className="w-4" />
                    {service.duration_minutes} min
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-base font-semibold">€{Number(service.price).toFixed(2)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </BookingLayout>
  );
};
