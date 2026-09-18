import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { Project, LedgerEntry, AuditLogItem, UserProfile } from '../types';
import { INITIAL_PROJECTS, INITIAL_ENTRIES, INITIAL_AUDIT_LOG } from '../data/initialData';

const COLLECTION_PROJECTS = 'projects';
const COLLECTION_ENTRIES = 'entries';
const COLLECTION_AUDIT = 'auditLogs';
const COLLECTION_USERS = 'users';

// Real-time subscribers or batch initializers
export async function seedInitialFirestoreDataIfEmpty(ownerUserId: string, ownerEmail?: string, ownerName?: string) {
  try {
    const projectsSnapshot = await getDocs(collection(db, COLLECTION_PROJECTS));
    if (projectsSnapshot.empty) {
      // Seed initial projects, customizing first partner to current logged in user if available
      const batch = writeBatch(db);

      const seededProjects = INITIAL_PROJECTS.map((proj, idx) => {
        if (idx === 0 && ownerEmail) {
          const updatedPartners = proj.partners.map((partner, pIdx) => {
            if (pIdx === 0) {
              return {
                ...partner,
                name: ownerName || partner.name,
                email: ownerEmail,
              };
            }
            return partner;
          });
          return { ...proj, partners: updatedPartners };
        }
        return proj;
      });

      for (const project of seededProjects) {
        const projectRef = doc(db, COLLECTION_PROJECTS, project.id);
        batch.set(projectRef, project);
      }

      for (const entry of INITIAL_ENTRIES) {
        const entryRef = doc(db, COLLECTION_ENTRIES, entry.id);
        batch.set(entryRef, entry);
      }

      for (const log of INITIAL_AUDIT_LOG) {
        const logRef = doc(db, COLLECTION_AUDIT, log.id);
        batch.set(logRef, log);
      }

      await batch.commit();
      console.log('Seeded initial Firestore data successfully');
    }
  } catch (error) {
    console.error('Error seeding initial Firestore data:', error);
  }
}

// User Profile save / fetch
export async function saveUserProfile(user: UserProfile): Promise<void> {
  try {
    const userRef = doc(db, COLLECTION_USERS, user.uid);
    await setDoc(userRef, user, { merge: true });
  } catch (err) {
    console.error('Error saving user profile:', err);
  }
}

// Subscribe to Projects
export function subscribeToProjects(onUpdate: (projects: Project[]) => void, onError?: (error: any) => void): Unsubscribe {
  const q = collection(db, COLLECTION_PROJECTS);
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Project[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as Project);
      });
      onUpdate(items);
    },
    (err) => {
      console.error('Projects subscription error:', err);
      if (onError) onError(err);
    }
  );
}

// Save or update Project
export async function saveProjectToFirestore(project: Project): Promise<void> {
  const projectRef = doc(db, COLLECTION_PROJECTS, project.id);
  await setDoc(projectRef, project);
}

// Subscribe to Entries
export function subscribeToEntries(onUpdate: (entries: LedgerEntry[]) => void, onError?: (error: any) => void): Unsubscribe {
  const q = collection(db, COLLECTION_ENTRIES);
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

// Subscribe to Audit Logs
export function subscribeToAuditLogs(onUpdate: (logs: AuditLogItem[]) => void, onError?: (error: any) => void): Unsubscribe {
  const q = collection(db, COLLECTION_AUDIT);
  return onSnapshot(
    q,
    (snapshot) => {
      const items: AuditLogItem[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as AuditLogItem);
      });
      // Sort newest first
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

// Reset Firestore data to clean Indian LLP scenario
export async function resetFirestoreToDemoData(ownerEmail?: string, ownerName?: string): Promise<void> {
  try {
    const batch = writeBatch(db);

    // Delete existing entries
    const existingEntries = await getDocs(collection(db, COLLECTION_ENTRIES));
    existingEntries.forEach(d => batch.delete(d.ref));

    // Delete existing projects
    const existingProjects = await getDocs(collection(db, COLLECTION_PROJECTS));
    existingProjects.forEach(d => batch.delete(d.ref));

    // Delete existing audit
    const existingAudit = await getDocs(collection(db, COLLECTION_AUDIT));
    existingAudit.forEach(d => batch.delete(d.ref));

    // Write default seed
    const seededProjects = INITIAL_PROJECTS.map((proj, idx) => {
      if (idx === 0 && ownerEmail) {
        const updatedPartners = proj.partners.map((partner, pIdx) => {
          if (pIdx === 0) {
            return {
              ...partner,
              name: ownerName || partner.name,
              email: ownerEmail,
            };
          }
          return partner;
        });
        return { ...proj, partners: updatedPartners };
      }
      return proj;
    });

    for (const project of seededProjects) {
      const projectRef = doc(db, COLLECTION_PROJECTS, project.id);
      batch.set(projectRef, project);
    }

    for (const entry of INITIAL_ENTRIES) {
      const entryRef = doc(db, COLLECTION_ENTRIES, entry.id);
      batch.set(entryRef, entry);
    }

    for (const log of INITIAL_AUDIT_LOG) {
      const logRef = doc(db, COLLECTION_AUDIT, log.id);
      batch.set(logRef, log);
    }

    await batch.commit();
  } catch (err) {
    console.error('Failed to reset firestore data:', err);
    throw err;
  }
}
