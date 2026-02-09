import { useState, useEffect, useRef, useCallback } from "react";
import { Send, MessageCircle, Info, Pause, Play, Square, AlertTriangle, Download, ExternalLink, Clock, Calendar, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { t, tArray } from "@/i18n";
import * as XLSX from 'xlsx';

interface Contact {
  id: string;
  name: string;
  phone_number: string;
}

interface ScheduledMessage {
  id: string;
  message: string;
  scheduledTime: string;
  selectedContacts: Contact[];
  status: 'pending' | 'running' | 'completed' | 'paused' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  processedCount?: number;
  totalCount?: number;
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
}

interface ScheduledMessageComposerProps {
  selectedCount: number;
  selectedPhoneNumbers: string[];
  selectedContacts: Contact[];
  allContacts: Contact[];
}

// Configuration constants for safety and compliance
const BATCH_SIZE = 25;
const DELAY_BETWEEN_CHATS = 1500;
const DELAY_BETWEEN_BATCHES = 5 * 60 * 1000;

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

// Default message templates
const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: '1',
    name: 'Promotional Message',
    content: 'Hello {name}! 🎉 Special offer just for you! Use code SAVE20 for 20% off. Limited time only!',
    variables: ['name']
  },
  {
    id: '2',
    name: 'Event Invitation',
    content: 'Hi {name}, you\'re invited to our special event! 📅 Join us on {date} at {location}. RSVP now!',
    variables: ['name', 'date', 'location']
  },
  {
    id: '3',
    name: 'Follow-up Message',
    content: 'Hello {name}, just following up on our previous conversation. Is there anything I can help you with?',
    variables: ['name']
  },
  {
    id: '4',
    name: 'Holiday Greeting',
    content: 'Dear {name}, 🎊 Happy Holidays! Wishing you joy and success in the coming year.',
    variables: ['name']
  }
];

