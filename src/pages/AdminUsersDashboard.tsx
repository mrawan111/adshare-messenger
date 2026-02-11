import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Search, Settings } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface InviterRow {
  profile_id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  invite_count: number;
  show_days_counter: boolean;
}

interface ReferralData {
  inviter_user_id: string;
}

interface InviterProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
}

export default function AdminUsersDashboard() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Access denied. Admins only.");
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  const { data: inviters = [], isLoading: invitersLoading } = useQuery<InviterRow[]>({
    queryKey: ["admin_inviters"],
    queryFn: async () => {
      if (!isAdmin) return [];

      const { data: referrals, error: referralsError } = await supabase
        .from("referrals")
        .select("inviter_user_id");

      if (referralsError) {
        console.error("Error fetching referrals:", referralsError);
        return [];
      }

      const typedReferrals = (referrals || []) as unknown as ReferralData[];
      if (typedReferrals.length === 0) return [];

      const inviterCounts = new Map<string, number>();
      for (const row of typedReferrals) {
        inviterCounts.set(row.inviter_user_id, (inviterCounts.get(row.inviter_user_id) || 0) + 1);
      }
      const inviterIds = Array.from(inviterCounts.keys());

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email")
        .in("user_id", inviterIds);

      if (profilesError) {
        console.error("Error fetching inviter profiles:", profilesError);
        return [];
      }

      const typedProfiles = (profiles || []) as unknown as InviterProfile[];
      if (typedProfiles.length === 0) return [];

      const profileIds = typedProfiles.map((p) => p.id);
      const { data: preferences } = await supabase
        .from("user_preferences")
        .select("profile_id, show_days_counter")
        .in("profile_id", profileIds);

      const prefMap = new Map(
        ((preferences as unknown as Array<{ profile_id: string; show_days_counter: boolean }>) || []).map((p) => [
          p.profile_id,
          p.show_days_counter,
        ])
      );

      return typedProfiles
        .map((profile) => ({
          profile_id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: profile.email,
          invite_count: inviterCounts.get(profile.user_id) || 0,
          show_days_counter: prefMap.get(profile.id) ?? false,
        }))
        .sort((a, b) => b.invite_count - a.invite_count);
    },
    enabled: !!isAdmin,
  });

  const toggleDaysCounterMutation = useMutation({
    mutationFn: async ({ profileId, value }: { profileId: string; value: boolean }) => {
      const { data: existing } = await supabase
        .from("user_preferences")
        .select("id")
        .eq("profile_id", profileId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_preferences")
          .update({ show_days_counter: value })
          .eq("profile_id", profileId);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("user_preferences").insert([
        {
          profile_id: profileId,
          show_days_counter: value,
          show_referral_bonus: true,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث عداد الأيام بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin_inviters"] });
    },
    onError: (error) => {
      console.error("Error updating days counter:", error);
      toast.error("فشل في تحديث عداد الأيام");
    },
  });

  const filteredInviters = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return inviters;

    return inviters.filter((row) => {
      const name = row.full_name?.toLowerCase() || "";
      const email = row.email?.toLowerCase() || "";
      return name.includes(term) || email.includes(term);
    });
  }, [inviters, searchTerm]);

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
            <Users className="inline-block ml-3 h-6 w-6 sm:h-8 sm:w-8" />
            لوحة تحكم الدعوات
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            يظهر هنا المستخدمون الذين دعوا مستخدمين آخرين فقط
          </p>
        </div>

        <Card className="shadow-elegant">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ابحث بالاسم أو البريد الإلكتروني..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Button variant="outline" onClick={() => setSearchTerm("")} className="shrink-0">
                مسح
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Settings className="h-5 w-5 text-primary" />
              المستخدمون الداعون ({filteredInviters.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invitersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filteredInviters.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p>لا يوجد مستخدمون داعون حالياً</p>
                <p className="mt-1 text-sm">جرّب تعديل البحث أو انتظر حتى تتم دعوات جديدة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInviters.map((row) => (
                  <div
                    key={row.profile_id}
                    className="flex flex-col gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{row.full_name || "مستخدم بدون اسم"}</h3>
                      <p className="text-sm text-muted-foreground truncate" dir="ltr">
                        {row.email || "-"}
                      </p>
                      <p className="mt-1 text-sm text-primary font-medium">
                        عدد الدعوات: {row.invite_count}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 bg-muted/30 p-3 rounded-md sm:bg-transparent sm:p-0 sm:w-auto w-full">
                      <Label htmlFor={`days-counter-${row.profile_id}`} className="text-sm font-medium cursor-pointer">
                        تفعيل عداد الأيام
                      </Label>
                      <Switch
                        id={`days-counter-${row.profile_id}`}
                        dir="ltr"
                        checked={row.show_days_counter}
                        onCheckedChange={(checked) =>
                          toggleDaysCounterMutation.mutate({
                            profileId: row.profile_id,
                            value: checked,
                          })
                        }
                        disabled={toggleDaysCounterMutation.isPending}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
