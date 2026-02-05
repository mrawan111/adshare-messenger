import { useState } from "react";
import { format } from "date-fns";
import { Share2, Check, Calendar, Trash2 } from "lucide-react";
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

interface PostCardProps {
  id: string;
  imageUrl: string;
  description: string;
  createdAt: string;
  onDelete: (id: string) => void;
}

export function PostCard({ id, imageUrl, description, createdAt, onDelete }: PostCardProps) {
  const [copied, setCopied] = useState(false);
  const { isAdmin } = useAuth();

  const handleShare = async () => {
    try {
      const postUrl = `${window.location.origin}/post/${id}`;
      const shareText = `${description}\n\n${postUrl}`;

      if (typeof navigator !== "undefined" && typeof (navigator as Navigator).share === "function") {
        await (navigator as Navigator).share({
          title: "Ad post",
          text: description,
          url: postUrl,
        });
        toast.success("Share opened");
        return;
      }

      const clipboard = (navigator as Navigator).clipboard;
      if (!clipboard || typeof clipboard.writeText !== "function") {
        throw new Error("Clipboard API not available");
      }

      await clipboard.writeText(shareText);
      setCopied(true);
      toast.success("Post link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Card className="group overflow-hidden shadow-card transition-all duration-300 hover:shadow-elegant hover:-translate-y-1 animate-fade-in">
      <div className="relative aspect-video overflow-hidden">
        <img
          src={imageUrl}
          alt="Ad post"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>
      
      <CardContent className="p-4">
        <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-foreground">
          {description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(createdAt), "MMM d, yyyy")}</span>
          </div>
          
          <div className="flex items-center gap-2">
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
                    <AlertDialogTitle>Delete Post</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this post? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
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
                  Copied
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  Share
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
