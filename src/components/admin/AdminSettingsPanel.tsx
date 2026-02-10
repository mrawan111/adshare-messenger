import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Users, Calendar } from "lucide-react";
import { useAdminSettings } from "@/hooks/useAdminSettings";

export function AdminSettingsPanel() {
  const {
    isDaysCounterEnabled,
    isReferralBonusEnabled,
    updateSetting,
    updateSettingMutation,
  } = useAdminSettings();

  const handleDaysCounterToggle = (checked: boolean) => {
    updateSetting("days_counter_enabled", checked.toString());
  };

  const handleReferralBonusToggle = (checked: boolean) => {
    updateSetting("referral_bonus_enabled", checked.toString());
  };

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          إعدادات النظام
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Days Counter Toggle */}
        <div className="flex items-center justify-between space-y-0">
          <div className="space-y-0.5">
            <Label htmlFor="days-counter" className="text-base font-medium">
              عداد الأيام
            </Label>
            <p className="text-sm text-muted-foreground">
              تفعيل أو تعطيل عرض عدد الأيام منذ التسجيل
            </p>
          </div>
          <Switch
            id="days-counter"
            checked={isDaysCounterEnabled}
            onCheckedChange={handleDaysCounterToggle}
            disabled={updateSettingMutation.isPending}
          />
        </div>

        {/* Referral Bonus Toggle */}
        <div className="flex items-center justify-between space-y-0">
          <div className="space-y-0.5">
            <Label htmlFor="referral-bonus" className="text-base font-medium">
              مكافآت الترشيح
            </Label>
            <p className="text-sm text-muted-foreground">
              تفعيل أو تعطيل نظام مكافآت الترشيح
            </p>
          </div>
          <Switch
            id="referral-bonus"
            checked={isReferralBonusEnabled}
            onCheckedChange={handleReferralBonusToggle}
            disabled={updateSettingMutation.isPending}
          />
        </div>

        {/* Status Summary */}
        <div className="pt-4 border-t">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-medium">عداد الأيام:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                isDaysCounterEnabled 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              }`}>
                {isDaysCounterEnabled ? "مفعل" : "معطل"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-medium">مكافآت الترشيح:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                isReferralBonusEnabled 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              }`}>
                {isReferralBonusEnabled ? "مفعل" : "معطل"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
