import { useState } from "react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { Share2, Check, Calendar, Trash2, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/i18n";

interface PostCardProps {
  id: string;
  imageUrl: string;
  description: string;
  createdAt: string;
  onDelete: (id: string) => void;
}

const APPLY_WHATSAPP_NUMBER = "01124188522";

export function PostCard({ id, imageUrl, description, createdAt, onDelete }: PostCardProps) {
  const [copied, setCopied] = useState(false);
  const { isAdmin } = useAuth();

  const handleShare = async () => {
    try {
      const postUrl = `${window.location.origin}/post/${id}`;
      const shareText = `${description}\n\n${postUrl}`;

      if (typeof navigator !== "undefined" && typeof (navigator as Navigator).share === "function") {
        await (navigator as Navigator).share({
          title: t("appName"),
          text: description,
          url: postUrl,
        });
        toast.success(t("posts.shareOpened"));
        return;
      }

      const clipboard = (navigator as Navigator).clipboard;
      if (!clipboard || typeof clipboard.writeText !== "function") {
        throw new Error("Clipboard API not available");
      }

      await clipboard.writeText(shareText);
      setCopied(true);
      toast.success(t("posts.shareCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("posts.shareFailed"));
    }
  };

  const handleApply = () => {
    const postUrl = `${window.location.origin}/post/${id}`;
    const message = `${description}\n\n${postUrl}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${APPLY_WHATSAPP_NUMBER}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Card className="group overflow-hidden shadow-card transition-all duration-300 hover:shadow-elegant hover:-translate-y-1 animate-fade-in">
      <div className="relative aspect-video overflow-hidden">
        <img
          src={imageUrl}
          alt="إعلان"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>
      
      <CardContent className="p-4">
        <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-foreground">
          {description}
        </p>
        
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(createdAt), "d MMM yyyy", { locale: arSA })}</span>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("posts.deleteTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("posts.deleteDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-row-reverse gap-2">
                    <AlertDialogCancel>{t("posts.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t("posts.confirmDelete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  {t("posts.copied")}
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  {t("posts.share")}
                </>
              )}
            </Button>

            <Button
              size="sm"
              onClick={handleApply}
              className="h-8 gap-1.5 bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
            >
              <MessageCircle className="h-4 w-4" />
              {t("posts.apply")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
