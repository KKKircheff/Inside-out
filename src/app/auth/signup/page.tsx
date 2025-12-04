'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Link as MuiLink,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { initializeUserProfile } from '@/app/actions/profile';

export default function SignupPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signUp(email, password, name);

      // Initialize user profile in Firestore
      await initializeUserProfile(userCredential.user.uid, email, name);

      router.push('/'); // Redirect to home after successful signup
    } catch (err: any) {
      console.error('Sign up error:', err);

      // Handle specific Firebase error codes
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setLoading(true);

    try {
      const userCredential = await signInWithGoogle();

      // Initialize user profile in Firestore (if new user)
      await initializeUserProfile(
        userCredential.user.uid,
        userCredential.user.email || '',
        userCredential.user.displayName || undefined
      );

      router.push('/'); // Redirect to home after successful signup
    } catch (err: any) {
      console.error('Google sign up error:', err);

      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign up was cancelled.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by the browser. Please allow popups and try again.');
      } else {
        setError(err.message || 'Failed to sign up with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: 4,
            borderRadius: 2,
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom align="center" fontWeight="bold">
            Create Account
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Join Inside Out to start making better decisions
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Stack spacing={3}>
            {/* Google Sign Up Button */}
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleSignUp}
              disabled={loading}
              sx={{
                borderColor: '#4285f4',
                color: '#4285f4',
                '&:hover': {
                  borderColor: '#357ae8',
                  bgcolor: 'rgba(66, 133, 244, 0.04)',
                },
              }}
            >
              Continue with Google
            </Button>

            <Divider>OR</Divider>

            {/* Email/Password Form */}
            <Box component="form" onSubmit={handleEmailSignUp}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Full Name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  disabled={loading}
                />

                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={loading}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  helperText="At least 6 characters"
                />

                <TextField
                  fullWidth
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                    },
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
                </Button>
              </Stack>
            </Box>

            {/* Links */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <MuiLink component={Link} href="/auth/login" underline="hover" fontWeight="medium">
                  Sign In
                </MuiLink>
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
