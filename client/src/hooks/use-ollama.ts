import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ollamaApi } from '@/lib/ollama-api';
import { useToast } from '@/hooks/use-toast';

export function useOllamaHealth() {
  return useQuery({
    queryKey: ['/api/health'],
    refetchInterval: 30000, // Check every 30 seconds
    retry: false,
  });
}

export function useModels() {
  return useQuery({
    queryKey: ['/api/models'],
    staleTime: 60000, // Cache for 1 minute
  });
}

export function useConversations() {
  return useQuery({
    queryKey: ['/api/conversations'],
  });
}

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['/api/conversations', conversationId, 'messages'],
    enabled: !!conversationId,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    queryFn: async () => {
      if (!conversationId) return [];
      const res = await ollamaApi.getMessages(conversationId);
      return res;
    }
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['/api/settings'],
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { title: string; model: string }) =>
      ollamaApi.createConversation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => ollamaApi.deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({
        title: "Success",
        description: "Conversation deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    },
  });
}

export function useCreateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, data }: {
      conversationId: string;
      data: { role: 'user' | 'assistant'; content: string }
    }) => ollamaApi.createMessage(conversationId, data),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/conversations', conversationId, 'messages']
      });
    },
  });
}

export function usePullModel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (name: string) => ollamaApi.pullModel(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/models'] });
      toast({
        title: "Success",
        description: "Model pulled successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to pull model",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteModel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (name: string) => ollamaApi.deleteModel(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/models'] });
      toast({
        title: "Success",
        description: "Model deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete model",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) =>
      ollamaApi.updateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
  });
}
