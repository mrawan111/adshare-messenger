import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";

export default function Post() {
  const { id } = useParams<{ id: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  return (
    <Layout>
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Posts
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : !post ? (
        <div className="py-16 text-center text-muted-foreground">Post not found</div>
      ) : (
        <div className="mx-auto max-w-3xl">
          <Card className="overflow-hidden shadow-elegant animate-fade-in">
            <div className="relative aspect-video overflow-hidden">
              <img
                src={post.image_url}
                alt="Ad post"
                className="h-full w-full object-cover"
              />
            </div>

            <CardContent className="p-6">
              <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(new Date(post.created_at), "MMM d, yyyy")}</span>
              </div>

              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {post.description}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </Layout>
  );
}
