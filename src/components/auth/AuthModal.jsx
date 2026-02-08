import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle, KeyRound } from 'lucide-react';

export default function AuthModal({
  open,
  onOpenChange,
  onGoogleSignIn,
  onEmailSignIn,
  onEmailSignUp,
  onPasswordReset,
  onUpdatePassword,
  initialMode = 'choose',
  forceMode = null, // used to force 'reset-password' from outside
}) {
  const [mode, setMode] = useState(forceMode || initialMode);
  // 'choose', 'signin', 'signup', 'confirm', 'forgot', 'reset-sent', 'reset-password', 'reset-done'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync forceMode when it changes
  React.useEffect(() => {
    if (forceMode) {
      setMode(forceMode);
      setError('');
      setLoading(false);
    }
  }, [forceMode]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setLoading(false);
    setMode(initialMode);
  };

  const handleClose = (open) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await onGoogleSignIn();
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await onEmailSignIn(email, password);
      handleClose(false);
    } catch (err) {
      setError(err.message || 'Invalid email or password');
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await onEmailSignUp(email, password);
      setMode('confirm');
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to create account');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onPasswordReset(email);
      setMode('reset-sent');
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onUpdatePassword(password);
      setMode('reset-done');
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to update password');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {/* Choose method */}
        {mode === 'choose' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">Welcome to atCollege</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-center text-gray-500 mb-6">
                Sign in to your account
              </p>
              
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-6 text-lg bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Sign in with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-gray-500">or</span>
                </div>
              </div>

              <Button
                onClick={() => { setLoading(false); setError(''); setMode('signin'); }}
                variant="outline"
                className="w-full py-6 text-lg"
              >
                <Mail className="w-5 h-5 mr-2" />
                Sign in with Email
              </Button>

              <p className="text-center text-sm text-gray-500">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setLoading(false); setError(''); setMode('choose-signup'); }}
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Sign up
                </button>
              </p>
            </div>
          </>
        )}

        {/* Choose method - Sign Up focused */}
        {mode === 'choose-signup' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">Create Your Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-center text-gray-500 mb-6">
                Join atCollege to discover campus life
              </p>
              
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-6 text-lg bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Sign up with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-gray-500">or</span>
                </div>
              </div>

              <Button
                onClick={() => { setLoading(false); setError(''); setMode('signup'); }}
                variant="outline"
                className="w-full py-6 text-lg"
              >
                <Mail className="w-5 h-5 mr-2" />
                Sign up with Email
              </Button>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setLoading(false); setError(''); setMode('choose'); }}
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Sign in
                </button>
              </p>
            </div>
          </>
        )}

        {/* Sign In */}
        {mode === 'signin' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">Sign In</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEmailSignIn} className="space-y-4 py-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => { setError(''); setMode('forgot'); }}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-6 text-lg bg-orange-500 hover:bg-orange-600"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
              </Button>

              <p className="text-center text-sm text-gray-500">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setLoading(false); setError(''); setMode('choose-signup'); }}
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Sign up
                </button>
              </p>
              
              <button
                type="button"
                onClick={() => { setLoading(false); setError(''); setMode('choose'); }}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
              >
                &larr; Back to options
              </button>
            </form>
          </>
        )}

        {/* Forgot Password */}
        {mode === 'forgot' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">Reset Password</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleForgotPassword} className="space-y-4 py-4">
              <p className="text-center text-gray-500 text-sm">
                Enter your email and we'll send you a link to reset your password.
              </p>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full py-6 text-lg bg-orange-500 hover:bg-orange-600"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
              </Button>

              <button
                type="button"
                onClick={() => { setLoading(false); setError(''); setMode('signin'); }}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
              >
                &larr; Back to sign in
              </button>
            </form>
          </>
        )}

        {/* Reset Email Sent */}
        {mode === 'reset-sent' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">Check Your Email</DialogTitle>
            </DialogHeader>
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-gray-600">
                We've sent a password reset link to:
              </p>
              <p className="font-medium text-gray-900">{email}</p>
              <p className="text-sm text-gray-500">
                Click the link in the email to reset your password. The link will expire in 1 hour.
              </p>
              <p className="text-xs text-gray-400">
                Don't see it? Check your spam folder.
              </p>
              <Button
                onClick={() => handleClose(false)}
                className="mt-4 bg-orange-500 hover:bg-orange-600"
              >
                Got it
              </Button>
            </div>
          </>
        )}

        {/* Set New Password (after clicking reset link) */}
        {mode === 'reset-password' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">Set New Password</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdatePassword} className="space-y-4 py-4">
              <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                <KeyRound className="w-6 h-6 text-orange-600" />
              </div>
              <p className="text-center text-gray-500 text-sm">
                Choose a new password for your account.
              </p>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-6 text-lg bg-orange-500 hover:bg-orange-600"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
              </Button>
            </form>
          </>
        )}

        {/* Password Reset Complete */}
        {mode === 'reset-done' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">Password Updated</DialogTitle>
            </DialogHeader>
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-gray-600">
                Your password has been updated successfully.
              </p>
              <p className="text-sm text-gray-500">
                You're now signed in with your new password.
              </p>
              <Button
                onClick={() => handleClose(false)}
                className="mt-4 bg-orange-500 hover:bg-orange-600"
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {/* Sign Up */}
        {mode === 'signup' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">Create Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEmailSignUp} className="space-y-4 py-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-6 text-lg bg-orange-500 hover:bg-orange-600"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
              </Button>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setLoading(false); setError(''); setMode('choose'); }}
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Sign in
                </button>
              </p>
              
              <button
                type="button"
                onClick={() => { setLoading(false); setError(''); setMode('choose-signup'); }}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
              >
                &larr; Back to options
              </button>
            </form>
          </>
        )}

        {/* Email Confirmation Sent */}
        {mode === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">Check Your Email</DialogTitle>
            </DialogHeader>
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-gray-600">
                We've sent a confirmation link to:
              </p>
              <p className="font-medium text-gray-900">{email}</p>
              <p className="text-sm text-gray-500">
                Click the link in the email to verify your account and complete registration.
              </p>
              <Button
                onClick={() => handleClose(false)}
                className="mt-4 bg-orange-500 hover:bg-orange-600"
              >
                Got it
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
