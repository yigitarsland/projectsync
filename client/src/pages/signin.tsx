'use client';
import * as React from 'react';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import { SignInPage } from '@toolpad/core/SignInPage';
import { Navigate, useNavigate } from 'react-router';
import { useSession } from '../SessionContext';
import {
  signInWithGoogle,
  signInWithGithub,
  signInWithCredentials,
  registerWithEmailAndPassword,
} from '../firebase/auth';

// Move Container outside to avoid recreation on every render
const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ height: '100vh', overflowY: 'auto', p: 2 }}>
    <Box sx={{ maxWidth: 400, width: '100%', mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {children}
    </Box>
  </Box>
);

export default function SignIn() {
  const { session, setSession, loading } = useSession();
  const navigate = useNavigate();

  // Mode toggles
  const [isRegister, setIsRegister] = React.useState(false);

  // Shared form fields
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');

  // Registration feedback
  const [registerError, setRegisterError] = React.useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = React.useState(false);

  const handleRegister = async () => {
    setRegisterError(null);
    setRegisterLoading(true);
    try {
      if (!name || !email || !password) {
        setRegisterError('Name, email and password are required');
        return;
      }
      const result = await registerWithEmailAndPassword(email, password, name);
      if (result.success && result.user) {
        setSession({ user: { name: result.user.displayName || '', email: result.user.email || '', image: result.user.photoURL || '' } });
        navigate('/', { replace: true });
      } else {
        setRegisterError(result.error || 'Registration failed');
      }
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setRegisterLoading(false);
    }
  };

  // Main render
  return (
    <Container>
      {loading ? (
        <LinearProgress sx={{ width: '100%' }} />
      ) : session ? (
        <Navigate to="/" />
      ) : isRegister ? (
        <>
          <Typography variant="h5">Register</Typography>
          {registerError && <Alert severity="error">{registerError}</Alert>}
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            autoFocus
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
          />
          <Button variant="contained" onClick={handleRegister} disabled={registerLoading}>
            {registerLoading ? 'Registering...' : 'Register'}
          </Button>
          <Button onClick={() => setIsRegister(false)}>Back to Sign In</Button>
        </>
      ) : (
        <>
          <SignInPage
            providers={[
              { id: 'google', name: 'Google' },
              { id: 'github', name: 'GitHub' },
              { id: 'credentials', name: 'Credentials' },
            ]}
            signIn={async (provider, formData, callbackUrl) => {
              console.log('signIn called with:', { provider, formData, callbackUrl });

              try {
                let result;
                if (provider.id === 'google') {
                  result = await signInWithGoogle();
                } else if (provider.id === 'github') {
                  result = await signInWithGithub();
                } else {
                  const email = formData.get('email')?.toString() || '';
                  const password = formData.get('password')?.toString() || '';
                  console.log('credentials:', { email, password });

                  if (!email || !password) return { error: 'Email and password are required' };

                  result = await signInWithCredentials(email, password);
                }
                if (result?.success && result.user) {
                  setSession({ user: { name: result.user.displayName || '', email: result.user.email || '', image: result.user.photoURL || '' } });
                  navigate(callbackUrl || '/', { replace: true });
                  return {};
                }
                return { error: result?.error || 'Failed to sign in' };
              } catch (error) {
                return { error: error instanceof Error ? error.message : 'An error occurred' };
              }
            }}


            // slots={{ subtitle: () => <Alert severity="info">Use <strong>toolpad-demo@mui.com</strong>/<strong>@demo1</strong></Alert> }}
            slotProps={{emailField: { name: 'email', placeholder: 'E-mail*' }, passwordField: { name: 'password', placeholder: 'Password*' },}}
          />

          <Box sx={{ textAlign: 'center', display: 'flex', justifyContent: 'center', mt: -20 }}>
            <Typography variant="body2">
              Don’t have an account?{' '}
              <Link component="button" onClick={() => setIsRegister(true)}>
                Register
              </Link>
            </Typography>
          </Box>
        </>
      )}
    </Container>
  );
}
