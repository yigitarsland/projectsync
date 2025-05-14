import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import axios from 'axios';
import { User } from '../types';

interface LoginProps {
  auth: Auth;
}

const Login: React.FC<LoginProps> = ({ auth }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<'project_manager' | 'team_member'>('team_member');
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      let userCredential;
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const token = await userCredential.user.getIdToken();
        await axios.post(
          'http://localhost:5000/api/users',
          { firebaseUid: userCredential.user.uid, email, name, role },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white p-6 rounded shadow-md w-80">
        <h2 className="text-xl font-bold mb-4">{isSignUp ? 'Sign Up' : 'Login'}</h2>
        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="mb-4">
              <label className="block text-gray-700">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          )}
          <div className="mb-4">
            <label className="block text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          {isSignUp && (
            <div className="mb-4">
              <label className="block text-gray-700">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'project_manager' | 'team_member')}
                className="w-full p-2 border rounded"
              >
                <option value="team_member">Team Member</option>
                <option value="project_manager">Project Manager</option>
              </select>
            </div>
          )}
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
            {isSignUp ? 'Sign Up' : 'Login'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-500 hover:underline"
          >
            {isSignUp ? 'Login' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;