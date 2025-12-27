import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Mic, Paperclip, Loader2, File as FileIcon, StopCircle, Sparkles, Calendar, FileText, ListTodo, Globe, ArrowUp, ShieldCheck } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { Toaster, toast } from 'sonner';
import axios from 'axios';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind class merging
function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// Environment variables
const N8N_URL = import.meta.env.PUBLIC_N8N_WEBHOOK_URL || 'https://n8n.gehringer.fr';
const TURNSTILE_SITE_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAAFetvs7aO1ZlD6M'; // Key from screenshot

/**
 * @param {object} props
 * @param {string} [props.customIcon]
 * @param {string} [props.customText]
 */
export default function ChatWidget({ customIcon = '', customText = '' }) {
    const [isOpen, setIsOpen] = useState(false);
    // Initial state has no messages to show the "Welcome" screen first.
    // We will add the bot greeting only when the conversation "starts" visually or keep it hidden.
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Audio Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const textareaRef = useRef(null);

    // File Upload State
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    // Auth State
    const [authState, setAuthState] = useState('idle'); // 'idle', 'email_input', 'otp_input', 'authenticated'
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [jwt, setJwt] = useState(null);
    const [turnstileToken, setTurnstileToken] = useState(null);
    const [pendingMessage, setPendingMessage] = useState(null); // To store message while authenticating

    const messagesEndRef = useRef(null);

    // Load JWT from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('chat_access_token') || localStorage.getItem('chat_jwt');
        if (storedToken) {
            setJwt(storedToken);
            setAuthState('authenticated');
        }
    }, []);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen, authState, uploadProgress]);

    // --- Audio Logic ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            toast.error('Impossible d\'accéder au microphone.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            // Stop all tracks
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    // --- File Logic ---
    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    // --- Auth Logic ---
    const handleAuthInit = async (e) => {
        e.preventDefault();
        if (!email || !turnstileToken) return;

        setIsLoading(true);
        try {
            const response = await axios.post(`${N8N_URL}/webhook/chat-api`, {
                email,
                turnstileToken,
                action: 'auth-init'
            });

            if (response.status === 200) {
                setAuthState('otp_input');
                toast.success('Code envoyé par email !');
            } else {
                const errorMsg = response.data?.error || 'Erreur lors de l\'initialisation.';
                toast.error(errorMsg);
            }
        } catch (error) {
            console.error('Auth Init Error:', error);
            const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Erreur de connexion au serveur.';
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAuthVerify = async (e) => {
        e.preventDefault();
        if (!otp || !email) return;

        setIsLoading(true);
        try {
            const response = await axios.post(`${N8N_URL}/webhook/chat-api`, {
                email,
                code: otp,
                action: 'auth-verify'
            });

            const rawData = response.data;
            console.log('Auth Verify Response:', rawData);

            // Handle n8n response which might be an array or object
            const data = Array.isArray(rawData) ? rawData[0] : rawData;

            if (response.status === 200 && data && data.accessToken) {
                // Store Tokens
                setJwt(data.accessToken);
                localStorage.setItem('chat_access_token', data.accessToken);
                if (data.refreshToken) {
                    localStorage.setItem('chat_refresh_token', data.refreshToken);
                }

                setAuthState('authenticated');
                toast.success('Authentification réussie !');

                // If there was a pending message, send it now
                if (pendingMessage) {
                    sendMessageInternal(pendingMessage.text, pendingMessage.audio, pendingMessage.file, data.accessToken);
                    setPendingMessage(null);
                    setInputValue('');
                    setAudioBlob(null);
                    setSelectedFile(null);
                }
            } else {
                console.error('Token missing in response:', data);
                // Support both error in 200 OK body or generic error
                const errorMsg = data.error || 'Code incorrect ou erreur serveur.';
                toast.error(errorMsg);
            }
        } catch (error) {
            console.error('Auth Verify Error:', error);
            // Handle axios 4xx/5xx errors
            const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Erreur de vérification.';
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('chat_access_token');
        localStorage.removeItem('chat_refresh_token');
        localStorage.removeItem('chat_jwt'); // Cleanup legacy
        setJwt(null);
        setAuthState('email_input'); // Reset to initial state
        setMessages([]); // Optional: clear history on logout
        toast.info('Déconnexion réussie.');
    };

    const refreshAccessToken = async () => {
        const refreshToken = localStorage.getItem('chat_refresh_token');
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await axios.post(`${N8N_URL}/webhook/chat-api`, {
                action: 'refresh-token',
                refreshToken: refreshToken
            });

            const data = Array.isArray(response.data) ? response.data[0] : response.data;

            if (data.accessToken) {
                console.log('Token refreshed successfully');
                setJwt(data.accessToken);
                localStorage.setItem('chat_access_token', data.accessToken);

                if (data.refreshToken) {
                    localStorage.setItem('chat_refresh_token', data.refreshToken);
                }

                return data.accessToken;
            }

            throw new Error('Failed to refresh token');
        } catch (error) {
            console.error('Refresh token failed:', error);
            // Force logout
            handleLogout();
            toast.error('Session expirée. Veuillez vous reconnecter.');
            throw error;
        }
    };

    // --- Message Logic ---
    const handleSendMessage = async (textOverride = null) => {
        const textToSend = textOverride || inputValue;
        if ((!textToSend.trim() && !audioBlob && !selectedFile) || isLoading) return;

        // Check Auth
        if (authState !== 'authenticated') {
            setPendingMessage({
                text: textToSend,
                audio: audioBlob,
                file: selectedFile
            });
            setAuthState('email_input');
            toast.info('Veuillez vous identifier pour envoyer un message.');
            return;
        }

        await sendMessageInternal(textToSend, audioBlob, selectedFile, jwt);

        // Reset inputs
        setInputValue('');
        setAudioBlob(null);
        setSelectedFile(null);
    };

    const sendMessageInternal = async (text, audio, file, token, isRetry = false) => {
        // Only add user message to UI if it's the first attempt (not a retry)
        if (!isRetry) {
            const newUserMsg = {
                role: 'user',
                type: audio ? 'audio' : (file ? 'file' : 'text'),
                content: text || (audio ? 'Message vocal' : file?.name),
                audioUrl: audio ? URL.createObjectURL(audio) : null
            };
            setMessages(prev => [...prev, newUserMsg]);
        }

        setIsLoading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('action', 'chat-message');
            if (text) formData.append('text', text);
            if (audio) formData.append('audio', audio, 'voice_message.webm');
            if (file) formData.append('file', file);

            // History context (simplified)
            const history = messages.map(m => ({ role: m.role, content: m.content }));
            formData.append('history', JSON.stringify(history));

            const response = await axios.post(`${N8N_URL}/webhook/chat-api`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });

            console.log('N8N Raw Response:', response.data);
            const data = Array.isArray(response.data) ? response.data[0] : response.data;
            console.log('Processed Data:', data);

            // Check for error in success response (e.g. 401 wrapped)
            if (data.error) {
                // Check if it's a token error wrapped in 200 OK
                if (data.error.includes('jwt expired') || data.error.includes('token')) {
                    const error = new Error(data.error);
                    error.response = { status: 401 };
                    throw error;
                }
                throw new Error(data.error);
            }

            // Add bot response
            const textResponse = data.response || data.output;
            if (textResponse || data.audioResponse) {
                setMessages(prev => [...prev, {
                    role: 'bot',
                    type: data.audioResponse ? 'audio' : 'text',
                    content: textResponse || 'Message audio reçu',
                    audioUrl: data.audioResponse
                }]);
            } else {
                // Fallback if no specific response field
                setMessages(prev => [...prev, { role: 'bot', type: 'text', content: 'Message reçu.' }]);
            }

        } catch (error) {
            console.error('Send Message Error:', error);

            // Handle 401 specifically if token expired
            if ((error.response?.status === 401 || error.message?.includes('jwt expired')) && !isRetry) {
                console.log('Access token expired, attempting refresh...');
                try {
                    const newToken = await refreshAccessToken();
                    // Retry with new token
                    return await sendMessageInternal(text, audio, file, newToken, true);
                } catch (refreshError) {
                    // Refresh failed, handled in refreshAccessToken (logout)
                    return;
                }
            }

            toast.error('Erreur lors de l\'envoi du message.');
            setMessages(prev => [...prev, { role: 'bot', type: 'text', content: 'Désolé, une erreur est survenue.' }]);
        } finally {
            setIsLoading(false);
            setUploadProgress(0);
        }
    };

    // --- Render Helpers ---
    const renderWelcomeScreen = () => {
        // EDITABLE TEXTS
        const title = "Assistant Gehringer";

        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-6 overflow-y-auto">
                <div className="w-16 h-16 rounded-full bg-white border shadow-sm flex items-center justify-center mb-2">
                    {customText ? (
                        <span className="font-logo text-3xl">{customText}</span>
                    ) : (
                        <MessageCircle size={32} className="text-slate-900" />
                    )}
                </div>

                <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
                    <div className="text-sm text-gray-500 max-w-[300px] mx-auto leading-relaxed text-left">
                        <p>Je peux vous aider à :</p>
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                            <li>analyser un document</li>
                            <li>préparer un échange ciblé avec Philippe</li>
                            <li>clarifier un besoin ou une problématique managériale...</li>
                        </ul>
                    </div>
                </div>

                <div className="w-full space-y-2">
                    <button
                        onClick={() => {
                            setInputValue("Pourriez-vous analyser le document suivant ?");
                            fileInputRef.current?.click();
                            setTimeout(() => textareaRef.current?.focus(), 100);
                        }}
                        className="w-full flex items-center gap-3 p-3 text-left bg-white hover:bg-gray-50 border border-gray-100 rounded-xl transition-colors group"
                    >
                        <span className="text-gray-400 group-hover:text-slate-900 transition-colors"><FileIcon size={18} /></span>
                        <span className="text-sm text-gray-700 flex-1">Analyser une offre ou une fiche de poste</span>
                    </button>

                    <button
                        onClick={() => {
                            setInputValue("Évaluer l’adéquation entre le besoin suivant et l’expérience de Philippe : ");
                            setTimeout(() => textareaRef.current?.focus(), 100);
                        }}
                        className="w-full flex items-center gap-3 p-3 text-left bg-white hover:bg-gray-50 border border-gray-100 rounded-xl transition-colors group"
                    >
                        <span className="text-gray-400 group-hover:text-slate-900 transition-colors"><Sparkles size={18} /></span>
                        <span className="text-sm text-gray-700 flex-1">Évaluer l’adéquation entre un besoin et l’expérience de Philippe</span>
                    </button>
                </div>

                {/* Privacy/Local AI Notice */}
                <div className="pt-2 w-full">
                    <div className="flex gap-3 items-start p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-600 text-left">
                        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-slate-400" />
                        <p className="leading-relaxed opacity-90">
                            <strong>IA Locale & confidentielle :</strong> Pour garantir la protection de vos données, cette IA s'exécute localement. Elle est plus lente que les IA Cloud, mais assure une confidentialité totale.
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    const renderMessages = () => {
        return (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg, idx) => (
                    <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                        <div className={cn(
                            "max-w-[85%] p-3 rounded-2xl shadow-sm",
                            msg.role === 'user' ? "bg-slate-900 text-white rounded-br-none" : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                        )}>
                            {msg.type === 'text' && <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                            {msg.type === 'audio' && (
                                <div className="flex flex-col gap-1">
                                    <p className="text-xs opacity-70">Message vocal</p>
                                    <audio controls src={msg.audioUrl} className="h-8 w-48" />
                                </div>
                            )}
                            {msg.type === 'file' && (
                                <div className="flex items-center gap-2">
                                    <FileIcon size={16} />
                                    <span className="text-sm truncate">{msg.content}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Upload Progress Bar */}
                {isLoading && uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="flex justify-end px-4">
                        <div className="w-[80%] bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                            <p className="text-xs text-right text-gray-500 mt-1">Envoi... {uploadProgress}%</p>
                        </div>
                    </div>
                )}

                {isLoading && authState === 'authenticated' && uploadProgress === 0 && (
                    <div className="flex justify-start">
                        <div className="bg-white text-gray-500 p-3 rounded-2xl border border-gray-200 rounded-bl-none flex items-center gap-2">
                            <Loader2 className="animate-spin" size={16} />
                            <span className="text-sm">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        );
    };

    const renderContent = () => {
        if (authState === 'email_input') {
            return (
                <div className="p-6 flex flex-col gap-6 h-full justify-center">
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-semibold text-gray-900">Connexion requise</h3>
                        <p className="text-sm text-gray-500">Veuillez entrer votre email pour continuer.</p>
                    </div>
                    <form onSubmit={handleAuthInit} className="flex flex-col gap-4">
                        <input
                            type="email"
                            placeholder="votre@email.com"
                            className="p-3 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <div className="w-full overflow-hidden rounded-xl">
                            <Turnstile
                                siteKey={TURNSTILE_SITE_KEY}
                                onSuccess={setTurnstileToken}
                                options={{ theme: 'light' }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || !turnstileToken}
                            className="bg-slate-900 text-white p-3 rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors font-medium"
                        >
                            {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Recevoir le code'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setAuthState('idle')}
                            className="text-xs text-gray-500 hover:underline text-center"
                        >
                            Annuler
                        </button>
                    </form>
                </div>
            );
        }

        if (authState === 'otp_input') {
            return (
                <div className="p-6 flex flex-col gap-6 h-full justify-center">
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-semibold text-gray-900">Vérification</h3>
                        <p className="text-sm text-gray-500">Entrez le code reçu par email.</p>
                    </div>
                    <form onSubmit={handleAuthVerify} className="flex flex-col gap-4">
                        <input
                            type="text"
                            placeholder="123456"
                            className="p-3 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-center tracking-widest text-lg"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                        />
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-slate-900 text-white p-3 rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors font-medium"
                        >
                            {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Vérifier'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setAuthState('email_input')}
                            className="text-xs text-gray-500 hover:underline text-center"
                        >
                            Changer d'email
                        </button>
                    </form>
                </div>
            );
        }

        // Main Chat Interface
        return (
            <>
                {/* Header for Chat Window */}
                <div className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-100 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <h2 className="font-semibold text-gray-800">Assistant Gehringer</h2>
                    </div>
                    <div className="flex items-center gap-2"> {/* Added a wrapper div for alignment */}
                        {authState === 'authenticated' && (
                            <button
                                onClick={handleLogout}
                                className="mr-2 text-xs font-medium text-slate-500 hover:text-red-600 bg-white hover:bg-red-50 px-2 py-1 rounded transition-colors border border-gray-200"
                                title="Se déconnecter de la session"
                            >
                                Déconnexion
                            </button>
                        )}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Messages or Welcome Screen */}
                {messages.length > 0 ? renderMessages() : renderWelcomeScreen()}

                {/* Input Area */}
                <div className="p-4 bg-white">
                    {/* Preview Attachments */}
                    {(audioBlob || selectedFile) && (
                        <div className="flex gap-2 mb-3 overflow-x-auto">
                            {audioBlob && (
                                <div className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-xs border border-red-100 font-medium">
                                    <Mic size={14} /> Audio <button onClick={() => setAudioBlob(null)} className="ml-1 hover:text-red-800"><X size={14} /></button>
                                </div>
                            )}
                            {selectedFile && (
                                <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-xs border border-blue-100 font-medium">
                                    <FileIcon size={14} /> {selectedFile.name} <button onClick={() => setSelectedFile(null)} className="ml-1 hover:text-blue-800"><X size={14} /></button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="relative border border-gray-200 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:border-slate-900 transition-all bg-white">
                        <textarea
                            ref={textareaRef}
                            className="w-full max-h-32 p-3 pb-10 bg-transparent outline-none resize-none text-sm placeholder:text-gray-400"
                            rows={1}
                            placeholder="Demander, chercher ou créer..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                        />

                        {/* Bottom Actions inside Input */}
                        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-1.5 text-gray-400 hover:text-slate-900 transition-colors rounded-md hover:bg-gray-50"
                                    title="Joindre un fichier"
                                >
                                    <Paperclip size={16} />
                                </button>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                {inputValue.trim() || audioBlob || selectedFile ? (
                                    <button
                                        onClick={() => handleSendMessage()}
                                        disabled={isLoading}
                                        className="p-1.5 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50"
                                    >
                                        <ArrowUp size={16} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={isRecording ? stopRecording : startRecording}
                                        className={cn(
                                            "p-1.5 rounded-md transition-all duration-300",
                                            isRecording ? "bg-red-500 text-white animate-pulse" : "text-gray-400 hover:text-slate-900 hover:bg-gray-50"
                                        )}
                                    >
                                        {isRecording ? <StopCircle size={16} /> : <Mic size={16} />}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-gray-400">L'IA peut faire des erreurs. Vérifiez les informations importantes.</p>
                    </div>
                </div>
            </>
        );
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
            <Toaster position="top-center" richColors />
            {isOpen && (
                <div className="mb-4 w-[350px] sm:w-[400px] h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
                    {renderContent()}
                </div>
            )}

            {/* Toggle Button Container with Tooltip */}
            <div className="relative group">
                {/* Tooltip */}
                <div className="absolute bottom-full right-0 mb-3 w-max max-w-[200px] bg-black text-white text-xs px-3 py-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none translate-y-2 group-hover:translate-y-0">
                    Bonjour, c'est l'A.I. de Gehringer
                    {/* Arrow */}
                    <div className="absolute top-full right-6 -mt-1 border-4 border-transparent border-t-black"></div>
                </div>

                {/* Toggle Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-2xl shadow-slate-900/30 transition-all duration-300 hover:scale-110 hover:-translate-y-1 flex items-center justify-center",
                        (customIcon || customText) && !isOpen ? "w-16 h-16 p-0 overflow-hidden border-4 border-white" : "p-4"
                    )}
                >
                    {isOpen ? (
                        <X size={24} className="transition-transform duration-300 rotate-90" />
                    ) : (
                        customIcon ? (
                            <img
                                src={customIcon}
                                alt="Chat"
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                        ) : customText ? (
                            <span className="font-logo text-2xl leading-none pt-1 transition-transform duration-300 group-hover:scale-110">
                                {customText}
                            </span>
                        ) : (
                            <MessageCircle size={24} className="transition-transform duration-300 group-hover:scale-110" />
                        )
                    )}
                </button>
            </div>
        </div>
    );
}
