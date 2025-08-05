import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { CheckCircle2, User, Mail } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const GitHubIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const GoogleIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const getProviderInfo = (authProvider: string) => {
  switch (authProvider) {
    case 'github':
      return {
        name: 'GitHub',
        icon: <GitHubIcon />,
        description: 'Connected via GitHub OAuth'
      };
    case 'google':
      return {
        name: 'Google',
        icon: <GoogleIcon />,
        description: 'Connected via Google OAuth'
      };
    case 'local':
    default:
      return {
        name: 'Email & Password',
        icon: <Mail className="w-5 h-5" />,
        description: 'Traditional email and password authentication'
      };
  }
};

export function LinkedAccounts() {
  const { user } = useAuth();
  
  if (!user) {
    return null;
  }

  const authProvider = user.auth_provider || 'local';
  const providerInfo = getProviderInfo(authProvider);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          <span>Account Information</span>
        </CardTitle>
        <CardDescription>
          Your current authentication method and account details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Authentication Method */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            {providerInfo.icon}
            <div>
              <div className="font-medium">Authentication Method</div>
              <div className="text-sm text-muted-foreground">
                {providerInfo.description}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-green-600 dark:text-green-400 font-medium">
              Currently signed in with {providerInfo.name}
            </span>
          </div>
        </div>

        {/* Account Details */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <div className="mt-1 text-sm">{user.email}</div>
            </div>
            
            {user.display_name && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Display Name</label>
                <div className="mt-1 text-sm">{user.display_name}</div>
              </div>
            )}
          </div>

          {user.avatar_url && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Avatar</label>
              <div className="mt-2">
                <img
                  src={user.avatar_url}
                  alt="User avatar"
                  className="w-12 h-12 rounded-full object-cover border"
                />
              </div>
            </div>
          )}
        </div>

        {/* Info for OAuth users */}
        {authProvider !== 'local' && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>OAuth Authentication:</strong> Your account is securely linked with {providerInfo.name}. 
              You can sign in quickly without remembering a password.
            </p>
          </div>
        )}

        {/* Info for local users */}
        {authProvider === 'local' && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-300">
              <strong>Password Authentication:</strong> Your account uses traditional email and password authentication. 
              Consider linking with OAuth providers for faster sign-in.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}