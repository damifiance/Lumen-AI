import { useEffect } from 'react';
import { Cpu } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { getModels } from '../../api/chat';

export function ModelSelector() {
  const { model, models, setModel, setModels } = useChatStore();

  useEffect(() => {
    getModels().then(setModels).catch(console.error);
  }, [setModels]);

  return (
    <div className="flex items-center gap-1.5">
      <Cpu size={13} className="text-gray-400" />
      <select
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="text-xs border-0 bg-transparent text-gray-500 focus:outline-none cursor-pointer font-medium pr-4"
      >
        {models.length > 0 ? (
          models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))
        ) : (
          <option value={model}>Loading...</option>
        )}
      </select>
    </div>
  );
}
