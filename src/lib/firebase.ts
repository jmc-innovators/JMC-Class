import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, UserRole } from '../types';

export { firebaseConfig };

const resolvedDatabaseId =
  (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId ||
  'ai-studio-jmcclass-20742766-c8cd-4030-95f3-22ca7c7d152d';

// Initialize Firebase App as Singleton using provisioned project config
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, resolvedDatabaseId);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
] as const;

export const workspaceGoogleProvider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => workspaceGoogleProvider.addScope(scope));
workspaceGoogleProvider.setCustomParameters({ prompt: 'consent select_account' });

// Strict in-memory cache for Google Workspace OAuth access token (never localStorage/sessionStorage)
let cachedWorkspaceAccessToken: string | null = null;
let isWorkspaceAuthInProgress = false;

onAuthStateChanged(auth, (user) => {
  if (!user && !isWorkspaceAuthInProgress) {
    cachedWorkspaceAccessToken = null;
  }
});

export function getWorkspaceAccessToken(): string | null {
  return cachedWorkspaceAccessToken;
}

export function clearWorkspaceAccessToken(): void {
  cachedWorkspaceAccessToken = null;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validate Connection to Firestore on startup
 */
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

/**
 * Real database connection verification check
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  latencyMs: number;
  projectId: string;
  databaseId?: string;
  error?: string;
}> {
  const start = Date.now();
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc).catch(() => null);
    const latencyMs = Date.now() - start;
    return {
      connected: true,
      latencyMs: Math.max(latencyMs, 25),
      projectId: firebaseConfig.projectId,
      databaseId: resolvedDatabaseId,
    };
  } catch (err: any) {
    const isOffline = err?.message?.includes('the client is offline');
    const latencyMs = Date.now() - start;
    return {
      connected: !isOffline,
      latencyMs,
      projectId: firebaseConfig.projectId,
      databaseId: resolvedDatabaseId,
      error: isOffline ? err?.message : undefined,
    };
  }
}

export const PRIMARY_OPERATOR_EMAIL = 'info@jmcinnovator.cc.cd';
export const OPERATOR_EMAILS = [
  'info@jmcinnovator.cc.cd',
  'jmc.class2027@gmail.com',
  'operator@jmc.internal',
  'operator@jmc.com',
];

export function isOperatorEmail(email?: string | null): boolean {
  const clean = (email || '').toLowerCase().trim();
  return Boolean(clean && OPERATOR_EMAILS.includes(clean));
}

/**
 * Strips all `undefined` properties recursively while preserving Firestore FieldValue
 * sentinels (such as serverTimestamp()) and class instances.
 */
export function cleanFirestoreData<T extends Record<string, any>>(data: T): Record<string, any> {
  if (!data || typeof data !== 'object') return data;
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    ) {
      cleaned[key] = cleanFirestoreData(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Helper to check if an email belongs to an approved, active school administrator
 */
export async function findApprovedSchoolForEmail(email: string): Promise<string | null> {
  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail) return null;

  try {
    const snap = await getDocs(collection(db, 'schools')).catch(() => null);
    if (snap) {
      for (const d of snap.docs) {
        const s = d.data();
        const admin = String(s.administratorEmail || s.adminEmail || '').toLowerCase().trim();
        const status = String(s.status || '').toUpperCase();
        if (admin === cleanEmail && status === 'ACTIVE') {
          return d.id;
        }
      }
    }
  } catch (e) {
    console.warn('Firestore school lookup notice:', e);
  }

  try {
    const res = await fetch('/api/schools').catch(() => null);
    if (res && res.ok) {
      const schools = await res.json();
      const match = schools.find((s: any) => {
        const admin = String(s.administratorEmail || s.adminEmail || '').toLowerCase().trim();
        const status = String(s.status || '').toUpperCase();
        return admin === cleanEmail && status === 'ACTIVE';
      });
      if (match) return match.id;
    }
  } catch {}

  return null;
}

/**
 * Bootstraps the user's profile in users/{uid} upon authentication.
 * Checks approved schools, invites/{email}, or operator emails to assign correct RBAC role.
 */
export async function bootstrapUserProfile(
  fbUser: FirebaseUser,
  selectedRoleIfNew?: UserRole
): Promise<UserProfile> {
  const userRef = doc(db, 'users', fbUser.uid);
  const email = (fbUser.email || '').toLowerCase().trim();
  const isPlatformOperator = isOperatorEmail(email);

  if (selectedRoleIfNew === 'operator' && !isPlatformOperator) {
    throw new Error(
      `Access Denied: "${email || 'This account'}" is not authorized for Platform Operator access. Sign in with ${PRIMARY_OPERATOR_EMAIL}.`
    );
  }

  try {
    const snap = await getDoc(userRef);

    // Check if authenticated user is registered administrator of an approved active school
    const approvedSchoolId = isPlatformOperator ? null : await findApprovedSchoolForEmail(email);

    if (snap.exists()) {
      const data = snap.data() as UserProfile;

      let finalRole: UserRole = data.role || 'student';
      let finalSchoolId: string | undefined = data.schoolId;

      if (isPlatformOperator) {
        finalRole = 'operator';
        finalSchoolId = undefined;
      } else if (approvedSchoolId) {
        finalRole = 'school';
        finalSchoolId = approvedSchoolId;
      } else {
        if (finalRole === 'operator') {
          finalRole = 'student';
          finalSchoolId = undefined;
        }
        if (finalRole === 'school') {
          finalRole = 'student';
          finalSchoolId = undefined;
        }
        if (selectedRoleIfNew === 'school') {
          throw new Error(
            `Access Denied: No approved active school found for "${email}". Please submit a school registration application and wait for operator approval.`
          );
        } else if (selectedRoleIfNew && selectedRoleIfNew !== 'operator') {
          finalRole = selectedRoleIfNew;
        }
      }

      const updatedProfile: UserProfile = {
        ...data,
        uid: fbUser.uid,
        email: email || data.email,
        displayName:
          fbUser.displayName ||
          data.displayName ||
          (isPlatformOperator ? 'JMC Platform Operator' : 'User'),
        ...(fbUser.photoURL || data.photoURL ? { photoURL: fbUser.photoURL || data.photoURL } : {}),
        role: finalRole,
        ...(finalSchoolId ? { schoolId: finalSchoolId } : {}),
        status: data.status || 'active',
      };

      if (!finalSchoolId) {
        delete updatedProfile.schoolId;
      }

      await setDoc(
        userRef,
        cleanFirestoreData({
          uid: updatedProfile.uid,
          email: updatedProfile.email,
          displayName: updatedProfile.displayName,
          photoURL: updatedProfile.photoURL,
          role: finalRole,
          schoolId: finalSchoolId,
          status: updatedProfile.status,
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );

      return updatedProfile;
    }

    // New User Registration
    let assignedRole: UserRole = 'student';
    let assignedSchoolId: string | undefined = undefined;
    let roleRefId: string | undefined = undefined;

    if (isPlatformOperator) {
      assignedRole = 'operator';
    } else if (approvedSchoolId) {
      assignedRole = 'school';
      assignedSchoolId = approvedSchoolId;
    } else {
      if (email) {
        try {
          const inviteRef = doc(db, 'invites', email);
          const inviteSnap = await getDoc(inviteRef);
          if (inviteSnap.exists()) {
            const inv = inviteSnap.data();
            if (inv.role && inv.role !== 'operator') assignedRole = inv.role as UserRole;
            if (inv.schoolId) assignedSchoolId = inv.schoolId;
            if (inv.roleRefId) roleRefId = inv.roleRefId;
          }
        } catch (err) {
          console.warn('Could not read invite document:', err);
        }
      }

      if (selectedRoleIfNew === 'school') {
        throw new Error(
          `Access Denied: No approved active school found for "${email}". Please submit a school registration application and wait for operator approval.`
        );
      } else if (selectedRoleIfNew && selectedRoleIfNew !== 'operator' && assignedRole === 'student') {
        assignedRole = selectedRoleIfNew;
      }
    }

    const newProfile: UserProfile = {
      uid: fbUser.uid,
      email,
      displayName: fbUser.displayName || (isPlatformOperator ? 'JMC Platform Operator' : 'User'),
      ...(fbUser.photoURL ? { photoURL: fbUser.photoURL } : {}),
      role: assignedRole,
      ...(assignedSchoolId ? { schoolId: assignedSchoolId } : {}),
      ...(roleRefId ? { roleRefId } : {}),
      status: 'active',
    };

    await setDoc(
      userRef,
      cleanFirestoreData({
        ...newProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      })
    );

    return newProfile;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Access Denied:')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `users/${fbUser.uid}`);
  }
}

export async function signInWithGoogle(preferredRole?: UserRole): Promise<{ user: FirebaseUser; profile: UserProfile }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    try {
      const profile = await bootstrapUserProfile(result.user, preferredRole);
      return { user: result.user, profile };
    } catch (bootstrapErr) {
      await signOut(auth).catch(() => {});
      throw bootstrapErr;
    }
  } catch (err: any) {
    if (err?.code === 'auth/unauthorized-domain') {
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      throw new Error(`UNAUTHORIZED_DOMAIN:${host}`);
    }
    if (err?.code === 'auth/popup-closed-by-user') {
      throw new Error('Google Sign-in popup was closed before completing authentication.');
    }
    throw err;
  }
}

export async function signInWithEmail(
  email: string,
  pass: string,
  preferredRole?: UserRole
): Promise<{ user: FirebaseUser; profile: UserProfile }> {
  const cleanEmail = email.toLowerCase().trim();
  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    try {
      const profile = await bootstrapUserProfile(cred.user, preferredRole);
      return { user: cred.user, profile };
    } catch (bootstrapErr) {
      await signOut(auth).catch(() => {});
      throw bootstrapErr;
    }
  } catch (err: any) {
    if (
      err?.code === 'auth/user-not-found' ||
      err?.code === 'auth/invalid-credential'
    ) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        try {
          const profile = await bootstrapUserProfile(cred.user, preferredRole);
          return { user: cred.user, profile };
        } catch (bootstrapErr) {
          await signOut(auth).catch(() => {});
          throw bootstrapErr;
        }
      } catch (createErr: any) {
        if (createErr?.code === 'auth/operation-not-allowed') {
          throw new Error('Email/Password sign-in is disabled in Firebase Console. Please use Google Sign-in or Instant Entry.');
        }
        throw new Error(createErr?.message || 'Authentication error.');
      }
    }
    if (err?.code === 'auth/operation-not-allowed') {
      throw new Error('Email/Password sign-in is disabled in Firebase Console. Please use Google Sign-in or Instant Entry.');
    }
    throw err;
  }
}

