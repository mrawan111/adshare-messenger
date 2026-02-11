import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { AddContactForm } from "@/components/contacts/AddContactForm";
import { ContactTable } from "@/components/contacts/ContactTable";
import { ContactGroups } from "@/components/contacts/ContactGroups";
import { ExcelContactImporter } from "@/components/contacts/ExcelContactImporter";
import { ScheduledMessageComposer } from "@/components/automation/ScheduledMessageComposer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/i18n";

interface Contact {
  id: string;
  name: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
}

export default function WhatsApp() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error(t("whatsapp.accessDenied"));
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Contact[];
    },
    enabled: isAdmin,
  });

  const addContactMutation = useMutation({
    mutationFn: async ({ name, phoneNumber }: { name: string; phoneNumber: string }) => {
      const { error } = await supabase.from("contacts").insert([{
        name,
        phone_number: phoneNumber,
      }] as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contacts"] }); toast.success(t("whatsapp.contactAdded")); },
    onError: () => { toast.error(t("whatsapp.contactAddFailed")); },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from("contacts").delete().eq("id", id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contacts"] }); setSelectedIds(new Set()); toast.success(t("whatsapp.contactDeleted")); },
    onError: (error) => { toast.error(t("whatsapp.contactDeleteFailed") + ": " + error.message); },
  });

  const importContactsMutation = useMutation({
    mutationFn: async (contactsToImport: Array<{ name: string; phone_number: string }>) => {
      const phoneNumbers = contactsToImport.map(c => c.phone_number);
      const { data: existingContacts, error: checkError } = await supabase
        .from("contacts")
        .select("phone_number")
        .in("phone_number", phoneNumbers);
      if (checkError) throw checkError;

      const existingPhoneNumbers = new Set((existingContacts as unknown as Array<{ phone_number: string }>)?.map(c => c.phone_number) || []);
      const newContacts = contactsToImport.filter(c => !existingPhoneNumbers.has(c.phone_number));

      if (newContacts.length === 0) return [];

      const { data, error } = await supabase
        .from("contacts")
        .insert(newContacts as any)
        .select();

      if (error) throw error;
      return (data || []) as unknown as Contact[];
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      const successCount = data?.length || 0;
      const duplicateCount = variables.length - successCount;
      if (successCount > 0) {
        toast.success(t("whatsapp.importSuccess", { count: successCount, duplicateCount }));
      } else {
        toast.warning(t("whatsapp.importWarning"));
      }
    },
    onError: (error) => { toast.error(t("whatsapp.importError") + ": " + error.message); },
  });

  const selectedPhoneNumbers = useMemo(() => contacts.filter((c) => selectedIds.has(c.id)).map((c) => c.phone_number), [contacts, selectedIds]);
  const selectedContacts = useMemo(() => contacts.filter((c) => selectedIds.has(c.id)), [contacts, selectedIds]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) { next.delete(id); } else { next.add(id); } return next; });
  };
  const handleSelectAll = () => { setSelectedIds(new Set(contacts.map((c) => c.id))); };
  const handleDeselectAll = () => { setSelectedIds(new Set()); };

  if (authLoading) {
    return (<Layout><div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></Layout>);
  }
  if (!isAdmin) return null;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">{t("whatsapp.messaging")}</h1>
        <p className="mt-1 text-muted-foreground">{t("whatsapp.messagingSubtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AddContactForm onAdd={(name, phoneNumber) => addContactMutation.mutate({ name, phoneNumber })} />
          <ExcelContactImporter onContactsImported={(c) => importContactsMutation.mutate(c)} />
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-display">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Contacts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">{[...Array(3)].map((_, i) => (<div key={i} className="h-12 animate-pulse rounded bg-muted" />))}</div>
                ) : (
                  <ContactTable contacts={contacts} selectedIds={selectedIds} onToggleSelect={handleToggleSelect} onSelectAll={handleSelectAll} onDeselectAll={handleDeselectAll} onDelete={(id) => deleteContactMutation.mutate(id)} />
                )}
              </CardContent>
            </Card>
            <ContactGroups contacts={contacts} selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
          </div>
        </div>
        <div>
          <ScheduledMessageComposer selectedCount={selectedIds.size} selectedPhoneNumbers={selectedPhoneNumbers} selectedContacts={selectedContacts} allContacts={contacts} />
        </div>
      </div>
    </Layout>
  );
}