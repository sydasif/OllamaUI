import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Settings, X, MessageSquare, Cpu, Wifi, WifiOff } from 'lucide-react';
import { useModels, useDeleteConversation, useOllamaHealth } from '@/hooks/use-ollama';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/lib/ollama-api';
import SettingsModal from '@/components/modals/settings-modal';
import ModelManagerModal from '@/components/modals/model-manager-modal';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  currentConversation?: Conversation;
  currentModel: string;
  onModelChange: (model: string) => void;
  onNewConversation: () => void;
  isMobile: boolean;
}

export default function Sidebar({
  open,
  onClose,
  conversations,
  currentConversation,
  currentModel,
  onModelChange,
  onNewConversation,
  isMobile,
}: SidebarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelManagerOpen, setModelManagerOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: models = [] } = useModels();
  const { data: healthCheck } = useOllamaHealth();
  const deleteConversationMutation = useDeleteConversation();

  const isConnected = (healthCheck as any)?.ollama ?? false;
  const availableModels = (models as any[]).filter((m: any) => m.isAvailable);

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await deleteConversationMutation.mutateAsync(id);
      if (currentConversation?.id === id) {
        setLocation('/');
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <div
        className={cn(
          "w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col",
          "transform transition-transform duration-300 ease-in-out",
          isMobile ? (open ? "translate-x-0" : "-translate-x-full absolute z-50 h-full") : "relative"
        )}
        data-testid="sidebar-container"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Ollama Chat
            </h1>
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                data-testid="button-close-sidebar"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-success animate-pulse" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Connected to localhost:11434
                </span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-error" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Disconnected
                </span>
              </>
            )}
          </div>
        </div>

        {/* Model Selection */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Current Model
          </label>
          <Select value={currentModel} onValueChange={onModelChange}>
            <SelectTrigger data-testid="select-model">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model: any) => (
                <SelectItem key={model.name} value={model.name}>
                  {model.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Recent Chats
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNewConversation}
              data-testid="button-new-chat"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {conversations.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              conversations.map(conversation => (
                <Link
                  key={conversation.id}
                  href={`/chat/${conversation.id}`}
                  className={cn(
                    "block p-3 rounded-lg transition-colors group",
                    currentConversation?.id === conversation.id
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                  )}
                  data-testid={`link-conversation-${conversation.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {conversation.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatTimeAgo(conversation.updatedAt)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteConversation(conversation.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`button-delete-conversation-${conversation.id}`}
                    >
                      <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                    </Button>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <Button
            variant="outline"
            className="w-full justify-center"
            onClick={() => setModelManagerOpen(true)}
            data-testid="button-manage-models"
          >
            <Cpu className="w-4 h-4 mr-2" />
            Manage Models
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-center"
            onClick={() => setSettingsOpen(true)}
            data-testid="button-settings"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <ModelManagerModal
        open={modelManagerOpen}
        onClose={() => setModelManagerOpen(false)}
      />
    </>
  );
}