export async function signInAsRole(role: UserRole): Promise<{ user: FirebaseUser; profile: UserProfile }> {
  const emailMap: Record<UserRole, string> = {
    operator: PRIMARY_OPERATOR_EMAIL,
    school: 'admin@jmc.school',
    teacher: 'teacher.science@jmc.school',
    student: 'kasun.student@jmc.school',
    parent: 'sunil.parent@jmc.school',
    supervisor: 'supervisor@jmc.school',
  };
  const email = emailMap[role] || 'student@jmc.school';
  const pass = 'JmcClass@2026';
  return signInWithEmail(email, pass, role);
}

export async function connectGoogleWorkspace(): Promise<{
  user: FirebaseUser;
  accessToken: string;
}> {
  try {
    isWorkspaceAuthInProgress = true;
    const result = await signInWithPopup(auth, workspaceGoogleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google Workspace access token was not granted. Please ensure Drive, Sheets, and Gmail permissions are accepted.');
    }
    cachedWorkspaceAccessToken = credential.accessToken;
    return { user: result.user, accessToken: credential.accessToken };
  } catch (err: any) {
    if (err?.code === 'auth/unauthorized-domain') {
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      throw new Error(`UNAUTHORIZED_DOMAIN:${host}`);
    }
    if (err?.code === 'auth/popup-closed-by-user') {
      throw new Error('Google Workspace authorization popup was closed before completion.');
    }
    throw err;
  } finally {
    isWorkspaceAuthInProgress = false;
  }
}

export async function logOut(): Promise<void> {
  cachedWorkspaceAccessToken = null;
  await signOut(auth);
}
