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
  standalone?: boolean;
  venueAccessExpiresAt?: number;
}

export interface PushDeliveryError {
  statusCode: number;
  message: string;
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
  standalone?: boolean;
  platform?: string;
  browser?: string;
  vapidKeyVersion?: string;
  venueAccessExpiresAt?: number;
  lastSeenAt?: string;
  lastSuccessfulSendAt?: string;
  lastFailedSendAt?: string;
  lastError?: PushDeliveryError;
  lastOpenedAt?: string;
  lastOpenedUrl?: string;
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
  historyId?: string;
  sent: number;
  failed: number;
  removed: number;
  total: number;
  errors: PushDeliveryError[];
}

export type PushDeliveryTargetStatus = "pending" | "accepted" | "failed";

export interface PushDeliveryTarget {
  id: string;
  endpointFingerprint: string;
  email?: string;
  browser?: string;
  platform?: string;
  status: PushDeliveryTargetStatus;
  statusCode?: number;
  error?: string;
  removed?: boolean;
  acceptedAt?: string;
  openedAt?: string;
}

export interface PushSendHistoryRecord {
  id: string;
  title: string;
  body: string;
  url: string;
  segment: PushAudienceSegment;
  email?: string;
  createdAt: string;
  completedAt?: string;
  sent: number;
  failed: number;
  removed: number;
  total: number;
  errors: PushDeliveryError[];
  targets: PushDeliveryTarget[];
}

export interface PushDeviceDiagnostic {
  id: string;
  email?: string;
  browser: string;
  platform: string;
  installed: boolean;
  standalone: boolean;
  permission: NotificationPermission | "unsupported" | "unknown";
  vapidKeyVersion: string;
  vapidStatus: "current" | "outdated" | "unknown";
  createdAt: string;
  updatedAt: string;
  lastSeenAt?: string;
  lastSuccessfulSendAt?: string;
  lastFailedSendAt?: string;
  lastError?: PushDeliveryError;
  lastOpenedAt?: string;
  lastOpenedUrl?: string;
  isIos: boolean;
  iosChecks?: {
    openedFromHome: boolean;
    permissionGranted: boolean;
    subscriptionPresent: boolean;
    focusAndLowPowerMode: "manual-check-required";
  };
}

export interface PushDiagnosticsResponse {
  email: string;
  currentVapidKeyVersion: string;
  devices: PushDeviceDiagnostic[];
}

export type PushHistoryResponseRecord = PushSendHistoryRecord;

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
