export type UserRole = 'owner' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  adminName: string;
  profileImage?: string;
  bio?: string;
  tiktokUrl?: string;
  instagramUrl?: string;
  whatsappChannelUrl?: string;
  otherSocialLinks?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MediaType = 'video' | 'photo';

export interface ClipItem {
  clipId: string;
  slug: string;
  title: string;
  creatorName: string;
  description?: string;
  uploaderUid: string;
  uploaderNameSnapshot: string;
  primaryMediaType: MediaType;
  primaryMediaUrl: string;
  primaryMediaPath?: string;
  photoOneUrl: string;
  photoOnePath?: string;
  photoTwoUrl: string;
  photoTwoPath?: string;
  downloadCount: number;
  likeCount: number;
  published: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SiteSettings {
  siteName: string;
  description: string;
  footerText: string;
  watermarkText: string;
  maintenanceMode: boolean;
  announcement: string;
  apkDownloadUrl?: string;
  apkVersionName?: string;
  apkReleaseNotes?: string;
  apkEnabled?: boolean;
  updatedAt?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
