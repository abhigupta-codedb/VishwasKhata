import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  query,
  where,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { Project, LedgerEntry, AuditLogItem, UserProfile } from '../types';
import { DEMO_PROJECTS, DEMO_ENTRIES, DEMO_AUDIT_LOG } from '../data/demoData';

const COLLECTION_PROJECTS = 'projects';
const COLLECTION_ENTRIES = 'entries';
const COLLECTION_AUDIT = 'auditLogs';
const COLLECTION_USERS = 'users';

// User Profile save / fetch
export async function saveUserProfile(user: UserProfile): Promise<void> {
  try {
    const userRef = doc(db, COLLECTION_USERS, user.uid);
    await setDoc(userRef, user, { merge: true });
  } catch (err) {
    console.error('Error saving user profile:', err);
  }
}

/**
 * Filter projects in memory or via authorized criteria
 */
export function isUserAuthorizedForProject(
  project: Project,
  userUid?: string | null,
  userEmail?: string | null,
  isAnonymous?: boolean
): boolean {
  if (isAnonymous) {
    return !!project.isDemo;
  }
  if (!userUid) return false;

  // Do not expose demo projects to authenticated production users unless explicitly added
  if (project.isDemo) return false;

  // Direct owner
  if (project.ownerUid && project.ownerUid === userUid) return true;

  // Authorized UID list
  if (project.authorizedUserUids && project.authorizedUserUids.includes(userUid)) return true;

  // Authorized Email list
  if (userEmail && project.authorizedEmails) {
    const normalizedUserEmail = userEmail.trim().toLowerCase();
    const hasEmailMatch = project.authorizedEmails.some(
      (e) => e.trim().toLowerCase() === normalizedUserEmail
    );
    if (hasEmailMatch) return true;
  }

  // Also check partner email list on the project
  if (userEmail && project.partners) {
    const normalizedUserEmail = userEmail.trim().toLowerCase();
    const hasPartnerEmail = project.partners.some(
      (p) => p.email && p.email.trim().toLowerCase() === normalizedUserEmail
    );
    if (hasPartnerEmail) return true;
  }

  return false;
}

/**
 * Subscribe to projects where user is authorized
 */
export function subscribeToAuthorizedProjects(
  userUid: string | null | undefined,
  userEmail: string | null | undefined,
  isAnonymous: boolean,
  onUpdate: (projects: Project[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  // If demo/anonymous, query demo projects
  let q = query(collection(db, COLLECTION_PROJECTS));
  if (isAnonymous) {
    q = query(collection(db, COLLECTION_PROJECTS), where('isDemo', '==', true));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const all: Project[] = [];
      snapshot.forEach((d) => {
        all.push(d.data() as Project);
      });

      // Filter securely client-side in tandem with Firestore rules
      const authorized = all.filter((proj) =>
        isUserAuthorizedForProject(proj, userUid, userEmail, isAnonymous)
      );

      onUpdate(authorized);
    },
    (err) => {
      console.error('Projects subscription error:', err);
      if (onError) onError(err);
    }
  );
}

// Save or update Project
export async function saveProjectToFirestore(project: Project): Promise<void> {
  // Ensure authorizedUserUids and authorizedEmails are always populated for membership checks
  const authorizedEmails = new Set(project.authorizedEmails || []);
  if (project.partners) {
    project.partners.forEach((p) => {
      if (p.email) authorizedEmails.add(p.email.trim().toLowerCase());
    });
  }

  const payload: Project = {
    ...project,
    authorizedEmails: Array.from(authorizedEmails),
    authorizedUserUids: project.authorizedUserUids || (project.ownerUid ? [project.ownerUid] : []),
  };

  const projectRef = doc(db, COLLECTION_PROJECTS, payload.id);
  await setDoc(projectRef, payload, { merge: true });
}

// Delete Project
export async function deleteProjectFromFirestore(projectId: string): Promise<void> {
  const projectRef = doc(db, COLLECTION_PROJECTS, projectId);
  await deleteDoc(projectRef);
}

/**
 * Subscribe to Entries for authorized projects
 */
export function subscribeToAuthorizedEntries(
  authorizedProjectIds: string[],
  onUpdate: (entries: LedgerEntry[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  if (!authorizedProjectIds || authorizedProjectIds.length === 0) {
    onUpdate([]);
    return () => {};
  }

  const q = collection(db, COLLECTION_ENTRIES);
  const allowedSet = new Set(authorizedProjectIds);

  return onSnapshot(
    q,
    (snapshot) => {
      const items: LedgerEntry[] = [];
      snapshot.forEach((d) => {
        const entry = d.data() as LedgerEntry;
        if (allowedSet.has(entry.projectId)) {
          items.push(entry);
        }
      });
      onUpdate(items);
    },
    (err) => {
      console.error('Entries subscription error:', err);
      if (onError) onError(err);
    }
  );
}

// Save or update Entry
export async function saveEntryToFirestore(entry: LedgerEntry): Promise<void> {
  const entryRef = doc(db, COLLECTION_ENTRIES, entry.id);
  await setDoc(entryRef, entry);
}

// Delete Entry
export async function deleteEntryFromFirestore(entryId: string): Promise<void> {
  const entryRef = doc(db, COLLECTION_ENTRIES, entryId);
  await deleteDoc(entryRef);
}

/**
 * Subscribe to Audit Logs for authorized projects
 */
export function subscribeToAuthorizedAuditLogs(
  authorizedProjectIds: string[],
  onUpdate: (logs: AuditLogItem[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  if (!authorizedProjectIds || authorizedProjectIds.length === 0) {
    onUpdate([]);
    return () => {};
  }

  const q = collection(db, COLLECTION_AUDIT);
  const allowedSet = new Set(authorizedProjectIds);

  return onSnapshot(
    q,
    (snapshot) => {
      const items: AuditLogItem[] = [];
      snapshot.forEach((d) => {
        const log = d.data() as AuditLogItem;
        if (allowedSet.has(log.projectId)) {
          items.push(log);
        }
      });
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Audit logs subscription error:', err);
      if (onError) onError(err);
    }
  );
}

// Save Audit Log Item
export async function saveAuditLogToFirestore(log: AuditLogItem): Promise<void> {
  const logRef = doc(db, COLLECTION_AUDIT, log.id);
  await setDoc(logRef, log);
}

/**
 * Seed isolated Demo Data into Firestore (only if not already seeded)
 * This populates isDemo: true items so demo users have realistic data without polluting production
 */
export async function seedDemoDataIfMissing(): Promise<void> {
  try {
    const demoQuery = query(collection(db, COLLECTION_PROJECTS), where('isDemo', '==', true));
    const demoSnap = await getDocs(demoQuery);

    if (demoSnap.empty) {
      const batch = writeBatch(db);

      for (const project of DEMO_PROJECTS) {
        const projectRef = doc(db, COLLECTION_PROJECTS, project.id);
        batch.set(projectRef, project);
      }

      for (const entry of DEMO_ENTRIES) {
        const entryRef = doc(db, COLLECTION_ENTRIES, entry.id);
        batch.set(entryRef, { ...entry, isDemo: true });
      }

      for (const log of DEMO_AUDIT_LOG) {
        const logRef = doc(db, COLLECTION_AUDIT, log.id);
        batch.set(logRef, { ...log, isDemo: true });
      }

      await batch.commit();
      console.log('Seeded isolated Demo Data successfully in Firestore');
    }
  } catch (err) {
    console.warn('Unable to seed demo data in Firestore (might already exist or permission limited):', err);
  }
}
