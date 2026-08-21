import { getProfile, updateProfile } from "@/services/freelanceSerivce";
import { fetchServices, createService } from "@/services/servicesService";
import { showError, showSuccess } from "@/utils/toast";
import { validateForm } from "@/utils/validators";
import { profileRules, serviceRules } from "@/constants/validation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const INITIAL_PROFILE = { business_name: "", description: "", business_type: "" };
const INITIAL_SERVICE = { name: "", description: "", duration_minutes: "", price: "" };

export const useCreateFreelanceProfile = () => {
  const navigate = useNavigate();
  const { refreshFirstAccess } = useAuth();
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [service, setService] = useState(INITIAL_SERVICE);

  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });

  const { data: servicesData, isLoading: isLoadingServices } = useQuery({
    queryKey: ["services"],
    queryFn: fetchServices,
  });

  useEffect(() => {
    if (profileData) {
      setProfile({
        business_name: profileData.business_name || "",
        description: profileData.description || "",
        business_type: profileData.business_type || "",
      });
    }
  }, [profileData]);

  useEffect(() => {
    const services = servicesData?.data;
    if (services && services.length > 0) {
      const first = services[0];
      setService({
        name: first.name || "",
        description: first.description || "",
        duration_minutes: first.duration_minutes ? String(first.duration_minutes) : "",
        price: first.price ? String(first.price) : "",
      });
    }
  }, [servicesData]);

  const isLoading = isLoadingProfile || isLoadingServices;

  const profileMutation = useMutation({ mutationFn: updateProfile });
  const serviceMutation = useMutation({ mutationFn: createService });

  const isSubmitting = profileMutation.isPending || serviceMutation.isPending;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const profileResult = validateForm(profile, profileRules);
    if (profileResult.errors.length > 0) return showError(profileResult.errors[0]);

    const serviceResult = validateForm(service, serviceRules);
    if (serviceResult.errors.length > 0) return showError(serviceResult.errors[0]);

    try {
      await profileMutation.mutateAsync(profileResult.values);
      await serviceMutation.mutateAsync({
        ...serviceResult.values,
        is_active: true,
        color: "#3B82F6",
      });
      await refreshFirstAccess();
      showSuccess("Profilo creato con successo!");
      navigate("/dashboard");
    } catch {
      showError("Errore durante la creazione del profilo");
    }
  };

  const onProfileChange = (key, value) => setProfile((p) => ({ ...p, [key]: value }));
  const onServiceChange = (key, value) => setService((s) => ({ ...s, [key]: value }));

  return { profile, service, onProfileChange, onServiceChange, isSubmitting, isLoading, handleSubmit };
};
