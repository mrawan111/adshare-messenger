import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Phone, Wallet, Users, Calendar, ArrowLeft, Edit2, Save, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { t } from "@/i18n";

export default function Profile() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    vodafone_cash: "",
  });
  const queryClient = useQueryClient();
  const { isDaysCounterEnabled } = useAdminSettings();

  useEffect(() => {
    if (!authLoading && !user) {
      sessionStorage.setItem("redirectAfterAuth", "/profile");
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) { console.error("Error fetching profile:", error); return null; }
      return data;
    },
    enabled: !!user,
  });

  const { data: referrals = [], isLoading: referralsLoading } = useQuery({
    queryKey: ["referrals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("referrals").select("id").eq("inviter_user_id", user.id);
      if (error) { console.error("Error fetching referrals:", error); return []; }
      return data;
    },
    enabled: !!user,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updateData: typeof formData) => {
      if (!user) throw new Error("User not authenticated");
      const { error } = await supabase.from("profiles").update(updateData).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث البيانات بنجاح");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: () => toast.error("فشل في تحديث البيانات"),
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone_number: profile.phone_number || "",
        vodafone_cash: profile.vodafone_cash || user?.user_metadata?.vodafone_cash || "",
      });
    }
  }, [profile, user]);

  const handleCancel = () => {
    setIsEditing(false);
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone_number: profile.phone_number || "",
        vodafone_cash: profile.vodafone_cash || user?.user_metadata?.vodafone_cash || "",
      });
    }
  };

  if (authLoading) {
    return (<Layout><div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></Layout>);
  }
  if (!user) return null;

  const referralCount = referrals.length;
  const daysSinceRegistration = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">الملف الشخصي</h1>
            <p className="text-muted-foreground">إدارة بياناتك الشخصية ومعلومات الحساب</p>
          </div>
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                معلومات شخصية
              </CardTitle>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="ml-2 h-4 w-4" />
                  تعديل
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <X className="ml-2 h-4 w-4" />
                    إلغاء
                  </Button>
                  <Button size="sm" onClick={() => updateProfileMutation.mutate(formData)} disabled={updateProfileMutation.isPending}>
                    <Save className="ml-2 h-4 w-4" />
                    {updateProfileMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4" />
                  الاسم الكامل
                </div>
                {isEditing ? (
                  <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="أدخل الاسم الكامل" className="text-lg" />
                ) : (
                  <p className="text-lg font-medium">{profile?.full_name || user.user_metadata?.full_name || "غير محدد"}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  رقم الهاتف
                </div>
                {isEditing ? (
                  <Input value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} placeholder="أدخل رقم الهاتف" className="text-lg" dir="ltr" />
                ) : (
                  <p className="text-lg font-medium" dir="ltr">{profile?.phone_number || user.user_metadata?.phone_number || "غير محدد"}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  رقم محفظة للمكافأت
                </div>
                {isEditing ? (
                  <Input value={formData.vodafone_cash} onChange={(e) => setFormData({ ...formData, vodafone_cash: e.target.value })} placeholder="أدخل رقم المحفظة" className="text-lg" dir="ltr" />
                ) : (
                  <p className="text-lg font-medium" dir="ltr">{profile?.vodafone_cash || user.user_metadata?.vodafone_cash || "غير محدد"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              الإحصائيات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-4 ${isDaysCounterEnabled ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
              <div className="text-center p-4 border rounded-lg">
                <div className="flex items-center justify-center mb-2"><Users className="h-8 w-8 text-primary" /></div>
                <div className="text-2xl font-bold text-primary">{referralsLoading ? "..." : referralCount}</div>
                <div className="text-sm text-muted-foreground">عدد الدعوات المرسلة</div>
              </div>
              {isDaysCounterEnabled && (
                <div className="text-center p-4 border rounded-lg">
                  <div className="flex items-center justify-center mb-2"><Calendar className="h-8 w-8 text-primary" /></div>
                  <div className="text-2xl font-bold text-primary">{daysSinceRegistration}</div>
                  <div className="text-sm text-muted-foreground">عدد الأيام منذ التسجيل</div>
                </div>
              )}
              <div className="text-center p-4 border rounded-lg">
                <div className="flex items-center justify-center mb-2"><Wallet className="h-8 w-8 text-primary" /></div>
                <div className="text-2xl font-bold text-primary">{referralCount * 1000}</div>
                <div className="text-sm text-muted-foreground">المكافآت المحتملة (ج.م)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader><CardTitle>حالة الحساب</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">حساب نشط</Badge>
              <span className="text-sm text-muted-foreground">تم التحقق من رقم الهاتف</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
