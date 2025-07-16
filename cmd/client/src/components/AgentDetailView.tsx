import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  Settings,
  Code,
  Copy,
  Check,
  Save,
  Loader2,
  ExternalLink,
  Key,
  Globe,
  Trash2,
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
import { agentsApi } from "../api/agents.api";
import {
  PROVIDERS,
  MODELS,
  getProviderDisplayName,
  type Agent,
  type UpdateAgentRequest,
  type Provider,
} from "../types/agent.types";

export function AgentDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "configuration" | "api"
  >("overview");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [editForm, setEditForm] = useState<UpdateAgentRequest>({});

  useEffect(() => {
    async function fetchAgent() {
      if (!id) return;

      try {
        setIsLoading(true);
        setError(null);

        // For now, we'll get the agent from the agents list
        // TODO: Implement individual agent fetching endpoint
        const response = await agentsApi.getAgents();
        console.log("All agents:", response.agents);
        console.log("Looking for agent ID:", id);

        const foundAgent = response.agents.find((a: any) => a.ID === id);
        console.log("Found agent:", foundAgent);

        if (!foundAgent) {
          setError(`Agent not found (ID: ${id})`);
          return;
        }

        // Transform the backend data to match our frontend interface
        const rawAgent = foundAgent as any;
        const transformedAgent: Agent = {
          id: rawAgent.ID,
          name: rawAgent.Name,
          provider: rawAgent.Provider,
          llm_model: rawAgent.LLMModel,
          system_prompt: rawAgent.SystemPrompt,
          max_tokens: rawAgent.MaxTokens,
          temperature: rawAgent.Temperature,
          created_at: rawAgent.CreatedAt,
          updated_at: rawAgent.UpdatedAt,
        };

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

      // Update local state
      setAgent((prev) =>
        prev
          ? {
              ...prev,
              ...editForm,
              llm_model: editForm.model || prev.llm_model,
            }
          : null,
      );

      // TODO: Show success toast
    } catch (err: any) {
      setError(err.message || "Failed to save agent");
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
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
              <span>Back</span>
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

            <Button variant="outline" size="sm">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-6 mt-6">
          {[
            { id: "overview", label: "Overview", icon: Bot },
            { id: "configuration", label: "Configuration", icon: Settings },
            { id: "api", label: "API & Integration", icon: Code },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
                    <span>Authentication</span>
                  </CardTitle>
                  <CardDescription>
                    API keys and authentication methods
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      <strong>Note:</strong> API key management is coming soon.
                      For now, use your session authentication.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="outline" disabled>
                      <Key className="w-4 h-4 mr-2" />
                      Generate API Key
                    </Button>
                    <Button variant="outline" disabled>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Documentation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

