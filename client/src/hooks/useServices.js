import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchServices,
  createService,
  updateService,
  deleteService,
} from "@/services/servicesService";
import { showSuccess, showError } from "@/utils/toast";
import { validateForm } from "@/utils/validators";
import { serviceRules } from "@/constants/validation";

const INITIAL_FORM = {
  name: "",
  description: "",
  duration_minutes: "",
  price: 0,
  color: "#3B82F6",
  is_active: true,
};

export const useServices = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: fetchServices,
  });

  const services = data?.data ?? [];

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["services"] });
    close();
  };

  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      onSuccess();
      showSuccess("Servizio creato con successo");
    },
    onError: () => showError("Errore durante la creazione del servizio"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateService(id, data),
    onSuccess: () => {
      onSuccess();
      showSuccess("Servizio aggiornato con successo");
    },
    onError: () => showError("Errore durante l'aggiornamento del servizio"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      showSuccess("Servizio eliminato con successo");
    },
    onError: () => showError("Errore durante l'eliminazione del servizio"),
  });

  const openCreate = () => {
    setEditingService(null);
    setFormData(INITIAL_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name || "",
      description: service.description || "",
      duration_minutes: service.duration_minutes ? String(service.duration_minutes) : "",
      price: service.price ? String(service.price) : "",
      color: service.color || "#3B82F6",
      is_active: service.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const close = () => {
    setIsModalOpen(false);
    setEditingService(null);
    setFormData(INITIAL_FORM);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const { errors, values } = validateForm(formData, serviceRules);
    if (errors.length > 0) return showError(errors[0]);

    const payload = {
      ...values,
      color: formData.color,
      is_active: formData.is_active,
    };

    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Sei sicuro di voler eliminare questo servizio?")) {
      deleteMutation.mutate(id);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return {
    services,
    isLoading,
    isModalOpen,
    editingService,
    formData,
    setFormData,
    isSubmitting,
    openCreate,
    openEdit,
    close,
    handleSubmit,
    handleDelete,
  };
};
