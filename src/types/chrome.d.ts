// Chrome Extension API Types
declare global {
  interface Window {
    chrome?: {
      tabs?: {
        query: (query: { url: string }) => Promise<Array<{ id: number; url: string; windowId?: number }>>;
        update: (tabId: number, updateProperties: { active: boolean }) => Promise<void>;
      };
      scripting?: {
        executeScript: (injection: {
          target: { tabId: number };
          func: (phone: string, msg: string) => Promise<boolean>;
          args: [string, string];
        }) => Promise<Array<{ result: boolean }>>;
      };
      runtime?: {
        sendMessage: (message: {
          action: string;
          phoneNumber?: string;
          message?: string;
          contactId?: string;
          contactName?: string;
          timestamp?: number;
        }) => Promise<{
          success: boolean;
          pong?: boolean;
          extensionId?: string;
          version?: string;
          permissions?: string[];
          error?: string;
        }>;
      };
    };
  }
}

export {};
