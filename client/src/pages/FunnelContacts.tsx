import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Download, FileSpreadsheet, FileText, Users, RefreshCw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FunnelContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  dateAdded: string;
}

export default function FunnelContacts() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [contacts, setContacts] = useState<FunnelContact[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const [isAdminCheckDone, setIsAdminCheckDone] = useState(false);

  // Restrict this page to admin/owner/developer only; redirect others to dashboard
  useEffect(() => {
    const savedProfile = localStorage.getItem("userProfile");
    const role = savedProfile ? (JSON.parse(savedProfile) as { role?: string }).role : "user";
    const isAdmin = role === "admin";
    if (!isAdmin) {
      setLocation("/dashboard");
      return;
    }
    setIsAdminCheckDone(true);
  }, [setLocation]);

  useEffect(() => {
    if (!isAdminCheckDone) return;
    loadContacts();
  }, [isAdminCheckDone]);

  const loadContacts = () => {
    const savedContacts = localStorage.getItem("funnelContacts");
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
    }
  };

  const funnelCurrentProfile = () => {
    const savedProfile = localStorage.getItem("userProfile");
    if (!savedProfile) {
      toast({
        title: "No Profile Found",
        description: "Please complete the User Profile first before funneling contact information.",
        variant: "destructive"
      });
      return;
    }

    const profile = JSON.parse(savedProfile);
    
    if (!profile.firstName || !profile.lastName || !profile.email) {
      toast({
        title: "Incomplete Profile",
        description: "Please fill in at least First Name, Last Name, and Email in the User Profile.",
        variant: "destructive"
      });
      return;
    }

    const existingContact = contacts.find(c => c.email === profile.email);
    if (existingContact) {
      const updatedContacts = contacts.map(c => 
        c.email === profile.email 
          ? {
              ...c,
              firstName: profile.firstName || c.firstName,
              lastName: profile.lastName || c.lastName,
              phone: profile.phone || c.phone,
              address: profile.address || c.address,
              city: profile.city || c.city,
              state: profile.state || c.state,
              zipCode: profile.zipCode || c.zipCode,
            }
          : c
      );
      setContacts(updatedContacts);
      localStorage.setItem("funnelContacts", JSON.stringify(updatedContacts));
      toast({
        title: "Contact Updated",
        description: "Existing contact information has been updated."
      });
    } else {
      const newContact: FunnelContact = {
        id: Date.now().toString(),
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        zipCode: profile.zipCode || "",
        dateAdded: new Date().toLocaleDateString()
      };

      const updatedContacts = [...contacts, newContact];
      setContacts(updatedContacts);
      localStorage.setItem("funnelContacts", JSON.stringify(updatedContacts));
      toast({
        title: "Contact Added",
        description: "Profile information has been funneled to contacts."
      });
    }
  };

  const deleteContact = (id: string) => {
    setContactToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (contactToDelete) {
      const updatedContacts = contacts.filter(c => c.id !== contactToDelete);
      setContacts(updatedContacts);
      localStorage.setItem("funnelContacts", JSON.stringify(updatedContacts));
      toast({
        title: "Contact Removed",
        description: "The contact has been deleted from the funnel."
      });
    }
    setShowDeleteDialog(false);
    setContactToDelete(null);
  };

  const exportToCSV = () => {
    if (contacts.length === 0) {
      toast({
        title: "No Contacts",
        description: "There are no contacts to export.",
        variant: "destructive"
      });
      return;
    }

    const headers = ["First Name", "Last Name", "Email", "Phone", "Address", "City", "State", "Zip Code", "Date Added"];
    const csvContent = [
      headers.join(","),
      ...contacts.map(c => [
        `"${c.firstName}"`,
        `"${c.lastName}"`,
        `"${c.email}"`,
        `"${c.phone}"`,
        `"${c.address}"`,
        `"${c.city}"`,
        `"${c.state}"`,
        `"${c.zipCode}"`,
        `"${c.dateAdded}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `funnel_contacts_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: "Export Complete",
      description: "Contacts exported to CSV (Excel compatible)."
    });
  };

  const exportToWord = () => {
    if (contacts.length === 0) {
      toast({
        title: "No Contacts",
        description: "There are no contacts to export.",
        variant: "destructive"
      });
      return;
    }

    let docContent = "FUNNEL CONTACTS REPORT\n";
    docContent += `Generated: ${new Date().toLocaleDateString()}\n`;
    docContent += "=".repeat(50) + "\n\n";

    contacts.forEach((c, index) => {
      docContent += `CONTACT ${index + 1}\n`;
      docContent += "-".repeat(30) + "\n";
      docContent += `Name: ${c.firstName} ${c.lastName}\n`;
      docContent += `Email: ${c.email}\n`;
      docContent += `Phone: ${c.phone}\n`;
      docContent += `Address: ${c.address}\n`;
      docContent += `City, State, Zip: ${c.city}, ${c.state} ${c.zipCode}\n`;
      docContent += `Date Added: ${c.dateAdded}\n\n`;
    });

    const blob = new Blob([docContent], { type: "text/plain;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `funnel_contacts_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();

    toast({
      title: "Export Complete",
      description: "Contacts exported to text document (Word compatible)."
    });
  };

  // Don't render content until admin check is done (avoids flash before redirect)
  if (!isAdminCheckDone) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[200px]" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
              <Users className="h-8 w-8 text-secondary" /> Funnel Contacts
            </h1>
            <p className="text-muted-foreground">Collect and store user profile information for future contact.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={funnelCurrentProfile} className="bg-secondary text-secondary-foreground" data-testid="button-funnel-profile">
              <RefreshCw className="mr-2 h-4 w-4" /> Funnel Current Profile
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Collected Contacts</CardTitle>
              <CardDescription data-testid="text-contact-count">
                {contacts.length} contact{contacts.length !== 1 ? 's' : ''} in funnel
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToCSV} disabled={contacts.length === 0} data-testid="button-export-csv">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
              </Button>
              <Button variant="outline" onClick={exportToWord} disabled={contacts.length === 0} data-testid="button-export-word">
                <FileText className="mr-2 h-4 w-4" /> Export Word
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-lg" data-testid="empty-state-contacts">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-primary mb-2" data-testid="text-empty-title">No Contacts in Funnel</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto" data-testid="text-empty-description">
                  Complete a User Profile, then click "Funnel Current Profile" to add contact information here.
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Date Added</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id} data-testid={`row-contact-${contact.id}`}>
                        <TableCell className="font-medium" data-testid={`text-name-${contact.id}`}>
                          {contact.firstName} {contact.lastName}
                        </TableCell>
                        <TableCell data-testid={`text-email-${contact.id}`}>{contact.email}</TableCell>
                        <TableCell data-testid={`text-phone-${contact.id}`}>{contact.phone || "-"}</TableCell>
                        <TableCell data-testid={`text-location-${contact.id}`}>
                          {contact.city && contact.state ? `${contact.city}, ${contact.state}` : "-"}
                        </TableCell>
                        <TableCell data-testid={`text-date-${contact.id}`}>{contact.dateAdded}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => deleteContact(contact.id)}
                            data-testid={`button-delete-contact-${contact.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this contact from the funnel? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground" data-testid="button-confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
