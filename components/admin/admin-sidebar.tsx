"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Tv, Megaphone, Gamepad2, ImageIcon, LogOut, Menu, X, Newspaper, Trophy, ReceiptText } from "lucide-react";
import { useState } from "react";
import { PanicButton } from "./panic-button";

const navGroups = [
  { label: "Operatività", items: [{ name: "Cruscotto", href: "/admin", icon: LayoutDashboard }, { name: "Live TV", href: "/admin/live-tv", icon: Tv }, { name: "Giochi Live", href: "/admin/games", icon: Gamepad2 }] },
  { label: "Comunicazione", items: [{ name: "Notifiche e promo", href: "/admin/push", icon: Megaphone }, { name: "Contenuti in evidenza", href: "/admin/highlights", icon: Newspaper }] },
  { label: "Gestione", items: [{ name: "Foto e media", href: "/admin/media", icon: ImageIcon }, { name: "Scontrini", href: "/admin/scontrini", icon: ReceiptText }, { name: "Vincitori", href: "/admin/vincitori", icon: Trophy }] },
] as const;

export function AdminSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="admin-shell flex min-h-screen bg-[#f4efe5] text-[var(--text)]">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[#fffdf8] px-4">
        <div className="flex items-center gap-3">
          <span className="font-black italic text-xl tracking-wider text-[var(--accent)]">
            TORTUGA ADMIN
          </span>
        </div>
        <div className="flex items-center gap-2">
          <PanicButton />
          <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-[var(--text)]">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[var(--border)] bg-[#fffdf8] shadow-[10px_0_30px_rgba(45,35,23,.08)] transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-16 items-center justify-between border-b border-[var(--border)] px-6">
          <span className="hidden font-black italic text-xl tracking-wider text-[var(--accent)] lg:block">
            TORTUGA ADMIN
          </span>
        </div>

        <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-6">
          {navGroups.map((group) => <section key={group.label}><p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[.18em] text-[var(--text-muted)]">{group.label}</p><div className="space-y-1">{group.items.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)} className={["flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all", isActive ? "border border-[rgba(165,43,43,.28)] bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:bg-[#f2ebdf] hover:text-[var(--text)]"].join(" ")}><Icon size={18} />{item.name}</Link>;
          })}</div></section>)}
        </nav>

        <div className="shrink-0 border-t border-[var(--border)] bg-[#fffdf8] p-4">
           <button 
             onClick={async () => {
                await fetch('/api/admin/session/logout', { method: 'POST' });
                window.location.href = '/';
             }}
             className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 transition-colors font-semibold"
           >
             <LogOut size={20} />
             Logout
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 min-h-screen relative flex flex-col">
         {/* Desktop Header area for Panic Button */}
         <div className="hidden lg:flex absolute top-4 right-6 z-30 justify-end w-full pointer-events-none">
            <div className="pointer-events-auto">
              <PanicButton />
            </div>
         </div>
         <div className="flex-1 w-full max-w-full overflow-x-hidden">
            {children}
         </div>
      </main>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
