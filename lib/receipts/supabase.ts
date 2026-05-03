import { getSupabaseAdmin } from "@/lib/match-drink/supabase";

export type ReceiptRequest = {
  id: string;
  user_email: string;
  customer_code?: string;
  amount: number;
  image_url: string;
  status: 'pending' | 'approved' | 'rejected';
  receipt_number?: string;
  admin_note?: string;
  created_at: string;
  processed_at?: string;
};

export const submitReceiptRequest = async (data: {
  user_email: string;
  customer_code?: string;
  amount: number;
  image_url: string;
}) => {
  const supabase = getSupabaseAdmin();
  const { data: request, error } = await supabase
    .from('receipt_requests')
    .insert([
      {
        user_email: data.user_email,
        customer_code: data.customer_code,
        amount: data.amount,
        image_url: data.image_url,
        status: 'pending'
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return request as ReceiptRequest;
};

export const getPendingReceiptRequests = async () => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('receipt_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as ReceiptRequest[];
};

export const updateReceiptStatus = async (id: string, updates: Partial<ReceiptRequest>) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('receipt_requests')
    .update({
      ...updates,
      processed_at: updates.status && updates.status !== 'pending' ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ReceiptRequest;
};

export const isReceiptNumberUsed = async (receiptNumber: string) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('receipt_requests')
    .select('id')
    .eq('receipt_number', receiptNumber)
    .maybeSingle();

  if (error) throw error;
  return !!data;
};
