import { sendPushNotification } from "@/lib/push/send";

export type GameType = "buzzer" | "matchDrink";

export async function sendGameStartPush(gameType: GameType) {
  const config = {
    buzzer: {
      title: "🎵 Music Quiz al via! 🏴‍☠️",
      body: "Le iscrizioni sono aperte. Premi qui per prenotare il tuo tavolo e scalare la classifica!",
      url: "/",
      tag: "buzzer-start",
    },
    matchDrink: {
      title: "🍸 Match & Drink al via! 🏴‍☠️",
      body: "Nuovi incontri e nuovi drink. Iscriviti subito per partecipare al gioco più social del Tortuga!",
      url: "/",
      tag: "match-drink-start",
    }
  };

  const payload = config[gameType];

  try {
    await sendPushNotification({
      ...payload,
      onlyVenuePresent: false, // Invia a tutti come richiesto
    });
  } catch (error) {
    console.error(`[Activation] Failed to send push for ${gameType}:`, error);
  }
}
