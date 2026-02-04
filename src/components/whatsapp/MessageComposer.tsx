import { useState } from "react";
import { Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface MessageComposerProps {
  selectedCount: number;
  selectedPhoneNumbers: string[];
}

export function MessageComposer({ selectedCount, selectedPhoneNumbers }: MessageComposerProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (selectedPhoneNumbers.length === 0) {
      toast.error("Please select at least one contact");
      return;
    }

    setIsSending(true);
    const encodedMessage = encodeURIComponent(message);

    for (let i = 0; i < selectedPhoneNumbers.length; i++) {
      const phoneNumber = selectedPhoneNumbers[i].replace(/\D/g, "");
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
      
      // Add a small delay between opening tabs to avoid popup blocking
      await new Promise((resolve) => setTimeout(resolve, i * 500));
      window.open(whatsappUrl, "_blank");
    }

    toast.success(`Opened ${selectedPhoneNumbers.length} WhatsApp chat(s)`);
    setIsSending(false);
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-display">
          <MessageCircle className="h-5 w-5 text-whatsapp" />
          Compose Message
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            rows={5}
            className="resize-none"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {selectedCount > 0 ? (
              <>
                Ready to send to{" "}
                <span className="font-semibold text-foreground">
                  {selectedCount} contact{selectedCount > 1 ? "s" : ""}
                </span>
              </>
            ) : (
              "Select contacts to send message"
            )}
          </p>

          <Button
            onClick={handleSend}
            disabled={selectedCount === 0 || !message.trim() || isSending}
            className="gradient-whatsapp text-whatsapp-foreground"
          >
            <Send className="mr-2 h-4 w-4" />
            {isSending ? "Opening chats..." : "Send via WhatsApp"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
