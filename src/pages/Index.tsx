import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { PostGrid } from "@/components/posts/PostGrid";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/i18n";

export default function Index() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("تم حذف الإعلان بنجاح");
    },
    onError: () => {
      toast.error("فشل في حذف الإعلان");
    },
  });

  return (
    <Layout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-start">
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            {t("posts.title")}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {t("posts.subtitle")}
          </p>
        </div>

        {isAdmin && (
          <Link to="/add-post">
            <Button className="gap-2 gradient-primary">
              <PlusCircle className="h-4 w-4" />
              {t("nav.addPost")}
            </Button>
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          {t("posts.noPosts")}
        </div>
      ) : (
        <PostGrid posts={posts} onDelete={(id) => deleteMutation.mutate(id)} />
      )}
    </Layout>
  );
}
