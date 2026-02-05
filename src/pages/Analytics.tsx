import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { MessageAnalytics } from "@/components/analytics/MessageAnalytics";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function Analytics() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [scheduledMessages, setScheduledMessages] = useState<Array<{
    id: string;
    status: string;
    processedCount?: number;
    totalCount?: number;
  }>>([]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Access denied. Admins only.");
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  // Load contacts from database
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Load scheduled messages from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('scheduledMessages');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setScheduledMessages(parsed);
      } catch (error) {
        console.error('Error loading scheduled messages:', error);
      }
    }
  }, []);

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
          <BarChart3 className="inline-block mr-3 h-8 w-8" />
          Analytics Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Monitor your messaging performance and contact engagement
        </p>
      </div>

      <MessageAnalytics 
        contacts={contacts} 
        scheduledMessages={scheduledMessages}
      />
    </Layout>
  );
}
