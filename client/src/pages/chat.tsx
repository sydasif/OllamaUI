import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import Sidebar from '@/components/chat/sidebar';
import ChatArea from '@/components/chat/chat-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { useConversations, useMessages, useCreateConversation, useModels } from '@/hooks/use-ollama';

export default function Chat() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState('llama3.1'); // Default to a placeholder
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  const isMobile = useIsMobile();
  const { conversationId } = useParams();
  const [, setLocation] = useLocation();

  const { data: conversations = [] } = useConversations();
  const { data: messages = [] } = useMessages(conversationId);
  const { data: models = [] } = useModels(); // Fetch available models
  const createConversationMutation = useCreateConversation();

  useEffect(() => {
    if ((models as any[]).length > 0 && currentModel === 'llama3.1') {
      // Set the current model to the first available model if it's still the default
      setCurrentModel((models as any[])[0].name);
    }
  }, [models, currentModel]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const startNewConversation = async (firstMessage?: string) => {
    const title = firstMessage ?
      firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '') :
      'New Chat';

    try {
      const newConversation = await createConversationMutation.mutateAsync({
        title,
        model: currentModel,
      });
      setLocation(`/chat/${newConversation.id}`);
      return newConversation.id;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }
  };

  const currentConversation = (conversations as any[]).find((c: any) => c.id === conversationId);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations as any[]}
        currentConversation={currentConversation}
        currentModel={currentModel}
        onModelChange={setCurrentModel}
        onNewConversation={startNewConversation}
        isMobile={isMobile}
        data-testid="sidebar"
      />

      <div className="flex-1 flex flex-col">
        <ChatArea
          conversationId={conversationId}
          currentConversation={currentConversation}
          messages={messages as any[]}
          currentModel={currentModel}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onToggleDarkMode={toggleDarkMode}
          onStartNewConversation={startNewConversation}
          darkMode={darkMode}
          isMobile={isMobile}
          data-testid="chat-area"
        />
      </div>
    </div>
  );
}
