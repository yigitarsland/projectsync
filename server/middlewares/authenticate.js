const admin = require('firebase-admin');
const User = require('../models/User'); // your user mongoose model

if (!admin.apps.length) {
  const serviceAccount = require('../config/serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  console.log('Auth header:', authHeader);
  const idToken = authHeader.split(' ')[1];
  if (!idToken) {
    console.log('No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Try to find user in MongoDB by firebaseUid
    let user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      console.log(`User not found for UID: ${decodedToken.uid}, creating new user...`);

      // Fetch full user record from Firebase to get displayName and email
      const firebaseUser = await admin.auth().getUser(decodedToken.uid);

      user = new User({
        firebaseUid: decodedToken.uid,
        name: firebaseUser.displayName || "Unnamed User",
        email: firebaseUser.email || "",
      });

      await user.save();
      console.log('New user created:', user);
    }

    // Attach full user object to req.user
    req.user = user;

    next();
  } catch (err) {
    console.error('Firebase token verification failed:', err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = authenticate;
