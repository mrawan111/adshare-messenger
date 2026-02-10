import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface UserPreferences {
  id: string;
  user_id: string;
  show_days_counter: boolean;
  show_referral_bonus: boolean;
  created_at: string;
  updated_at: string;
}

export function useUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user preferences
  const { data: preferences, isLoading } = useQuery<UserPreferences>({
    queryKey: ["user_preferences", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      // Call the function to get or create preferences
      const { data, error } = await supabase
        .rpc("get_or_create_user_preferences", { user_uuid: user.id })
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<Pick<UserPreferences, 'show_days_counter' | 'show_referral_bonus'>>) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("user_preferences")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث الإعدادات بنجاح");
      queryClient.invalidateQueries({ queryKey: ["user_preferences", user?.id] });
    },
    onError: (error) => {
      console.error("Error updating preferences:", error);
      toast.error("فشل في تحديث الإعدادات");
    },
  });

  // Update specific preference
  const updatePreference = (key: 'show_days_counter' | 'show_referral_bonus', value: boolean) => {
    updatePreferencesMutation.mutate({ [key]: value });
  };

  // Get effective setting (combines admin and user preferences)
  const getEffectiveDaysCounterSetting = (adminEnabled: boolean) => {
    return adminEnabled && (preferences?.show_days_counter ?? true);
  };

  const getEffectiveReferralBonusSetting = (adminEnabled: boolean) => {
    return adminEnabled && (preferences?.show_referral_bonus ?? true);
  };

  return {
    preferences,
    isLoading,
    updatePreference,
    updatePreferencesMutation,
    getEffectiveDaysCounterSetting,
    getEffectiveReferralBonusSetting,
  };
}
