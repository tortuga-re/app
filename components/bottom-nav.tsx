"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, Home, Info, Users } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/gift", label: "Gift", Icon: Gift },
  { href: "/ciurma", label: "Ciurma", Icon: Users },
  { href: "/info", label: "Info", Icon: Info },
];

export function BottomNav({ isVip = false }: { isVip?: boolean }) {
  const pathname = usePathname();
  return <div className="app-bottom-nav pointer-events-none fixed inset-x-0 z-30 flex justify-center px-3">
    <nav className="minimal-bottom-nav pointer-events-auto grid w-full max-w-md grid-cols-4 px-2 py-2">
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return <Link key={href} href={href} onClick={() => triggerHaptic()} className={cn("minimal-nav-item", active && "active", href === "/ciurma" && isVip && "vip")}>
          <Icon size={21} strokeWidth={active ? 2.2 : 1.7} /><span>{label}</span>
        </Link>;
      })}
    </nav>
  </div>;
}
