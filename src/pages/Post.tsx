import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, MessageCircle, Share2, Check } from "lucide-react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { t } from "@/i18n";
import { openWhatsAppChat } from "@/lib/whatsapp";

const APPLY_WHATSAPP_NUMBER = "+201124188522";
const PUBLIC_BASE_URL = "https://ad-blast-tool.lovable.app";

interface PostData {
  id: string;
  description: string;
  image_url: string;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
}

export default function Post() {
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);

  const { data: post, isLoading } = useQuery<PostData | null>({
    queryKey: ["post", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PostData | null;
    },
  });

  const handleShare = async () => {
    if (!post) return;
    try {
      const postUrl = `${PUBLIC_BASE_URL}/post/${id}`;
      const shareText = `${postUrl}\n\n${post.description}`;
      const clipboard = (navigator as Navigator).clipboard;
      if (clipboard && typeof clipboard.writeText === "function") {
        await clipboard.writeText(shareText);
        setCopied(true);
        toast.success(t("posts.shareCopied"));
        setTimeout(() => setCopied(false), 2000);
        return;
      }
      if (typeof navigator !== "undefined" && typeof (navigator as Navigator).share === "function") {
        await (navigator as Navigator).share({ title: t("appName"), text: shareText });
        toast.success(t("posts.shareOpened"));
        return;
      }
      if (!clipboard || typeof clipboard.writeText !== "function") {
        throw new Error("Clipboard API not available");
      }
    } catch {
      toast.error(t("posts.shareFailed"));
    }
  };

  const handleApply = () => {
    if (!post) return;
    const postUrl = `${PUBLIC_BASE_URL}/post/${id}`;
    const message = `${postUrl}\n\n${post.description}`;
    openWhatsAppChat(APPLY_WHATSAPP_NUMBER, message);
  };

  return (
    <Layout>
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {t("posts.backToPosts")}
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : !post ? (
        <div className="py-16 text-center text-muted-foreground">{t("posts.postNotFound")}</div>
      ) : (
        <div className="mx-auto max-w-3xl">
          <Card className="overflow-hidden shadow-elegant animate-fade-in">
            <div className="relative aspect-video overflow-hidden">
              <img src={post.image_url} alt="إعلان" className="h-full w-full object-cover" />
            </div>
            <CardContent className="p-6">
              <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(new Date(post.created_at), "d MMM yyyy", { locale: arSA })}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground mb-4">{post.description}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground">
                  {copied ? (<><Check className="h-4 w-4" />{t("posts.copied")}</>) : (<><Share2 className="h-4 w-4" />{t("posts.share")}</>)}
                </Button>
                <Button size="sm" onClick={handleApply} className="gap-1.5 bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90">
                  <MessageCircle className="h-4 w-4" />
                  {t("posts.apply")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Layout>
  );
}
