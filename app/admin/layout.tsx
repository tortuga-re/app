import { AdminSessionGate } from "@/components/admin/AdminSessionGate";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminSessionGate>{children}</AdminSessionGate>;
}
