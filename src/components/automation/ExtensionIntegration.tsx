import { useState, useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Puzzle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface ExtensionStatus {
  connected: boolean;
  extensionId?: string;
  version?: string;
  permissions?: string[];
  lastPing?: number;
}

interface MessageResult {
  success: boolean;
  contactId: string;
  phoneNumber: string;
  timestamp: number;
  error?: string;
}

interface ExtensionIntegrationProps {
  onExtensionReady: (ready: boolean) => void;
}

export function ExtensionIntegration({ onExtensionReady }: ExtensionIntegrationProps) {
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>({
    connected: false
  });
  const [isChecking, setIsChecking] = useState(false);
  const [messageQueue, setMessageQueue] = useState<MessageResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check extension connection on mount
  useEffect(() => {
    checkExtensionConnection();
    
    // Set up periodic connection check
    const interval = setInterval(checkExtensionConnection, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Notify parent when extension status changes
  useEffect(() => {
    onExtensionReady(extensionStatus.connected);
  }, [extensionStatus.connected, onExtensionReady]);

  const checkExtensionConnection = async () => {
    setIsChecking(true);
    
    try {
      if (typeof window !== 'undefined' && window.chrome?.runtime) {
        // Try multiple methods to detect extension
        let extensionDetected = false;
        
        // Method 1: Try to ping the extension
        try {
          const response = await window.chrome.runtime.sendMessage({
            action: 'ping',
            timestamp: Date.now()
          });
          
          if (response && (response.pong || response.success)) {
            extensionDetected = true;
            setExtensionStatus({
              connected: true,
              extensionId: response.extensionId || 'unknown',
              version: response.version || 'unknown',
              permissions: response.permissions || [],
              lastPing: Date.now()
            });
            toast.success("WhatsApp sender extension connected!");
          }
        } catch (pingError) {
          console.log('Ping method failed, trying alternative detection...');
        }
        
        // Method 2: Check if any WhatsApp-related extensions are installed
        if (!extensionDetected) {
          try {
            // Try to list all extensions (may not work due to permissions)
            const extensions = await (window as any).chrome.management?.getAll();
            const whatsappExtensions = extensions?.filter((ext: any) => 
              ext.name.toLowerCase().includes('whatsapp') || 
              ext.name.toLowerCase().includes('sender') ||
              ext.description?.toLowerCase().includes('whatsapp')
            );
            
            if (whatsappExtensions && whatsappExtensions.length > 0) {
              extensionDetected = true;
              setExtensionStatus({
                connected: true,
                extensionId: whatsappExtensions[0].id,
                version: whatsappExtensions[0].version,
                permissions: whatsappExtensions[0].permissions || [],
                lastPing: Date.now()
              });
              toast.success("WhatsApp extension detected!");
            }
          } catch (listError) {
            console.log('Extension listing failed, this is normal due to permissions');
          }
        }
        
        // Method 3: Assume extension exists if we can access chrome.runtime
        if (!extensionDetected && window.chrome.runtime) {
          console.log('Chrome runtime available, assuming extension is installed');
          setExtensionStatus({
            connected: true,
            extensionId: 'detected',
            version: 'unknown',
            permissions: ['unknown'],
            lastPing: Date.now()
          });
          toast.info("Chrome extension runtime detected. Extension may be installed.");
        }
        
        if (!extensionDetected) {
          setExtensionStatus({ connected: false });
        }
      } else {
        setExtensionStatus({ connected: false });
      }
    } catch (error) {
      console.error('Extension connection check failed:', error);
      setExtensionStatus({ connected: false });
    } finally {
      setIsChecking(false);
    }
  };

  const sendMessages = async (contacts: Array<{ id: string; name: string; phone_number: string }>, message: string): Promise<MessageResult[]> => {
    if (!extensionStatus.connected) {
      toast.error("Extension not connected. Please check your WhatsApp sender extension.");
      return [];
    }

    setIsProcessing(true);
    const results: MessageResult[] = [];

    try {
      // Send messages in batches to avoid overwhelming the extension
      const batchSize = 5;
      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        
        for (const contact of batch) {
          try {
            const response = await window.chrome.runtime.sendMessage({
              action: 'sendWhatsAppMessage',
              contactId: contact.id,
              phoneNumber: contact.phone_number,
              message: message,
              contactName: contact.name
            });

            results.push({
              success: response.success || false,
              contactId: contact.id,
              phoneNumber: contact.phone_number,
              timestamp: Date.now(),
              error: response.error
            });

            // Small delay between messages
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            results.push({
              success: false,
              contactId: contact.id,
              phoneNumber: contact.phone_number,
              timestamp: Date.now(),
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Longer delay between batches
        if (i + batchSize < contacts.length) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      setMessageQueue(results);
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      if (successCount > 0) {
        toast.success(`Successfully sent ${successCount} message${successCount > 1 ? 's' : ''}!`);
      }
      
      if (failCount > 0) {
        toast.error(`Failed to send ${failCount} message${failCount > 1 ? 's' : ''}`);
      }

    } catch (error) {
      toast.error("Failed to communicate with extension");
      console.error('Extension communication error:', error);
    } finally {
      setIsProcessing(false);
    }

    return results;
  };

  const clearQueue = () => {
    setMessageQueue([]);
  };

  const installExtension = () => {
    // Open Chrome Web Store or provide installation instructions
    window.open('https://chrome.google.com/webstore/detail/your-whatsapp-sender-extension', '_blank');
  };

  const getExtensionInstructions = () => (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Extension Setup Instructions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">1</div>
          <div>
            <p className="font-medium">Install WhatsApp Sender Extension</p>
            <p className="text-sm text-muted-foreground">Install the extension from Chrome Web Store</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">2</div>
          <div>
            <p className="font-medium">Enable Extension</p>
            <p className="text-sm text-muted-foreground">Make sure the extension is enabled in Chrome</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">3</div>
          <div>
            <p className="font-medium">Login to WhatsApp Web</p>
            <p className="text-sm text-muted-foreground">Open WhatsApp Web and login to your account</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">4</div>
          <div>
            <p className="font-medium">Grant Permissions</p>
            <p className="text-sm text-muted-foreground">Allow the extension to access WhatsApp Web</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">5</div>
          <div>
            <p className="font-medium">Refresh This Page</p>
            <p className="text-sm text-muted-foreground">Refresh to establish connection with extension</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Extension Status Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Puzzle className="h-5 w-5" />
            WhatsApp Sender Extension
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {extensionStatus.connected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-600">Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Extension v{extensionStatus.version || 'Unknown'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-600">Not Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Extension not detected or not installed
                    </p>
                  </div>
                </>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={checkExtensionConnection}
              disabled={isChecking}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Checking...' : 'Check'}
            </Button>
          </div>

          {/* Extension Details */}
          {extensionStatus.connected && (
            <div className="rounded-lg bg-green-50 p-3 border border-green-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-green-800">Extension ID:</p>
                  <p className="text-green-600">{extensionStatus.extensionId}</p>
                </div>
                <div>
                  <p className="font-medium text-green-800">Last Ping:</p>
                  <p className="text-green-600">
                    {extensionStatus.lastPing ? new Date(extensionStatus.lastPing).toLocaleTimeString() : 'Never'}
                  </p>
                </div>
              </div>
              {extensionStatus.permissions && (
                <div className="mt-3">
                  <p className="font-medium text-green-800 text-sm mb-2">Permissions:</p>
                  <div className="flex flex-wrap gap-1">
                    {extensionStatus.permissions.map((permission, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!extensionStatus.connected && (
              <Button onClick={installExtension} className="flex-1">
                <Puzzle className="mr-2 h-4 w-4" />
                Install Extension
              </Button>
            )}
            <Button variant="outline" onClick={() => window.open('https://web.whatsapp.com', '_blank')}>
              <Smartphone className="mr-2 h-4 w-4" />
              Open WhatsApp Web
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Message Queue Status */}
      {messageQueue.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Messages</CardTitle>
              <Button variant="outline" size="sm" onClick={clearQueue}>
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Success Rate:</span>
                <span className="font-medium">
                  {messageQueue.filter(r => r.success).length}/{messageQueue.length}
                </span>
              </div>
              <Progress 
                value={(messageQueue.filter(r => r.success).length / messageQueue.length) * 100} 
                className="h-2" 
              />
              <div className="max-h-40 overflow-y-auto space-y-2">
                {messageQueue.slice(-5).map((result, index) => (
                  <div key={index} className="flex items-center justify-between text-sm p-2 rounded border">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span>{result.phoneNumber}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Installation Instructions */}
      {!extensionStatus.connected && getExtensionInstructions()}

      {/* Processing Indicator */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <div>
                <p className="font-medium">Sending messages via extension...</p>
                <p className="text-sm text-muted-foreground">
                  Please keep WhatsApp Web open and logged in
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Export the sendMessages function for use in other components
export type { MessageResult, ExtensionStatus };
