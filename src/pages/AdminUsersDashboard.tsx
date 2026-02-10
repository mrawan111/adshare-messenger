import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Search, ToggleLeft, ToggleRight, Calendar, Mail, Shield, Settings } from "lucide-react";
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
  email: string;
  full_name: string | null;
  phone_number: string | null;
  created_at: string;
  user_id: string;
  invited_at?: string;
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
  invited_at: string;
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

  // Fetch all users with their preferences
  const { data: users = [], isLoading: usersLoading } = useQuery<UserProfile[]>({
    queryKey: ["admin_users", currentPage, usersPerPage, searchTerm],
    queryFn: async () => {
      if (!isAdmin) return [];

      try {
        // First fetch all users
        let profilesQuery = supabase
          .from("profiles")
          .select(`
            id,
            email,
            full_name,
            phone_number,
            created_at,
            user_id
          `)
          .order("created_at", { ascending: false });

        // Apply search filter if provided
        if (searchTerm) {
          profilesQuery = profilesQuery.or(
            `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`
          );
        }

        // Apply pagination
        const { data: profiles, error: profilesError } = await profilesQuery.range(
          (currentPage - 1) * usersPerPage,
          currentPage * usersPerPage - 1
        );

        if (profilesError) throw profilesError;

        const profilesData = profiles as UserProfile[] | null;
        if (!profilesData || profilesData.length === 0) return [];

        // Get ALL referrals first, then filter for invited users
        const { data: referrals, error: referralsError } = await supabase
          .from("referrals")
          .select("invited_user_id, invited_at")
          .order("invited_at", { ascending: false });

        if (referralsError) {
          console.error("Error fetching referrals:", referralsError);
        }

        console.log("Profiles found:", profilesData.length);
        console.log("All referrals found:", referrals?.length || 0);

        // Filter to only show users who were invited via links
        const referralData = referrals as ReferralData[] | null;
        const invitedUserIds = referralData?.map(r => r.invited_user_id) || [];
        const usersInvitedViaLink = profilesData.filter(p => invitedUserIds.includes(p.user_id));

        console.log("Users invited via link:", usersInvitedViaLink.length);

        // If no users were invited via links, show all users with a flag
        const finalUsersList = usersInvitedViaLink.length > 0 ? usersInvitedViaLink : profilesData;
        const showAllUsersFlag = usersInvitedViaLink.length === 0;

        // Calculate days since invited for each user
        const usersWithDaysCounter = finalUsersList.map(profile => {
          const referral = referralData?.find(r => r.invited_user_id === profile.user_id);
          const invitedAt = referral?.invited_at || profile.created_at;
          const daysSinceInvited = Math.floor(
            (new Date().getTime() - new Date(invitedAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          
          return {
            ...profile,
            invited_at: invitedAt,
            days_since_invited: daysSinceInvited,
            is_invited_via_link: invitedUserIds.includes(profile.user_id)
          };
        });

        // Then fetch preferences for these users
        const { data: preferences, error: preferencesError } = await supabase
          .from("user_preferences")
          .select("profile_id, show_days_counter, show_referral_bonus")
          .in("profile_id", usersWithDaysCounter.map(p => p.id));

        if (preferencesError) {
          console.error("Error fetching preferences:", preferencesError);
        }

        // Merge profiles with preferences
        return usersWithDaysCounter.map(profile => ({
          ...profile,
          user_preferences: preferences?.find(p => p.profile_id === profile.id) || null
        }));
      } catch (error) {
        console.error("Query error:", error);
        return [];
      }
    },
    enabled: !!isAdmin,
  });

  // Toggle user preference mutation
  const toggleUserPreferenceMutation = useMutation({
    mutationFn: async ({ userId, preference, value }: { 
      userId: string; 
      preference: 'show_days_counter' | 'show_referral_bonus'; 
      value: boolean 
    }) => {
      console.log("Toggling preference:", { userId, preference, value });
      
      try {
        // Check if preference exists for this user
        const { data: existingPrefs } = await supabase
          .from("user_preferences")
          .select("profile_id")
          .eq("profile_id", userId)
          .single();

        if (existingPrefs) {
          // Update existing preference
          const { error } = await supabase
            .from("user_preferences")
            .update({ [preference]: value })
            .eq("profile_id", userId);

          if (error) throw error;
        } else {
          // Insert new preference record with both settings
          const { error } = await supabase
            .from("user_preferences")
            .insert({
              profile_id: userId,
              show_days_counter: preference === 'show_days_counter' ? value : true,
              show_referral_bonus: preference === 'show_referral_bonus' ? value : true,
            });

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
    toggleUserPreferenceMutation.mutate({
      userId,
      preference: "show_days_counter",
      value: !currentValue,
    });
  };

  const handleToggleReferralBonus = (userId: string, currentValue: boolean) => {
    toggleUserPreferenceMutation.mutate({
      userId,
      preference: "show_referral_bonus", 
      value: !currentValue,
    });
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
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            <Users className="inline-block ml-3 h-8 w-8" />
            لوحة تحكم المستخدمين
          </h1>
          <p className="mt-1 text-muted-foreground">
            إدارة المستخدمين الذين تمت دعوتهم عبر الرابط وتفعيل/تعطيل عداد الأيام لكل مستخدم
          </p>
        </div>

        {/* Search Bar */}
        <Card className="shadow-elegant">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="البحث بالاسم، البريد الإلكتروني، أو رقم الهاتف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Button variant="outline" onClick={() => setSearchTerm("")}>
                مسح
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              المستخدمون ({users.length})
              {users.some(u => !u.is_invited_via_link) && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  يعرض جميع المستخدمين (لا يوجد مدعومون عبر الرابط)
                </Badge>
              )}
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
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                        <span className="text-sm font-medium text-primary">
                          {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            {user.full_name || "مستخدم غير معروف"}
                          </h3>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            نشط
                          </Badge>
                          {user.is_invited_via_link && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              مدعوم عبر الرابط
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>{user.email}</span>
                          </div>
                          {user.phone_number && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{user.phone_number}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                    <div className="flex items-center gap-3">
                      {/* Days Counter Toggle */}
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`days-counter-${user.id}`} className="text-sm">
                          عداد الأيام
                        </Label>
                        <Switch
                          id={`days-counter-${user.id}`}
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

                      {/* Referral Bonus Toggle */}
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`referral-bonus-${user.id}`} className="text-sm">
                          مكافآت
                        </Label>
                        <Switch
                          id={`referral-bonus-${user.id}`}
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
        {users.length > usersPerPage && (
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
