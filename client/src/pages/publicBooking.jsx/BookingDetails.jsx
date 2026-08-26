import { useParams, useSearchParams, useNavigate, Navigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { fetchProfessionalBySlug, createBooking } from "@/services/publicService";
import { Loader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { showError } from "@/utils/toast";
import { validateForm } from "@/utils/validators";
import { bookingRules } from "@/constants/validation";
import { ArrowLeft, Clock, Calendar as CalendarIcon, Clock3, User, Mail, Phone, FileText } from "lucide-react";
import { BookingLayout } from "@/components/publicBooking/BookingLayout";
import { COLOR_PRESETS, DEFAULT_COLOR, DEFAULT_LAYOUT } from "@/constants/appearance";

export const BookingDetails = () => {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date");
  const time = searchParams.get("time");

  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    notes: "",
  });

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["publicProfile", code],
    queryFn: () => fetchProfessionalBySlug(code),
    // I 4 step del flusso rimontano la stessa query: senza questo il profilo
    // viene rifetchato a ogni passaggio di pagina.
    staleTime: 5 * 60 * 1000,
  });

  const bookingMutation = useMutation({
    mutationFn: (payload) => createBooking(code, payload),
    onSuccess: () => {
      navigate(`/book/${code}/confirmation?date=${date}&time=${time}&name=${encodeURIComponent(form.client_name.trim())}`);
    },
    onError: (err) => {
      const status = err?.response?.status;
      if (status === 409) {
        showError("Slot non più disponibile. Seleziona un altro orario.");
      } else {
        showError("Errore durante la prenotazione. Riprova.");
      }
    },
  });

  if (!serviceId || !date || !time) return <Navigate to={`/book/${code}`} replace />;
  if (profileLoading) return <Loader />;
  if (!profileData?.data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Professionista non trovato.</p>
      </div>
    );
  }

  const { freelancer, services } = profileData.data;
  const service = services.find((s) => s.id === serviceId);
  if (!service) return <Navigate to={`/book/${code}`} replace />;

  const primaryColor = COLOR_PRESETS.find(c => c.key === (freelancer.booking_page_color ?? DEFAULT_COLOR))?.hex ?? COLOR_PRESETS[0].hex;
  const layout = freelancer.booking_page_layout ?? DEFAULT_LAYOUT;

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();

    const { errors, values } = validateForm(form, bookingRules);
    if (errors.length > 0) return showError(errors[0]);

    bookingMutation.mutate({
      service_id: serviceId,
      date,
      start_time: time,
      ...values,
    });
  };

  const sidebarExtra = (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">Riepilogo</p>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: service.color }} />
          <span className="font-medium">{service.name}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarIcon className="w-3.5 h-3.5" />
          <span className="capitalize">{formattedDate}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock3 className="w-3.5 h-3.5" />
          <span>{time} — {service.duration_minutes} min</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>€{Number(service.price).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <BookingLayout layout={layout} primaryColor={primaryColor} freelancer={freelancer} sidebarExtra={sidebarExtra}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/book/${code}/date?serviceId=${serviceId}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">I tuoi dati</h1>
            <p className="text-sm text-muted-foreground">Inserisci le informazioni per completare la prenotazione.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-background border rounded-2xl p-6 shadow-sm space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="client_name" className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              Nome completo *
            </Label>
            <Input id="client_name" name="client_name" value={form.client_name} onChange={handleChange} placeholder="Mario Rossi" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="client_email" className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              Email *
            </Label>
            <Input id="client_email" name="client_email" type="email" value={form.client_email} onChange={handleChange} placeholder="mario@esempio.it" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="client_phone" className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              Telefono
            </Label>
            <Input id="client_phone" name="client_phone" type="tel" value={form.client_phone} onChange={handleChange} placeholder="+39 333 1234567" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              Note
            </Label>
            <Textarea id="notes" name="notes" value={form.notes} onChange={handleChange} placeholder="Indicazioni aggiuntive per il professionista..." maxLength={500} rows={3} />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={bookingMutation.isPending}>
            {bookingMutation.isPending ? "Prenotazione in corso..." : "Conferma prenotazione"}
          </Button>
        </form>
      </div>
    </BookingLayout>
  );
};
