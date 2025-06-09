import {
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  setPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
  signOut,
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { firebaseAuth } from './firebaseConfig';

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();
const auth = getAuth();

// Sign in with Google functionality
export const signInWithGoogle = async () => {
  try {
    return setPersistence(firebaseAuth, browserSessionPersistence).then(async () => {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      return {
        success: true,
        user: result.user,
        error: null,
      };
    });
  } catch (error: any) {
    return {
      success: false,
      user: null,
      error: error.message,
    };
  }
};

// Sign in with GitHub functionality
export const signInWithGithub = async () => {
  try {
    return setPersistence(firebaseAuth, browserSessionPersistence).then(async () => {
      const result = await signInWithPopup(firebaseAuth, githubProvider);
      return {
        success: true,
        user: result.user,
        error: null,
      };
    });
  } catch (error: any) {
    return {
      success: false,
      user: null,
      error: error.message,
    };
  }
};

// Sign in with email and password

export async function signInWithCredentials(email: string, password: string) {
  try {
    return setPersistence(firebaseAuth, browserSessionPersistence).then(async () => {
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      return {
        success: true,
        user: userCredential.user,
        error: null,
      };
    });
  } catch (error: any) {
    return {
      success: false,
      user: null,
      error: error.message || 'Failed to sign in with email/password',
    };
  }
}

export async function registerWithEmailAndPassword(email: string, password: string, name: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: name });
    }
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Registration error' };
  }
}

// Sign out functionality
export const firebaseSignOut = async () => {
  try {
    await signOut(firebaseAuth);
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// Auth state observer
export const onAuthStateChanged = (callback: (user: any) => void) => {
  return firebaseAuth.onAuthStateChanged(callback);
};
