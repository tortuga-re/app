export interface PushSubscriptionKeys {
  auth?: string;
  p256dh?: string;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  expirationTime?: number | null;
  keys?: PushSubscriptionKeys;
}

export interface SavePushSubscriptionInput {
  subscription: PushSubscriptionPayload;
  email?: string;
  permission?: NotificationPermission | "unsupported";
  userAgent?: string;
  installed?: boolean;
}

export interface StoredPushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    auth: string;
    p256dh: string;
  };
  email?: string;
  permission?: NotificationPermission | "unsupported";
  userAgent?: string;
  installed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavePushSubscriptionResponse {
  saved: true;
  record: StoredPushSubscription;
}

export interface DeletePushSubscriptionInput {
  endpoint: string;
}

export interface DeletePushSubscriptionResponse {
  deleted: boolean;
}

export interface PushSendPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  email?: string;
  icon?: string;
  badge?: string;
  renotify?: boolean;
}

export interface PushSendResponse {
  sent: number;
  failed: number;
  removed: number;
  total: number;
}
