import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Key, Shield, Upload, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SSOProvider {
  id: string;
  workspace_id: string;
  provider_type: 'saml' | 'oauth';
  enabled: boolean;
  domain: string | null;
  saml_metadata_xml: string | null;
  saml_metadata_url: string | null;
  oauth_client_id: string | null;
  oauth_client_secret: string | null;
  oauth_authorize_url: string | null;
  oauth_token_url: string | null;
  oauth_scopes: string | null;
}

interface SSOConfigPanelProps {
  workspaceId: string;
}

export function SSOConfigPanel({ workspaceId }: SSOConfigPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [samlProvider, setSamlProvider] = useState<SSOProvider | null>(null);
  const [oauthProvider, setOauthProvider] = useState<SSOProvider | null>(null);

  // SAML form state
  const [samlEnabled, setSamlEnabled] = useState(false);
  const [samlDomain, setSamlDomain] = useState('');
  const [samlMetadataXml, setSamlMetadataXml] = useState('');
  const [samlMetadataUrl, setSamlMetadataUrl] = useState('');

  // OAuth form state
  const [oauthEnabled, setOauthEnabled] = useState(false);
  const [oauthDomain, setOauthDomain] = useState('');
  const [oauthClientId, setOauthClientId] = useState('');
  const [oauthClientSecret, setOauthClientSecret] = useState('');
  const [oauthAuthorizeUrl, setOauthAuthorizeUrl] = useState('');
  const [oauthTokenUrl, setOauthTokenUrl] = useState('');
  const [oauthScopes, setOauthScopes] = useState('openid email profile');

  useEffect(() => {
    loadSSOProviders();
  }, [workspaceId]);

  const loadSSOProviders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workspace_sso_providers')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (error) throw error;

      const saml = data?.find((p) => p.provider_type === 'saml') || null;
      const oauth = data?.find((p) => p.provider_type === 'oauth') || null;

      setSamlProvider(saml as SSOProvider | null);
      setOauthProvider(oauth as SSOProvider | null);

      // Populate SAML form
      if (saml) {
        setSamlEnabled(saml.enabled);
        setSamlDomain(saml.domain || '');
        setSamlMetadataXml(saml.saml_metadata_xml || '');
        setSamlMetadataUrl(saml.saml_metadata_url || '');
      }

      // Populate OAuth form
      if (oauth) {
        setOauthEnabled(oauth.enabled);
        setOauthDomain(oauth.domain || '');
        setOauthClientId(oauth.oauth_client_id || '');
        setOauthClientSecret(oauth.oauth_client_secret || '');
        setOauthAuthorizeUrl(oauth.oauth_authorize_url || '');
        setOauthTokenUrl(oauth.oauth_token_url || '');
        setOauthScopes(oauth.oauth_scopes || 'openid email profile');
      }
    } catch (error) {
      console.error('Error loading SSO providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSamlFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSamlMetadataXml(content);
    };
    reader.readAsText(file);
  };

  const saveSamlConfig = async () => {
    setSaving(true);
    try {
      const config = {
        workspace_id: workspaceId,
        provider_type: 'saml' as const,
        enabled: samlEnabled,
        domain: samlDomain || null,
        saml_metadata_xml: samlMetadataXml || null,
        saml_metadata_url: samlMetadataUrl || null,
      };

      if (samlProvider) {
        const { error } = await supabase
          .from('workspace_sso_providers')
          .update(config)
          .eq('id', samlProvider.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('workspace_sso_providers')
          .insert(config);
        if (error) throw error;
      }

      toast.success('SAML configuration saved');
      loadSSOProviders();
    } catch (error) {
      console.error('Error saving SAML config:', error);
      toast.error('Failed to save SAML configuration');
    } finally {
      setSaving(false);
    }
  };

  const saveOAuthConfig = async () => {
    setSaving(true);
    try {
      const config = {
        workspace_id: workspaceId,
        provider_type: 'oauth' as const,
        enabled: oauthEnabled,
        domain: oauthDomain || null,
        oauth_client_id: oauthClientId || null,
        oauth_client_secret: oauthClientSecret || null,
        oauth_authorize_url: oauthAuthorizeUrl || null,
        oauth_token_url: oauthTokenUrl || null,
        oauth_scopes: oauthScopes || null,
      };

      if (oauthProvider) {
        const { error } = await supabase
          .from('workspace_sso_providers')
          .update(config)
          .eq('id', oauthProvider.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('workspace_sso_providers')
          .insert(config);
        if (error) throw error;
      }

      toast.success('OAuth configuration saved');
      loadSSOProviders();
    } catch (error) {
      console.error('Error saving OAuth config:', error);
      toast.error('Failed to save OAuth configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="saml">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="saml" className="gap-2">
            <Key className="w-4 h-4" />
            SAML 2.0
          </TabsTrigger>
          <TabsTrigger value="oauth" className="gap-2">
            <Shield className="w-4 h-4" />
            OAuth 2.0 / OIDC
          </TabsTrigger>
        </TabsList>

        {/* SAML Configuration */}
        <TabsContent value="saml" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>SAML 2.0 Configuration</span>
                <Switch checked={samlEnabled} onCheckedChange={setSamlEnabled} />
              </CardTitle>
              <CardDescription>
                Connect with Okta, OneLogin, Azure AD, and other SAML providers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="saml-domain">Email Domain</Label>
                <Input
                  id="saml-domain"
                  value={samlDomain}
                  onChange={(e) => setSamlDomain(e.target.value)}
                  placeholder="example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Users with @{samlDomain || 'domain.com'} emails will be redirected to SSO
                </p>
              </div>

              <div className="space-y-2">
                <Label>Identity Provider Metadata</Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept=".xml"
                    onChange={handleSamlFileUpload}
                    className="hidden"
                    id="saml-file"
                  />
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => document.getElementById('saml-file')?.click()}
                  >
                    <Upload className="w-4 h-4" />
                    Upload XML
                  </Button>
                  {samlMetadataXml && (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <Check className="w-4 h-4" />
                      Metadata loaded
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="saml-url">Or Metadata URL</Label>
                <Input
                  id="saml-url"
                  value={samlMetadataUrl}
                  onChange={(e) => setSamlMetadataUrl(e.target.value)}
                  placeholder="https://your-idp.com/metadata.xml"
                />
              </div>

              {samlMetadataXml && (
                <div className="space-y-2">
                  <Label>Metadata Preview</Label>
                  <Textarea
                    value={samlMetadataXml.slice(0, 500) + (samlMetadataXml.length > 500 ? '...' : '')}
                    readOnly
                    className="font-mono text-xs h-24"
                  />
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Service Provider Details
                  </h4>
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">ACS URL:</span> https://taskbit.lovable.app/auth/saml/callback</p>
                    <p><span className="text-muted-foreground">Entity ID:</span> https://taskbit.lovable.app</p>
                    <p><span className="text-muted-foreground">Name ID:</span> emailAddress</p>
                  </div>
                </div>
              </div>

              <Button onClick={saveSamlConfig} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save SAML Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OAuth Configuration */}
        <TabsContent value="oauth" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>OAuth 2.0 / OIDC Configuration</span>
                <Switch checked={oauthEnabled} onCheckedChange={setOauthEnabled} />
              </CardTitle>
              <CardDescription>
                Connect with custom OAuth 2.0 or OpenID Connect providers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="oauth-domain">Email Domain</Label>
                <Input
                  id="oauth-domain"
                  value={oauthDomain}
                  onChange={(e) => setOauthDomain(e.target.value)}
                  placeholder="example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="oauth-client-id">Client ID</Label>
                  <Input
                    id="oauth-client-id"
                    value={oauthClientId}
                    onChange={(e) => setOauthClientId(e.target.value)}
                    placeholder="your-client-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="oauth-client-secret">Client Secret</Label>
                  <Input
                    id="oauth-client-secret"
                    type="password"
                    value={oauthClientSecret}
                    onChange={(e) => setOauthClientSecret(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="oauth-authorize">Authorization URL</Label>
                <Input
                  id="oauth-authorize"
                  value={oauthAuthorizeUrl}
                  onChange={(e) => setOauthAuthorizeUrl(e.target.value)}
                  placeholder="https://your-idp.com/oauth2/authorize"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="oauth-token">Token URL</Label>
                <Input
                  id="oauth-token"
                  value={oauthTokenUrl}
                  onChange={(e) => setOauthTokenUrl(e.target.value)}
                  placeholder="https://your-idp.com/oauth2/token"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="oauth-scopes">Scopes</Label>
                <Input
                  id="oauth-scopes"
                  value={oauthScopes}
                  onChange={(e) => setOauthScopes(e.target.value)}
                  placeholder="openid email profile"
                />
              </div>

              <div className="pt-4 border-t">
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Redirect URI
                  </h4>
                  <p className="text-sm font-mono bg-background rounded px-2 py-1">
                    https://taskbit.lovable.app/auth/oauth/callback
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Add this URL to your OAuth provider's allowed redirect URIs
                  </p>
                </div>
              </div>

              <Button onClick={saveOAuthConfig} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save OAuth Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
