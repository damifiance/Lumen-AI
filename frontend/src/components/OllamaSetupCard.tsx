import { Download, ExternalLink } from 'lucide-react';
import ollamaSetupImg from '../assets/ollama-setup.png';

export function OllamaSetupCard() {
  return (
    <div className="max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Download size={18} className="text-accent" />
        <h3 className="font-semibold text-gray-700">Get Started with Ollama</h3>
      </div>

      <img
        src={ollamaSetupImg}
        alt="Ollama setup example showing 'ollama pull llama3.1' command"
        className="rounded-lg border border-gray-200 mb-3 w-full h-auto"
      />

      <p className="text-xs text-gray-500 mb-3">
        Install Ollama and pull a model to start using local AI for free.
      </p>

      <a
        href="https://ollama.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-xs text-accent hover:text-accent/80 transition-colors"
      >
        <span>Download Ollama</span>
        <ExternalLink size={12} />
      </a>
    </div>
  );
}
