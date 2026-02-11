import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Search, Calendar, Phone, Shield, Settings } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  id: string;
  full_name: string | null;
  phone_number: string;
  created_at: string;
  user_id: string;
  invited_at?: string;
  inviter_name?: string | null;
  days_since_invited?: number;
  is_invited_via_link?: boolean;
  user_preferences?: {
    profile_id: string;
    show_days_counter: boolean;
    show_referral_bonus: boolean;
  } | null;
}

interface ReferralData {
  invited_user_id: string;
  inviter_user_id: string;
  invited_at: string;
}

interface UserPreferenceInsert {
  profile_id: string;
  show_days_counter: boolean;
  show_referral_bonus: boolean;
}

export default function AdminUsersDashboard() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Access denied. Admins only.");
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  const { data: users = [], isLoading: usersLoading } = useQuery<UserProfile[]>({
    queryKey: ["admin_users", currentPage, usersPerPage, searchTerm],
    queryFn: async () => {
      if (!isAdmin) return [];

      try {
        // Get ALL referrals (admin can see all via RLS policy)
        const { data: referrals, error: referralsError } = await supabase
          .from("referrals")
          .select("invited_user_id, inviter_user_id, invited_at")
          .order("invited_at", { ascending: false });

        if (referralsError) {
          console.error("Error fetching referrals:", referralsError);
          return [];
        }

        const typedReferrals = referrals as unknown as ReferralData[];
        const invitedUserIds = typedReferrals?.map(r => r.invited_user_id) || [];

        if (invitedUserIds.length === 0) return [];

        // Fetch profiles only for invited users
        let profilesQuery = supabase
          .from("profiles")
          .select("id, full_name, phone_number, created_at, user_id")
          .in("user_id", invitedUserIds)
          .order("created_at", { ascending: false });

        if (searchTerm) {
          profilesQuery = profilesQuery.or(
            `full_name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`
          );
        }

        const { data: profiles, error: profilesError } = await profilesQuery.range(
          (currentPage - 1) * usersPerPage,
          currentPage * usersPerPage - 1
        );

        if (profilesError) throw profilesError;

        const typedProfiles = profiles as unknown as UserProfile[];
        if (!typedProfiles || typedProfiles.length === 0) return [];

        // Get all inviter profiles for names
        const inviterIds = [...new Set(typedReferrals.map(r => r.inviter_user_id))];
        const { data: inviterProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", inviterIds);

        const inviterMap = new Map(
          (inviterProfiles as unknown as Array<{ user_id: string; full_name: string | null }>)?.map(p => [p.user_id, p.full_name]) || []
        );

        // Calculate days and map inviter names
        const usersWithDetails = typedProfiles.map(profile => {
          const referral = typedReferrals?.find(r => r.invited_user_id === profile.user_id);
          const invitedAt = referral?.invited_at || profile.created_at;
          const daysSinceInvited = Math.floor(
            (new Date().getTime() - new Date(invitedAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          
          return {
            ...profile,
            invited_at: invitedAt,
            inviter_name: referral ? inviterMap.get(referral.inviter_user_id) || null : null,
            days_since_invited: daysSinceInvited,
            is_invited_via_link: true,
          };
        });

        // Fetch preferences
        const { data: preferences } = await supabase
          .from("user_preferences")
          .select("profile_id, show_days_counter, show_referral_bonus")
          .in("profile_id", usersWithDetails.map(p => p.id));

        const typedPrefs = preferences as unknown as Array<{ profile_id: string; show_days_counter: boolean; show_referral_bonus: boolean }>;

        return usersWithDetails.map(profile => ({
          ...profile,
          user_preferences: typedPrefs?.find(p => p.profile_id === profile.id) || null
        }));
      } catch (error) {
        console.error("Query error:", error);
        return [];
      }
    },
    enabled: !!isAdmin,
  });

  const toggleUserPreferenceMutation = useMutation({
    mutationFn: async ({ userId, preference, value }: { 
      userId: string; 
      preference: 'show_days_counter' | 'show_referral_bonus'; 
      value: boolean 
    }) => {
      try {
        const { data: existingPrefs } = await supabase
          .from("user_preferences")
          .select("profile_id")
          .eq("profile_id", userId)
          .single();

        if (existingPrefs) {
          const { error } = await supabase
            .from("user_preferences")
            .update({ [preference]: value } as Record<string, boolean>)
            .eq("profile_id", userId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("user_preferences")
            .insert([{
              profile_id: userId,
              show_days_counter: preference === 'show_days_counter' ? value : true,
              show_referral_bonus: preference === 'show_referral_bonus' ? value : true,
            }] as UserPreferenceInsert[]);
          if (error) throw error;
        }
      } catch (error) {
        console.error("Mutation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("تم تحديث تفضيلات المستخدم بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (error) => {
      console.error("Error updating user preference:", error);
      toast.error("فشل في تحديث تفضيلات المستخدم");
    },
  });

  const handleToggleDaysCounter = (userId: string, currentValue: boolean) => {
    toggleUserPreferenceMutation.mutate({ userId, preference: "show_days_counter", value: !currentValue });
  };

  const handleToggleReferralBonus = (userId: string, currentValue: boolean) => {
    toggleUserPreferenceMutation.mutate({ userId, preference: "show_referral_bonus", value: !currentValue });
  };

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
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
            <Users className="inline-block ml-3 h-6 w-6 sm:h-8 sm:w-8" />
            لوحة تحكم المستخدمين
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            جميع المستخدمين الذين تمت دعوتهم عبر روابط الإحالة
          </p>
        </div>

        {/* Search Bar */}
        <Card className="shadow-elegant">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="البحث بالاسم أو رقم الهاتف..."
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

        {/* Users List */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Settings className="h-5 w-5 text-primary" />
              المستخدمون المدعوون ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : users.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p>لا يوجد مستخدمون تمت دعوتهم عبر الرابط</p>
                <p className="mt-1 text-sm">جرب تغيير شروط البحث</p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors lg:flex-row lg:items-center lg:justify-between"
                  >
                    {/* User Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
                        <span className="text-sm font-medium text-primary">
                          {user.full_name?.charAt(0) || "?"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium truncate">
                            {user.full_name || "مستخدم غير معروف"}
                          </h3>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs shrink-0">
                            مدعو عبر الرابط
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span dir="ltr">{user.phone_number}</span>
                          </div>
                          {user.inviter_name && (
                            <div className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              <span>دعوة من: {user.inviter_name}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>
                            انضم: {new Date(user.created_at).toLocaleDateString("ar-EG")}
                          </span>
                          {user.days_since_invited !== undefined && (
                            <span className="font-medium text-primary">
                              {user.days_since_invited} يوم
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Toggle Controls - Fixed UI with better RTL support */}
                    <div className="flex flex-col gap-4 w-full sm:w-auto sm:flex-row sm:items-center sm:gap-6 shrink-0 border-t sm:border-t-0 pt-4 sm:pt-0">
                      <div className="flex items-center justify-between gap-4 bg-muted/30 p-3 rounded-md sm:bg-transparent sm:p-0">
                        <Label htmlFor={`days-counter-${user.id}`} className="text-sm font-medium cursor-pointer">
                          عداد الأيام
                        </Label>
                        <Switch
                          id={`days-counter-${user.id}`}
                          dir="ltr"
                          checked={user.user_preferences?.show_days_counter ?? true}
                          onCheckedChange={() => 
                            handleToggleDaysCounter(
                              user.id, 
                              user.user_preferences?.show_days_counter ?? true
                            )
                          }
                          disabled={toggleUserPreferenceMutation.isPending}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-4 bg-muted/30 p-3 rounded-md sm:bg-transparent sm:p-0">
                        <Label htmlFor={`referral-bonus-${user.id}`} className="text-sm font-medium cursor-pointer">
                          مكافآت الترشيح
                        </Label>
                        <Switch
                          id={`referral-bonus-${user.id}`}
                          dir="ltr"
                          checked={user.user_preferences?.show_referral_bonus ?? true}
                          onCheckedChange={() => 
                            handleToggleReferralBonus(
                              user.id, 
                              user.user_preferences?.show_referral_bonus ?? true
                            )
                          }
                          disabled={toggleUserPreferenceMutation.isPending}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {users.length >= usersPerPage && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              السابق
            </Button>
            <span className="text-sm text-muted-foreground">
              صفحة {currentPage}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              التالي
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
