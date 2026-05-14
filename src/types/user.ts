export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username?: string;
  photoURL?: string;
  isOnline?: boolean;
  lastSeen?: { toDate: () => Date } | null;
}