export function ScheduledMessageComposer({ selectedCount, selectedPhoneNumbers, selectedContacts, allContacts }: ScheduledMessageComposerProps) {
  const [message, setMessage] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("immediate");
  
  // Progress tracking state
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [processedNumbers, setProcessedNumbers] = useState(0);
  const [totalNumbers, setTotalNumbers] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [currentStatus, setCurrentStatus] = useState("");
  
  const automationRef = useRef<boolean>(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const scheduleRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved scheduled messages from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('scheduledMessages');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setScheduledMessages(parsed);
      } catch (error) {
        console.error('Error loading scheduled messages:', error);
      }
    }
  }, []);

  // Save scheduled messages to localStorage
  useEffect(() => {
    if (scheduledMessages.length > 0) {
      localStorage.setItem('scheduledMessages', JSON.stringify(scheduledMessages));
    }
  }, [scheduledMessages]);

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

  const openWhatsAppChatWithCheck = async (phoneNumber: string, message: string): Promise<boolean> => {
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      if (!formattedPhone || formattedPhone.length < 12) {
        console.error(`Invalid phone number: ${phoneNumber}`);
        return false;
      }
      
      const encodedMessage = encodeURIComponent(message);
      
      // Check if device is mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      
      if (isMobile) {
        // On mobile, use location.href for whatsapp:// protocol to open native app
        const url = `whatsapp://send?phone=${formattedPhone}&text=${encodedMessage}`;
        window.location.href = url;
        return true;
      }
      
      // On desktop, use window.open with wa.me
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

  const personalizeMessage = (template: string, contact: Contact, variables: Record<string, string>) => {
    let personalized = template;
    
    // Replace contact-specific variables
    personalized = personalized.replace(/{name}/g, contact.name);
    personalized = personalized.replace(/{phone}/g, contact.phone_number);
    
    // Replace custom variables
    Object.entries(variables).forEach(([key, value]) => {
      personalized = personalized.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    
    return personalized;
  };

  const executeScheduledMessage = useCallback(async (scheduledMsg: ScheduledMessage) => {
    // Update status to running
    setScheduledMessages(prev => prev.map(msg => 
      msg.id === scheduledMsg.id ? { ...msg, status: 'running' } : msg
    ));

    automationRef.current = true;
    setIsSending(true);
    setIsPaused(false);
    
    const numbers = scheduledMsg.selectedContacts.map(c => c.phone_number);
    let successCount = 0;
    let failCount = 0;
    let processed = 0;

    for (let batchIndex = 0; batchIndex < Math.ceil(numbers.length / BATCH_SIZE); batchIndex++) {
      if (!automationRef.current) break;

      while (isPaused && automationRef.current) {
        setCurrentStatus(t("whatsapp.pausedClickResume"));
        await sleep(1000);
      }

      if (!automationRef.current) break;

      const startIndex = batchIndex * BATCH_SIZE;
      const endIndex = Math.min(startIndex + BATCH_SIZE, numbers.length);
      const batch = numbers.slice(startIndex, endIndex);
      const batchContacts = scheduledMsg.selectedContacts.slice(startIndex, endIndex);

      setCurrentBatch(batchIndex + 1);
      setCurrentStatus(t("whatsapp.processingBatch", { batchNumber: batchIndex + 1 }));

      for (let i = 0; i < batch.length; i++) {
        if (!automationRef.current) break;

        while (isPaused && automationRef.current) {
          await sleep(1000);
        }

        if (!automationRef.current) break;

        const phoneNumber = batch[i];
        const contact = batchContacts[i];
        const personalizedMsg = personalizeMessage(scheduledMsg.message, contact, templateVariables);
        
        setCurrentStatus(t("whatsapp.openingChatFor", { name: contact.name }));

        const success = await openWhatsAppChatWithCheck(phoneNumber, personalizedMsg);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
        
        processed++;
        setProcessedNumbers(processed);

        if (i < batch.length - 1) {
          await sleep(DELAY_BETWEEN_CHATS);
        }
      }

      if (batchIndex < Math.ceil(numbers.length / BATCH_SIZE) - 1 && automationRef.current) {
        setCurrentStatus(t("whatsapp.batchCompleted", { batchNumber: batchIndex + 1 }));
        
        let remainingDelay = DELAY_BETWEEN_BATCHES / 1000;
        setCountdown(remainingDelay);

        const batchDelayStart = Date.now();
        while (Date.now() - batchDelayStart < DELAY_BETWEEN_BATCHES && automationRef.current) {
          const elapsed = Math.floor((Date.now() - batchDelayStart) / 1000);
          remainingDelay = Math.max(0, (DELAY_BETWEEN_BATCHES / 1000) - elapsed);
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

    // Update message status
    const finalStatus = automationRef.current ? 'completed' : 'cancelled';
    setScheduledMessages(prev => prev.map(msg => 
      msg.id === scheduledMsg.id 
        ? { 
            ...msg, 
            status: finalStatus, 
            completedAt: new Date().toISOString(),
            processedCount: processed,
            totalCount: numbers.length
          } 
        : msg
    ));

    if (automationRef.current) {
      toast.success(t("whatsapp.campaignCompleted", { successCount, failCount }));
      setCurrentStatus(t("whatsapp.campaignCompleted", { successCount, failCount }));
    } else {
      setCurrentStatus(t("whatsapp.campaignStopped"));
      toast.info(t("whatsapp.campaignStopped"));
    }

    setIsSending(false);
    automationRef.current = false;
    
    setTimeout(() => {
      setCurrentBatch(0);
      setProcessedNumbers(0);
      setCurrentStatus("");
    }, 3000);
  }, [templateVariables, isPaused]);

  // Check for scheduled messages that need to be sent
  useEffect(() => {
    const checkScheduledMessages = () => {
      const now = new Date();
      const pendingMessages = scheduledMessages.filter(msg => 
        msg.status === 'pending' && new Date(msg.scheduledTime) <= now
      );

      pendingMessages.forEach(msg => {
        executeScheduledMessage(msg);
      });
    };

    const interval = setInterval(checkScheduledMessages, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [scheduledMessages, executeScheduledMessage]);

  const handleScheduleMessage = () => {
    if (!message.trim()) {
      toast.error(t("whatsapp.pleaseEnterMessage"));
      return;
    }

    if (!scheduledTime) {
      toast.error(t("whatsapp.selectScheduledTime"));
      return;
    }

    if (selectedContacts.length === 0) {
      toast.error(t("whatsapp.selectAtLeastOneContact"));
      return;
    }

    const scheduledDate = new Date(scheduledTime);
    const now = new Date();

    if (scheduledDate <= now) {
      toast.error(t("whatsapp.scheduledTimeFuture"));
      return;
    }

    const newScheduledMessage: ScheduledMessage = {
      id: Date.now().toString(),
      message,
      scheduledTime: scheduledDate.toISOString(),
      selectedContacts,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    setScheduledMessages(prev => [...prev, newScheduledMessage]);
    toast.success(t("whatsapp.messageScheduledFor", { time: scheduledDate.toLocaleString() }));
    
    // Reset form
    setMessage("");
    setScheduledTime("");
    setSelectedTemplate("");
    setTemplateVariables({});
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMessage(template.content);
      setSelectedTemplate(templateId);
      
      // Initialize template variables
      const vars: Record<string, string> = {};
      template.variables.forEach(variable => {
        vars[variable] = "";
      });
      setTemplateVariables(vars);
    }
  };

  const handleCancelScheduled = (id: string) => {
    setScheduledMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, status: 'cancelled' } : msg
    ));
    toast.success(t("whatsapp.scheduledMessageCancelled"));
  };

  const handleDeleteScheduled = (id: string) => {
    setScheduledMessages(prev => prev.filter(msg => msg.id !== id));
    toast.success(t("whatsapp.scheduledMessageDeleted"));
  };

  const progressPercentage = totalNumbers > 0 ? (processedNumbers / totalNumbers) * 100 : 0;

  const exportToExcel = () => {
    try {
      const wsData = [
        ['Name', 'Phone Number'],
        ...selectedContacts.map(contact => [contact.name, contact.phone_number])
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Contacts');

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `whatsapp_contacts_${timestamp}.xlsx`;

      XLSX.writeFile(wb, filename);
      toast.success(t("whatsapp.excelFileExported", { filename }));
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error(t("whatsapp.failedToExportExcel"));
    }
  };

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <MessageCircle className="h-5 w-5 text-whatsapp" />
            {t("whatsapp.advancedAutomation")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="immediate">{t("whatsapp.immediate")}</TabsTrigger>
              {/* <TabsTrigger value="scheduled">Scheduled</TabsTrigger> */}
              {/* <TabsTrigger value="templates">Templates</TabsTrigger> */}
            </TabsList>

            <TabsContent value="immediate" className="space-y-4">
              {/* Immediate sending content - similar to original MessageComposer */}
              <div className="space-y-4">


                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      onClick={exportToExcel}
                      disabled={selectedContacts.length === 0}
                      variant="outline"
                      className="flex-1"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {t("whatsapp.exportToExcel")}
                    </Button>
                    <Button
                      onClick={() => {
                        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                        if (isMobile) {
                          window.location.href = 'whatsapp://';
                        } else {
                          window.open('https://web.whatsapp.com', '_blank');
                        }
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {t("whatsapp.openWhatsApp")}
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      onClick={() => window.open('https://chromewebstore.google.com/detail/wasender-bulk-messaging-a/kodbldeoapjomlhbbnlcnhaphfakdhfk', '_blank')}
                      variant="outline"
                      className="flex-1"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {t("whatsapp.installWhatsAppExtension")}
                    </Button>
                  </div>

                  <Button
                    onClick={() => setShowStartDialog(true)}
                    disabled={selectedCount === 0 || !message.trim() || isSending}
                    className="gradient-whatsapp text-whatsapp-foreground"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {t("whatsapp.startAutomatedSending")}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/*
            <TabsContent value="scheduled" className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-time">Schedule Time</Label>
                    <Input
                      id="scheduled-time"
                      type="datetime-local"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduled-message">Message</Label>
                    <Textarea
                      id="scheduled-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message here..."
                      rows={5}
                      className="resize-none"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleScheduleMessage}
                  disabled={!message.trim() || !scheduledTime || selectedContacts.length === 0}
                  className="w-full"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Schedule Message
                </Button>

                {scheduledMessages.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium">Scheduled Messages</h3>
                    <div className="space-y-2">
                      {scheduledMessages.map((msg) => (
                        <div key={msg.id} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant={
                                    msg.status === 'completed'
                                      ? 'default'
                                      : msg.status === 'running'
                                        ? 'secondary'
                                        : msg.status === 'cancelled'
                                          ? 'destructive'
                                          : 'outline'
                                  }
                                >
                                  {msg.status}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(msg.scheduledTime).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm font-medium mb-1">
                                {msg.selectedContacts.length} contacts
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {msg.message}
                              </p>
                              {msg.processedCount && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Progress: {msg.processedCount}/{msg.totalCount}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {msg.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelScheduled(msg.id)}
                                >
                                  Cancel
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteScheduled(msg.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Message Templates</Label>
                  <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTemplate && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Template Variables</Label>
                      {Object.entries(templateVariables).map(([key, value]) => (
                        <div key={key} className="grid grid-cols-2 gap-2">
                          <Label htmlFor={`var-${key}`} className="text-sm">
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </Label>
                          <Input
                            id={`var-${key}`}
                            value={value}
                            onChange={(e) =>
                              setTemplateVariables((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            placeholder={`Enter ${key}`}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <Label>Preview</Label>
                      <div className="rounded-lg border p-3 bg-muted/30">
                        <p className="text-sm">
                          {selectedContacts.length > 0
                            ? personalizeMessage(message, selectedContacts[0], templateVariables)
                            : message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="template-message">Message</Label>
                  <Textarea
                    id="template-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message here... Use {name}, {phone}, or custom variables like {date}"
                    rows={5}
                    className="resize-none"
                  />
                </div>

                <Button
                  onClick={() => {
                    const newTemplate: MessageTemplate = {
                      id: Date.now().toString(),
                      name: `Custom Template ${templates.length + 1}`,
                      content: message,
                      variables: [],
                    };
                    setTemplates((prev) => [...prev, newTemplate]);
                    toast.success("Template saved successfully");
                  }}
                  disabled={!message.trim()}
                  variant="outline"
                  className="w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save as Template
                </Button>
              </div>
            </TabsContent>
            */}
          </Tabs>

          {/* Progress Section */}
          {isSending && (
            <div className="space-y-3 rounded-lg bg-muted/30 p-4 border">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{t("whatsapp.progress")}</span>
                  <span className="text-sm text-muted-foreground">
                    {processedNumbers} / {totalNumbers} {t("whatsapp.numbers")}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("whatsapp.batch")} {currentBatch} {t("whatsapp.of")} {totalBatches}</span>
                  <span>{progressPercentage.toFixed(1)}% {t("whatsapp.complete")}</span>
                </div>
              </div>

              {currentStatus && (
                <div className="text-sm">
                  <p className="font-medium text-foreground">{t("whatsapp.status")}:</p>
                  <p className="text-muted-foreground">{currentStatus}</p>
                </div>
              )}

              {countdown > 0 && (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                    <span className="font-mono text-sm font-medium text-primary">
                      {t("whatsapp.nextBatchIn")} {formatCountdown(countdown)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Control Buttons for running automation */}
          {isSending && (
            <div className="flex gap-2">
              {!isPaused ? (
                <Button onClick={() => setIsPaused(true)} variant="outline" className="flex-1">
                  <Pause className="mr-2 h-4 w-4" />
                  {t("whatsapp.pause")}
                </Button>
              ) : (
                <Button onClick={() => setIsPaused(false)} variant="outline" className="flex-1">
                  <Play className="mr-2 h-4 w-4" />
                  {t("whatsapp.resume")}
                </Button>
              )}
              <Button
                onClick={() => {
                  automationRef.current = false;
                  setIsSending(false);
                }}
                variant="destructive"
                className="flex-1"
              >
                <Square className="mr-2 h-4 w-4" />
                {t("whatsapp.stopCampaign")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start Confirmation Dialog */}
      <AlertDialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("whatsapp.startAutomatedCampaign")}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{t("whatsapp.campaignDescription", { selectedCount, batchSize: 25 })}</p>
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium mb-2">{t("whatsapp.campaignDetails")}</p>
                <ul className="text-xs space-y-1">
                  <li>• {t("whatsapp.totalBatches")}: {totalBatches}</li>
                  <li>• {t("whatsapp.delayBetweenChats")}: 1.5 {t("whatsapp.seconds")}</li>
                  <li>• {t("whatsapp.delayBetweenBatches")}: 5 {t("whatsapp.minutes")}</li>
                  <li>• {t("whatsapp.estimatedTime")}: ~{Math.ceil((totalBatches - 1) * 5 + (totalNumbers * 1.5) / 60)} {t("whatsapp.minutes")}</li>
                </ul>
              </div>
              <p className="text-amber-600 font-medium">{t("whatsapp.manualSendWarning")}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("whatsapp.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowStartDialog(false);
                executeScheduledMessage({
                  id: Date.now().toString(),
                  message,
                  scheduledTime: new Date().toISOString(),
                  selectedContacts,
                  status: 'running',
                  createdAt: new Date().toISOString()
                });
              }} 
              className="gradient-whatsapp text-whatsapp-foreground"
            >
              Start Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
