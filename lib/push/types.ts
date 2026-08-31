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
  venueAccessExpiresAt?: number;
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
  venueAccessExpiresAt?: number;
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

export type PushAudienceSegment =
  | "all"
  | "venue_present"
  | "installed_app"
  | "identified_customers"
  | "recent_visitors_30d"
  | "birthday_soon_14d"
  | "vip_inactive_60d"
  | "specific_email";

export interface PushSendPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  email?: string;
  icon?: string;
  badge?: string;
  renotify?: boolean;
  onlyVenuePresent?: boolean;
  segment?: PushAudienceSegment;
}

export interface PushSendResponse {
  sent: number;
  failed: number;
  removed: number;
  total: number;
  errors: Array<{
    statusCode: number;
    message: string;
  }>;
}

export interface SavedPushSegment {
  id: string;
  name: string;
  segment: PushAudienceSegment;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedPushCampaign {
  id: string;
  name: string;
  title: string;
  body: string;
  url: string;
  segment: PushAudienceSegment;
  email?: string;
  createdAt: string;
  updatedAt: string;
}
