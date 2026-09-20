import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  Unsubscribe,
  orderBy
} from 'firebase/firestore';
import { Project, LedgerEntry, AuditLogItem, UserProfile } from '../types';

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
 * Automatically claims and accepts any pending project invitations matching the user's verified email.
 * This links their Firebase UID into `authorizedUserUids` and updates the partner record.
 */
export async function linkPendingEmailInvitations(
  userUid: string,
  userEmail: string | null | undefined
): Promise<void> {
  if (!userUid || !userEmail) return;

  try {
    const normalizedEmail = userEmail.trim().toLowerCase();
    const q = query(
      collection(db, COLLECTION_PROJECTS),
      where('authorizedEmails', 'array-contains', normalizedEmail)
    );

    const snapshot = await getDocs(q);
    for (const d of snapshot.docs) {
      const project = d.data() as Project;
      const uids = new Set(project.authorizedUserUids || []);
      let changed = false;

      if (!uids.has(userUid)) {
        uids.add(userUid);
        changed = true;
      }

      // Link partner record by email
      const updatedPartners = (project.partners || []).map((p) => {
        if (p.email && p.email.trim().toLowerCase() === normalizedEmail) {
          if (p.uid !== userUid || p.status !== 'active') {
            changed = true;
            return { ...p, uid: userUid, status: 'active' as const };
          }
        }
        return p;
      });

      if (changed) {
        const projectRef = doc(db, COLLECTION_PROJECTS, project.id);
        await setDoc(
          projectRef,
          {
            authorizedUserUids: Array.from(uids),
            partners: updatedPartners,
          },
          { merge: true }
        );
      }
    }
  } catch (err) {
    console.warn('Could not auto-link email invitations:', err);
  }
}

/**
 * Subscribes ONLY to projects where the authenticated user is an authorized member.
 * Does NOT fetch all projects and filter on the client.
 */
export function subscribeToUserProjects(
  userUid: string,
  onUpdate: (projects: Project[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  if (!userUid) {
    onUpdate([]);
    return () => {};
  }

  // Real multi-tenant query: only docs where userUid is in authorizedUserUids
  const q = query(
    collection(db, COLLECTION_PROJECTS),
    where('authorizedUserUids', 'array-contains', userUid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const projects: Project[] = [];
      snapshot.forEach((d) => {
        projects.push(d.data() as Project);
      });
      onUpdate(projects);
    },
    (err) => {
      console.error('Error fetching authorized projects:', err);
      if (onError) onError(err);
    }
  );
}

// Save or update Project
export async function saveProjectToFirestore(project: Project): Promise<void> {
  const authorizedEmails = new Set(project.authorizedEmails || []);
  if (project.partners) {
    project.partners.forEach((p) => {
      if (p.email) authorizedEmails.add(p.email.trim().toLowerCase());
    });
  }

  const uids = new Set(project.authorizedUserUids || []);
  if (project.ownerUid) uids.add(project.ownerUid);
  if (project.partners) {
    project.partners.forEach((p) => {
      if (p.uid) uids.add(p.uid);
    });
  }

  const payload: Project = {
    ...project,
    authorizedEmails: Array.from(authorizedEmails),
    authorizedUserUids: Array.from(uids),
  };

  const projectRef = doc(db, COLLECTION_PROJECTS, payload.id);
  await setDoc(projectRef, payload, { merge: true });
}

// Delete Project (Owner only)
export async function deleteProjectFromFirestore(projectId: string): Promise<void> {
  const projectRef = doc(db, COLLECTION_PROJECTS, projectId);
  await deleteDoc(projectRef);
}

/**
 * Subscribes strictly to entries of the SELECTED project.
 * Does NOT download entries from other projects.
 */
export function subscribeToProjectEntries(
  projectId: string,
  onUpdate: (entries: LedgerEntry[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  if (!projectId) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, COLLECTION_ENTRIES),
    where('projectId', '==', projectId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: LedgerEntry[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as LedgerEntry);
      });
      onUpdate(items);
    },
    (err) => {
      console.error(`Entries subscription error for project ${projectId}:`, err);
      if (onError) onError(err);
    }
  );
}

// Save or update Entry
export async function saveEntryToFirestore(entry: LedgerEntry): Promise<void> {
  const entryRef = doc(db, COLLECTION_ENTRIES, entry.id);
  await setDoc(entryRef, entry, { merge: true });
}

// Delete Entry (only unapproved drafts or pending entries permitted)
export async function deleteEntryFromFirestore(entryId: string): Promise<void> {
  const entryRef = doc(db, COLLECTION_ENTRIES, entryId);
  await deleteDoc(entryRef);
}

/**
 * Subscribes strictly to audit logs of the SELECTED project.
 * Does NOT download logs from other projects.
 */
export function subscribeToProjectAuditLogs(
  projectId: string,
  onUpdate: (logs: AuditLogItem[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  if (!projectId) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, COLLECTION_AUDIT),
    where('projectId', '==', projectId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: AuditLogItem[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as AuditLogItem);
      });
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error(`Audit logs subscription error for project ${projectId}:`, err);
      if (onError) onError(err);
    }
  );
}

// Save Audit Log Item (Append-only)
export async function saveAuditLogToFirestore(log: AuditLogItem): Promise<void> {
  const logRef = doc(db, COLLECTION_AUDIT, log.id);
  await setDoc(logRef, log);
}
