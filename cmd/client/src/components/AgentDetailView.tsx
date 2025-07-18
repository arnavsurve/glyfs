import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  Settings,
  Code,
  Copy,
  Check,
  Save,
  Loader2,
  Key,
  Globe,
  Trash2,
  Wrench,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { agentsApi, type APIKey } from "../api/agents.api";
import {
  PROVIDERS,
  MODELS,
  getProviderDisplayName,
  type Agent,
  type UpdateAgentRequest,
  type Provider,
} from "../types/agent.types";
import { transformAgentData } from "../utils/agent.utils";
import { toast } from "sonner";
import { AgentToolsTab } from "./AgentToolsTab";

export function AgentDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "configuration" | "tools" | "api"
  >("overview");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [editForm, setEditForm] = useState<UpdateAgentRequest>({});

  // API Key management state
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgent() {
      if (!id) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch individual agent using the new endpoint
        const response = await agentsApi.getAgent(id);
        console.log("Agent fetched:", response.agent);

        if (!response.agent) {
          setError(`Agent not found (ID: ${id})`);
          return;
        }

        // Transform the backend data to match our frontend interface
        const transformedAgent = transformAgentData(response.agent);

        setAgent(transformedAgent);
        setEditForm({
          name: transformedAgent.name,
          provider: transformedAgent.provider as any,
          model: transformedAgent.llm_model,
          system_prompt: transformedAgent.system_prompt,
          max_tokens: transformedAgent.max_tokens,
          temperature: transformedAgent.temperature,
        });
      } catch (err: any) {
        console.error("Failed to fetch agent:", err);
        setError(err.message || "Failed to load agent");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAgent();
  }, [id]);

  const handleSave = async () => {
    if (!agent || !id) return;

    try {
      setIsSaving(true);
      setError(null);

      await agentsApi.updateAgent(id, editForm);

      // Refetch the agent to get the latest data
      const response = await agentsApi.getAgent(id);
      if (response.agent) {
        // Transform the backend data to match our frontend interface
        const transformedAgent = transformAgentData(response.agent);
        setAgent(transformedAgent);
      }

      // Show success toast
      toast.success("Agent updated successfully!");
    } catch (err: any) {
      const errorMessage = err.message || "Failed to save agent";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!agent || !id) return;

    try {
      setIsDeleting(true);
      setError(null);

      await agentsApi.deleteAgent(id);

      // Navigate immediately to agents list
      navigate("/agents");

      // Show persistent success toast with undo action after a brief delay
      // This ensures the toast appears after navigation is complete
      setTimeout(() => {
        toast.success(`"${agent.name}" has been deleted`, {
          description: "Undo within the next 30 seconds",
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                await agentsApi.restoreAgent(id);
                toast.success(`"${agent.name}" has been restored!`);
                // Navigate back to the restored agent
                navigate(`/agents/${id}`);
              } catch (err: any) {
                toast.error("Failed to restore agent. Please try again.");
              }
            },
          },
          duration: 30000, // Show for 30 seconds to give plenty of time to undo
        });
      }, 100); // Small delay to ensure navigation completes first
    } catch (err: any) {
      const errorMessage = err.message || "Failed to delete agent";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success(`${field} copied to clipboard!`);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy to clipboard");
    }
  };

  const getApiUrl = () => `${window.location.origin}/api/agents/${id}/invoke`;

  const getModelDisplayName = () => {
    if (!agent) return "";
    const provider = agent.provider as keyof typeof MODELS;
    if (!MODELS[provider]) return agent.llm_model;

    const model = MODELS[provider].find((m) => m.value === agent.llm_model);
    return model ? model.label : agent.llm_model;
  };

  const handleProviderChange = (provider: Provider) => {
    const firstModel = MODELS[provider][0];
    setEditForm((prev) => ({
      ...prev,
      provider,
      model: firstModel ? firstModel.value : "",
    }));
  };

  // Tab persistence
  const setActiveTabWithPersistence = (tab: "overview" | "configuration" | "tools" | "api") => {
    setActiveTab(tab);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', tab);
      return newParams;
    }, { replace: true });
  };

  // API Key management functions
  const fetchAPIKeys = async () => {
    if (!id) return;

    try {
      setIsLoadingKeys(true);
      const response = await agentsApi.getAPIKeys(id);
      setApiKeys(response.api_keys || []);
    } catch (err: any) {
      console.error("Failed to fetch API keys:", err);
      // Only show error toast for actual network/server errors
      if (err?.response?.status >= 500 || !err?.response) {
        toast.error("Failed to load API keys");
      }
      setApiKeys([]);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleCreateAPIKey = async () => {
    if (!id || !newKeyName.trim()) return;

    try {
      setIsCreatingKey(true);
      const response = await agentsApi.createAPIKey(id, newKeyName.trim());
      setNewlyCreatedKey(response.api_key);
      setNewKeyName("");
      setShowCreateKeyModal(false);
      await fetchAPIKeys();
      toast.success("API key created successfully!");
    } catch (err: any) {
      console.error("Failed to create API key:", err);
      toast.error("Failed to create API key");
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleDeleteAPIKey = async (keyId: number, keyName: string) => {
    if (!id) return;

    try {
      await agentsApi.deleteAPIKey(id, keyId.toString());
      await fetchAPIKeys();
      toast.success(`API key "${keyName}" revoked successfully`);
    } catch (err: any) {
      console.error("Failed to delete API key:", err);
      toast.error("Failed to revoke API key");
    }
  };

  // Sync activeTab with URL changes
  useEffect(() => {
    const tab = searchParams.get('tab') as "overview" | "configuration" | "tools" | "api";
    const validTab = ["overview", "configuration", "tools", "api"].includes(tab) ? tab : "overview";
    setActiveTab(validTab);
  }, [searchParams]);

  // Fetch API keys when tab changes to API
  useEffect(() => {
    if (activeTab === "api" && id) {
      fetchAPIKeys();
    }
  }, [activeTab, id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading agent...</p>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-6">
            <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Agent Not Found</h1>
            <p className="text-muted-foreground">
              {error || "The requested agent could not be found."}
            </p>
          </div>
          <Button onClick={() => navigate("/agents")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>
        </div>
      </div>
    );
  }

  const selectedProvider = (editForm.provider || agent.provider) as Provider;
  const availableModels = MODELS[selectedProvider] || [];

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/agents")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{agent.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {getProviderDisplayName(agent.provider)} •{" "}
                  {getModelDisplayName()} • Created{" "}
                  {new Date(agent.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={isDeleting}>
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Agent</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{agent?.name}"? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Agent
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-6 mt-6">
          {[
            { id: "overview", label: "Overview", icon: Bot },
            { id: "configuration", label: "Configuration", icon: Settings },
            { id: "tools", label: "Tools", icon: Wrench },
            { id: "api", label: "API & Integration", icon: Code },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTabWithPersistence(id as any)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="mb-6 p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Core details and identity of your agent
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="agent-name">Agent Name</Label>
                    <Input
                      id="agent-name"
                      value={editForm.name || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="system-prompt">System Prompt</Label>
                    <Textarea
                      id="system-prompt"
                      value={editForm.system_prompt || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          system_prompt: e.target.value,
                        }))
                      }
                      className="mt-1 min-h-[120px]"
                      placeholder="Define your agent's personality, expertise, and behavior..."
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Agent Details</CardTitle>
                  <CardDescription>
                    Technical information and identifiers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Agent ID</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          value={agent.id}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(agent.id, "id")}
                        >
                          {copiedField === "id" ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>Provider</Label>
                      <Input
                        value={getProviderDisplayName(agent.provider)}
                        readOnly
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Created</Label>
                      <Input
                        value={new Date(agent.created_at).toLocaleString()}
                        readOnly
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Last Updated</Label>
                      <Input
                        value={new Date(agent.updated_at).toLocaleString()}
                        readOnly
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Configuration Tab */}
          {activeTab === "configuration" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Model Configuration</CardTitle>
                  <CardDescription>
                    AI model and provider settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Provider</Label>
                      <Select
                        value={editForm.provider || agent.provider}
                        onValueChange={handleProviderChange}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={PROVIDERS.ANTHROPIC}>
                            Anthropic
                          </SelectItem>
                          <SelectItem value={PROVIDERS.OPENAI}>
                            OpenAI
                          </SelectItem>
                          <SelectItem value={PROVIDERS.GOOGLE} disabled>
                            Google (Coming Soon)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Model</Label>
                      <Select
                        value={editForm.model || agent.llm_model}
                        onValueChange={(value: string) =>
                          setEditForm((prev) => ({ ...prev, model: value }))
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Response Parameters</CardTitle>
                  <CardDescription>
                    Control how your agent generates responses
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="max-tokens">Max Tokens</Label>
                      <Input
                        id="max-tokens"
                        type="number"
                        min="1"
                        max="8192"
                        value={editForm.max_tokens || agent.max_tokens}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            max_tokens: parseInt(e.target.value) || 2048,
                          }))
                        }
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Maximum response length (1-8192)
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="temperature">Temperature</Label>
                      <Input
                        id="temperature"
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={editForm.temperature || agent.temperature}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            temperature: parseFloat(e.target.value) || 0.7,
                          }))
                        }
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Creativity level (0.0-2.0)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tools Tab */}
          {activeTab === "tools" && id && (
            <AgentToolsTab agentId={id} />
          )}

          {/* API Tab */}
          {activeTab === "api" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Globe className="w-5 h-5" />
                    <span>API Endpoint</span>
                  </CardTitle>
                  <CardDescription>
                    HTTP endpoint for invoking your agent
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Invoke URL</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input
                        value={getApiUrl()}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(getApiUrl(), "url")}
                      >
                        {copiedField === "url" ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <h4 className="text-sm font-medium mb-2">
                      Example Request
                    </h4>
                    <pre className="text-xs text-muted-foreground overflow-x-auto">
                      {`curl -X POST "${getApiUrl()}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "message": "Hello, how can you help me today?"
  }'`}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Key className="w-5 h-5" />
                    <span>API Keys</span>
                  </CardTitle>
                  <CardDescription>
                    Manage API keys for programmatic access to your agent
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Create API keys to invoke your agent programmatically
                    </p>
                    <Button
                      onClick={() => setShowCreateKeyModal(true)}
                      size="sm"
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Generate New Key
                    </Button>
                  </div>

                  {isLoadingKeys ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : apiKeys.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Key className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No API keys created yet</p>
                      <p className="text-xs">Generate your first API key to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {apiKeys.map((key) => (
                        <div
                          key={key.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-medium">{key.name}</h4>
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                Active
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Created {new Date(key.created_at).toLocaleDateString()}
                              {key.last_used && (
                                <span className="ml-2">
                                  • Last used {new Date(key.last_used).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to revoke "{key.name}"? This action cannot be undone and any applications using this key will stop working.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteAPIKey(key.id, key.name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Revoke Key
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Create API Key Modal */}
                  <AlertDialog open={showCreateKeyModal} onOpenChange={setShowCreateKeyModal}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Create New API Key</AlertDialogTitle>
                        <AlertDialogDescription>
                          Give your API key a descriptive name to help you identify its purpose.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="py-4">
                        <Label htmlFor="key-name">Key Name</Label>
                        <Input
                          id="key-name"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="e.g., Production API, Mobile App"
                          className="mt-2"
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCreateAPIKey}
                          disabled={!newKeyName.trim() || isCreatingKey}
                        >
                          {isCreatingKey ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Key className="w-4 h-4 mr-2" />
                              Create Key
                            </>
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Show newly created key */}
                  {newlyCreatedKey && (
                    <AlertDialog open={!!newlyCreatedKey} onOpenChange={() => setNewlyCreatedKey(null)}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>API Key Created</AlertDialogTitle>
                          <AlertDialogDescription>
                            Save this API key now. You won't be able to see it again.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                          <Label>Your API Key</Label>
                          <div className="flex items-center space-x-2 mt-2">
                            <Input
                              value={newlyCreatedKey}
                              readOnly
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(newlyCreatedKey, "API key")}
                            >
                              {copiedField === "API key" ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogAction onClick={() => setNewlyCreatedKey(null)}>
                            I've saved my key
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
