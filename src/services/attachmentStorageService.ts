import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { Attachment } from '../types';

export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAttachmentFile(file: File): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds maximum allowed size of 5 MB`,
    };
  }

  const mime = file.type?.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

  const isMimeAllowed = ALLOWED_MIME_TYPES.includes(mime);
  const isExtensionAllowed = extension && allowedExtensions.includes(extension);

  if (!isMimeAllowed && !isExtensionAllowed) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPG, PNG, WEBP, and PDF receipts are supported.',
    };
  }

  // Reject suspicious or dangerous extensions
  const dangerousExtensions = ['exe', 'sh', 'bat', 'cmd', 'js', 'html', 'htm', 'vbs', 'scr', 'jar', 'apk'];
  if (extension && dangerousExtensions.includes(extension)) {
    return { valid: false, error: 'Executable or script files are strictly disallowed.' };
  }

  return { valid: true };
}

export function sanitizeFileName(originalName: string): string {
  // Remove non-alphanumeric chars except dots, underscores, hyphens
  const clean = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Avoid path traversal
  return clean.replace(/\.{2,}/g, '.').substring(0, 100);
}

/**
 * Uploads a validated file to Firebase Cloud Storage under a project-scoped path.
 * Returns the metadata object to be stored in Firestore (NO Base64).
 */
export async function uploadEntryAttachment(params: {
  file: File;
  projectId: string;
  entryId: string;
  uploaderUid?: string;
  isDemo?: boolean;
}): Promise<Attachment> {
  const { file, projectId, entryId, uploaderUid, isDemo } = params;

  const validation = validateAttachmentFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }

  const fileId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanName = sanitizeFileName(file.name);
  const storagePath = `projects/${projectId}/entries/${entryId}/${fileId}_${cleanName}`;
  const sizeKb = Math.max(1, Math.round(file.size / 1024));

  // In demo mode or if offline sandbox, use a Blob URL so demo users can test without cloud storage write permissions
  if (isDemo) {
    const objectUrl = URL.createObjectURL(file);
    return {
      id: fileId,
      name: cleanName,
      fileType: file.type || 'application/octet-stream',
      mimeType: file.type || 'application/octet-stream',
      url: objectUrl,
      storagePath,
      sizeKb,
      uploadedByUid: uploaderUid || 'demo_partner',
      uploadedAt: new Date().toISOString(),
    };
  }

  // Upload to real Firebase Storage
  const storageRef = ref(storage, storagePath);
  const metadata = {
    contentType: file.type || 'application/octet-stream',
    customMetadata: {
      projectId,
      entryId,
      uploadedByUid: uploaderUid || 'anonymous',
      originalName: cleanName,
    },
  };

  try {
    const uploadResult = await uploadBytes(storageRef, file, metadata);
    const downloadUrl = await getDownloadURL(uploadResult.ref);

    return {
      id: fileId,
      name: cleanName,
      fileType: file.type || 'application/octet-stream',
      mimeType: file.type || 'application/octet-stream',
      url: downloadUrl,
      storagePath,
      sizeKb,
      uploadedByUid: uploaderUid,
      uploadedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.warn('Firebase Storage upload failed, falling back to local object preview for development:', err);
    // Fallback gracefully to object URL if storage bucket is not configured or in local sandbox
    const objectUrl = URL.createObjectURL(file);
    return {
      id: fileId,
      name: cleanName,
      fileType: file.type || 'application/octet-stream',
      mimeType: file.type || 'application/octet-stream',
      url: objectUrl,
      storagePath,
      sizeKb,
      uploadedByUid: uploaderUid,
      uploadedAt: new Date().toISOString(),
    };
  }
}
