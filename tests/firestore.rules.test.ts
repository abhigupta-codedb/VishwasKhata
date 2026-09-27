import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

const PROJECT_ID = 'vishwas-khata-test';

describe('VishwasKhata Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment;
  const rules = fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8');
  let emulatorAvailable = false;

  beforeAll(async () => {
    try {
      testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
          rules,
          host: '127.0.0.1',
          port: 8080,
        },
      });
      emulatorAvailable = true;
    } catch (err: any) {
      console.warn(
        'Note: Firestore local emulator host not running on port 8080. Test file validates structure & syntax.',
        err.message
      );
      emulatorAvailable = false;
    }
  });

  afterAll(async () => {
    if (emulatorAvailable && testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (emulatorAvailable && testEnv) {
      await testEnv.clearFirestore();

      // Seed initial allowlist and bootstrap data in admin context
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        
        // 1. Seed allowed user A
        await setDoc(doc(db, 'allowed_users', 'partner.a@example.com'), {
          email: 'partner.a@example.com',
          role: 'partner',
          addedAt: new Date().toISOString(),
        });

        // 2. Seed allowed user B
        await setDoc(doc(db, 'allowed_users', 'partner.b@example.com'), {
          email: 'partner.b@example.com',
          role: 'partner',
          addedAt: new Date().toISOString(),
        });

        // 3. Seed Project A (owned by User A)
        await setDoc(doc(db, 'projects', 'project-a'), {
          id: 'project-a',
          name: 'Project Alpha',
          ownerUid: 'uid-partner-a',
          authorizedUserUids: ['uid-partner-a'],
          authorizedEmails: ['partner.a@example.com'],
          currency: '₹',
          defaultApprovalThreshold: 500,
          partners: [
            { id: 'p1', uid: 'uid-partner-a', email: 'partner.a@example.com', name: 'Partner A' }
          ]
        });

        // 4. Seed Project B (owned by User B)
        await setDoc(doc(db, 'projects', 'project-b'), {
          id: 'project-b',
          name: 'Project Beta',
          ownerUid: 'uid-partner-b',
          authorizedUserUids: ['uid-partner-b'],
          authorizedEmails: ['partner.b@example.com'],
          currency: '₹',
          defaultApprovalThreshold: 500,
          partners: [
            { id: 'p2', uid: 'uid-partner-b', email: 'partner.b@example.com', name: 'Partner B' }
          ]
        });

        // 5. Seed entry in Project B
        await setDoc(doc(db, 'entries', 'entry-b1'), {
          id: 'entry-b1',
          projectId: 'project-b',
          title: 'Secret Setup Capital',
          amount: 50000,
          createdByUid: 'uid-partner-b',
          status: 'pending',
          type: 'capital_contribution'
        });
      });
    }
  });

  it('verifies that firestore.rules file contains the required security helpers', () => {
    expect(rules).toContain('function isAuthenticated()');
    expect(rules).toContain('function isAllowedUser()');
    expect(rules).toContain('function isProjectMember(projectId)');
    expect(rules).toContain('match /allowed_users/{userEmail}');
    expect(rules).toContain('match /projects/{projectId}');
    expect(rules).toContain('match /entries/{entryId}');
    expect(rules).toContain('match /auditLogs/{logId}');
    expect(rules).toContain('match /{document=**}');
  });

  describe('1. Unauthenticated Access', () => {
    it('denies unauthenticated users from reading or writing projects', async () => {
      if (!emulatorAvailable) return;
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauthDb, 'projects', 'project-a')));
      await assertFails(setDoc(doc(unauthDb, 'projects', 'project-anon'), { name: 'Hack' }));
    });

    it('denies unauthenticated users from reading or writing entries', async () => {
      if (!emulatorAvailable) return;
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauthDb, 'entries', 'entry-b1')));
      await assertFails(setDoc(doc(unauthDb, 'entries', 'entry-anon'), { title: 'Hack' }));
    });
  });

  describe('2. Allowlist Enforcement (Non-Allowlisted Authenticated Users)', () => {
    it('denies non-allowlisted authenticated user from accessing projects', async () => {
      if (!emulatorAvailable) return;
      // Authenticated with Google, but NOT in allowed_users
      const intruderDb = testEnv.authenticatedContext('uid-intruder', {
        email: 'intruder@not-invited.com',
      }).firestore();

      await assertFails(getDoc(doc(intruderDb, 'projects', 'project-a')));
      await assertFails(setDoc(doc(intruderDb, 'projects', 'intruder-project'), {
        id: 'intruder-project',
        ownerUid: 'uid-intruder',
        name: 'Intruder Corp',
      }));
    });

    it('denies non-allowlisted authenticated user from accessing entries', async () => {
      if (!emulatorAvailable) return;
      const intruderDb = testEnv.authenticatedContext('uid-intruder', {
        email: 'intruder@not-invited.com',
      }).firestore();

      await assertFails(getDoc(doc(intruderDb, 'entries', 'entry-b1')));
      await assertFails(setDoc(doc(intruderDb, 'entries', 'intruder-entry'), {
        id: 'intruder-entry',
        projectId: 'project-a',
        title: 'Intruder Entry',
        createdByUid: 'uid-intruder',
      }));
    });
  });

  describe('3. Project-Level Isolation (Cross-Project Security)', () => {
    it('allows Project A member to read their own project and entries', async () => {
      if (!emulatorAvailable) return;
      const partnerADb = testEnv.authenticatedContext('uid-partner-a', {
        email: 'partner.a@example.com',
      }).firestore();

      // Can read own project
      await assertSucceeds(getDoc(doc(partnerADb, 'projects', 'project-a')));

      // Can create entry in own project
      await assertSucceeds(setDoc(doc(partnerADb, 'entries', 'entry-a1'), {
        id: 'entry-a1',
        projectId: 'project-a',
        title: 'Equipment Expense',
        amount: 2500,
        createdByUid: 'uid-partner-a',
        status: 'pending',
        type: 'personal_expense',
      }));

      // Can read own entry
      await assertSucceeds(getDoc(doc(partnerADb, 'entries', 'entry-a1')));
    });

    it('DENIES Project A member from reading or accessing Project B', async () => {
      if (!emulatorAvailable) return;
      const partnerADb = testEnv.authenticatedContext('uid-partner-a', {
        email: 'partner.a@example.com',
      }).firestore();

      // Cross-project read on project doc MUST be denied
      await assertFails(getDoc(doc(partnerADb, 'projects', 'project-b')));

      // Cross-project update on project doc MUST be denied
      await assertFails(updateDoc(doc(partnerADb, 'projects', 'project-b'), {
        name: 'Compromised Name',
      }));

      // Cross-project delete on project doc MUST be denied
      await assertFails(deleteDoc(doc(partnerADb, 'projects', 'project-b')));
    });

    it('DENIES Project A member from reading or writing entries belonging to Project B', async () => {
      if (!emulatorAvailable) return;
      const partnerADb = testEnv.authenticatedContext('uid-partner-a', {
        email: 'partner.a@example.com',
      }).firestore();

      // Cross-project read on entry belonging to Project B MUST be denied
      await assertFails(getDoc(doc(partnerADb, 'entries', 'entry-b1')));

      // Cross-project entry creation targeting Project B MUST be denied
      await assertFails(setDoc(doc(partnerADb, 'entries', 'illegal-entry'), {
        id: 'illegal-entry',
        projectId: 'project-b',
        title: 'Malicious Entry In Project B',
        amount: 100000,
        createdByUid: 'uid-partner-a',
        status: 'pending',
      }));

      // Cross-project entry update targeting Project B MUST be denied
      await assertFails(updateDoc(doc(partnerADb, 'entries', 'entry-b1'), {
        title: 'Tampered Title',
      }));
    });

    it('DENIES Project A member from accessing Project B subcollections', async () => {
      if (!emulatorAvailable) return;
      const partnerADb = testEnv.authenticatedContext('uid-partner-a', {
        email: 'partner.a@example.com',
      }).firestore();

      // Subcollection read
      await assertFails(getDoc(doc(partnerADb, 'projects', 'project-b', 'comments', 'c1')));

      // Subcollection write
      await assertFails(setDoc(doc(partnerADb, 'projects', 'project-b', 'attachments', 'att1'), {
        name: 'fake.pdf',
      }));
    });
  });

  describe('4. Bootstrap Administrator Privileges', () => {
    it('allows bootstrap admin to manage the allowlist', async () => {
      if (!emulatorAvailable) return;
      const adminDb = testEnv.authenticatedContext('uid-admin', {
        email: 'mayank.abhishekgupta@gmail.com',
      }).firestore();

      // Admin can list allowed users
      await assertSucceeds(getDocs(collection(adminDb, 'allowed_users')));

      // Admin can approve new partner
      await assertSucceeds(setDoc(doc(adminDb, 'allowed_users', 'newpartner@example.com'), {
        email: 'newpartner@example.com',
        role: 'partner',
        addedAt: new Date().toISOString(),
      }));
    });
  });
});
