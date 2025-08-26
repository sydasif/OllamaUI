import { memo } from 'react';
import type { Message as MessageType } from '@/lib/ollama-api';
import { cn } from '@/lib/utils';

interface MessageComponentProps {
    message: MessageType;
    isLast: boolean;
}

const MessageComponent = memo(({ message, isLast }: MessageComponentProps) => {
    const isUser = message.role === 'user';

    return (
        <div
            className={cn(
                "flex space-x-3",
                isUser ? "justify-end" : "justify-start"
            )}
        >
            <div
                className={cn(
                    "flex-1 min-w-0 max-w-2xl",
                    isUser ? "ml-auto" : "mr-auto"
                )}
            >
                <div
                    className={cn(
                        "rounded-lg p-4 shadow-sm",
                        isUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                    )}
                >
                    <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap break-words">
                        {message.content}
                    </div>
                </div>
            </div>
        </div>
    );
});

MessageComponent.displayName = 'MessageComponent';

export default MessageComponent;
