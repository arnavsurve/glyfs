import { useState, useEffect } from "react";
import {
  Plus,
  Server,
  Loader2,
  X,
  Trash2,
  TestTube,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Wrench,
  RefreshCw,
  Edit,
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
  AgentMCPServerDetail,
  CreateMCPServerRequest,
  UpdateMCPServerRequest,
} from "../types/mcp.types";
import { toast } from "sonner";

interface AgentToolsTabProps {
  agentId: string;
}

export function AgentToolsTab({ agentId }: AgentToolsTabProps) {
  const [agentServers, setAgentServers] = useState<AgentMCPServerDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingServer, setEditingServer] =
    useState<AgentMCPServerDetail | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Create server form state
  const [createForm, setCreateForm] = useState<CreateMCPServerRequest>({
    name: "",
    description: "",
    server_url: "",
    server_type: "http",
    timeout: 30,
    headers: {},
    max_retries: 3,
  });

  const [headerKey, setHeaderKey] = useState("");
  const [headerValue, setHeaderValue] = useState("");
  const [isHeaderSensitive, setIsHeaderSensitive] = useState(false);
  const [isUrlSensitive, setIsUrlSensitive] = useState(false);
  const [sensitiveHeaders, setSensitiveHeaders] = useState<string[]>([]);

  // Edit server form state
  const [editForm, setEditForm] = useState<UpdateMCPServerRequest>({});
  const [editHeaderKey, setEditHeaderKey] = useState("");
  const [editHeaderValue, setEditHeaderValue] = useState("");
  const [isEditHeaderSensitive, setIsEditHeaderSensitive] = useState(false);
  const [isEditUrlSensitive, setIsEditUrlSensitive] = useState(false);
  const [editSensitiveHeaders, setEditSensitiveHeaders] = useState<string[]>(
    []
  );

  const addHeader = () => {
    if (headerKey.trim() && headerValue.trim()) {
      // Save current header to the form
      setCreateForm((prev) => ({
        ...prev,
        headers: {
          ...prev.headers,
          [headerKey.trim()]: headerValue.trim(),
        },
      }));

      // Track sensitive headers
      if (isHeaderSensitive) {
        setSensitiveHeaders((prev) => [...prev, headerKey.trim()]);
      }

      // Clear fields to add another header
      setHeaderKey("");
      setHeaderValue("");
      setIsHeaderSensitive(false);
    }
  };

  const removeHeader = (key: string) => {
    setCreateForm((prev) => {
      const newHeaders = { ...prev.headers };
      delete newHeaders[key];
      return {
        ...prev,
        headers: newHeaders,
      };
    });

    // Remove from sensitive headers if present
    setSensitiveHeaders((prev) => prev.filter((h) => h !== key));
  };

  // Edit form helper functions
  const addEditHeader = () => {
    if (editHeaderKey.trim() && editHeaderValue.trim()) {
      setEditForm((prev) => ({
        ...prev,
        headers: {
          ...prev.headers,
          [editHeaderKey.trim()]: editHeaderValue.trim(),
        },
      }));

      if (isEditHeaderSensitive) {
        setEditSensitiveHeaders((prev) => [...prev, editHeaderKey.trim()]);
      }

      setEditHeaderKey("");
      setEditHeaderValue("");
      setIsEditHeaderSensitive(false);
    }
  };

  const removeEditHeader = (key: string) => {
    setEditForm((prev) => {
      const newHeaders = { ...prev.headers };
      delete newHeaders[key];
      return {
        ...prev,
        headers: newHeaders,
      };
    });

    setEditSensitiveHeaders((prev) => prev.filter((h) => h !== key));
  };

  const openEditModal = async (server: AgentMCPServerDetail) => {
    setEditingServer(server);

    setEditForm({
      name: server.server_name,
      description: server.description,
      server_url: server.server_url,
      timeout: server.timeout,
      headers: server.headers || {},
      max_retries: server.max_retries,
      env: server.env || {},
    });

    // Set sensitive flags based on server data
    setIsEditUrlSensitive(server.encrypted_url || false);
    setEditSensitiveHeaders(server.sensitive_headers || []);

    setEditHeaderKey("");
    setEditHeaderValue("");
    setIsEditHeaderSensitive(false);
    setShowEditModal(true);
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Only fetch servers associated with this agent
      const agentServersResponse = await mcpApi.getAgentMCPServers(agentId);
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

      // Auto-include current header key/value if they have values
      const finalHeaders = { ...createForm.headers };
      const finalSensitiveHeaders = [...sensitiveHeaders];

      if (headerKey.trim() && headerValue.trim()) {
        finalHeaders[headerKey.trim()] = headerValue.trim();
        if (isHeaderSensitive) {
          finalSensitiveHeaders.push(headerKey.trim());
        }
      }

      const serverData = {
        ...createForm,
        agent_id: agentId, // Auto-associate with current agent
        headers: finalHeaders,
        sensitive_url: isUrlSensitive,
        sensitive_headers: finalSensitiveHeaders,
      };

      await mcpApi.createServer(serverData);

      // Reset form
      setCreateForm({
        name: "",
        description: "",
        server_url: "",
        server_type: "http",
        timeout: 30,
        headers: {},
        max_retries: 3,
      });

      setHeaderKey("");
      setHeaderValue("");
      setIsHeaderSensitive(false);
      setIsUrlSensitive(false);
      setSensitiveHeaders([]);
      setShowCreateModal(false);
      await fetchData();
      toast.success("MCP server created successfully");
    } catch (err: any) {
      console.error("Failed to create MCP server:", err);
      const errorMessage = err?.message || "Failed to create MCP server";
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditServer = async () => {
    if (!editingServer) return;

    try {
      setIsUpdating(true);

      // Auto-include current header key/value if they have values
      const finalHeaders = { ...editForm.headers };
      const finalSensitiveHeaders = [...editSensitiveHeaders];

      if (editHeaderKey.trim() && editHeaderValue.trim()) {
        finalHeaders[editHeaderKey.trim()] = editHeaderValue.trim();
        if (isEditHeaderSensitive) {
          finalSensitiveHeaders.push(editHeaderKey.trim());
        }
      }

      const updateData: UpdateMCPServerRequest = {
        name: editForm.name,
        description: editForm.description,
        server_url: editForm.server_url,
        timeout: editForm.timeout,
        headers: finalHeaders,
        max_retries: editForm.max_retries,
        env: editForm.env,
        sensitive_url: isEditUrlSensitive,
        sensitive_headers: finalSensitiveHeaders,
      };

      await mcpApi.updateServer(editingServer.server_id, updateData);

      setShowEditModal(false);
      setEditingServer(null);
      setEditForm({});
      setEditHeaderKey("");
      setEditHeaderValue("");
      setIsEditHeaderSensitive(false);
      setIsEditUrlSensitive(false);
      setEditSensitiveHeaders([]);

      await fetchData();
      toast.success("MCP server updated successfully");
    } catch (err: any) {
      console.error("Failed to update MCP server:", err);
      toast.error("Failed to update MCP server");
    } finally {
      setIsUpdating(false);
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

  const handleToggleEnabled = async (
    serverId: string,
    serverName: string,
    enabled: boolean
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

  const truncateUrl = (url: string, maxLength: number = 50): string => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + "...";
  };

  const displayUrl = (url: string, isEncrypted: boolean): string => {
    if (isEncrypted) {
      return "••••••••••••••••••••••••••••••••••••••••";
    }
    return truncateUrl(url);
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
              <CardDescription className="mt-4">
                Connect your agent to Model Context Protocol servers to provide
                access to tools and resources
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
      {agentServers.length === 0 ? (
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
          {agentServers.map((server) => {
            return (
              <Card key={server.server_id} className="relative">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="px-2 py-0.5 bg-primary/10 rounded-lg">
                          <span className="text-xs font-medium text-primary uppercase">
                            {server.server_type}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium">{server.server_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {server.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-muted-foreground">
                        <span
                          className="flex items-center"
                          title={server.encrypted_url ? "Encrypted URL" : server.server_url}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          {displayUrl(server.server_url, server.encrypted_url || false)}
                        </span>
                      </div>

                      {server.last_seen && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Last seen:{" "}
                          {new Date(server.last_seen).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Enable/Disable Toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleToggleEnabled(
                            server.server_id,
                            server.server_name,
                            !server.enabled
                          )
                        }
                      >
                        {server.enabled ? (
                          <ToggleRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                      </Button>

                      {/* Test Connection */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleTestConnection(
                            server.server_id,
                            server.server_name
                          )
                        }
                      >
                        <TestTube className="w-4 h-4" />
                      </Button>

                      {/* Edit Server */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(server)}
                      >
                        <Edit className="w-4 h-4" />
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
                              Are you sure you want to delete "
                              {server.server_name}"? This will remove the server
                              from this agent.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleDeleteServer(
                                  server.server_id,
                                  server.server_name
                                )
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
              <div className="flex items-center space-x-2 mt-2">
                <input
                  type="checkbox"
                  id="url-sensitive"
                  checked={isUrlSensitive}
                  onChange={(e) => setIsUrlSensitive(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary accent-primary dark:border-gray-600 dark:focus:ring-offset-background cursor-pointer"
                  style={{ colorScheme: "dark" }}
                />
                <Label htmlFor="url-sensitive" className="text-sm">
                  🔒 URL contains sensitive data (API keys, tokens, etc.)
                </Label>
              </div>
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
                  value={createForm.timeout}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      timeout: parseInt(e.target.value) || 30,
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
                Add authentication or custom headers. Headers will be
                automatically included when creating the server. Use the +
                button to add multiple headers.
              </p>

              {/* Existing Headers */}
              {Object.entries(createForm.headers || {}).length > 0 && (
                <div className="space-y-2 mb-3">
                  {Object.entries(createForm.headers || {}).map(
                    ([key, value]) => {
                      const isSensitive = sensitiveHeaders.includes(key);
                      return (
                        <div
                          key={key}
                          className="flex items-center space-x-2 p-2 bg-muted rounded-lg"
                        >
                          <span className="text-sm font-medium flex items-center space-x-1">
                            {isSensitive && <span className="text-xs">🔒</span>}
                            <span>{key}:</span>
                          </span>
                          <span className="text-sm text-muted-foreground flex-1">
                            {isSensitive ||
                            key.toLowerCase().includes("auth") ||
                            key.toLowerCase().includes("token")
                              ? "*".repeat(Math.min(value.length, 20))
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
                      );
                    }
                  )}
                </div>
              )}

              {/* Add Header Form */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={headerKey}
                    onChange={(e) => setHeaderKey(e.target.value)}
                    placeholder="Authorization"
                  />
                  <div className="flex space-x-2">
                    <Input
                      value={headerValue}
                      onChange={(e) => setHeaderValue(e.target.value)}
                      placeholder="Bearer token123"
                      type={
                        headerKey.toLowerCase().includes("auth") ||
                        headerKey.toLowerCase().includes("token") ||
                        isHeaderSensitive
                          ? "password"
                          : "text"
                      }
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

                {/* Sensitive header checkbox */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="header-sensitive"
                    checked={isHeaderSensitive}
                    onChange={(e) => setIsHeaderSensitive(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary accent-primary dark:border-gray-600 dark:focus:ring-offset-background cursor-pointer"
                    style={{ colorScheme: "dark" }}
                  />
                  <Label htmlFor="header-sensitive" className="text-sm">
                    🔒 Header contains sensitive data (will be encrypted)
                  </Label>
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

      {/* Edit Server Modal */}
      <AlertDialog open={showEditModal} onOpenChange={setShowEditModal}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit MCP Server</AlertDialogTitle>
            <AlertDialogDescription>
              Update your MCP server configuration and settings.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-server-name">Server Name</Label>
                <Input
                  id="edit-server-name"
                  value={editForm.name || ""}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="My MCP Server"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-server-type">Server Type</Label>
                <Select
                  value={
                    editingServer?.server_type ||
                    "http"
                  }
                  onValueChange={(_value: "http" | "sse") => {
                    // Server type is read-only in edit mode for now
                    // setEditForm((prev) => ({ ...prev, server_type: value }));
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
              <Label htmlFor="edit-server-url">Server URL</Label>
              <Input
                id="edit-server-url"
                value={editForm.server_url || ""}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    server_url: e.target.value,
                  }))
                }
                placeholder="https://your-mcp-server.com/mcp"
                className="mt-1"
              />
              <div className="flex items-center space-x-2 mt-2">
                <input
                  type="checkbox"
                  id="edit-url-sensitive"
                  checked={isEditUrlSensitive}
                  onChange={(e) => setIsEditUrlSensitive(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary accent-primary dark:border-gray-600 dark:focus:ring-offset-background cursor-pointer"
                  style={{ colorScheme: "dark" }}
                />
                <Label htmlFor="edit-url-sensitive" className="text-sm">
                  🔒 URL contains sensitive data (API keys, tokens, etc.)
                </Label>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-server-description">
                Description (Optional)
              </Label>
              <Textarea
                id="edit-server-description"
                value={editForm.description || ""}
                onChange={(e) =>
                  setEditForm((prev) => ({
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
                <Label htmlFor="edit-timeout">Timeout (seconds)</Label>
                <Input
                  id="edit-timeout"
                  type="number"
                  min="1"
                  max="300"
                  value={editForm.timeout || 30}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      timeout: parseInt(e.target.value) || 30,
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
                Add authentication or custom headers. Headers will be
                automatically included when updating the server. Use the +
                button to add multiple headers.
              </p>

              {/* Existing Headers */}
              {Object.entries(editForm.headers || {}).length > 0 && (
                <div className="space-y-2 mb-3">
                  {Object.entries(editForm.headers || {}).map(
                    ([key, value]) => {
                      const isSensitive = editSensitiveHeaders.includes(key);
                      return (
                        <div
                          key={key}
                          className="flex items-center space-x-2 p-2 bg-muted rounded-lg"
                        >
                          <span className="text-sm font-medium flex items-center space-x-1">
                            {isSensitive && <span className="text-xs">🔒</span>}
                            <span>{key}:</span>
                          </span>
                          <span className="text-sm text-muted-foreground flex-1">
                            {isSensitive ||
                            key.toLowerCase().includes("auth") ||
                            key.toLowerCase().includes("token")
                              ? "*".repeat(Math.min(value.length, 20))
                              : value}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEditHeader(key)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    }
                  )}
                </div>
              )}

              {/* Add Header Form */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={editHeaderKey}
                    onChange={(e) => setEditHeaderKey(e.target.value)}
                    placeholder="Authorization"
                  />
                  <div className="flex space-x-2">
                    <Input
                      value={editHeaderValue}
                      onChange={(e) => setEditHeaderValue(e.target.value)}
                      placeholder="Bearer token123"
                      type={
                        editHeaderKey.toLowerCase().includes("auth") ||
                        editHeaderKey.toLowerCase().includes("token") ||
                        isEditHeaderSensitive
                          ? "password"
                          : "text"
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addEditHeader}
                      disabled={
                        !editHeaderKey.trim() || !editHeaderValue.trim()
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Sensitive header checkbox */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-header-sensitive"
                    checked={isEditHeaderSensitive}
                    onChange={(e) => setIsEditHeaderSensitive(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary accent-primary dark:border-gray-600 dark:focus:ring-offset-background cursor-pointer"
                    style={{ colorScheme: "dark" }}
                  />
                  <Label htmlFor="edit-header-sensitive" className="text-sm">
                    🔒 Header contains sensitive data (will be encrypted)
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEditServer}
              disabled={!editForm.name || !editForm.server_url || isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Update Server
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
