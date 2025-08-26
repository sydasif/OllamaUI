import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Menu, Sun, Moon, RotateCcw, Send, Paperclip } from 'lucide-react';
import Message from '@/components/chat/message';
import { useCreateMessage, useMessages } from '@/hooks/use-ollama';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Message as MessageType, Conversation } from '@/lib/ollama-api';
import { useQueryClient } from '@tanstack/react-query';

interface ChatAreaProps {
  conversationId?: string;
  currentConversation?: Conversation;
  messages: MessageType[];
  currentModel: string;
  onToggleSidebar: () => void;
  onToggleDarkMode: () => void;
  onStartNewConversation: (firstMessage?: string) => Promise<string | null>;
  darkMode: boolean;
  isMobile: boolean;
}

export default function ChatArea({
  conversationId,
  currentConversation,
  messages,
  currentModel,
  onToggleSidebar,
  onToggleDarkMode,
  onStartNewConversation,
  darkMode,
  isMobile,
}: ChatAreaProps) {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const createMessageMutation = useCreateMessage();
  const queryClient = useQueryClient();
  const { data: messagesData, isLoading } = useMessages(conversationId);
  const [localMessages, setLocalMessages] = useState<MessageType[]>(messages);

  // Update local messages when messages prop or query data changes
  useEffect(() => {
    if (messagesData) {
      setLocalMessages(messagesData);
    } else if (messages) {
      setLocalMessages(messages);
    }
  }, [messages, messagesData]);

  // Refetch messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'messages'] });
    }
  }, [conversationId, queryClient]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      try {
        messagesEndRef.current.scrollIntoView({
          behavior,
          block: 'end',
        });
      } catch (error) {
        console.error('Scroll error:', error);
      }
    }
  };

  // Handle scroll when messages change
  useEffect(() => {
    if (localMessages.length > 0) {
      // Immediate scroll
      scrollToBottom('auto');

      // Delayed scrolls to handle content loading
      const timeouts = [100, 300, 500].map(delay =>
        setTimeout(() => scrollToBottom('smooth'), delay)
      );

      return () => timeouts.forEach(clearTimeout);
    }
  }, [localMessages]);

  // Handle scroll during streaming
  useEffect(() => {
    if (streamingMessage) {
      scrollToBottom('smooth');
    }
  }, [streamingMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const messageText = input.trim();
    setInput('');

    let activeConversationId = conversationId;

    // Create new conversation if needed
    if (!activeConversationId) {
      const newConvId = await onStartNewConversation(messageText);
      if (!newConvId) return;
      activeConversationId = newConvId;
    }

    try {
      // Create user message
      await createMessageMutation.mutateAsync({
        conversationId: activeConversationId,
        data: { role: 'user', content: messageText }
      });

      // Start streaming response
      setIsGenerating(true);
      setStreamingMessage('');

      // Send chat request and handle streaming response
      const response = await fetch(`/api/conversations/${activeConversationId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          model: currentModel,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch response not OK:', errorText); // Log error response
        throw new Error(`Failed to start chat: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        console.error('No readable stream from response.'); // Log if no reader
        setIsGenerating(false);
        setStreamingMessage('');
        return;
      }

      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        console.log('Received chunk:', chunk); // Log each chunk
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          console.log('Processing line:', line); // Log each line
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              console.log('Parsed data:', data); // Log parsed data
              if (data.error) {
                console.error('Streaming error:', data.error);
                setIsGenerating(false);
                return;
              }

              if (data.done) {
                setIsGenerating(false);
                setStreamingMessage('');
                // Invalidate messages query to refetch the assistant's complete message
                queryClient.invalidateQueries({ queryKey: ['/api/conversations', activeConversationId, 'messages'] });
                return;
              }

              if (data.content) {
                setStreamingMessage(prev => prev + data.content);
              }
            } catch (e) {
              console.error('Error parsing stream data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsGenerating(false);
      setStreamingMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearChat = () => {
    // TODO: Implement clear current chat
  };

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  };

  useEffect(() => {
    autoResize();
  }, [input]);

  // Use local messages for display
  const displayMessages = localMessages;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              data-testid="button-toggle-sidebar"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentConversation?.title || 'New Chat'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {currentModel} • Ready to assist
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleDarkMode}
            data-testid="button-toggle-dark-mode"
          >
            {darkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            data-testid="button-clear-chat"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
        data-testid="messages-container"
        type="always"
        style={{ height: 'calc(100vh - 180px)' }}>
        {isLoading ? (
          <div className="flex justify-center items-center py-4">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        ) : displayMessages.length === 0 && !streamingMessage ? (
          <div className="flex justify-center items-center h-full">
            <div className="max-w-md text-center">
              <div className="w-16 h-16 mx-auto mb-4 gradient-primary rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Welcome to Ollama Chat
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Start a conversation with your local AI model. Ask questions, get help with coding, or explore creative ideas.
              </p>
            </div>
          </div>
        ) : (
          <>
            {displayMessages.map((message) => (
              <Message key={message.id} message={message} />
            ))}

            {/* Streaming Message */}
            {isGenerating && (
              <div className="flex space-x-3">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 0 002-2V5a2 0 00-2-2H5a2 0 00-2 2v10a2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600">
                    {streamingMessage ? (
                      <div className="prose dark:prose-invert max-w-none text-sm">
                        {streamingMessage}
                        <span className="animate-pulse">▋</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Thinking...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
        <ScrollBar />
      </ScrollArea>

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shrink-0">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message here... (Shift+Enter for new line)"
              className={cn(
                "w-full pr-20 resize-none min-h-[60px] max-h-40",
                "focus:ring-2 focus:ring-primary focus:border-transparent"
              )}
              disabled={isGenerating}
              data-testid="input-message"
            />

            <div className="absolute right-3 bottom-3 flex items-center space-x-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                data-testid="button-attach-file"
              >
                <Paperclip className="w-4 h-4" />
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={!input.trim() || isGenerating}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>

          <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <span>Press Shift+Enter for new line</span>
              <span>•</span>
              <span>{input.length} characters</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>Powered by</span>
              <span className="font-medium text-primary">Ollama</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
