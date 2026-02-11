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

      const { data: existingPrefs, error: existingError } = await supabase
        .from("user_preferences")
        .select("id, profile_id, show_days_counter, show_referral_bonus, created_at, updated_at")
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existingPrefs) return existingPrefs as unknown as UserPreferences;

      const { data: insertedPrefs, error: insertError } = await supabase
        .from("user_preferences")
        .insert([{ profile_id: profile.id, show_days_counter: false, show_referral_bonus: true }])
        .select("id, profile_id, show_days_counter, show_referral_bonus, created_at, updated_at")
        .single();

      if (!insertError && insertedPrefs) return insertedPrefs as unknown as UserPreferences;

      // Handle race condition when another request created the row.
      const { data: fallbackPrefs, error: fallbackError } = await supabase
        .from("user_preferences")
        .select("id, profile_id, show_days_counter, show_referral_bonus, created_at, updated_at")
        .eq("profile_id", profile.id)
        .single();

      if (fallbackError) throw (insertError || fallbackError);
      return fallbackPrefs as unknown as UserPreferences;
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
    return adminEnabled && (preferences?.show_days_counter ?? false);
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
