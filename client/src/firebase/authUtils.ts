// authUtils.ts
import { firebaseAuth } from './firebaseConfig';

export const getIdToken = async (): Promise<string> => {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("User not authenticated");
  return await user.getIdToken();
};
