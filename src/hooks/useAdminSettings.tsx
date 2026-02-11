import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AdminSetting {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export function useAdminSettings() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading } = useQuery<AdminSetting[]>({
    queryKey: ["admin_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .order("key");

      if (error) throw error;
      return (data || []) as unknown as AdminSetting[];
    },
    enabled: !!user && isAdmin,
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("admin_settings")
        .update({ value } as Record<string, string>)
        .eq("key", key);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث الإعدادات بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin_settings"] });
    },
    onError: (error) => {
      console.error("Error updating setting:", error);
      toast.error("فشل في تحديث الإعدادات");
    },
  });

  const getSetting = (key: string, defaultValue: string = "false") => {
    const setting = settings.find(s => s.key === key);
    return setting?.value || defaultValue;
  };

  const updateSetting = (key: string, value: string) => {
    updateSettingMutation.mutate({ key, value });
  };

  const isDaysCounterEnabled = getSetting("days_counter_enabled", "true") === "true";
  const isReferralBonusEnabled = getSetting("referral_bonus_enabled", "true") === "true";

  return {
    settings,
    isLoading,
    isDaysCounterEnabled,
    isReferralBonusEnabled,
    updateSetting,
    updateSettingMutation,
  };
}