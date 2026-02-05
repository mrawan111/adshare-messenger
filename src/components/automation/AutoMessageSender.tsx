import { useState, useEffect, useRef } from "react";
import { Send, MessageCircle, AlertTriangle, Play, Pause, Square, Zap, Settings, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ExtensionIntegration } from "./ExtensionIntegration";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  phone_number: string;
}

interface AutoMessageSenderProps {
  selectedCount: number;
  selectedPhoneNumbers: string[];
  selectedContacts: Contact[];
  allContacts: Contact[];
}

// Configuration
const BATCH_SIZE = 10; // Smaller batches for better control
const DELAY_BETWEEN_MESSAGES = 2000; // 2 seconds between messages
const DELAY_BETWEEN_BATCHES = 3 * 60 * 1000; // 3 minutes between batches
const MESSAGE_SEND_TIMEOUT = 5000; // 5 seconds timeout for message sending

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const formatPhoneNumber = (phoneNumber: string): string => {
  const cleaned = phoneNumber.replace(/\D/g, "");
  
  if (cleaned.startsWith('01')) {
    return cleaned.startsWith('20') ? cleaned : `20${cleaned}`;
  }
  
  if (cleaned.startsWith('20')) {
    return cleaned;
  }
  
  return cleaned;
};

export function AutoMessageSender({ selectedCount, selectedPhoneNumbers, selectedContacts, allContacts }: AutoMessageSenderProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [sendMethod, setSendMethod] = useState("popup");
  const [messageDelay, setMessageDelay] = useState(2000);
  const [batchDelay, setBatchDelay] = useState(3);
  const [extensionReady, setExtensionReady] = useState(false);
  
  // Progress tracking
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [processedNumbers, setProcessedNumbers] = useState(0);
  const [totalNumbers, setTotalNumbers] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [currentStatus, setCurrentStatus] = useState("");
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  
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

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Method 1: Open WhatsApp chat (existing method)
  const openWhatsAppChat = async (phoneNumber: string, message: string): Promise<boolean> => {
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      if (!formattedPhone || formattedPhone.length < 12) {
        console.error(`Invalid phone number: ${phoneNumber}`);
        return false;
      }
      
      const encodedMessage = encodeURIComponent(message);
      const url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
      
      const newWindow = window.open(url, "_blank");
      
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

  // Method 2: Enhanced WhatsApp Web automation with multiple approaches
  const sendWhatsAppMessage = async (phoneNumber: string, message: string): Promise<boolean> => {
    try {
      console.log('🚀 Starting sendWhatsAppMessage for:', phoneNumber);
      
      const formattedPhone = formatPhoneNumber(phoneNumber);
      console.log('📱 Formatted phone number:', formattedPhone);
      
      if (!formattedPhone || formattedPhone.length < 12) {
        console.error(`❌ Invalid phone number: ${phoneNumber} -> ${formattedPhone}`);
        return false;
      }

      // Try different methods in order of preference
      const methods = [
        { name: 'Chrome Extension', func: tryChromeExtension },
        { name: 'WhatsApp Web URL', func: tryWhatsAppWebURL },
        { name: 'WhatsApp Mobile URL', func: tryWhatsAppMobileURL }
      ];

      for (const method of methods) {
        console.log(`🔄 Trying ${method.name}...`);
        try {
          const result = await method.func(phoneNumber, message, formattedPhone);
          if (result) {
            console.log(`✅ ${method.name} succeeded!`);
            toast.success(`Message sent via ${method.name}`);
            return true;
          }
        } catch (error) {
          console.log(`❌ ${method.name} failed:`, error.message);
          continue;
        }
      }

      console.log('❌ All methods failed');
      toast.error("All auto-send methods failed. Please send manually.");
      return false;

    } catch (error) {
      console.error('❌ Error in sendWhatsAppMessage:', error);
      toast.error("Failed to send message");
      return false;
    }
  };

  // Method 2a: Try Chrome Extension (if available)
  const tryChromeExtension = async (phoneNumber: string, message: string, formattedPhone: string): Promise<boolean> => {
    if (typeof window !== 'undefined' && window.chrome?.tabs && window.chrome?.scripting) {
      console.log('🔍 Chrome APIs available, trying extension method...');
      
      const tabs = await window.chrome.tabs.query({ url: "*://web.whatsapp.com/*" });
      
      if (tabs.length > 0) {
        const tab = tabs[0];
        await window.chrome.tabs.update(tab.id, { active: true });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const results = await window.chrome.scripting?.executeScript({
          target: { tabId: tab.id },
          func: (phone: string, msg: string) => {
            return new Promise((resolve) => {
              try {
                // Enhanced automation script
                const sendButton = document.querySelector('[data-testid="send"]');
                const messageBox = document.querySelector('[contenteditable="true"][data-testid="conversation-compose-box-input"]');
                
                if (messageBox && sendButton) {
                  // Clear any existing content
                  (messageBox as HTMLElement).focus();
                  messageBox.textContent = '';
                  
                  // Type the message
                  messageBox.textContent = msg;
                  
                  // Trigger input events
                  messageBox.dispatchEvent(new Event('input', { bubbles: true }));
                  messageBox.dispatchEvent(new Event('change', { bubbles: true }));
                  
                  // Wait a moment for the message to be processed
                  setTimeout(() => {
                    // Check if send button is enabled
                    if (!(sendButton as HTMLButtonElement).hasAttribute('disabled') && 
                        !(sendButton as HTMLButtonElement).classList.contains('disabled')) {
                      // Click send button
                      (sendButton as HTMLElement).click();
                      
                      // Wait for message to send
                      setTimeout(() => {
                        // Check if message was sent by looking for sent message indicators
                        const sentMessages = document.querySelectorAll('[data-testid="msg-container"]');
                        if (sentMessages.length > 0) {
                          resolve(true);
                        } else {
                          resolve(false);
                        }
                      }, 2000);
                    } else {
                      console.log('Send button is disabled');
                      resolve(false);
                    }
                  }, 1500);
                } else {
                  console.log('Message box or send button not found');
                  // Try alternative selectors
                  const altMessageBox = document.querySelector('div[contenteditable="true"]');
                  const altSendButton = document.querySelector('button[data-testid="send"]');
                  
                  if (altMessageBox && altSendButton) {
                    (altMessageBox as HTMLElement).focus();
                    altMessageBox.textContent = msg;
                    altMessageBox.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    setTimeout(() => {
                      if (!(altSendButton as HTMLButtonElement).hasAttribute('disabled')) {
                        (altSendButton as HTMLElement).click();
                        setTimeout(() => resolve(true), 2000);
                      } else {
                        resolve(false);
                      }
                    }, 1500);
                  } else {
                    resolve(false);
                  }
                }
              } catch (error) {
                console.error('Error in automation script:', error);
                resolve(false);
              }
            });
          },
          args: [formattedPhone, message]
        });
        
        return results?.[0]?.result || false;
      } else {
        console.log('No WhatsApp Web tabs found');
      }
    }
    return false;
  };

  // Method 2b: WhatsApp Web URL with auto-send attempt
  const tryWhatsAppWebURL = async (phoneNumber: string, message: string, formattedPhone: string): Promise<boolean> => {
    const encodedMessage = encodeURIComponent(message);
    const url = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
    
    const newWindow = window.open(url, "_blank");
    
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      console.error('Failed to open WhatsApp Web window');
      return false;
    }
    
    // Wait for page to load and try auto-send
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    try {
      // Try to send the message using various methods
      let messageSent = false;
      
      // Method 1: Try to inject script to send message
      try {
        const results = await new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            try {
              newWindow.postMessage({
                type: 'sendWhatsAppMessage',
                message: message
              }, '*');
            } catch (e) {
              // Ignore cross-origin errors
            }
          }, 1000);
          
          // Stop trying after 10 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve(false);
          }, 10000);
        });
        
        if (results) {
          messageSent = true;
        }
      } catch (error) {
        console.log('Script injection method failed:', error);
      }
      
      // Method 2: Try keyboard simulation
      if (!messageSent) {
        try {
          newWindow.focus();
          
          // Try to send Enter key event
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          });
          
          newWindow.postMessage({
            type: 'keydown',
            key: 'Enter',
            code: 'Enter',
            keyCode: 13
          }, '*');
          
          // Also try Ctrl+Enter as alternative
          setTimeout(() => {
            newWindow.postMessage({
              type: 'keydown',
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              ctrlKey: true
            }, '*');
          }, 500);
          
          messageSent = true;
        } catch (error) {
          console.log('Keyboard simulation failed:', error);
        }
      }
      
      // Wait a bit to see if message was sent
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Close the window after attempting to send
      try {
        newWindow.close();
      } catch (e) {
        // Window might already be closed
      }
      
      return messageSent;
    } catch (error) {
      console.error('Error in tryWhatsAppWebURL:', error);
      return false;
    }
  };

  // Method 2c: WhatsApp Mobile URL (opens mobile app)
  const tryWhatsAppMobileURL = async (phoneNumber: string, message: string, formattedPhone: string): Promise<boolean> => {
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    
    const newWindow = window.open(url, "_blank");
    
    return !!(newWindow && !newWindow.closed);
  };

  // Method 3: Enhanced extension approach with proper integration
  const sendViaExtension = async (phoneNumber: string, message: string, contactId?: string, contactName?: string): Promise<boolean> => {
    try {
      if (typeof window !== 'undefined' && window.chrome?.runtime && extensionReady) {
        // Try to communicate with browser extension
        const response = await window.chrome.runtime.sendMessage({
          action: 'sendWhatsAppMessage',
          phoneNumber: formatPhoneNumber(phoneNumber),
          message: message,
          contactId: contactId,
          contactName: contactName
        });
        
        return response?.success || false;
      } else {
        // Extension not available, fall back to other methods
        toast.info("Extension not ready. Using fallback method.");
        return await sendWhatsAppMessage(phoneNumber, message);
      }
    } catch (error) {
      console.error('Extension method failed:', error);
      return await sendWhatsAppMessage(phoneNumber, message);
    }
  };

  // Main automation function
  const startAutomation = async () => {
    automationRef.current = true;
    setIsSending(true);
    setIsPaused(false);
    setSuccessCount(0);
    setFailCount(0);
    
    const numbers = [...selectedPhoneNumbers];
    let processed = 0;

    // Process in batches
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      if (!automationRef.current) break;

      while (isPaused && automationRef.current) {
        setCurrentStatus("Paused - Click Resume to continue");
        await sleep(1000);
      }

      if (!automationRef.current) break;

      const startIndex = batchIndex * BATCH_SIZE;
      const endIndex = Math.min(startIndex + BATCH_SIZE, numbers.length);
      const batch = numbers.slice(startIndex, endIndex);

      setCurrentBatch(batchIndex + 1);
      setCurrentStatus(`Processing batch ${batchIndex + 1} of ${totalBatches}`);

      // Process current batch
      for (let i = 0; i < batch.length; i++) {
        if (!automationRef.current) break;

        while (isPaused && automationRef.current) {
          await sleep(1000);
        }

        if (!automationRef.current) break;

        const phoneNumber = batch[i];
        const contact = selectedContacts.find(c => c.phone_number === phoneNumber);
        const contactName = contact?.name || phoneNumber;
        
        setCurrentStatus(`Sending to ${contactName}...`);

        const success = await sendWhatsAppMessage(phoneNumber, message);
        
        console.log(`🔍 Message send result for ${contactName}:`, success);
        
        if (success) {
          setSuccessCount(prev => prev + 1);
          toast.success(`Message sent to ${contactName}`);
        } else {
          setFailCount(prev => prev + 1);
          toast.error(`Failed to send message to ${contactName}`);
        }
        
        processed++;
        setProcessedNumbers(processed);

        // Delay between messages
        if (i < batch.length - 1) {
          await sleep(messageDelay);
        }
      }

      // Check if this was the last batch
      if (batchIndex < totalBatches - 1 && automationRef.current) {
        setCurrentStatus(`Batch ${batchIndex + 1} completed. Waiting ${batchDelay} minutes...`);
        
        // Start countdown for batch delay
        let remainingDelay = batchDelay * 60;
        setCountdown(remainingDelay);

        const batchDelayStart = Date.now();
        while (Date.now() - batchDelayStart < (batchDelay * 60 * 1000) && automationRef.current) {
          const elapsed = Math.floor((Date.now() - batchDelayStart) / 1000);
          remainingDelay = Math.max(0, (batchDelay * 60) - elapsed);
          setCountdown(remainingDelay);
          
          while (isPaused && automationRef.current) {
            await sleep(1000);
          }
          
          if (!automationRef.current) break;
          await sleep(1000);
        }
        setCountdown(0);
      }
    }

    // Final status
    if (automationRef.current) {
      setCurrentStatus("Campaign completed!");
      toast.success(`Campaign completed! ${successCount} sent${failCount > 0 ? ` (${failCount} failed)` : ''}`);
    } else {
      setCurrentStatus("Campaign stopped");
      toast.info("Campaign stopped by user");
    }

    setIsSending(false);
    automationRef.current = false;
    
    setTimeout(() => {
      setCurrentBatch(0);
      setProcessedNumbers(0);
      setCurrentStatus("");
      setSuccessCount(0);
      setFailCount(0);
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
    setIsSending(false);
    setIsPaused(false);
    setCountdown(0);
    setCurrentStatus("Stopping...");
  };

  const progressPercentage = totalNumbers > 0 ? (processedNumbers / totalNumbers) * 100 : 0;

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <Zap className="h-5 w-5 text-primary" />
            Automatic Message Sender
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Settings Section */}
          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border p-3">
              <div className="space-y-2">
                <Label>Send Method</Label>
                <Select value={sendMethod} onValueChange={setSendMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popup">Open Chat Tabs</SelectItem>
                    <SelectItem value="web">Auto Send (WhatsApp Web)</SelectItem>
                    <SelectItem value="extension" disabled={!extensionReady}>Browser Extension {extensionReady ? "" : "(Not Ready)"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="message-delay">Message Delay (sec)</Label>
                  <Input
                    id="message-delay"
                    type="number"
                    value={messageDelay / 1000}
                    onChange={(e) => setMessageDelay(parseInt(e.target.value) * 1000)}
                    min="1"
                    max="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch-delay">Batch Delay (min)</Label>
                  <Input
                    id="batch-delay"
                    type="number"
                    value={batchDelay}
                    onChange={(e) => setBatchDelay(parseInt(e.target.value))}
                    min="1"
                    max="10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Extension Integration */}
          <ExtensionIntegration onExtensionReady={setExtensionReady} />

          {/* Warning Section */}
          <div className="rounded-lg bg-amber-50 p-3 border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">⚠️ Important Notice:</p>
                <ul className="text-xs space-y-1">
                  <li>• Automatic sending requires browser extensions or specific setup</li>
                  <li>• WhatsApp Web automation sends messages directly (no manual sending needed)</li>
                  <li>• Auto send method may trigger WhatsApp's anti-spam protection</li>
                  <li>• Use responsibly and with appropriate delays to avoid account issues</li>
                  {extensionReady && <li>• ✅ Extension detected and ready for automatic sending</li>}
                  {!extensionReady && <li>• ⚠️ Install WhatsApp sender extension for automatic sending</li>}
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
                    {processedNumbers} / {totalNumbers} messages
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Batch {currentBatch} of {totalBatches}</span>
                  <span>{progressPercentage.toFixed(1)}% complete</span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="text-green-600">✓ {successCount} sent</span>
                  <span className="text-red-600">✗ {failCount} failed</span>
                </div>
              </div>

              {currentStatus && (
                <div className="text-sm">
                  <p className="font-medium text-foreground">Status:</p>
                  <p className="text-muted-foreground">{currentStatus}</p>
                </div>
              )}

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
          <div className="space-y-3">
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

            {!isSending ? (
              <Button
                onClick={handleStart}
                disabled={selectedCount === 0 || !message.trim()}
                className="w-full"
              >
                <Send className="mr-2 h-4 w-4" />
                Start Automatic Sending
              </Button>
            ) : (
              <div className="flex gap-2">
                {!isPaused ? (
                  <Button onClick={handlePause} variant="outline" className="flex-1">
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </Button>
                ) : (
                  <Button onClick={handleResume} variant="outline" className="flex-1">
                    <Play className="mr-2 h-4 w-4" />
                    Resume
                  </Button>
                )}
                <Button onClick={handleStop} variant="destructive" className="flex-1">
                  <Square className="mr-2 h-4 w-4" />
                  Stop Campaign
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Start Confirmation Dialog */}
      <AlertDialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start Automatic Message Campaign?</AlertDialogTitle>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>This will attempt to automatically send messages to <strong>{selectedCount}</strong> contacts.</p>
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium mb-2">Campaign Settings:</p>
                <ul className="text-xs space-y-1">
                  <li>• Send method: {sendMethod === "popup" ? "Open Chat Tabs" : sendMethod === "web" ? "Auto Send (WhatsApp Web)" : "Browser Extension"}</li>
                  <li>• Total batches: {totalBatches}</li>
                  <li>• Delay between messages: {messageDelay / 1000} seconds</li>
                  <li>• Delay between batches: {batchDelay} minutes</li>
                  <li>• Estimated time: ~{Math.ceil((totalBatches - 1) * batchDelay + (totalNumbers * messageDelay) / 60000)} minutes</li>
                </ul>
              </div>
              {sendMethod === "web" && (
                <p className="text-red-600 font-medium">⚠️ Messages will be sent automatically. Use with caution to avoid account restrictions.</p>
              )}
              {sendMethod === "extension" && (
                <p className="text-amber-600 font-medium">⚠️ Automatic sending may not work due to WhatsApp restrictions.</p>
              )}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStart}>
              Start Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
