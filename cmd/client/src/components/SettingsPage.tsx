import { useState, useEffect } from 'react';
import { Settings, Key, Save, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { settingsApi } from '../api/settings.api';
import type { UserSettings, UpdateUserSettingsRequest } from '../types/settings.types';
import { toast } from 'sonner';
import { LinkedAccounts } from './LinkedAccounts';

export function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<UpdateUserSettingsRequest>({});
  const [showKeys, setShowKeys] = useState({
    anthropic: false,
    openai: false,
    gemini: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await settingsApi.getSettings();
      setSettings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      const updatedSettings = await settingsApi.updateSettings(formData);
      setSettings(updatedSettings);
      setFormData({});
      toast.success('Settings updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleKeyVisibility = (key: 'anthropic' | 'openai' | 'gemini') => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="text-muted-foreground">
                Manage your account settings and API configurations
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* API Keys Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-primary" />
              <span>API Keys</span>
            </CardTitle>
            <CardDescription>
              Configure your API keys for different LLM providers. These keys are encrypted and stored securely.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Anthropic API Key */}
            <div className="space-y-2">
              <Label htmlFor="anthropic_key" className="text-sm font-medium">
                Anthropic API Key
              </Label>
              <div className="relative">
                <Input
                  id="anthropic_key"
                  type={showKeys.anthropic ? "text" : "password"}
                  placeholder={settings?.anthropic_api_key || "sk-ant-..."}
                  value={formData.anthropic_api_key || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    anthropic_api_key: e.target.value 
                  }))}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-7 w-7"
                  onClick={() => toggleKeyVisibility('anthropic')}
                >
                  {showKeys.anthropic ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Required for Claude models (e.g., Claude 3.5 Sonnet)
              </p>
              {settings?.anthropic_api_key && (
                <p className="text-xs text-green-600 flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  API key configured
                </p>
              )}
            </div>

            {/* OpenAI API Key */}
            <div className="space-y-2">
              <Label htmlFor="openai_key" className="text-sm font-medium">
                OpenAI API Key
              </Label>
              <div className="relative">
                <Input
                  id="openai_key"
                  type={showKeys.openai ? "text" : "password"}
                  placeholder={settings?.openai_api_key || "sk-..."}
                  value={formData.openai_api_key || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    openai_api_key: e.target.value 
                  }))}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-7 w-7"
                  onClick={() => toggleKeyVisibility('openai')}
                >
                  {showKeys.openai ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Required for GPT models (e.g., GPT-4, GPT-4o)
              </p>
              {settings?.openai_api_key && (
                <p className="text-xs text-green-600 flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  API key configured
                </p>
              )}
            </div>

            {/* Gemini API Key */}
            <div className="space-y-2">
              <Label htmlFor="gemini_key" className="text-sm font-medium">
                Google Gemini API Key
              </Label>
              <div className="relative">
                <Input
                  id="gemini_key"
                  type={showKeys.gemini ? "text" : "password"}
                  placeholder={settings?.gemini_api_key || "Enter your Gemini API key"}
                  value={formData.gemini_api_key || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    gemini_api_key: e.target.value 
                  }))}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-7 w-7"
                  onClick={() => toggleKeyVisibility('gemini')}
                >
                  {showKeys.gemini ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Required for Gemini models (Coming soon)
              </p>
              {settings?.gemini_api_key && (
                <p className="text-xs text-green-600 flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  API key configured
                </p>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={isSaving || Object.keys(formData).length === 0}
                className="min-w-[120px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Linked Accounts Section */}
        <div className="mt-8">
          <LinkedAccounts />
        </div>

        {/* Info Section */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="text-sm font-medium mb-2">About API Keys</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Your API keys are encrypted and stored securely</li>
            <li>• Keys are never exposed in API responses</li>
            <li>• You need to configure API keys before creating agents</li>
            <li>• Each provider requires its own API key</li>
          </ul>
        </div>
      </div>
    </div>
  );
}