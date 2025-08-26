import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Download, Loader2 } from 'lucide-react';
import { useModels, usePullModel, useDeleteModel } from '@/hooks/use-ollama';
import { useToast } from '@/hooks/use-toast';

interface ModelManagerModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ModelManagerModal({ open, onClose }: ModelManagerModalProps) {
  const [newModelName, setNewModelName] = useState('');
  const { data: models = [] } = useModels();
  const pullModelMutation = usePullModel();
  const deleteModelMutation = useDeleteModel();
  const { toast } = useToast();

  const handlePullModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelName.trim()) return;

    try {
      await pullModelMutation.mutateAsync(newModelName.trim());
      setNewModelName('');
      toast({
        title: "Model download started",
        description: "The model is being downloaded in the background.",
      });
    } catch (error) {
      console.error('Failed to pull model:', error);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete the model "${modelName}"?`)) {
      return;
    }

    try {
      await deleteModelMutation.mutateAsync(modelName);
    } catch (error) {
      console.error('Failed to delete model:', error);
    }
  };

  const formatFileSize = (size?: string) => {
    if (!size) return 'Unknown size';
    return size;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]" data-testid="modal-model-manager">
        <DialogHeader>
          <DialogTitle>Model Management</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Pull New Model */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-4">
            <h4 className="font-medium text-sm">Pull New Model</h4>
            <form onSubmit={handlePullModel} className="flex space-x-3">
              <div className="flex-1">
                <Input
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="Model name (e.g., llama3.1, mistral)"
                  disabled={pullModelMutation.isPending}
                  data-testid="input-model-name"
                />
              </div>
              <Button
                type="submit"
                disabled={!newModelName.trim() || pullModelMutation.isPending}
                data-testid="button-pull-model"
              >
                {pullModelMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Pulling...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Pull Model
                  </>
                )}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">
              Enter a model name from the Ollama library (e.g., llama3.1, mistral, codestral)
            </p>
          </div>

          {/* Available Models */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Available Models</h4>
            
            {(models as any[]).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No models available</p>
                <p className="text-sm mt-1">Pull a model to get started</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(models as any[]).map((model: any) => (
                  <div
                    key={model.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    data-testid={`model-item-${model.name}`}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{model.displayName}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Size: {formatFileSize(model.size)} • 
                        Updated: {formatDate(model.lastUpdated)}
                        {!model.isAvailable && ' • Unavailable'}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteModel(model.name)}
                      disabled={deleteModelMutation.isPending}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-delete-model-${model.name}`}
                    >
                      {deleteModelMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="button-close-model-manager"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
