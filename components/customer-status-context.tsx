"use client";

import { createContext, useContext } from "react";
import type { CustomerStatusState } from "@/lib/use-customer-status";

const CustomerStatusContext = createContext<CustomerStatusState | null>(null);

export function CustomerStatusProvider({
  value,
  children,
}: {
  value: CustomerStatusState;
  children: React.ReactNode;
}) {
  return <CustomerStatusContext.Provider value={value}>{children}</CustomerStatusContext.Provider>;
}

export function useCurrentCustomerStatus() {
  const status = useContext(CustomerStatusContext);
  if (!status) throw new Error("useCurrentCustomerStatus richiede CustomerStatusProvider");
  return status;
}
