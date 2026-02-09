import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, Wallet, Users, Calendar, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/i18n";

export default function Profile() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      sessionStorage.setItem("redirectAfterAuth", "/profile");
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Fetch user profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      return data;
    },
    enabled: !!user,
  });

  // Fetch referral count
  const { data: referrals = [], isLoading: referralsLoading } = useQuery({
    queryKey: ["referrals", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("referrals")
        .select("id")
        .eq("inviter_user_id", user.id);

      if (error) {
        console.error("Error fetching referrals:", error);
        return [];
      }

      return data;
    },
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  const referralCount = referrals.length;

  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              الملف الشخصي
            </h1>
            <p className="text-muted-foreground">
              إدارة بياناتك الشخصية ومعلومات الحساب
            </p>
          </div>
        </div>

        {/* Profile Information Card */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              معلومات شخصية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4" />
                  الاسم الكامل
                </div>
                <p className="text-lg font-medium">
                  {profile?.full_name || user.user_metadata?.full_name || "غير محدد"}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  البريد الإلكتروني
                </div>
                <p className="text-lg font-medium" dir="ltr">
                  {user.email}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  رقم الهاتف
                </div>
                <p className="text-lg font-medium" dir="ltr">
                  {profile?.phone_number || user.user_metadata?.phone_number || "غير محدد"}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  رقم محفظة للمكافأت
                </div>
                <p className="text-lg font-medium" dir="ltr">
                  {user.user_metadata?.vodafone_cash || profile?.phone_number || "غير محدد"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Card */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              الإحصائيات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 border rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary">
                  {referralsLoading ? "..." : referralCount}
                </div>
                <div className="text-sm text-muted-foreground">
                  عدد الدعوات المرسلة
                </div>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary">
                  {new Date(user.created_at).toLocaleDateString("ar-EG", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="text-sm text-muted-foreground">
                  تاريخ الانضمام
                </div>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Wallet className="h-8 w-8 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary">
                  {referralCount * 1000}
                </div>
                <div className="text-sm text-muted-foreground">
                  المكافآت المحتملة (ج.م)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>حالة الحساب</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                حساب نشط
              </Badge>
              <span className="text-sm text-muted-foreground">
                تم التحقق من البريد الإلكتروني
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
