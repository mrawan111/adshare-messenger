import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { PostGrid } from "@/components/posts/PostGrid";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Index() {
  const queryClient = useQueryClient();

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
      toast.success("Post deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete post");
    },
  });

  return (
    <Layout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Advertising Posts
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage and share your advertising content
          </p>
        </div>

        <Link to="/add-post">
          <Button className="gap-2 gradient-primary">
            <PlusCircle className="h-4 w-4" />
            Add New Post
          </Button>
        </Link>
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
      ) : (
        <PostGrid posts={posts} onDelete={(id) => deleteMutation.mutate(id)} />
      )}
    </Layout>
  );
}
