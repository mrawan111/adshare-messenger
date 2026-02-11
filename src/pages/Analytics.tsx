import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Users } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { ReferralAnalytics } from "@/components/analytics/ReferralAnalytics";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function Analytics() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Access denied. Admins only.");
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
          <UserPlus className="inline-block ml-3 h-8 w-8" />
          لوحة تحليلات الدعوات
        </h1>
        <p className="mt-1 text-muted-foreground">
          مراقبة أداء نظام الإحالة ومتابعة الدعوات
        </p>
      </div>

      <div className="mb-6">
        <Button 
          onClick={() => navigate("/admin/users")}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          إدارة المستخدمين
        </Button>
      </div>

      <div className="space-y-8">
        <ReferralAnalytics />
      </div>
    </Layout>
  );
}