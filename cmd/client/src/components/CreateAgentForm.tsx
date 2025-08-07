import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Bot, Loader2, ArrowLeft, Sparkles, AlertCircle } from "lucide-react";
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
  type CreateAgentRequest,
  type Provider,
} from "../types/agent.types";

export function CreateAgentForm() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateAgentRequest>({
    name: "",
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    system_prompt: "",
    max_tokens: 2048,
    temperature: 0.7,
  });

  const handleProviderChange = (provider: Provider) => {
    const firstModel = MODELS[provider][0];
    setFormData((prev) => ({
      ...prev,
      provider,
      model: firstModel ? firstModel.value : "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Prepare the request, omitting system_prompt if empty
      const requestData: CreateAgentRequest = {
        name: formData.name,
        provider: formData.provider,
        model: formData.model,
        max_tokens: formData.max_tokens,
        temperature: formData.temperature,
      };

      // Only include system_prompt if it's not empty
      if (formData.system_prompt && formData.system_prompt.trim()) {
        requestData.system_prompt = formData.system_prompt.trim();
      }

      await agentsApi.createAgent(requestData);
      navigate("/app/agents", {
        state: { message: `Agent "${formData.name}" created successfully!` },
      });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to create agent";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedProvider = formData.provider as Provider;
  const availableModels = MODELS[selectedProvider] || [];

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/app/agents")}
            className="mb-4 -ml-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>

          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Create New Agent</h1>
              <p className="text-muted-foreground">
                Configure your agent with custom settings and behavior
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>Agent Configuration</span>
            </CardTitle>
            <CardDescription>
              Set up your agent's identity, model, and behavior parameters
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Display */}
              {error && (
                <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-destructive">{error}</p>
                      {error.includes("API key") && (
                        <Link
                          to="/settings"
                          className="text-sm text-primary hover:underline mt-1 inline-block"
                        >
                          Go to Settings to configure API keys →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">
                    Agent Name *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., Research Assistant, Code Helper, Writing Buddy"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose a descriptive name for your agent
                  </p>
                </div>

                <div>
                  <Label
                    htmlFor="system_prompt"
                    className="text-sm font-medium"
                  >
                    System Prompt
                  </Label>
                  <Textarea
                    id="system_prompt"
                    placeholder="You are a helpful AI assistant. Your role is to... (optional)"
                    value={formData.system_prompt}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        system_prompt: e.target.value,
                      }))
                    }
                    className="mt-1 min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional: Define your agent's personality, expertise, and
                    behavior. Leave empty to use model defaults.
                  </p>
                </div>
              </div>

              {/* Model Configuration */}
              <div className="space-y-4 pt-2 border-t">
                <h3 className="text-lg font-semibold">Model Settings</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="provider" className="text-sm font-medium">
                      Provider *
                    </Label>
                    <Select
                      value={formData.provider}
                      onValueChange={handleProviderChange}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PROVIDERS.ANTHROPIC}>
                          Anthropic
                        </SelectItem>
                        <SelectItem value={PROVIDERS.OPENAI}>OpenAI</SelectItem>
                        <SelectItem value={PROVIDERS.GOOGLE} disabled>
                          Google (Coming Soon)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="model" className="text-sm font-medium">
                      Model *
                    </Label>
                    <Select
                      value={formData.model}
                      onValueChange={(value: string) =>
                        setFormData((prev) => ({ ...prev, model: value }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a model" />
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
              </div>

              {/* Advanced Settings */}
              <div className="space-y-4 pt-2 border-t">
                <h3 className="text-lg font-semibold">Advanced Settings</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max_tokens" className="text-sm font-medium">
                      Max Tokens
                    </Label>
                    <Input
                      id="max_tokens"
                      type="number"
                      min="1"
                      max="8192"
                      value={formData.max_tokens}
                      onChange={(e) =>
                        setFormData((prev) => ({
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
                    <Label
                      htmlFor="temperature"
                      className="text-sm font-medium"
                    >
                      Temperature
                    </Label>
                    <Input
                      id="temperature"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.temperature}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          temperature: parseFloat(e.target.value) || 0.7,
                        }))
                      }
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Response entropy (0.0-1.0)
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/app/agents")}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="min-w-[120px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4 mr-2" />
                      Create Agent
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
