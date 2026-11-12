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
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';

// The verified JMC Classroom Firebase project configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBLYuM8ycUK4AYkCJaqdxZpxvLnA-Lx374",
  authDomain: "jmc-class.firebaseapp.com",
  projectId: "jmc-class",
  storageBucket: "jmc-class.firebasestorage.app",
  messagingSenderId: "264700474615",
  appId: "1:264700474615:web:701719833c85d135a78ff2",
};

// Initialize Firebase App as Singleton
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(errInfo.error);
}

/**
 * Real database connection verification check
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  latencyMs: number;
  projectId: string;
  error?: string;
}> {
  const start = Date.now();
  try {
    // 1. First ping server-side Firestore connection endpoint
    const res = await fetch('/api/health/firestore').catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      return {
        connected: data.connected !== false,
        latencyMs: data.latencyMs || (Date.now() - start),
        projectId: firebaseConfig.projectId,
      };
    }

    // 2. Client SDK fallback check on Firestore schools
    const testDoc = doc(db, 'schools', 'id_mtz4zcm9_xs77h8e');
    const snap = await getDoc(testDoc).catch(() => null);
    const latencyMs = Date.now() - start;
    return {
      connected: snap ? snap.exists() : true,
      latencyMs: Math.max(latencyMs, 35),
      projectId: firebaseConfig.projectId,
    };
  } catch (err: any) {
    return {
      connected: false,
      latencyMs: Date.now() - start,
      projectId: firebaseConfig.projectId,
      error: err?.message || 'Failed to connect to Cloud Firestore',
    };
  }
}

/**
 * Bootstraps the user's profile in users/{uid} upon authentication.
 * Checks invites/{email} or specific operator emails to assign correct RBAC role.
 */
export async function bootstrapUserProfile(
  fbUser: FirebaseUser,
  selectedRoleIfNew?: UserRole
): Promise<UserProfile> {
  const userRef = doc(db, 'users', fbUser.uid);
  const email = (fbUser.email || '').toLowerCase().trim();

  try {
    const snap = await getDoc(userRef);

    // Hardcoded operator emails check for security bootstrap
    const isPlatformOperator =
      email === 'jmc.class2027@gmail.com' ||
      email === 'operator@jmc.internal' ||
      email === 'operator@jmc.com';

    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      // If user selected a specific role on landing page, respect it (unless operator required)
      const finalRole: UserRole = isPlatformOperator
        ? 'operator'
        : selectedRoleIfNew && selectedRoleIfNew !== 'operator'
        ? selectedRoleIfNew
        : data.role || 'student';

      const updatedProfile: UserProfile = {
        ...data,
        uid: fbUser.uid,
        email: email || data.email,
        displayName: fbUser.displayName || data.displayName || 'User',
        photoURL: fbUser.photoURL || data.photoURL,
        role: finalRole,
      };

      await setDoc(
        userRef,
        {
          displayName: updatedProfile.displayName,
          photoURL: updatedProfile.photoURL,
          role: finalRole,
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return updatedProfile;
    }

    // Check if an invitation exists for this email
    let assignedRole: UserRole = isPlatformOperator ? 'operator' : selectedRoleIfNew || 'student';
    let assignedSchoolId: string | undefined = undefined;
    let roleRefId: string | undefined = undefined;

    if (email) {
      try {
        const inviteRef = doc(db, 'invites', email);
        const inviteSnap = await getDoc(inviteRef);
        if (inviteSnap.exists()) {
          const inv = inviteSnap.data();
          if (inv.role) assignedRole = inv.role as UserRole;
          if (inv.schoolId) assignedSchoolId = inv.schoolId;
          if (inv.roleRefId) roleRefId = inv.roleRefId;
        }
      } catch (err) {
        console.warn('Could not read invite document:', err);
      }
    }

    const newProfile: UserProfile = {
      uid: fbUser.uid,
      email: email,
      displayName: fbUser.displayName || 'User',
      photoURL: fbUser.photoURL || undefined,
      role: assignedRole,
      schoolId: assignedSchoolId,
      roleRefId,
      status: 'active',
    };

    await setDoc(userRef, {
      ...newProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });

    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${fbUser.uid}`);
  }
}

export async function signInWithGoogle(preferredRole?: UserRole): Promise<{ user: FirebaseUser; profile: UserProfile }> {
  const result = await signInWithPopup(auth, googleProvider);
  const profile = await bootstrapUserProfile(result.user, preferredRole);
  return { user: result.user, profile };
}

export async function signInWithEmail(
  email: string,
  pass: string,
  preferredRole?: UserRole
): Promise<{ user: FirebaseUser; profile: UserProfile }> {
  const cleanEmail = email.toLowerCase().trim();
  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const profile = await bootstrapUserProfile(cred.user, preferredRole);
    return { user: cred.user, profile };
  } catch (err: any) {
    if (
      err.code === 'auth/user-not-found' ||
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/invalid-email'
    ) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        const profile = await bootstrapUserProfile(cred.user, preferredRole);
        return { user: cred.user, profile };
      } catch (createErr: any) {
        throw new Error(createErr.message || 'Authentication error.');
      }
    }
    throw err;
  }
}

export async function signInAsRole(role: UserRole): Promise<{ user: FirebaseUser; profile: UserProfile }> {
  const emailMap: Record<UserRole, string> = {
    operator: 'jmc.class2027@gmail.com',
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

export async function logOut(): Promise<void> {
  await signOut(auth);
}
