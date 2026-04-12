import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '../components/AppLayout';
import ParticleNetwork from '../components/ParticleNetwork';
import ResumenCard from '../components/ResumenCard';
import { useProject } from '../context/ProjectContext';

const ROLE_ICON = {
  backend: "database", frontend: "brush", security: "policy",
  database: "storage", devops: "cloud_sync", qa: "bug_report", ux: "design_services"
};

export default function ConfiguratorPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { updateState } = useProject();
  
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isContinuousActive, setIsContinuousActive] = useState(false);
  const isContinuousModeRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const [pendingConfig, setPendingConfig] = useState(null);
  const [savedConfig, setSavedConfig] = useState(null);
  const [sessionId, setSessionId] = useState('--');
  const [statusBanner, setStatusBanner] = useState(null);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    loadExisting();
    bootstrap();
  }, []);

  const bootstrap = async () => {
    if (messages.length === 0) {
      try {
        const res = await fetch(`/api/chat/${projectId}/history`);
        if (res.ok) {
          const history = await res.json();
          if (history && history.length > 0) {
            setMessages(history.map(m => ({ role: m.role, text: m.content })));
            return;
          }
        }
      } catch (e) {
        console.error("Failed to load history", e);
      }
      
      setMessages([
        { role: 'assistant', text: "Hi! I'm Neural Architect 🚀. I will help you define your project and the agent team that will build it. To start, tell me in one sentence what you want to build." }
      ]);
    }
  };

  const loadExisting = async () => {
    try {
      const res = await fetch(`/api/chat/${projectId}/config`, { credentials: "include" });
      if (!res.ok) return;
      const cfg = await res.json();
      if (cfg && cfg.backend) {
        setSavedConfig(cfg);
      }
    } catch (_) {}
  };

  const showBanner = (kind, text) => {
    setStatusBanner({ kind, text });
    setTimeout(() => setStatusBanner(null), 8000);
  };

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    setMessages(prev => [...prev, { role: 'user', text }]);
    setInputValue('');
    setIsTyping(true);

    try {
      const res = await fetch(`/api/chat/${projectId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text })
      });
      
      setIsTyping(false);
      
      if (!res.ok) {
        const errorText = await res.text();
        setMessages(prev => [...prev, { role: 'assistant', text: "⚠️ Server error: " + errorText }]);
        return;
      }
      
      const data = await res.json();
      processBackendResponse(data);
    } catch (e) {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', text: "⚠️ " + e.message }]);
    }
  };

  const startListeningCycle = async () => {
    if (!isContinuousModeRef.current) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setInputValue(''); // Limpiar input antes de empezar
      accumulatedTranscriptRef.current = ''; // Reiniciar también el texto acumulado del reconocimiento de voz

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 512;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let lastSpeechTime = Date.now();
      let hasSpoken = false;
      let checkInterval;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        clearInterval(checkInterval);
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch(e){}
        }
        
        if (hasSpoken && audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await sendAudioMessage(audioBlob);
        } else if (isContinuousModeRef.current) {
          startListeningCycle();
        }
      };

      checkInterval = setInterval(() => {
        if (!isContinuousModeRef.current || mediaRecorder.state !== 'recording') {
          clearInterval(checkInterval);
          if (mediaRecorder.state === 'recording') mediaRecorder.stop();
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / bufferLength;

        // Threshold adaptado para detectar el habla
        if (average > 10) {
          lastSpeechTime = Date.now();
          hasSpoken = true;
        } else {
          // Si el usuario ha hablado y hay un silencio prolongado de 1.8 segundos, enviamos el audio.
          if (hasSpoken && Date.now() - lastSpeechTime > 1800) {
            mediaRecorder.stop();
          }
        }
      }, 100);

      mediaRecorder.start();
      
      // Asegurarnos de iniciar recognition SIEMPRE que arrancamos el ciclo
      if (recognitionRef.current) {
        try { 
          recognitionRef.current.start(); 
        } catch(e) {
          console.warn("Speech recognition already started", e);
        }
      }
      
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone", err);
      showBanner("err", "Could not access the microphone.");
      isContinuousModeRef.current = false;
      setIsContinuousActive(false);
      setIsRecording(false);
    }
  };

  // Función para arrancar/parar
  const toggleContinuousMode = () => {
    if (isContinuousModeRef.current) {
      isContinuousModeRef.current = false;
      setIsContinuousActive(false);
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
      }
      setIsRecording(false);
    } else {
      isContinuousModeRef.current = true;
      setIsContinuousActive(true);
      startListeningCycle();
    }
  };

  // useRef to keep track of the accumulated text to avoid clearing on each re-render
  const accumulatedTranscriptRef = useRef('');

  useEffect(() => {
    // Configuración del Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES'; // Ajustar si es necesario
      
      recognition.onresult = (event) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
             accumulatedTranscriptRef.current += event.results[i][0].transcript + ' ';
          } else {
             interimTranscript += event.results[i][0].transcript;
          }
        }
        
        const combinedText = (accumulatedTranscriptRef.current + interimTranscript).trim();
        // Update input directly with combined text to see it live
        setInputValue(combinedText);
      };
      
      // Intentar reiniciar si el servicio se desconecta de manera anormal, a menos que estemos parándolo
      recognition.onend = () => {
        if (isContinuousModeRef.current && isRecording) {
           try { recognition.start(); } catch(e) {}
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
      };
      
      recognitionRef.current = recognition;
    } else {
      console.warn("This browser does not support the SpeechRecognition API. Use Chrome or Edge for live transcription.");
    }
    
    return () => {
      isContinuousModeRef.current = false;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
      }
    };
  }, []);

  const sendAudioMessage = async (audioBlob) => {
    setIsProcessingVoice(true);
    setIsTyping(true);
    
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');

      const res = await fetch(`/api/chat/${projectId}/voice`, {
        method: "POST",
        credentials: "include",
        body: formData
      });
      
      setIsTyping(false);
      
      if (!res.ok) {
        const errorText = await res.text();
        setMessages(prev => [...prev, { role: 'assistant', text: "⚠️ Server error: " + errorText }]);
        setIsProcessingVoice(false);
        setInputValue('');
        if (isContinuousModeRef.current) startListeningCycle();
        return;
      }
      
      const data = await res.json();
      if (data.transcribedText) {
        setMessages(prev => [...prev, { role: 'user', text: data.transcribedText }]);
        setInputValue(''); // Limpiar lo que haya dictado tras enviar
        accumulatedTranscriptRef.current = '';
      }
      
      processBackendResponse(data);
      
      if (data.audioBase64) {
        const audioSrc = `data:audio/mp3;base64,${data.audioBase64}`;
        const audio = new Audio(audioSrc);
        audio.onended = () => {
          setIsProcessingVoice(false);
          if (isContinuousModeRef.current) startListeningCycle();
        };
        audio.play().catch(e => {
          console.error("Error playing audio", e);
          setIsProcessingVoice(false);
          if (isContinuousModeRef.current) startListeningCycle();
        });
      } else {
        setIsProcessingVoice(false);
        if (isContinuousModeRef.current) startListeningCycle();
      }
      } catch (e) {
      setIsTyping(false);
      setIsProcessingVoice(false);
      setInputValue('');
      accumulatedTranscriptRef.current = '';
      setMessages(prev => [...prev, { role: 'assistant', text: "⚠️ " + e.message }]);
      if (isContinuousModeRef.current) startListeningCycle();
    }
  };

  const processBackendResponse = (data) => {
    const aiReply = data.reply || "";

    if (aiReply.includes("[CONFIRMADO]")) {
      setMessages(prev => [...prev, { role: 'assistant', text: "✅ Perfect! Team confirmed and saved to the database. Preparing your orchestration environment..." }]);
    } else {
      setMessages(prev => [...prev, { role: 'assistant', text: aiReply }]);
    }
    
    if (data.sessionId) setSessionId(data.sessionId.substring(0, 8));
    
    if (data.pendingConfig) {
      setPendingConfig(data.pendingConfig);
    }
    
    const latestPending = data.pendingConfig || pendingConfig;
    
    if (data.saved) {
      setSavedConfig(data.saved);
      setPendingConfig(null);
      showBanner("ok", "Configuration saved. Redirecting to Orchestration...");
      setTimeout(() => navigate(`/project/${projectId}/orchestration`), 2000);
    } else if (aiReply.includes("[CONFIRMADO]") && latestPending) {
       handleConfirm(latestPending);
    }
  };

  const handleConfirm = async (configToSave = pendingConfig) => {
    if (!configToSave) return;
    try {
      const res = await fetch(`/api/chat/${projectId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(configToSave)
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      setSavedConfig(saved);
      setPendingConfig(null);
      
      updateState({
        projectIdea: saved.idea,
        selectedTechs: [saved.backend, saved.frontend, saved.database],
        generatedAgents: saved.agents
      });
      
      showBanner("ok", "Configuration saved. Redirecting to Orchestration...");
      setTimeout(() => navigate(`/project/${projectId}/orchestration`), 2000);
    } catch (e) {
      showBanner("err", "Could not save: " + e.message);
    }
  };

  const handleReset = async () => {
    await fetch(`/api/chat/${projectId}/reset`, { method: "POST", credentials: "include" });
    setMessages([]);
    setPendingConfig(null);
    setSavedConfig(null);
    setSessionId('--');
    bootstrap();
  };

  const activeConfig = savedConfig || pendingConfig;

  const RightPanel = (
    <div className="flex flex-col h-full bg-surface-container-low/80 backdrop-blur-3xl border-l border-white/5 relative z-10 w-full overflow-y-auto">
      <ParticleNetwork particleCount={20} className="opacity-20 absolute inset-0 pointer-events-none" />
      
      <div className="p-6 relative z-10 flex flex-col gap-6">
        
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-headline font-bold text-xl flex items-center gap-2 drop-shadow-md">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#3adffa]" />
            Stack
          </h3>
          <div className="flex gap-2">
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">Session · {sessionId}</span>
            <button onClick={handleReset} disabled={isContinuousActive} className="text-[10px] text-outline hover:text-white uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Reset</button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-surface-container border border-outline-variant/20 rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Backend</div>
            <div className="font-headline text-base text-on-surface">{activeConfig?.backend || "—"}</div>
          </div>
          <div className="bg-surface-container border border-outline-variant/20 rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Frontend</div>
            <div className="font-headline text-base text-on-surface">{activeConfig?.frontend || "—"}</div>
          </div>
          <div className="bg-surface-container border border-outline-variant/20 rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Database</div>
            <div className="font-headline text-base text-on-surface">{activeConfig?.database || "—"}</div>
          </div>
        </div>

        <div className="mt-2 text-[10px] uppercase tracking-widest text-on-surface-variant text-center">
          {savedConfig ? `Saved in H2 · id ${savedConfig.id}` : pendingConfig ? 'Pending confirmation' : 'Waiting for responses...'}
        </div>
        
        <button 
          onClick={handleConfirm}
          disabled={!pendingConfig}
          className={`w-full px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
            savedConfig 
              ? 'bg-tertiary/10 border border-tertiary/20 text-tertiary opacity-50 cursor-not-allowed'
              : pendingConfig
                ? 'bg-tertiary/20 border border-tertiary/40 text-tertiary hover:bg-tertiary/30'
                : 'bg-surface-container-high border border-outline-variant/20 text-outline-variant cursor-not-allowed'
          }`}
        >
          {savedConfig ? 'Saved ✓' : 'Save to H2'}
        </button>

        {savedConfig && (
          <button onClick={() => navigate(`/project/${projectId}/orchestration`)} className="w-full text-center px-4 py-3 rounded-xl bg-primary/10 border border-primary/40 text-primary font-bold text-xs uppercase tracking-widest hover:bg-primary/20 transition-all">
            Build Architecture →
          </button>
        )}
      </div>
    </div>
  );

  return (
    <AppLayout rightPanel={RightPanel} noPadding>
      <div className="flex flex-col h-[calc(100vh-4rem)] relative">
        <ParticleNetwork particleCount={30} className="opacity-10 fixed pointer-events-none" />

        {/* Header */}
        <div className="px-8 py-5 border-b border-white/5 bg-surface-container-low/80 backdrop-blur-md relative z-10 shadow-sm">
          <div className="flex items-center justify-between mb-2">
             <span className="px-3 py-1 bg-tertiary/10 border border-tertiary/30 text-tertiary text-[10px] uppercase tracking-widest rounded-full font-bold">Step 01 · Intent & Team</span>
          </div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-on-surface">Project Configurator</h1>
          <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">Talk with Neural Architect. It will define your idea, stack, and specialized agents to compose your synthetic team.</p>
        </div>

        {/* Banner */}
        <AnimatePresence>
          {statusBanner && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className={`mx-8 mt-4 p-4 rounded-xl border ${
                statusBanner.kind === "ok" ? "border-tertiary/40 bg-tertiary/5 text-tertiary" :
                statusBanner.kind === "err" ? "border-red-500/40 bg-red-500/5 text-red-300" :
                "border-primary/40 bg-primary/5 text-primary"
              }`}
            >
              {statusBanner.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 custom-scrollbar relative z-10 scroll-smooth">
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-5 py-4 text-sm leading-relaxed shadow-sm ${
                  isUser 
                    ? 'bg-gradient-to-br from-primary/20 to-primary-container/10 border border-primary/30 text-on-surface rounded-tr-sm whitespace-pre-wrap' 
                    : 'bg-surface-container-high border border-outline-variant/30 text-on-surface-variant rounded-tl-sm w-full'
                }`}>
                  {isUser ? msg.text : <ResumenCard text={msg.text} />}
                </div>
              </div>
            );
          })}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl rounded-tl-sm px-5 py-4 flex gap-1 items-center">
                {isProcessingVoice ? (
                  <span className="text-sm text-primary font-mono animate-pulse">Processing audio...</span>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="px-8 py-6 border-t border-white/5 bg-surface-container-low/90 backdrop-blur-xl relative z-10">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }}
            className="max-w-4xl mx-auto flex items-end gap-4 relative"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isContinuousActive ? (isProcessingVoice ? "Processing audio..." : "Listening... Speak and I will stop automatically when silence is detected.") : "Describe your idea or reply to the architect..."}
              className="flex-1 bg-surface-container-highest border border-outline-variant/30 focus:border-primary/70 focus:ring-0 focus:outline-none rounded-xl px-6 py-4 text-sm text-on-surface placeholder-outline disabled:opacity-50 transition-all shadow-inner"
              disabled={isTyping || isContinuousActive}
              autoComplete="off"
            />
            
            <button
              type="button"
              onClick={toggleContinuousMode}
              disabled={isTyping && !isProcessingVoice}
              className={`px-4 py-4 rounded-xl flex items-center justify-center transition-all ${
                isContinuousActive
                  ? 'bg-error/20 text-error border border-error/50 animate-pulse'
                  : 'bg-surface-container-highest text-slate-500 border border-outline-variant/20 hover:text-primary hover:border-primary/50'
              }`}
              title={isContinuousActive ? "Stop continuous voice chat" : "Start continuous voice chat"}
            >
              <span className="material-symbols-outlined">
                {isContinuousActive ? 'stop_circle' : 'mic'}
              </span>
            </button>

            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping || isRecording || isContinuousActive}
              className={`px-8 py-4 rounded-xl flex items-center justify-center transition-all font-bold tracking-wide ${
                inputValue.trim() && !isTyping && !isRecording && !isContinuousActive
                  ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary-container shadow-[0_0_20px_-5px_#3adffa]'
                  : 'bg-surface-container-highest text-slate-500 border border-outline-variant/20'
              }`}
            >
              <span className="material-symbols-outlined mr-2">send</span>
              Send
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
