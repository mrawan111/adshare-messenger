import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AddContactFormProps {
  onAdd: (name: string, phoneNumber: string) => void;
}

export function AddContactForm({ onAdd }: AddContactFormProps) {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && phoneNumber.trim()) {
      onAdd(name.trim(), phoneNumber.trim());
      setName("");
      setPhoneNumber("");
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-display">
          <UserPlus className="h-5 w-5 text-primary" />
          Add Contact
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full sm:w-auto gradient-primary">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
