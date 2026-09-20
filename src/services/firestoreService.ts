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
  Unsubscribe 
} from 'firebase/firestore';
import { Project, LedgerEntry, AuditLogItem, UserProfile } from '../types';

const COLLECTION_PROJECTS = 'projects';
const COLLECTION_ENTRIES = 'entries';
const COLLECTION_AUDIT = 'auditLogs';
const COLLECTION_USERS = 'users';

/**
 * Recursively strips any object keys where value is `undefined`.
 * Firestore strictly rejects documents containing undefined values.
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

// User Profile save / fetch
export async function saveUserProfile(user: UserProfile): Promise<void> {
  try {
    const cleaned = cleanForFirestore(user);
    const userRef = doc(db, COLLECTION_USERS, cleaned.uid);
    await setDoc(userRef, cleaned, { merge: true });
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
        const updatePayload = cleanForFirestore({
          authorizedUserUids: Array.from(uids),
          partners: updatedPartners,
        });
        await setDoc(projectRef, updatePayload, { merge: true });
        console.log(`[Auto-Allocate] Linked user ${userUid} (${normalizedEmail}) to project "${project.name}" (${project.id})`);
      }
    }
  } catch (err) {
    console.warn('Could not auto-link email invitations:', err);
  }
}

/**
 * Subscribes to projects where the authenticated user is an authorized member.
 * Supports both direct authorizedUserUids matching AND authorizedEmails matching,
 * so invited partners see their allocated projects immediately upon signing in.
 */
export function subscribeToUserProjects(
  userUid: string,
  userEmail: string | null | undefined,
  onUpdate: (projects: Project[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  if (!userUid) {
    onUpdate([]);
    return () => {};
  }

  const projectsMap = new Map<string, Project>();

  const emit = () => {
    const list = Array.from(projectsMap.values());
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(list);
  };

  const unsubs: Unsubscribe[] = [];

  // 1. Query by UID in authorizedUserUids
  const qUid = query(
    collection(db, COLLECTION_PROJECTS),
    where('authorizedUserUids', 'array-contains', userUid)
  );

  const unsubUid = onSnapshot(
    qUid,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'removed') {
          // Only remove if not kept by email query
          const current = projectsMap.get(change.doc.id);
          const normalizedEmail = userEmail?.trim().toLowerCase();
          if (current && (!normalizedEmail || !current.authorizedEmails?.includes(normalizedEmail))) {
            projectsMap.delete(change.doc.id);
          }
        } else {
          projectsMap.set(change.doc.id, change.doc.data() as Project);
        }
      });
      emit();
    },
    (err) => {
      console.error('Error fetching authorized projects by UID:', err);
      if (onError) onError(err);
    }
  );
  unsubs.push(unsubUid);

  // 2. Query by Email in authorizedEmails (for newly invited partners whose UID is being linked)
  if (userEmail) {
    const normalizedEmail = userEmail.trim().toLowerCase();
    const qEmail = query(
      collection(db, COLLECTION_PROJECTS),
      where('authorizedEmails', 'array-contains', normalizedEmail)
    );

    const unsubEmail = onSnapshot(
      qEmail,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'removed') {
            const current = projectsMap.get(change.doc.id);
            if (current && !current.authorizedUserUids?.includes(userUid)) {
              projectsMap.delete(change.doc.id);
            }
          } else {
            projectsMap.set(change.doc.id, change.doc.data() as Project);
          }
        });
        emit();
      },
      (err) => {
        console.warn('Query for authorized email projects encountered notice:', err);
      }
    );
    unsubs.push(unsubEmail);
  }

  return () => {
    unsubs.forEach((unsub) => unsub());
  };
}

// Save or update Project
export async function saveProjectToFirestore(project: Project): Promise<void> {
  const authorizedEmails = new Set<string>();
  if (project.authorizedEmails) {
    project.authorizedEmails.forEach((e) => {
      if (e) authorizedEmails.add(e.trim().toLowerCase());
    });
  }
  if (project.partners) {
    project.partners.forEach((p) => {
      if (p.email) authorizedEmails.add(p.email.trim().toLowerCase());
    });
  }

  const uids = new Set<string>();
  if (project.authorizedUserUids) {
    project.authorizedUserUids.forEach((u) => {
      if (u) uids.add(u);
    });
  }
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

  const cleaned = cleanForFirestore(payload);
  const projectRef = doc(db, COLLECTION_PROJECTS, cleaned.id);
  await setDoc(projectRef, cleaned, { merge: true });
  console.log(`[Firestore] Project "${cleaned.name}" (${cleaned.id}) saved to Firestore.`);
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
  const cleaned = cleanForFirestore(entry);
  const entryRef = doc(db, COLLECTION_ENTRIES, cleaned.id);
  await setDoc(entryRef, cleaned, { merge: true });
  console.log(`[Firestore] Ledger entry "${cleaned.title}" (${cleaned.id}) saved to Firestore.`);
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
  const cleaned = cleanForFirestore(log);
  const logRef = doc(db, COLLECTION_AUDIT, cleaned.id);
  await setDoc(logRef, cleaned);
  console.log(`[Firestore] Audit log (${cleaned.id}) saved to Firestore.`);
}
