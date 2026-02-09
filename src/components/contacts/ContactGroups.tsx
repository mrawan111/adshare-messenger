import { useState, useMemo } from "react";
import { Users, Plus, X, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { t } from "@/i18n";

interface Contact {
  id: string;
  name: string;
  phone_number: string;
}

interface ContactGroup {
  id: string;
  name: string;
  description?: string;
  contact_ids: string[];
  created_at: string;
}

interface ContactGroupsProps {
  contacts: Contact[];
  selectedIds: Set<string>;
  onSelectionChange: (groupIds: Set<string>) => void;
}

export function ContactGroups({ contacts, selectedIds, onSelectionChange }: ContactGroupsProps) {
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [selectedContactsForGroup, setSelectedContactsForGroup] = useState<Set<string>>(new Set());
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("all");

  // Load groups from localStorage
  useState(() => {
    const savedGroups = localStorage.getItem('contactGroups');
    if (savedGroups) {
      try {
        const parsed = JSON.parse(savedGroups);
        setGroups(parsed);
      } catch (error) {
        console.error('Error loading contact groups:', error);
      }
    }
  });

  // Save groups to localStorage
  const saveGroups = (updatedGroups: ContactGroup[]) => {
    localStorage.setItem('contactGroups', JSON.stringify(updatedGroups));
    setGroups(updatedGroups);
  };

  // Filter contacts based on selected group
  const filteredContacts = useMemo(() => {
    if (selectedGroupFilter === "all") {
      return contacts;
    }
    
    const group = groups.find(g => g.id === selectedGroupFilter);
    if (!group) return contacts;
    
    return contacts.filter(contact => group.contact_ids.includes(contact.id));
  }, [contacts, groups, selectedGroupFilter]);

  // Get contacts for a specific group
  const getGroupContacts = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return [];
    
    return contacts.filter(contact => group.contact_ids.includes(contact.id));
  };

  // Create new group
  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      toast.error(t("whatsapp.enterGroupName"));
      return;
    }

    if (selectedContactsForGroup.size === 0) {
      toast.error(t("whatsapp.selectContactsForGroupError"));
      return;
    }

    const newGroup: ContactGroup = {
      id: Date.now().toString(),
      name: newGroupName.trim(),
      description: newGroupDescription.trim(),
      contact_ids: Array.from(selectedContactsForGroup),
      created_at: new Date().toISOString()
    };

    saveGroups([...groups, newGroup]);
    
    // Reset form
    setNewGroupName("");
    setNewGroupDescription("");
    setSelectedContactsForGroup(new Set());
    setShowCreateDialog(false);
    
    toast.success(t("whatsapp.groupCreatedSuccess", { name: newGroup.name }));
  };

  // Update existing group
  const handleUpdateGroup = () => {
    if (!editingGroup || !newGroupName.trim()) {
      toast.error(t("whatsapp.enterGroupName"));
      return;
    }

    const updatedGroups = groups.map(group => 
      group.id === editingGroup.id 
        ? {
            ...group,
            name: newGroupName.trim(),
            description: newGroupDescription.trim(),
            contact_ids: Array.from(selectedContactsForGroup)
          }
        : group
    );

    saveGroups(updatedGroups);
    
    // Reset form
    setNewGroupName("");
    setNewGroupDescription("");
    setSelectedContactsForGroup(new Set());
    setEditingGroup(null);
    setShowEditDialog(false);
    
    toast.success(t("whatsapp.groupUpdatedSuccess", { name: newGroupName }));
  };

  // Delete group
  const handleDeleteGroup = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    if (confirm(t("whatsapp.deleteGroupConfirm", { name: group.name }))) {
      saveGroups(groups.filter(g => g.id !== groupId));
      toast.success(t("whatsapp.groupDeleted", { name: group.name }));
    }
  };

  // Select all contacts in a group
  const handleSelectGroup = (groupId: string) => {
    const groupContacts = getGroupContacts(groupId);
    const newSelection = new Set(selectedIds);
    
    groupContacts.forEach(contact => {
      newSelection.add(contact.id);
    });
    
    onSelectionChange(newSelection);
  };

  // Open edit dialog
  const handleEditGroup = (group: ContactGroup) => {
    setEditingGroup(group);
    setNewGroupName(group.name);
    setNewGroupDescription(group.description || "");
    setSelectedContactsForGroup(new Set(group.contact_ids));
    setShowEditDialog(true);
  };

  // Toggle contact selection for group creation/editing
  const toggleContactForGroup = (contactId: string) => {
    setSelectedContactsForGroup(prev => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-display">
          <Users className="h-5 w-5 text-primary" />
          {t("whatsapp.contactGroups")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Group Filter */}
        <div className="space-y-2">
          <Label>{t("whatsapp.filterByGroup")}</Label>
          <Select value={selectedGroupFilter} onValueChange={setSelectedGroupFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("whatsapp.selectGroup")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("whatsapp.allContacts", { count: contacts.length })}</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name} ({group.contact_ids.length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Groups List */}
        {groups.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">{t("whatsapp.yourGroups")}</h3>
            <div className="space-y-2">
              {groups.map((group) => {
                const groupContacts = getGroupContacts(group.id);
                return (
                  <div key={group.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{group.name}</h4>
                          <Badge variant="secondary">{groupContacts.length} {t("whatsapp.contacts")}</Badge>
                        </div>
                        {group.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {group.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {groupContacts.slice(0, 3).map((contact) => (
                            <Badge key={contact.id} variant="outline" className="text-xs">
                              {contact.name}
                            </Badge>
                          ))}
                          {groupContacts.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{groupContacts.length - 3} {t("whatsapp.more", { count: groupContacts.length - 3 })}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelectGroup(group.id)}
                        >
                          {t("whatsapp.selectAll")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditGroup(group)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteGroup(group.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Create Group Button */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              {t("whatsapp.createNewGroup")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("whatsapp.createContactGroup")}</DialogTitle>
              <DialogDescription>
                {t("whatsapp.createGroupDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">{t("whatsapp.groupName")}</Label>
                <Input
                  id="group-name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder={t("whatsapp.groupNamePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-description">{t("whatsapp.groupDescription")}</Label>
                <Input
                  id="group-description"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder={t("whatsapp.groupDescriptionPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("whatsapp.selectContactsForGroup")}</Label>
                <div className="max-h-60 overflow-y-auto rounded-lg border p-3">
                  <div className="space-y-2">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`contact-${contact.id}`}
                          checked={selectedContactsForGroup.has(contact.id)}
                          onCheckedChange={() => toggleContactForGroup(contact.id)}
                        />
                        <Label
                          htmlFor={`contact-${contact.id}`}
                          className="flex-1 text-sm font-normal cursor-pointer"
                        >
                          {contact.name} - {contact.phone_number}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedContactsForGroup.size} {t("whatsapp.contactsSelected", { count: selectedContactsForGroup.size })}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                {t("whatsapp.cancel")}
              </Button>
              <Button onClick={handleCreateGroup}>
                {t("whatsapp.createGroup")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Group Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("whatsapp.editGroup")}</DialogTitle>
              <DialogDescription>
                {t("whatsapp.updateGroupDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-group-name">{t("whatsapp.groupName")}</Label>
                <Input
                  id="edit-group-name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder={t("whatsapp.groupNamePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-group-description">{t("whatsapp.groupDescription")}</Label>
                <Input
                  id="edit-group-description"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder={t("whatsapp.groupDescriptionPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("whatsapp.selectContactsForGroup")}</Label>
                <div className="max-h-60 overflow-y-auto rounded-lg border p-3">
                  <div className="space-y-2">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-contact-${contact.id}`}
                          checked={selectedContactsForGroup.has(contact.id)}
                          onCheckedChange={() => toggleContactForGroup(contact.id)}
                        />
                        <Label
                          htmlFor={`edit-contact-${contact.id}`}
                          className="flex-1 text-sm font-normal cursor-pointer"
                        >
                          {contact.name} - {contact.phone_number}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedContactsForGroup.size} {t("whatsapp.contactsSelected", { count: selectedContactsForGroup.size })}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                {t("whatsapp.cancel")}
              </Button>
              <Button onClick={handleUpdateGroup}>
                {t("whatsapp.updateGroup")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
