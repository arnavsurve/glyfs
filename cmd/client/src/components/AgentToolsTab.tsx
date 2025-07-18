import { useState, useEffect } from "react";
import {
  Plus,
  Server,
  Loader2,
  Check,
  X,
  Globe,
  Zap,
  Trash2,
  TestTube,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Wrench,
  AlertCircle,
  RefreshCw,
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
import { mcpApi } from "../api/mcp.api";
import type {
  MCPServer,
  AgentMCPServer,
  CreateMCPServerRequest,
} from "../types/mcp.types";
import { toast } from "sonner";

interface AgentToolsTabProps {
  agentId: string;
}

export function AgentToolsTab({ agentId }: AgentToolsTabProps) {
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [agentServers, setAgentServers] = useState<AgentMCPServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create server form state
  const [createForm, setCreateForm] = useState<CreateMCPServerRequest>({
    name: "",
    description: "",
    server_url: "",
    server_type: "http",
    config: {
      server_type: "http",
      url: "",
      timeout: 30,
      headers: {},
    },
  });

  const [headerKey, setHeaderKey] = useState("");
  const [headerValue, setHeaderValue] = useState("");

  const addHeader = () => {
    if (headerKey.trim() && headerValue.trim()) {
      setCreateForm(prev => ({
        ...prev,
        config: {
          ...prev.config,
          headers: {
            ...prev.config.headers,
            [headerKey.trim()]: headerValue.trim(),
          },
        },
      }));
      setHeaderKey("");
      setHeaderValue("");
    }
  };

  const removeHeader = (key: string) => {
    setCreateForm(prev => {
      const newHeaders = { ...prev.config.headers };
      delete newHeaders[key];
      return {
        ...prev,
        config: {
          ...prev.config,
          headers: newHeaders,
        },
      };
    });
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [serversResponse, agentServersResponse] = await Promise.all([
        mcpApi.listServers(),
        mcpApi.getAgentMCPServers(agentId),
      ]);

      setMcpServers(serversResponse.servers || []);
      setAgentServers(agentServersResponse.servers || []);
    } catch (err: any) {
      console.error("Failed to fetch MCP data:", err);
      toast.error("Failed to load MCP servers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetchData();
      toast.success("Data refreshed");
    } catch (err: any) {
      toast.error("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [agentId]);

  const handleCreateServer = async () => {
    try {
      setIsCreating(true);

      // Debug: Log the form state before sending
      console.log("DEBUG: Form state before sending:", createForm);
      console.log("DEBUG: Headers in form:", createForm.config.headers);

      // Set URL in config to match server_url, preserving headers
      const serverData = {
        ...createForm,
        config: {
          ...createForm.config,
          url: createForm.server_url,
          server_type: createForm.server_type,
        },
      };

      console.log("DEBUG: Server data being sent:", serverData);
      console.log("DEBUG: Headers in server data:", serverData.config.headers);

      await mcpApi.createServer(serverData);

      // Reset form
      setCreateForm({
        name: "",
        description: "",
        server_url: "",
        server_type: "http",
        config: {
          server_type: "http",
          url: "",
          timeout: 30,
          headers: {},
        },
      });

      setHeaderKey("");
      setHeaderValue("");
      setShowCreateModal(false);
      await fetchData();
      toast.success("MCP server created successfully");
    } catch (err: any) {
      console.error("Failed to create MCP server:", err);
      toast.error("Failed to create MCP server");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteServer = async (serverId: string, serverName: string) => {
    try {
      await mcpApi.deleteServer(serverId);
      await fetchData();
      toast.success(`MCP server "${serverName}" deleted successfully`);
    } catch (err: any) {
      console.error("Failed to delete MCP server:", err);
      toast.error("Failed to delete MCP server");
    }
  };

  const handleTestConnection = async (serverId: string, serverName: string) => {
    try {
      const result = await mcpApi.testConnection(serverId);
      if (result.success) {
        toast.success(`Connection to "${serverName}" successful`);
      } else {
        toast.error(`Connection to "${serverName}" failed: ${result.error}`);
      }
    } catch (err: any) {
      console.error("Failed to test connection:", err);
      toast.error("Failed to test connection");
    }
  };

  const handleToggleAssociation = async (
    serverId: string,
    serverName: string,
    currentlyEnabled: boolean,
  ) => {
    try {
      if (currentlyEnabled) {
        await mcpApi.disassociateAgentMCPServer(agentId, serverId);
        toast.success(`Disconnected from "${serverName}"`);
      } else {
        await mcpApi.associateAgentMCPServer(agentId, serverId);
        toast.success(`Connected to "${serverName}"`);
      }
      await fetchData();
    } catch (err: any) {
      console.error("Failed to toggle association:", err);
      toast.error("Failed to update server association");
    }
  };

  const handleToggleEnabled = async (
    serverId: string,
    serverName: string,
    enabled: boolean,
  ) => {
    try {
      await mcpApi.toggleAgentMCPServer(agentId, serverId, enabled);
      await fetchData();
      toast.success(`${enabled ? "Enabled" : "Disabled"} "${serverName}"`);
    } catch (err: any) {
      console.error("Failed to toggle server:", err);
      toast.error("Failed to toggle server");
    }
  };

  const getServerAssociation = (
    serverId: string,
  ): AgentMCPServer | undefined => {
    return agentServers.find((as) => as.server_id === serverId);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: "bg-green-100 text-green-800", icon: Check },
      inactive: { color: "bg-gray-100 text-gray-800", icon: X },
      error: { color: "bg-red-100 text-red-800", icon: AlertCircle },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.inactive;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading MCP servers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Wrench className="w-5 h-5" />
                <span>Agent Tools</span>
              </CardTitle>
              <CardDescription>
                Connect your agent to MCP (Model Context Protocol) servers to
                provide unlimited tools and capabilities
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add MCP Server
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* MCP Servers List */}
      {mcpServers.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No MCP Servers</h3>
              <p className="text-muted-foreground mb-4">
                Add your first MCP server to give your agent access to external
                tools and capabilities
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add MCP Server
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {mcpServers.map((server) => {
            const association = getServerAssociation(server.id);
            const isConnected = !!association;
            const isEnabled = association?.enabled || false;

            return (
              <Card key={server.id} className="relative">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {server.server_type === "sse" ? (
                            <Zap className="w-4 h-4 text-primary" />
                          ) : (
                            <Globe className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">{server.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {server.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          {server.server_url}
                        </span>
                        <span className="uppercase font-medium">
                          {server.server_type}
                        </span>
                        {getStatusBadge(server.status)}
                      </div>

                      {server.last_seen && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Last seen:{" "}
                          {new Date(server.last_seen).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Connection Toggle */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleToggleAssociation(
                            server.id,
                            server.name,
                            isConnected,
                          )
                        }
                        className={
                          isConnected ? "border-green-200 bg-green-50" : ""
                        }
                      >
                        {isConnected ? (
                          <>
                            <Check className="w-4 h-4 mr-2 text-green-600" />
                            Connected
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Connect
                          </>
                        )}
                      </Button>

                      {/* Enable/Disable Toggle (only if connected) */}
                      {isConnected && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleToggleEnabled(
                              server.id,
                              server.name,
                              !isEnabled,
                            )
                          }
                        >
                          {isEnabled ? (
                            <ToggleRight className="w-5 h-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-gray-400" />
                          )}
                        </Button>
                      )}

                      {/* Test Connection */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleTestConnection(server.id, server.name)
                        }
                      >
                        <TestTube className="w-4 h-4" />
                      </Button>

                      {/* Delete Server */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete MCP Server
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{server.name}"?
                              This will disconnect it from all agents and cannot
                              be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleDeleteServer(server.id, server.name)
                              }
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Server
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Server Modal */}
      <AlertDialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Add MCP Server</AlertDialogTitle>
            <AlertDialogDescription>
              Connect to an external MCP server to provide your agent with
              additional tools and capabilities.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="server-name">Server Name</Label>
                <Input
                  id="server-name"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="My MCP Server"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="server-type">Server Type</Label>
                <Select
                  value={createForm.server_type}
                  onValueChange={(value: "http" | "sse") => {
                    setCreateForm((prev) => ({
                      ...prev,
                      server_type: value,
                      config: { ...prev.config, server_type: value },
                    }));
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="sse">
                      SSE (Server-Sent Events)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="server-url">Server URL</Label>
              <Input
                id="server-url"
                value={createForm.server_url}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    server_url: e.target.value,
                  }))
                }
                placeholder="https://your-mcp-server.com/mcp"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="server-description">Description (Optional)</Label>
              <Textarea
                id="server-description"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="What tools and capabilities does this server provide?"
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timeout">Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  min="1"
                  max="300"
                  value={createForm.config.timeout}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      config: {
                        ...prev.config,
                        timeout: parseInt(e.target.value) || 30,
                      },
                    }))
                  }
                  className="mt-1"
                />
              </div>
            </div>

            {/* Headers Section */}
            <div>
              <Label>HTTP Headers (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Add authentication or custom headers. For GitHub, use Authorization: Bearer YOUR_TOKEN
              </p>
              
              {/* Existing Headers */}
              {Object.entries(createForm.config.headers || {}).length > 0 && (
                <div className="space-y-2 mb-3">
                  {Object.entries(createForm.config.headers || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2 p-2 bg-muted rounded-lg">
                      <span className="text-sm font-medium">{key}:</span>
                      <span className="text-sm text-muted-foreground flex-1">
                        {key.toLowerCase().includes('auth') || key.toLowerCase().includes('token') 
                          ? '*'.repeat(Math.min(value.length, 20))
                          : value}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeHeader(key)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add Header Form */}
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={headerKey}
                  onChange={(e) => setHeaderKey(e.target.value)}
                  placeholder="Header name (e.g., Authorization)"
                />
                <div className="flex space-x-2">
                  <Input
                    value={headerValue}
                    onChange={(e) => setHeaderValue(e.target.value)}
                    placeholder="Header value (e.g., Bearer token123)"
                    type={headerKey.toLowerCase().includes('auth') || headerKey.toLowerCase().includes('token') ? 'password' : 'text'}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addHeader}
                    disabled={!headerKey.trim() || !headerValue.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateServer}
              disabled={
                !createForm.name || !createForm.server_url || isCreating
              }
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Server
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

