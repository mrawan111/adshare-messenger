import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface UserPreferences {
  id: string;
  profile_id: string;
  show_days_counter: boolean;
  show_referral_bonus: boolean;
  created_at: string;
  updated_at: string;
}

export function useUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user preferences using profile_id
  const { data: preferences, isLoading } = useQuery<UserPreferences | null>({
    queryKey: ["user_preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // First get profile id
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return null;

      const { data, error } = await supabase
        .rpc("get_or_create_user_preferences", { profile_uuid: profile.id })
        .single();

      if (error) throw error;
      return data as unknown as UserPreferences;
    },
    enabled: !!user,
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<Pick<UserPreferences, 'show_days_counter' | 'show_referral_bonus'>>) => {
      if (!user || !preferences) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("user_preferences")
        .update(updates as Record<string, boolean>)
        .eq("profile_id", preferences.profile_id);

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