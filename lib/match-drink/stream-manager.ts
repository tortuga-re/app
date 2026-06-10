import { MatchDrinkSession } from "./types";
import { getSession } from "./storage";

type Subscriber = (session: MatchDrinkSession | null) => void;

class StreamManager {
  private static instance: StreamManager;
  
  private sessions: Map<string, {
    data: MatchDrinkSession | null;
    subscribers: Set<Subscriber>;
    interval: NodeJS.Timeout | null;
    lastUpdate: number;
  }> = new Map();

  private constructor() {}

  public static getInstance(): StreamManager {
    if (!StreamManager.instance) {
      StreamManager.instance = new StreamManager();
    }
    return StreamManager.instance;
  }

  public subscribe(sessionId: string, callback: Subscriber): () => void {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        data: null,
        subscribers: new Set(),
        interval: null,
        lastUpdate: 0,
      });
      this.startPolling(sessionId);
    }

    const sessionState = this.sessions.get(sessionId)!;
    sessionState.subscribers.add(callback);

    // Invia lo stato immediatamente al nuovo iscritto (se disponibile)
    if (sessionState.data) {
      try {
        callback(sessionState.data);
      } catch (err) {
        console.error("Error sending initial state to subscriber:", err);
      }
    }

    return () => {
      this.unsubscribe(sessionId, callback);
    };
  }

  private unsubscribe(sessionId: string, callback: Subscriber) {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) return;

    sessionState.subscribers.delete(callback);

    // Se non ci sono più iscritti, ferma il polling per risparmiare risorse
    if (sessionState.subscribers.size === 0) {
      if (sessionState.interval) {
        clearInterval(sessionState.interval);
      }
      this.sessions.delete(sessionId);
    }
  }

  private startPolling(sessionId: string) {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) return;

    // Esegui la prima query subito
    this.poll(sessionId);

    // Poi ogni 800ms (più reattivo per live game)
    sessionState.interval = setInterval(() => this.poll(sessionId), 800);
  }

  private async poll(sessionId: string) {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState || sessionState.subscribers.size === 0) return;

    try {
      const sessionData = await getSession(sessionId);
      
      // Confrontiamo i dati (versione base per evitare spam di aggiornamenti identici)
      // Per semplicità confrontiamo stringificando (si può ottimizzare se necessario)
      const newDataString = JSON.stringify(sessionData);
      const oldDataString = JSON.stringify(sessionState.data);

      if (newDataString !== oldDataString) {
        sessionState.data = sessionData;
        sessionState.lastUpdate = Date.now();
        this.notifySubscribers(sessionId, sessionData);
      }
    } catch (err) {
      console.error(`Error polling session ${sessionId}:`, err);
    }
  }

  private notifySubscribers(sessionId: string, data: MatchDrinkSession | null) {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) return;

    sessionState.subscribers.forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        // Rimuove gli iscritti rotti
        console.error("Error notifying subscriber, removing it.", err);
        sessionState.subscribers.delete(callback);
      }
    });
  }
}

export const streamManager = StreamManager.getInstance();
