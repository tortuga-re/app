import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/live-buzzer/admin";
import { getProfileData, createReservationMovement, createContactMovement, addPointsToContact, getContactReservations } from "@/lib/cooperto/service";
import { updateReceiptStatus, isReceiptNumberUsed } from "@/lib/receipts/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, status, receiptNumber, adminNote, adminEmail } = body;

    // 1. Security Check
    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: "Accesso negato." }, { status: 403 });
    }

    if (status === 'rejected') {
      await updateReceiptStatus(id, { status: 'rejected', admin_note: adminNote });
      return NextResponse.json({ success: true, message: "Richiesta rifiutata." });
    }

    if (status === 'approved') {
      if (!receiptNumber) {
        return NextResponse.json({ error: "Il numero scontrino è obbligatorio per l'approvazione." }, { status: 400 });
      }

      // 2. Check for duplicate receipt number
      const isDuplicate = await isReceiptNumberUsed(receiptNumber);
      if (isDuplicate) {
        return NextResponse.json({ error: "Questo numero scontrino è già stato registrato." }, { status: 400 });
      }

      // 3. Process with Cooperto
      // Get the request data from DB first to get email and amount
      const { getSupabaseAdmin } = await import("@/lib/match-drink/supabase");
      const supabase = getSupabaseAdmin();
      const { data: receiptReq, error: dbError } = await supabase
        .from('receipt_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (dbError || !receiptReq) {
        return NextResponse.json({ error: "Richiesta non trovata nel database." }, { status: 404 });
      }

      const email = receiptReq.user_email;
      const amount = receiptReq.amount;

      // Find customer on Cooperto
      const profile = await getProfileData("email", email);
      if (!profile.contact?.CodiceContatto) {
        return NextResponse.json({ error: "Cliente non trovato su Cooperto." }, { status: 404 });
      }

      const contactCode = profile.contact.CodiceContatto;

      // 4. Find Last Reservation/Visit
      const reservations = await getContactReservations(contactCode);
      // Sort by date descending and find the latest one that is in the past
      const pastReservations = reservations
        .filter(r => r.DataPrenotazione && new Date(r.DataPrenotazione) < new Date())
        .sort((a, b) => {
          const dateA = a.DataPrenotazione ? new Date(a.DataPrenotazione).getTime() : 0;
          const dateB = b.DataPrenotazione ? new Date(b.DataPrenotazione).getTime() : 0;
          return dateB - dateA;
        });

      const lastRes = pastReservations[0];
      let coopertoSuccess = false;

      if (lastRes && lastRes.CodicePrenotazione) {
        // Link to reservation
        coopertoSuccess = await createReservationMovement({
          CodicePrenotazione: lastRes.CodicePrenotazione,
          Importo: amount,
          Note: `Scontrino n. ${receiptNumber} caricato da App`
        });
      } else {
        // Fallback to contact movement
        coopertoSuccess = await createContactMovement({
          CodiceContatto: contactCode,
          DataMovimento: new Date().toISOString(),
          Importo: amount,
          Note: `Scontrino n. ${receiptNumber} caricato da App (nessuna prenotazione trovata)`
        });
      }

      if (!coopertoSuccess) {
        return NextResponse.json({ error: "Errore durante la registrazione della spesa su Cooperto." }, { status: 500 });
      }

      // 5. Add Points (Optional if Cooperto doesn't do it automatically via movement)
      // Usually movements in Cooperto trigger points based on configuration, 
      // but we can also add them manually if needed. 
      // For now, we assume the movement is enough or we add a base amount.
      await addPointsToContact({
        codiceContatto: contactCode,
        punti: Math.floor(amount), // 1 point per Euro as example
        note: `Punti per scontrino n. ${receiptNumber}`
      });

      // 6. Update Database
      await updateReceiptStatus(id, { 
        status: 'approved', 
        receipt_number: receiptNumber,
        admin_note: adminNote,
        customer_code: contactCode
      });

      return NextResponse.json({ success: true, message: "Scontrino approvato e punti accreditati!" });
    }

    return NextResponse.json({ error: "Azione non valida." }, { status: 400 });

  } catch (error) {
    console.error("Admin process error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Errore interno durante l'elaborazione." 
    }, { status: 500 });
  }
}
