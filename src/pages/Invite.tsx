import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check, Share2, Users, Calendar, Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { t } from "@/i18n";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface ReferralData {
  id: string;
  invited_user_id: string;
  invited_at: string;
  invited_name: string | null;
  invited_phone: string | null;
  days_since_invited: number;
}

export default function Invite() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isDaysCounterEnabled } = useAdminSettings();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      sessionStorage.setItem("redirectAfterAuth", "/invite");
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const daysSinceRegistration = user ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const referralLink = user ? `${window.location.origin}/auth?ref=${user.id}` : "";

  const { data: referrals = [], isLoading: referralsLoading } = useQuery<ReferralData[]>({
    queryKey: ["referrals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("referrals")
        .select("id, invited_user_id, invited_at")
        .eq("inviter_user_id", user.id)
        .order("invited_at", { ascending: false });

      if (error) { console.error("Error fetching referrals:", error); return []; }

      const invitedUserIds = data.map((r) => r.invited_user_id);
      if (invitedUserIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone_number")
        .in("user_id", invitedUserIds);

      return data.map((referral) => {
        const profile = profiles?.find((p) => p.user_id === referral.invited_user_id);
        return {
          id: referral.id,
          invited_user_id: referral.invited_user_id,
          invited_at: referral.invited_at,
          invited_name: profile?.full_name || null,
          invited_phone: profile?.phone_number || null,
          days_since_invited: Math.floor((Date.now() - new Date(referral.invited_at).getTime()) / (1000 * 60 * 60 * 24)),
        };
      });
    },
    enabled: !!user,
  });

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success(t("invite.linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error(t("invite.copyFailed")); }
  };

  const shareLink = async () => {
    const shareMessage = `${t("invite.shareText")}\n\n${referralLink}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: t("invite.shareTitle"), text: shareMessage });
        toast.success(t("invite.shareSuccess"));
      } catch (err) {
        if ((err as Error).name !== "AbortError") toast.error(t("invite.shareFailed"));
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareMessage);
        setCopied(true);
        toast.success(t("invite.linkCopied"));
        setTimeout(() => setCopied(false), 2000);
      } catch { toast.error(t("invite.copyFailed")); }
    }
  };

  if (authLoading) {
    return (<Layout><div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></Layout>);
  }
  if (!user) return null;

  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">{t("invite.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("invite.subtitle")}</p>
        </div>

        {isDaysCounterEnabled && (
          <Card className="shadow-elegant">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${daysSinceRegistration >= 30 ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                  <span className="text-2xl font-bold">{daysSinceRegistration}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">عدد الأيام منذ التسجيل</h3>
                <p className="text-muted-foreground">
                  {daysSinceRegistration >= 30 ? '🎉 لقد أكملت 30 يوم! يمكنك الآن الحصول على مكافآتك' : `متبقي ${30 - daysSinceRegistration} يوم للحصول على المكافأة`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Share2 className="h-5 w-5 text-primary" />{t("invite.yourLink")}</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center"><span className="text-white text-sm font-bold">💰</span></div>
                  <div className="space-y-2">
                    <p className="text-gray-800 dark:text-gray-200 font-medium">يمكنك ترشيح أي شخص للعمل دليفري من خلال هذا الرابط،</p>
                    <p className="text-green-600 dark:text-green-400 font-semibold text-lg">وعند إكماله شهر عمل كامل تحصل على بونص 1000 جنيه.</p>
                  </div>
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("invite.referralLink")}</Label>
              <div className="flex gap-2">
                <Input value={referralLink} readOnly className="font-mono text-sm" dir="ltr" />
                <Button onClick={copyToClipboard} variant="outline" className="shrink-0">
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={copyToClipboard} className="flex-1 gradient-primary"><Copy className="ml-2 h-4 w-4" />{t("invite.copyLink")}</Button>
              <Button onClick={shareLink} variant="outline" className="flex-1"><Share2 className="ml-2 h-4 w-4" />{t("invite.shareLink")}</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />{t("invite.historyTitle")}</CardTitle>
            <CardDescription>{t("invite.historyDescription", { count: referrals.length })}</CardDescription>
          </CardHeader>
          <CardContent>
            {referralsLoading ? (
              <div className="flex items-center justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : referrals.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p>{t("invite.noReferrals")}</p>
                <p className="mt-1 text-sm">{t("invite.startInviting")}</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("invite.invitedName")}</TableHead>
                      <TableHead>رقم الهاتف</TableHead>
                      <TableHead>{t("invite.invitedDate")}</TableHead>
                      {isDaysCounterEnabled && <TableHead>عدد الأيام</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((referral) => (
                      <TableRow key={referral.id}>
                        <TableCell className="font-medium">{referral.invited_name || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm" dir="ltr">{referral.invited_phone || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{new Date(referral.invited_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}</span>
                          </div>
                        </TableCell>
                        {isDaysCounterEnabled && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${referral.days_since_invited >= 30 ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>{referral.days_since_invited}</span>
                              <span className="text-sm text-muted-foreground">{referral.days_since_invited >= 30 ? '✅' : `(${referral.days_since_invited}/30)`}</span>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
