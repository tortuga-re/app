import { AdminSessionGate } from "@/components/admin/AdminSessionGate";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminSessionGate>
      <AdminSidebar>
        {children}
      </AdminSidebar>
    </AdminSessionGate>
  );
}
