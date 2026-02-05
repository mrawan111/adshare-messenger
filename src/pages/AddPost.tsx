import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Upload, ImageIcon, X } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/i18n";

export default function AddPost() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error(t("addPost.accessDenied"));
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error(t("addPost.imageOnly"));
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(t("addPost.imageTooLarge"));
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No image selected");

      setIsUploading(true);

      // Generate unique filename
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName);

      // Create post with image URL
      const { error: insertError } = await supabase.from("posts").insert({
        image_url: urlData.publicUrl,
        description,
      });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success(t("addPost.success"));
      navigate("/");
    },
    onError: (error) => {
      console.error("Error creating post:", error);
      toast.error(t("addPost.error"));
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error(t("addPost.selectImage"));
      return;
    }
    if (!description.trim()) {
      toast.error(t("addPost.enterDescription"));
      return;
    }
    createMutation.mutate();
  };

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
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("posts.backToPosts")}
        </Link>
      </div>

      <div className="mx-auto max-w-2xl">
        <Card className="shadow-elegant animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-2xl">
              <Upload className="h-6 w-6 text-primary" />
              {t("addPost.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>{t("addPost.image")}</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {imagePreview ? (
                  <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
                    <img
                      src={imagePreview}
                      alt="معاينة"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute end-2 top-2 rounded-full bg-foreground/80 p-1.5 text-background transition-colors hover:bg-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-video w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors hover:border-primary hover:bg-muted"
                  >
                    <ImageIcon className="mb-3 h-12 w-12 text-muted-foreground/50" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {t("addPost.clickToUpload")}
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground/70">
                      {t("addPost.imageFormats")}
                    </span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("addPost.description")}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("addPost.descriptionPlaceholder")}
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
                  disabled={isUploading}
                >
                  {t("addPost.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || isUploading}
                  className="flex-1 gradient-primary"
                >
                  {isUploading ? t("addPost.uploading") : t("addPost.create")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
