import { useState, useEffect, useRef } from "react";
import { Send, MessageCircle, Info, Pause, Play, Square, AlertTriangle, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface Contact {
  id: string;
  name: string;
  phone_number: string;
}

interface MessageComposerProps {
  selectedCount: number;
  selectedPhoneNumbers: string[];
  selectedContacts: Contact[];
  allContacts: Contact[];
}

// Configuration constants for safety and compliance
const BATCH_SIZE = 25; // Numbers per batch
const DELAY_BETWEEN_CHATS = 1500; // 1.5 seconds between chat opens
const DELAY_BETWEEN_BATCHES = 5 * 60 * 1000; // 5 minutes between batches

// Helper function to create a delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to format phone number with country code
const formatPhoneNumber = (phoneNumber: string): string => {
  const cleaned = phoneNumber.replace(/\D/g, "");
  
  // Handle Egyptian numbers (starting with 01, 011, 012, 010, 015)
  if (cleaned.startsWith('01')) {
    return cleaned.startsWith('20') ? cleaned : `20${cleaned}`;
  }
  
  // Handle numbers that already have country code
  if (cleaned.startsWith('20')) {
    return cleaned;
  }
  
  // Handle other international numbers (add as needed)
  // For now, assume it's already properly formatted
  return cleaned;
};

export function MessageComposer({ selectedCount, selectedPhoneNumbers, selectedContacts, allContacts }: MessageComposerProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  
  // Progress tracking state
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [processedNumbers, setProcessedNumbers] = useState(0);
  const [totalNumbers, setTotalNumbers] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [currentStatus, setCurrentStatus] = useState("");
  
  // Ref to control the automation loop
  const automationRef = useRef<boolean>(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate total batches
  useEffect(() => {
    const batches = Math.ceil(selectedPhoneNumbers.length / BATCH_SIZE);
    setTotalBatches(batches);
    setTotalNumbers(selectedPhoneNumbers.length);
  }, [selectedPhoneNumbers]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdownRef.current) {
      clearTimeout(countdownRef.current);
      countdownRef.current = null;
    }

    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [countdown]);

  // Format countdown time
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Open WhatsApp chat for a single number
  const openWhatsAppChat = async (phoneNumber: string, message: string): Promise<boolean> => {
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      // Validate phone number
      if (!formattedPhone || formattedPhone.length < 12) {
        console.error(`Invalid phone number: ${phoneNumber}`);
        return false;
      }
      
      // Use wa.me URL (more reliable than web.whatsapp.com for automation)
      const encodedMessage = encodeURIComponent(message);
      const url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
      
      const newWindow = window.open(url, "_blank");
      
      // Check if popup was blocked
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        console.error(`Popup blocked for phone number: ${phoneNumber}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      return false;
    }
  };

  // Main automation function
  const startAutomation = async () => {
    automationRef.current = true;
    setIsSending(true);
    setIsStopped(false);
    setIsPaused(false);
    
    const numbers = [...selectedPhoneNumbers];
    let successCount = 0;
    let failCount = 0;
    let processed = 0;

    // Process in batches
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      // Check if stopped
      if (!automationRef.current) {
        break;
      }

      // Wait if paused
      while (isPaused && automationRef.current) {
        setCurrentStatus("Paused - Click Resume to continue");
        await sleep(1000);
      }

      if (!automationRef.current) {
        break;
      }

      const startIndex = batchIndex * BATCH_SIZE;
      const endIndex = Math.min(startIndex + BATCH_SIZE, numbers.length);
      const batch = numbers.slice(startIndex, endIndex);

      setCurrentBatch(batchIndex + 1);
      setCurrentStatus(`Processing batch ${batchIndex + 1} of ${totalBatches}`);

      // Process current batch
      for (let i = 0; i < batch.length; i++) {
        // Check if stopped
        if (!automationRef.current) {
          break;
        }

        // Wait if paused
        while (isPaused && automationRef.current) {
          await sleep(1000);
        }

        if (!automationRef.current) {
          break;
        }

        const phoneNumber = batch[i];
        setCurrentStatus(`Opening chat for ${phoneNumber}...`);

        const success = await openWhatsAppChat(phoneNumber, message);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
        
        processed++;
        setProcessedNumbers(processed);

        // Delay between chats (except for the last one in batch)
        if (i < batch.length - 1) {
          await sleep(DELAY_BETWEEN_CHATS);
        }
      }

      // Check if this was the last batch
      if (batchIndex < totalBatches - 1 && automationRef.current) {
        setCurrentStatus(`Batch ${batchIndex + 1} completed. Waiting 5 minutes before next batch...`);
        
        // Start countdown for batch delay
        let remainingDelay = DELAY_BETWEEN_BATCHES / 1000; // Convert to seconds
        setCountdown(remainingDelay);

        const batchDelayStart = Date.now();
        while (Date.now() - batchDelayStart < DELAY_BETWEEN_BATCHES && automationRef.current) {
          // Update countdown every second
          const elapsed = Math.floor((Date.now() - batchDelayStart) / 1000);
          remainingDelay = Math.max(0, (DELAY_BETWEEN_BATCHES / 1000) - elapsed);
          setCountdown(remainingDelay);
          
          // Handle pause during batch delay
          while (isPaused && automationRef.current) {
            await sleep(1000);
          }
          
          if (!automationRef.current) {
            break;
          }
          
          await sleep(1000);
        }
        setCountdown(0);
      }
    }

    // Final status
    if (automationRef.current) {
      setCurrentStatus("Campaign completed!");
      toast.success(`Campaign completed! ${successCount} chats opened${failCount > 0 ? ` (${failCount} failed)` : ''}`);
    } else {
      setCurrentStatus("Campaign stopped");
      toast.info("Campaign stopped by user");
    }

    setIsSending(false);
    automationRef.current = false;
    
    // Reset progress after a delay
    setTimeout(() => {
      setCurrentBatch(0);
      setProcessedNumbers(0);
      setCurrentStatus("");
    }, 3000);
  };

  const handleStart = () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (selectedPhoneNumbers.length === 0) {
      toast.error("Please select at least one contact");
      return;
    }

    setShowStartDialog(true);
  };

  const handleConfirmStart = () => {
    setShowStartDialog(false);
    startAutomation();
  };

  const handlePause = () => {
    setIsPaused(true);
    setCurrentStatus("Pausing...");
  };

  const handleResume = () => {
    setIsPaused(false);
    setCurrentStatus("Resuming...");
  };

  const handleStop = () => {
    automationRef.current = false;
    setIsStopped(true);
    setIsPaused(false);
    setCountdown(0);
    setCurrentStatus("Stopping...");
  };

  const progressPercentage = totalNumbers > 0 ? (processedNumbers / totalNumbers) * 100 : 0;

  // Excel Export Function
  const exportToExcel = () => {
    try {
      // Create worksheet data
      const wsData = [
        ['Name', 'Phone Number'],
        ...selectedContacts.map(contact => [contact.name, contact.phone_number])
      ];

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Contacts');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `whatsapp_contacts_${timestamp}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);
      
      toast.success(`Excel file exported: ${filename}`);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Failed to export Excel file');
    }
  };

  // WhatsApp Web Function
  const openWhatsAppWeb = () => {
    window.open('https://web.whatsapp.com', '_blank');
    toast.info('Opened WhatsApp Web in new tab');
  };

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <MessageCircle className="h-5 w-5 text-whatsapp" />
            Automated WhatsApp Messaging
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning and Info Section */}
          <div className="rounded-lg bg-amber-50 p-3 border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">⚠️ Important - Read Before Starting:</p>
                <ul className="text-xs space-y-1">
                  <li>• Allow popups for this site in your browser settings</li>
                  <li>• Each WhatsApp chat will open in a new tab automatically</li>
                  <li>• You must manually press "Send" in each WhatsApp chat</li>
                  <li>• Processing: 25 numbers per batch with 5-minute delays</li>
                  <li>• This prevents account bans and ensures safe delivery</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Phone Number Format Info */}
          <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Phone Number Format:</p>
                <ul className="text-xs space-y-1">
                  <li>• Egyptian numbers: 01111447286 → +201111447286</li>
                  <li>• International: Include country code (e.g., +44 for UK)</li>
                  <li>• WhatsApp will open with pre-filled message</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={5}
              className="resize-none"
              disabled={isSending}
            />
          </div>

          {/* Progress Section */}
          {isSending && (
            <div className="space-y-3 rounded-lg bg-muted/30 p-4 border">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {processedNumbers} / {totalNumbers} numbers
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Batch {currentBatch} of {totalBatches}</span>
                  <span>{progressPercentage.toFixed(1)}% complete</span>
                </div>
              </div>

              {/* Status */}
              {currentStatus && (
                <div className="text-sm">
                  <p className="font-medium text-foreground">Status:</p>
                  <p className="text-muted-foreground">{currentStatus}</p>
                </div>
              )}

              {/* Countdown Timer */}
              {countdown > 0 && (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                    <span className="font-mono text-sm font-medium text-primary">
                      Next batch in: {formatCountdown(countdown)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex flex-col gap-3">
            {/* Selection Info */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {selectedCount > 0 ? (
                  <>
                    Ready to send to{" "}
                    <span className="font-semibold text-foreground">
                      {selectedCount} contact{selectedCount > 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({totalBatches} batch{totalBatches > 1 ? "es" : ""})
                    </span>
                  </>
                ) : (
                  "Select contacts to send message"
                )}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {/* Export and Quick Actions */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={exportToExcel}
                  disabled={selectedContacts.length === 0}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export to Excel
                </Button>
                <Button
                  onClick={openWhatsAppWeb}
                  variant="outline"
                  className="flex-1"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open WhatsApp Web
                </Button>
              </div>

              {/* Main Action Buttons */}
              <div className="flex flex-col gap-2 sm:flex-row">
                {!isSending ? (
                  <Button
                    onClick={handleStart}
                    disabled={selectedCount === 0 || !message.trim()}
                    className="gradient-whatsapp text-whatsapp-foreground"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Start Automated Sending
                  </Button>
                ) : (
                  <>
                    {!isPaused ? (
                      <Button
                        onClick={handlePause}
                        variant="outline"
                        className="flex-1"
                      >
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </Button>
                    ) : (
                      <Button
                        onClick={handleResume}
                        variant="outline"
                        className="flex-1"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Resume
                      </Button>
                    )}
                    <Button
                      onClick={handleStop}
                      variant="destructive"
                      className="flex-1"
                    >
                      <Square className="mr-2 h-4 w-4" />
                      Stop Campaign
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Start Confirmation Dialog */}
      <AlertDialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start Automated WhatsApp Campaign?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will automatically open WhatsApp chats for <strong>{selectedCount}</strong> contacts in batches of <strong>25</strong>.</p>
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium mb-2">Campaign Details:</p>
                <ul className="text-xs space-y-1">
                  <li>• Total batches: {totalBatches}</li>
                  <li>• Delay between chats: 1.5 seconds</li>
                  <li>• Delay between batches: 5 minutes</li>
                  <li>• Estimated time: ~{Math.ceil((totalBatches - 1) * 5 + (totalNumbers * 1.5) / 60)} minutes</li>
                </ul>
              </div>
              <p className="text-amber-600 font-medium">⚠️ You must manually send each message in WhatsApp.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStart} className="gradient-whatsapp text-whatsapp-foreground">
              Start Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
