// authUtils.ts
import { firebaseAuth } from './firebaseConfig';

export const getIdToken = async (): Promise<string | null> => {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  return await user.getIdToken(true);
};
