import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Calendar, Users } from "lucide-react";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useAuth } from "@/contexts/AuthContext";

export function UserPreferencesPanel() {
  const { user } = useAuth();
  const {
    preferences,
    isLoading,
    updatePreference,
    updatePreferencesMutation,
  } = useUserPreferences();

  const handleDaysCounterToggle = (checked: boolean) => {
    updatePreference("show_days_counter", checked);
  };

  const handleReferralBonusToggle = (checked: boolean) => {
    updatePreference("show_referral_bonus", checked);
  };

  if (!user) return null;

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          تفضيلات العرض
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Days Counter Toggle */}
        <div className="flex items-center justify-between space-y-0">
          <div className="space-y-0.5">
            <Label htmlFor="user-days-counter" className="text-base font-medium">
              عداد الأيام
            </Label>
            <p className="text-sm text-muted-foreground">
              إظهار أو إخفاء عدد الأيام منذ التسجيل
            </p>
          </div>
          <Switch
            id="user-days-counter"
            checked={preferences?.show_days_counter ?? true}
            onCheckedChange={handleDaysCounterToggle}
            disabled={isLoading || updatePreferencesMutation.isPending}
          />
        </div>

        {/* Referral Bonus Toggle */}
        <div className="flex items-center justify-between space-y-0">
          <div className="space-y-0.5">
            <Label htmlFor="user-referral-bonus" className="text-base font-medium">
              مكافآت الترشيح
            </Label>
            <p className="text-sm text-muted-foreground">
              إظهار أو إخفاء معلومات مكافآت الترشيح
            </p>
          </div>
          <Switch
            id="user-referral-bonus"
            checked={preferences?.show_referral_bonus ?? true}
            onCheckedChange={handleReferralBonusToggle}
            disabled={isLoading || updatePreferencesMutation.isPending}
          />
        </div>

        {/* Status Summary */}
        <div className="pt-4 border-t">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-medium">عداد الأيام:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                preferences?.show_days_counter
                  ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              }`}>
                {preferences?.show_days_counter ? "مظهر" : "مخفي"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-medium">مكافآت الترشيح:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                preferences?.show_referral_bonus
                  ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              }`}>
                {preferences?.show_referral_bonus ? "مظهر" : "مخفي"}
              </span>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            ملاحظة: هذه الإعدادات خاصة بك فقط. قد يتطلب المشرف تفعيل هذه الميزات على مستوى النظام.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
