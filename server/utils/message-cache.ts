import LRU from 'lru-cache';
import { type Message } from '@shared/schema';

interface CacheOptions {
    maxSize?: number;
    ttl?: number;
}

export class MessageCache {
    private cache: LRU<string, Message[]>;

    constructor(options: CacheOptions = {}) {
        this.cache = new LRU({
            max: options.maxSize || 1000,
            ttl: options.ttl || 1000 * 60 * 5, // 5 minutes
        });
    }

    get(conversationId: string): Message[] | undefined {
        return this.cache.get(conversationId);
    }

    set(conversationId: string, messages: Message[]): void {
        this.cache.set(conversationId, messages);
    }

    delete(conversationId: string): void {
        this.cache.delete(conversationId);
    }

    clear(): void {
        this.cache.clear();
    }
}
