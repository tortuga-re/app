import { type NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin/server-auth";
import { getProfileData, createReservationMovement, createContactMovement, addPointsToContact, getContactReservations } from "@/lib/cooperto/service";
import { updateReceiptStatus, isReceiptNumberUsed } from "@/lib/receipts/supabase";
import { unlockAchievement } from "@/lib/profile/achievement-service";

export const dynamic = "force-dynamic";

/**
 * Formatta una data nel formato YYYY-MM-DDTHH:mm:ssZ per Cooperto
 */
const formatCoopertoDate = (date: Date) => {
  return date.toISOString().split('.')[0] + 'Z'; // Rimuove i millisecondi ma mantiene la Z
};

export async function POST(request: NextRequest) {
  try {
    const adminRequest = requireAdminRequest(request);
    if (!adminRequest.ok) {
      return adminRequest.response;
    }

    const body = await request.json();
    const { id, status, receiptNumber, adminNote } = body;

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
      const { getSupabaseAdmin } = await import("@/lib/supabase/client");
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

      // Compatibilità per ricevute inviate prima dello sblocco immediato.
      await unlockAchievement(email, "assaggiatore-ufficiale");

      // Find customer on Cooperto
      const profile = await getProfileData("email", email);
      if (!profile.contact?.CodiceContatto) {
        return NextResponse.json({ error: "Cliente non trovato su Cooperto." }, { status: 404 });
      }

      const contactCode = profile.contact.CodiceContatto;

      // 4. Check Fidelity Card and activate if missing
      if (!profile.contact.CodiceCard) {
        console.log(`Fidelity mancante per ${email}, attivazione in corso...`);
        const { activateFidelityCard } = await import("@/lib/cooperto/service");
        await activateFidelityCard({ contactCode });
        console.info(`[Admin Process] Card attivata per ${email}, attesa 3s...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // 5. Calculate Points and prepare data
      const finalAmount = body.amount || amount;
      const pointsToAdd = Math.floor(finalAmount / 10);
      const coopertoDate = formatCoopertoDate(new Date());

      // 6. ADD POINTS FIRST
      if (pointsToAdd > 0) {
        console.info(`[Admin Process] Scontrino ${receiptNumber}: Caricamento ${pointsToAdd} punti...`);
        await addPointsToContact({
          codiceContatto: contactCode,
          punti: pointsToAdd,
          note: `Punti per scontrino n. ${receiptNumber} (Importo: €${finalAmount})`
        });
        console.info(`[Admin Process] Scontrino ${receiptNumber}: Punti caricati con successo.`);
      }

      // 7. WAIT and then RECORD MOVEMENT
      console.info(`[Admin Process] Scontrino ${receiptNumber}: Attesa 5s prima di registrare spesa...`);
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 8. RECORD MOVEMENT with Soft-Fail
      try {
        const reservations = await getContactReservations(contactCode);
        const pastReservations = reservations
          .filter(r => r.DataPrenotazione && new Date(r.DataPrenotazione) < new Date())
          .sort((a, b) => {
            const dateA = a.DataPrenotazione ? new Date(a.DataPrenotazione).getTime() : 0;
            const dateB = b.DataPrenotazione ? new Date(b.DataPrenotazione).getTime() : 0;
            return dateB - dateA;
          });

        const lastRes = pastReservations[0];
        
        if (lastRes && lastRes.CodicePrenotazione) {
          await createReservationMovement({
            CodicePrenotazione: lastRes.CodicePrenotazione,
            Importo: finalAmount,
            Note: `Scontrino n. ${receiptNumber} caricato da App`
          });
        } else {
          await createContactMovement({
            CodiceContatto: contactCode,
            DataMovimento: coopertoDate,
            Importo: finalAmount,
            Note: `Scontrino n. ${receiptNumber} caricato da App (nessuna prenotazione trovata)`
          });
        }
        console.info(`[Admin Process] Scontrino ${receiptNumber}: Movimento registrato con successo.`);
      } catch (movError: unknown) {
        const errorMsg = movError instanceof Error ? movError.message : String(movError);
        console.warn(`[Admin Process] Scontrino ${receiptNumber}: Errore durante CreaMovimento, ma procediamo comunque dato che i punti sono stati caricati.`, errorMsg);
        
        // Se l'errore NON è il solito errore di transazione, forse dovremmo preoccuparci?
        // Ma data l'esperienza dell'utente, Cooperto spesso scrive anche se dà errore.
      }

      // 9. Update Database status - ALWAYS do this if we reached this point
      await updateReceiptStatus(id, { 
        status: 'approved', 
        receipt_number: receiptNumber,
        admin_note: adminNote,
        customer_code: contactCode,
        amount: finalAmount
      });

      return NextResponse.json({ success: true, message: `Scontrino approvato! Caricati ${pointsToAdd} punti.` });
    }

    return NextResponse.json({ error: "Azione non valida." }, { status: 400 });

  } catch (error) {
    console.error("Admin process error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Errore interno durante l'elaborazione." 
    }, { status: 500 });
  }
}
