import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { AddContactForm } from "@/components/contacts/AddContactForm";
import { ContactTable } from "@/components/contacts/ContactTable";
import { MessageComposer } from "@/components/whatsapp/MessageComposer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function WhatsApp() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Access denied. Admins only.");
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const addContactMutation = useMutation({
    mutationFn: async ({ name, phoneNumber }: { name: string; phoneNumber: string }) => {
      const { error } = await supabase.from("contacts").insert({
        name,
        phone_number: phoneNumber,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact added successfully");
    },
    onError: () => {
      toast.error("Failed to add contact");
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deletedId);
        return next;
      });
      toast.success("Contact deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete contact");
    },
  });

  const selectedPhoneNumbers = useMemo(() => {
    return contacts
      .filter((c) => selectedIds.has(c.id))
      .map((c) => c.phone_number);
  }, [contacts, selectedIds]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(contacts.map((c) => c.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
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
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
          WhatsApp Messaging
        </h1>
        <p className="mt-1 text-muted-foreground">
          Send messages to multiple contacts via WhatsApp Web
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <AddContactForm
            onAdd={(name, phoneNumber) =>
              addContactMutation.mutate({ name, phoneNumber })
            }
          />

          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-display">
                <MessageCircle className="h-5 w-5 text-primary" />
                Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-12 animate-pulse rounded bg-muted"
                    />
                  ))}
                </div>
              ) : (
                <ContactTable
                  contacts={contacts}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={handleDeselectAll}
                  onDelete={(id) => deleteContactMutation.mutate(id)}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <MessageComposer
            selectedCount={selectedIds.size}
            selectedPhoneNumbers={selectedPhoneNumbers}
          />
        </div>
      </div>
    </Layout>
  );
}
