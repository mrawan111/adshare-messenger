import { toast } from "sonner";
import { t } from "@/i18n";
import { Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Contact {
  id: string;
  name: string;
  phone_number: string;
}

interface ContactTableProps {
  contacts: Contact[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: (id: string) => void;
}

export function ContactTable({
  contacts,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onDelete,
}: ContactTableProps) {
  const allSelected = contacts.length > 0 && selectedIds.size === contacts.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < contacts.length;

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <h3 className="mb-1 font-display text-base font-semibold text-foreground">
          {t("whatsapp.noContactsYet")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("whatsapp.addContactsToMessage")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSelectAll}
          disabled={allSelected}
          className="text-xs"
        >
          {t("whatsapp.selectAll")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDeselectAll}
          disabled={selectedIds.size === 0}
          className="text-xs"
        >
          {t("whatsapp.deselectAll")}
        </Button>
        {selectedIds.size > 0 && (
          <span className="ml-2 text-sm text-muted-foreground">
            {selectedIds.size} {t("whatsapp.selected")}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected;
                    }
                  }}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onSelectAll();
                    } else {
                      onDeselectAll();
                    }
                  }}
                />
              </TableHead>
              <TableHead>{t("whatsapp.name")}</TableHead>
              <TableHead>{t("whatsapp.phoneNumber")}</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow
                key={contact.id}
                className={
                  selectedIds.has(contact.id)
                    ? "bg-primary/5"
                    : "hover:bg-muted/30"
                }
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(contact.id)}
                    onCheckedChange={() => onToggleSelect(contact.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{contact.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {contact.phone_number}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(contact.id)}
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
