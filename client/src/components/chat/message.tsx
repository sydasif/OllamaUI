import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Share, User, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Message as MessageType } from '@/lib/ollama-api';

interface MessageProps {
  message: MessageType;
}

export default function Message({ message }: MessageProps) {
  const { toast } = useToast();
  const [isDark] = useState(() => document.documentElement.classList.contains('dark'));

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return `${diffHours} hr ago`;
    
    return date.toLocaleDateString();
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast({
        title: "Copied",
        description: "Message copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy message",
        variant: "destructive",
      });
    }
  };

  const shareMessage = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shared from Ollama Chat',
          text: message.content,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      copyMessage();
    }
  };

  const isUser = message.role === 'user';

  return (
    <div className="flex space-x-3" data-testid={`message-${message.id}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser 
          ? 'bg-blue-100 dark:bg-blue-900' 
          : 'gradient-primary'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-blue-600 dark:text-blue-300" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className={`rounded-lg p-4 shadow-sm border ${
          isUser
            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
        }`}>
          <div className="prose dark:prose-invert max-w-none text-sm">
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = typeof props.inline === 'boolean' ? props.inline : false;
                    return !isInline && match ? (
                      <SyntaxHighlighter
                        style={isDark ? oneDark : oneLight as any}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-md"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-600">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(message.timestamp)}
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyMessage}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 h-auto p-1"
                data-testid={`button-copy-message-${message.id}`}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
              {!isUser && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={shareMessage}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 h-auto p-1"
                  data-testid={`button-share-message-${message.id}`}
                >
                  <Share className="w-3 h-3 mr-1" />
                  Share
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
