import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Admin() {
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Admin Panel</h1>
          <p className="text-muted-foreground">System management and user oversight.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground uppercase font-bold">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">56</div>
              <p className="text-xs text-muted-foreground uppercase font-bold">New Signups (Today)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">$12.4k</div>
              <p className="text-xs text-muted-foreground uppercase font-bold">Revenue (MRR)</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>User Management</CardTitle>
            <div className="w-64 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users..." className="pl-8" />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">john.doe@example.com</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell><Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge></TableCell>
                  <TableCell>Dec 01, 2025</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="sm">Edit</Button></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">admin@vaclaim.com</TableCell>
                  <TableCell>Admin</TableCell>
                  <TableCell><Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Active</Badge></TableCell>
                  <TableCell>Nov 15, 2025</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="sm">Edit</Button></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
