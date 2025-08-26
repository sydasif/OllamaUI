import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useSettings, useUpdateSetting } from '@/hooks/use-ollama';
import { useToast } from '@/hooks/use-toast';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { data: settings = [] } = useSettings();
  const updateSettingMutation = useUpdateSetting();
  const { toast } = useToast();

  // Local state for form values
  const [formData, setFormData] = useState({
    ollama_url: 'http://localhost:11434',
    temperature: 0.7,
    max_tokens: 1024,
    system_prompt: 'You are a helpful AI assistant.',
    auto_save: true,
  });

  // Load settings into form
  useEffect(() => {
    if ((settings as any[]).length > 0) {
      const settingsMap = (settings as any[]).reduce((acc: any, setting: any) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>);

      setFormData({
        ollama_url: settingsMap.ollama_url?.url || 'http://localhost:11434',
        temperature: settingsMap.temperature?.temperature || 0.7,
        max_tokens: settingsMap.max_tokens?.max_tokens || 1024,
        system_prompt: settingsMap.system_prompt?.prompt || 'You are a helpful AI assistant.',
        auto_save: settingsMap.auto_save?.enabled || true,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      const updates = [
        { key: 'ollama_url', value: { url: formData.ollama_url } },
        { key: 'temperature', value: { temperature: formData.temperature } },
        { key: 'max_tokens', value: { max_tokens: formData.max_tokens } },
        { key: 'system_prompt', value: { prompt: formData.system_prompt } },
        { key: 'auto_save', value: { enabled: formData.auto_save } },
      ];

      await Promise.all(
        updates.map(update =>
          updateSettingMutation.mutateAsync(update)
        )
      );

      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="modal-settings">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Ollama API URL */}
          <div className="space-y-2">
            <Label htmlFor="ollama-url">Ollama API URL</Label>
            <Input
              id="ollama-url"
              type="url"
              value={formData.ollama_url}
              onChange={(e) => setFormData(prev => ({ ...prev, ollama_url: e.target.value }))}
              placeholder="http://localhost:11434"
              data-testid="input-ollama-url"
            />
          </div>

          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Temperature (Creativity)</Label>
              <span className="text-sm text-muted-foreground" data-testid="text-temperature-value">
                {formData.temperature}
              </span>
            </div>
            <Slider
              value={[formData.temperature]}
              onValueChange={(value) => setFormData(prev => ({ ...prev, temperature: value[0] }))}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
              data-testid="slider-temperature"
            />
            <p className="text-xs text-muted-foreground">
              Lower values are more focused, higher values are more creative
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <Label htmlFor="max-tokens">Max Response Length</Label>
            <Select
              value={formData.max_tokens.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, max_tokens: parseInt(value) }))}
            >
              <SelectTrigger data-testid="select-max-tokens">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="512">Short (512 tokens)</SelectItem>
                <SelectItem value="1024">Medium (1024 tokens)</SelectItem>
                <SelectItem value="2048">Long (2048 tokens)</SelectItem>
                <SelectItem value="4096">Very Long (4096 tokens)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="system-prompt">System Prompt</Label>
            <Textarea
              id="system-prompt"
              value={formData.system_prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
              placeholder="You are a helpful AI assistant..."
              rows={3}
              data-testid="textarea-system-prompt"
            />
          </div>

          {/* Auto-save */}
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-save">Auto-save Chat History</Label>
            <Switch
              id="auto-save"
              checked={formData.auto_save}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_save: checked }))}
              data-testid="switch-auto-save"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="button-cancel-settings"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateSettingMutation.isPending}
            data-testid="button-save-settings"
          >
            {updateSettingMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
