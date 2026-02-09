import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, UserPlus, Trophy, TrendingUp, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';

interface ReferralWithDetails {
  id: string;
  inviter_user_id: string;
  invited_user_id: string;
  invited_at: string;
  inviter_name: string | null;
  inviter_email: string;
  invited_name: string | null;
  invited_email: string;
}

interface UserReferralStats {
  userId: string;
  userName: string | null;
  userEmail: string;
  referralCount: number;
  lastReferralDate: string | null;
}

export function ReferralAnalytics() {
  // Fetch all referrals with profile details
  const { data: referrals = [], isLoading: referralsLoading } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      // Get all referrals
      const { data: referralData, error: referralError } = await supabase
        .from("referrals")
        .select("*")
        .order("invited_at", { ascending: false });

      if (referralError) throw referralError;

      // Get all profiles to map user details
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email");

      if (profilesError) throw profilesError;

      // Create a map for quick lookup
      const profileMap = new Map(
        profiles?.map(p => [p.user_id, { name: p.full_name, email: p.email }]) || []
      );

      // Combine referral data with profile details
      return referralData?.map(ref => ({
        ...ref,
        inviter_name: profileMap.get(ref.inviter_user_id)?.name || null,
        inviter_email: profileMap.get(ref.inviter_user_id)?.email || "Unknown",
        invited_name: profileMap.get(ref.invited_user_id)?.name || null,
        invited_email: profileMap.get(ref.invited_user_id)?.email || "Unknown",
      })) as ReferralWithDetails[];
    },
  });

  // Fetch total user count
  const { data: totalUsers = 0 } = useQuery({
    queryKey: ["total-users"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  // Calculate stats per user (who invited the most)
  const userStats = useMemo((): UserReferralStats[] => {
    const statsMap = new Map<string, UserReferralStats>();

    referrals.forEach(ref => {
      const existing = statsMap.get(ref.inviter_user_id);
      if (existing) {
        existing.referralCount++;
        if (!existing.lastReferralDate || ref.invited_at > existing.lastReferralDate) {
          existing.lastReferralDate = ref.invited_at;
        }
      } else {
        statsMap.set(ref.inviter_user_id, {
          userId: ref.inviter_user_id,
          userName: ref.inviter_name,
          userEmail: ref.inviter_email,
          referralCount: 1,
          lastReferralDate: ref.invited_at,
        });
      }
    });

    return Array.from(statsMap.values()).sort((a, b) => b.referralCount - a.referralCount);
  }, [referrals]);

  // Calculate overall stats
  const stats = useMemo(() => {
    const totalReferrals = referrals.length;
    const usersWhoReferred = userStats.length;
    const topReferrer = userStats[0] || null;

    // Calculate referrals this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const referralsThisWeek = referrals.filter(
      r => new Date(r.invited_at) >= oneWeekAgo
    ).length;

    // Calculate referral rate
    const referralRate = totalUsers > 0 ? ((totalReferrals / totalUsers) * 100).toFixed(1) : "0";

    return {
      totalReferrals,
      usersWhoReferred,
      topReferrer,
      referralsThisWeek,
      referralRate,
      totalUsers,
    };
  }, [referrals, userStats, totalUsers]);

  // Export to Excel
  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ['إحصائية', 'القيمة'],
        ['إجمالي الدعوات', stats.totalReferrals],
        ['إجمالي المستخدمين', stats.totalUsers],
        ['المستخدمين الذين دعوا آخرين', stats.usersWhoReferred],
        ['الدعوات هذا الأسبوع', stats.referralsThisWeek],
        ['نسبة الدعوات', `${stats.referralRate}%`],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'ملخص');

      // All referrals sheet
      const referralData = [
        ['الداعي', 'بريد الداعي', 'المدعو', 'بريد المدعو', 'تاريخ الدعوة'],
        ...referrals.map(ref => [
          ref.inviter_name || 'غير معروف',
          ref.inviter_email,
          ref.invited_name || 'غير معروف',
          ref.invited_email,
          new Date(ref.invited_at).toLocaleDateString('ar-EG'),
        ])
      ];
      const referralWs = XLSX.utils.aoa_to_sheet(referralData);
      XLSX.utils.book_append_sheet(wb, referralWs, 'جميع الدعوات');

      // Leaderboard sheet
      const leaderboardData = [
        ['المستخدم', 'البريد الإلكتروني', 'عدد الدعوات', 'آخر دعوة'],
        ...userStats.map(user => [
          user.userName || 'غير معروف',
          user.userEmail,
          user.referralCount,
          user.lastReferralDate ? new Date(user.lastReferralDate).toLocaleDateString('ar-EG') : '-',
        ])
      ];
      const leaderboardWs = XLSX.utils.aoa_to_sheet(leaderboardData);
      XLSX.utils.book_append_sheet(wb, leaderboardWs, 'ترتيب الداعين');

      const timestamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `referral_analytics_${timestamp}.xlsx`);
    } catch (error) {
      console.error('Error exporting analytics:', error);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  if (referralsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">تحليلات الدعوات</h2>
          <p className="text-muted-foreground">تتبع أداء نظام الإحالة والدعوات</p>
        </div>
        <Button variant="outline" onClick={exportToExcel}>
          <Download className="ml-2 h-4 w-4" />
          تصدير Excel
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الدعوات</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">
              دعوة ناجحة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              مستخدم مسجل
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الداعين النشطين</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.usersWhoReferred}</div>
            <p className="text-xs text-muted-foreground">
              مستخدم قام بدعوة آخرين
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">هذا الأسبوع</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.referralsThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              دعوة جديدة
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Referrers Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            ترتيب أفضل الداعين
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userStats.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              لا توجد دعوات بعد
            </p>
          ) : (
            <div className="space-y-4">
              {userStats.slice(0, 10).map((user, index) => (
                <div
                  key={user.userId}
                  className="flex flex-col gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold shrink-0">
                      {index + 1}
                    </div>
                    <Avatar className="shrink-0">
                      <AvatarFallback className="bg-primary/20">
                        {getInitials(user.userName, user.userEmail)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{user.userName || 'مستخدم'}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.userEmail}</p>
                    </div>
                  </div>
                  <div className="text-left self-end sm:self-auto">
                    <Badge variant={index < 3 ? "default" : "secondary"} className="text-base sm:text-lg px-3 py-1">
                      {user.referralCount} دعوة
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle>جميع الدعوات</CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              لا توجد دعوات بعد
            </p>
          ) : (
            <>
              {/* Mobile: Card layout */}
              <div className="space-y-3 sm:hidden">
                {referrals.map((ref) => (
                  <div key={ref.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-sm shrink-0">الداعي:</span>
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-xs">
                          {getInitials(ref.inviter_name, ref.inviter_email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{ref.inviter_name || 'مستخدم'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-sm shrink-0">المدعو:</span>
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/20 text-primary">
                          {getInitials(ref.invited_name, ref.invited_email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{ref.invited_name || 'مستخدم'}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-muted-foreground text-sm">التاريخ:</span>
                      <p className="text-sm">
                        {new Date(ref.invited_at).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block rounded-md border overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-4 text-right font-medium">الداعي</th>
                      <th className="p-4 text-right font-medium">المدعو</th>
                      <th className="p-4 text-right font-medium">تاريخ الدعوة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((ref) => (
                      <tr key={ref.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="text-xs">
                                {getInitials(ref.inviter_name, ref.inviter_email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{ref.inviter_name || 'مستخدم'}</p>
                              <p className="text-xs text-muted-foreground truncate">{ref.inviter_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="text-xs bg-primary/20 text-primary">
                                {getInitials(ref.invited_name, ref.invited_email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{ref.invited_name || 'مستخدم'}</p>
                              <p className="text-xs text-muted-foreground truncate">{ref.invited_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm">
                            {new Date(ref.invited_at).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(ref.invited_at).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
