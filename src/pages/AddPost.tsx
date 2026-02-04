import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Upload, ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function AddPost() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("posts").insert({
        image_url: imageUrl,
        description,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post created successfully!");
      navigate("/");
    },
    onError: () => {
      toast.error("Failed to create post");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim() || !description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    createMutation.mutate();
  };

  const handleImageUrlChange = (url: string) => {
    setImageUrl(url);
    if (url.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i) || url.startsWith("https://")) {
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

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

      <div className="mx-auto max-w-2xl">
        <Card className="shadow-elegant animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-2xl">
              <Upload className="h-6 w-6 text-primary" />
              Create New Post
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => handleImageUrlChange(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Paste a direct link to an image (JPG, PNG, GIF, WebP)
                </p>
              </div>

              {imagePreview && (
                <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={() => setImagePreview(null)}
                  />
                </div>
              )}

              {!imagePreview && imageUrl && (
                <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border bg-muted/50">
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Image preview will appear here
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write a compelling description for your ad..."
                  rows={4}
                  required
                  className="resize-none"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 gradient-primary"
                >
                  {createMutation.isPending ? "Creating..." : "Create Post"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
