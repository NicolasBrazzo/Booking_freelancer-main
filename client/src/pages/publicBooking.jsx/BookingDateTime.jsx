import { useParams, useSearchParams, useNavigate, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchProfessionalBySlug, fetchAvailableSlots } from "@/services/publicService";
import { cn } from "@/utils/cnFunc";
import { Loader } from "@/components/Loader";
import { Clock, ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingLayout } from "@/components/publicBooking/BookingLayout";
import { COLOR_PRESETS, DEFAULT_COLOR, DEFAULT_LAYOUT } from "@/constants/appearance";

export const BookingDateTime = () => {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const serviceId = searchParams.get("serviceId");

  const [selectedDate, setSelectedDate] = useState("");

  const { data: profileData, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ["publicProfile", code],
    queryFn: () => fetchProfessionalBySlug(code),
    // I 4 step del flusso rimontano la stessa query: senza questo il profilo
    // viene rifetchato a ogni passaggio di pagina.
    staleTime: 5 * 60 * 1000,
  });

  const { data: slotsData, isLoading: slotsLoading, error: slotsError } = useQuery({
    queryKey: ["slots", code, selectedDate, serviceId],
    queryFn: () => fetchAvailableSlots(code, selectedDate, serviceId),
    enabled: !!selectedDate && !!serviceId,
  });

  if (!serviceId) return <Navigate to={`/book/${code}`} replace />;
  if (profileLoading) return <Loader />;
  if (!profileData?.data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className={profileError ? "text-destructive" : "text-muted-foreground"}>
          {profileError?.message ?? "Professionista non trovato."}
        </p>
      </div>
    );
  }

  const { freelancer, services } = profileData.data;
  const service = services.find((s) => s.id === serviceId);
  if (!service) return <Navigate to={`/book/${code}`} replace />;

  const primaryColor = COLOR_PRESETS.find(c => c.key === (freelancer.booking_page_color ?? DEFAULT_COLOR))?.hex ?? COLOR_PRESETS[0].hex;
  const layout = freelancer.booking_page_layout ?? DEFAULT_LAYOUT;
  const today = new Date().toISOString().split("T")[0];
  const slots = slotsData?.data ?? [];

  const sidebarExtra = (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">Servizio</p>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: service.color }} />
        <p className="font-medium text-sm">{service.name}</p>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {service.duration_minutes} min — €{Number(service.price).toFixed(2)}
      </p>
    </div>
  );

  return (
    <BookingLayout layout={layout} primaryColor={primaryColor} freelancer={freelancer} sidebarExtra={sidebarExtra}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/book/${code}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Scegli data e ora</h1>
            <p className="text-sm text-muted-foreground">Seleziona il giorno e l'orario che preferisci.</p>
          </div>
        </div>

        <div className="bg-background border rounded-2xl p-5 shadow-sm space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            Data
          </label>
          <input
            type="date"
            min={today}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {selectedDate && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Orari disponibili</h2>
            {slotsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
              </div>
            ) : slotsError ? (
              <div className="bg-background border rounded-2xl p-6 text-center text-destructive text-sm">
                {slotsError.message}
              </div>
            ) : slots.length === 0 ? (
              <div className="bg-background border rounded-2xl p-6 text-center text-muted-foreground text-sm">
                Nessuno slot disponibile per questa data.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.start_time}
                    type="button"
                    onClick={() =>
                      navigate(`/book/${code}/details?serviceId=${serviceId}&date=${selectedDate}&time=${slot.start_time}`)
                    }
                    className={cn(
                      "bg-background border rounded-xl py-3 px-2 text-sm font-medium text-center",
                      "transition-all duration-150 shadow-sm",
                      "hover:border-foreground/40 hover:shadow-md",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  >
                    {slot.start_time}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </BookingLayout>
  );
};
