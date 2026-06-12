
import * as React from "react";
import { Send, Paperclip, Mic, X, Square } from "lucide-react";
import { Button, Spinner } from "@heroui/react";
import { useTranslation } from "react-i18next";

interface ChatInputProps {
  isStreaming: boolean;
  onSend: (message: string, attachments?: File[]) => void;
}

export function ChatInput({ isStreaming, onSend }: ChatInputProps) {
  const { t } = useTranslation();
  const [input, setInput] = React.useState("");
  const [attachments, setAttachments] = React.useState<any[]>([]);
  const [isRecording, setIsRecording] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Audio recording refs
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isUploading = attachments.some(a => a.isUploading);
    if ((!input.trim() && attachments.length === 0) || isStreaming || isUploading) return;
    
    // Chỉ gửi các file đã upload xong
    const readyAttachments = attachments.filter(a => !a.isUploading);
    onSend(input.trim(), readyAttachments);
    setInput("");
    setAttachments([]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const { chatService } = await import('@/src/features/chat-session/services/chat.service');
      
      filesArray.forEach(async (file) => {
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        // Thêm file vào UI với trạng thái uploading
        setAttachments((prev) => [...prev, { id: tempId, name: file.name, isUploading: true }]);
        
        try {
          const uploadedData = await chatService.uploadFile(file);
          // Cập nhật lại state file
          setAttachments((prev) => prev.map(a => a.id === tempId ? { ...uploadedData, isUploading: false } : a));
        } catch (err) {
          console.error('Lỗi upload file:', err);
          // Xóa khỏi danh sách nếu lỗi
          setAttachments((prev) => prev.filter(a => a.id !== tempId));
        }
      });
    }
  };

  const removeAttachment = (idToRemove: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== idToRemove));
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          // Call API to transcribe voice
          const formData = new FormData();
          formData.append('file', audioBlob, 'recording.webm');
          
          try {
            // Import apiClient at the top of the file if needed, or we can just import dynamically
            // Wait, we need to import apiClient. Let me replace the top of the file as well.
            const { apiClient } = await import('@/src/lib/api-client');
            const response = await apiClient.post('/api/voice/to-text', formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            });
            if (response.status === 200 || response.status === 201) {
              const data = response.data;
              if (data.text) {
                setInput((prev) => prev + (prev ? ' ' : '') + data.text);
              }
            }
          } catch (err) {
            console.error('Voice transcription error', err);
          }
          
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Microphone access denied', err);
      }
    }
  };

  return (
    <div className="p-4 bg-background border-t border-default-200/60">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
          {attachments.map((file) => (
            <div key={file.id} className={`relative flex items-center bg-default-100 border border-default-200 rounded-lg px-3 py-1.5 text-xs text-default-700 ${file.isUploading ? 'opacity-70' : ''}`}>
              <span className="truncate max-w-[150px]">{file.name}</span>
              {file.isUploading && <Spinner size="sm" className="ml-2 w-3 h-3" />}
              <button 
                type="button"
                onClick={() => removeAttachment(file.id)} 
                className="ml-2 text-default-400 hover:text-danger cursor-pointer"
                disabled={file.isUploading}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recording Visualizer (Mock) */}
      {isRecording && (
        <div className="flex items-center gap-3 mb-3 bg-danger-50 text-danger px-4 py-2 rounded-xl animate-pulse border border-danger-200">
           <Mic className="h-4 w-4 animate-bounce" />
           <span className="text-sm font-medium">Đang ghi âm...</span>
           <div className="flex gap-1 items-end h-4 ml-2">
             {[...Array(5)].map((_, i) => (
                <div key={i} className="w-1 bg-danger h-full animate-[bounce_1s_infinite]" style={{ animationDelay: `${i * 0.1}s`}} />
             ))}
           </div>
        </div>
      )}

      <form className="flex gap-2 items-end" onSubmit={handleSubmit}>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple 
          onChange={handleFileChange} 
        />
        
        <div className="flex-1 flex items-center bg-default-100 border border-default-200 rounded-2xl focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
           <Button
             isIconOnly
             variant="ghost"
             className="border-none text-default-500 ml-1 cursor-pointer"
             onClick={() => fileInputRef.current?.click()}
             isDisabled={isStreaming}
             type="button"
           >
             <Paperclip className="h-4.5 w-4.5" />
           </Button>
           
           <input
            className="flex-1 bg-transparent text-foreground px-2 py-3.5 text-sm focus:outline-none disabled:opacity-50"
            disabled={isStreaming}
            placeholder={
              isStreaming ? t("chat.input.processing") : t("chat.input.placeholder")
            }
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <Button
             isIconOnly
             variant="ghost"
             className={`border-none mr-1 cursor-pointer ${isRecording ? "text-danger bg-danger-50" : "text-default-500"}`}
             onClick={toggleRecording}
             isDisabled={isStreaming}
             type="button"
           >
             {isRecording ? <Square className="h-4 w-4" fill="currentColor" /> : <Mic className="h-4.5 w-4.5" />}
           </Button>
        </div>

        <Button
          isIconOnly
          className={`cursor-pointer h-12 w-12 rounded-2xl shrink-0 ${input.trim() || attachments.length > 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25' : 'bg-default-200 text-default-400'}`}
          isDisabled={isStreaming || (!input.trim() && attachments.length === 0)}
          type="submit"
        >
          {isStreaming ? (
            <Spinner color="current" size="sm" />
          ) : (
            <Send className="h-4.5 w-4.5 ml-0.5" />
          )}
        </Button>
      </form>
    </div>
  );
}
