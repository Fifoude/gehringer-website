import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Mic, Paperclip, Loader2, File as FileIcon, StopCircle, Sparkles, Calendar, ArrowUp, ShieldCheck } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { Toaster, toast } from 'sonner';
import axios from 'axios';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { chatTranslations } from '../i18n/chat';

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
 * @param {'fr' | 'en'} [props.lang]
 */
export default function ChatWidget({ customIcon = '', customText = '', lang = 'fr' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Translations
    const t = chatTranslations[lang] || chatTranslations['fr'];

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
    const [pendingMessage, setPendingMessage] = useState(null);

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
            toast.error(t.errors.mic_access);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
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
                toast.success(t.auth.sent);
            } else {
                const errorMsg = response.data?.error || t.auth.error_init;
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
            const data = Array.isArray(rawData) ? rawData[0] : rawData;

            if (response.status === 200 && data && data.accessToken) {
                setJwt(data.accessToken);
                localStorage.setItem('chat_access_token', data.accessToken);
                if (data.refreshToken) {
                    localStorage.setItem('chat_refresh_token', data.refreshToken);
                }

                setAuthState('authenticated');
                toast.success(t.auth.success);

                if (pendingMessage) {
                    sendMessageInternal(pendingMessage.text, pendingMessage.audio, pendingMessage.file, data.accessToken);
                    setPendingMessage(null);
                    setInputValue('');
                    setAudioBlob(null);
                    setSelectedFile(null);
                }
            } else {
                const errorMsg = data.error || t.auth.error_verify;
                toast.error(errorMsg);
            }
        } catch (error) {
            console.error('Auth Verify Error:', error);
            const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Erreur de vérification.';
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('chat_access_token');
        localStorage.removeItem('chat_refresh_token');
        localStorage.removeItem('chat_jwt');
        setJwt(null);
        setAuthState('email_input');
        setMessages([]);
        toast.info(t.auth.logout);
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
            handleLogout();
            toast.error(t.auth.session_expired);
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
            toast.info(t.errors.login_required);
            return;
        }

        await sendMessageInternal(textToSend, audioBlob, selectedFile, jwt);

        setInputValue('');
        setAudioBlob(null);
        setSelectedFile(null);
    };

    const sendMessageInternal = async (text, audio, file, token, isRetry = false) => {
        if (!isRetry) {
            const newUserMsg = {
                role: 'user',
                type: audio ? 'audio' : (file ? 'file' : 'text'),
                content: text || (audio ? t.labels.voice_msg : file?.name),
                audioUrl: audio ? URL.createObjectURL(audio) : null
            };
            setMessages(prev => [...prev, newUserMsg]);
        }

        setIsLoading(true);
        setUploadProgress(0);

        try {
            // Note: We are sending the language to the backend
            const formData = new FormData();
            formData.append('action', 'chat-message');
            formData.append('lang', lang);
            if (text) formData.append('text', text);
            if (audio) formData.append('audio', audio, 'voice_message.webm');
            if (file) formData.append('file', file);

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

            const data = Array.isArray(response.data) ? response.data[0] : response.data;

            if (data.error) {
                if (data.error.includes('jwt expired') || data.error.includes('token')) {
                    const error = new Error(data.error);
                    error.response = { status: 401 };
                    throw error;
                }
                throw new Error(data.error);
            }

            const textResponse = data.response || data.output;
            if (textResponse || data.audioResponse) {
                setMessages(prev => [...prev, {
                    role: 'bot',
                    type: data.audioResponse ? 'audio' : 'text',
                    content: textResponse || t.labels.audio_received,
                    audioUrl: data.audioResponse
                }]);
            } else {
                setMessages(prev => [...prev, { role: 'bot', type: 'text', content: 'Message reçu.' }]);
            }

        } catch (error) {
            console.error('Send Message Error:', error);

            if ((error.response?.status === 401 || error.message?.includes('jwt expired')) && !isRetry) {
                console.log('Access token expired, attempting refresh...');
                try {
                    const newToken = await refreshAccessToken();
                    return await sendMessageInternal(text, audio, file, newToken, true);
                } catch (refreshError) {
                    return;
                }
            }

            toast.error(t.errors.send_error);
            setMessages(prev => [...prev, { role: 'bot', type: 'text', content: t.errors.generic }]);
        } finally {
            setIsLoading(false);
            setUploadProgress(0);
        }
    };

    // --- Render Helpers ---
    const renderWelcomeScreen = () => {
        return (
            <div className="flex-1 overflow-y-auto px-6 py-8 bg-white scrollbar-none">
                <div className="flex flex-col items-center text-center space-y-6 mb-8">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-tr from-slate-900 to-slate-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
                        <div className="relative w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-2xl">
                            {customText ? (
                                <span className="font-logo text-3xl pt-1">{customText}</span>
                            ) : (
                                <Sparkles size={40} className="animate-pulse" />
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                            {t.title}
                        </h2>
                        <p className="text-gray-500 text-sm leading-relaxed max-w-[280px] mx-auto">
                            {t.welcome.intro}
                        </p>
                    </div>

                    <div className="w-full grid gap-2">
                        {[t.welcome.task1, t.welcome.task2, t.welcome.task3].map((task, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-left hover:border-slate-200 transition-colors group">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-slate-900 transition-colors"></div>
                                <span className="text-xs text-slate-600 font-medium group-hover:text-slate-900 transition-colors">{task}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => {
                            setInputValue(t.actions.analyze_doc_prompt);
                            fileInputRef.current?.click();
                            setTimeout(() => textareaRef.current?.focus(), 100);
                        }}
                        className="w-full flex items-center gap-4 p-4 text-left bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md group"
                    >
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <FileIcon size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800">{t.actions.analyze_doc}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-bold">PDF, TXT, LOGS</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowUp size={16} className="rotate-45 text-slate-400" />
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            setInputValue(t.actions.evaluate_fit_prompt);
                            setTimeout(() => textareaRef.current?.focus(), 100);
                        }}
                        className="w-full flex items-center gap-4 p-4 text-left bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md group"
                    >
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <Sparkles size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800">{t.actions.evaluate_fit}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-bold">Matching & Skills</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowUp size={16} className="rotate-45 text-slate-400" />
                        </div>
                    </button>
                </div>

                {/* Privacy Notice */}
                <div className="mt-8 pt-6 border-t border-slate-50 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-[10px] text-slate-500 font-medium mb-3 shadow-sm border border-slate-200/50">
                        <ShieldCheck size={12} className="text-emerald-500" />
                        Local & Secure AI
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed px-4 italic">
                        {t.privacy}
                    </p>
                </div>
            </div>
        );
    };

    const renderMessages = () => {
        return (
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50 scrollbar-thin">
                {messages.map((msg, idx) => (
                    <div key={idx} className={cn("flex animate-in fade-in slide-in-from-bottom-2 duration-300", msg.role === 'user' ? "justify-end" : "justify-start")}>
                        <div className={cn(
                            "max-w-[85%] p-4 rounded-2xl shadow-sm relative group",
                            msg.role === 'user'
                                ? "bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-br-none shadow-slate-200"
                                : "bg-white text-slate-800 border border-slate-100 rounded-bl-none shadow-slate-200/50"
                        )}>
                            {msg.type === 'text' && <p className="text-sm !leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                            {msg.type === 'audio' && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold opacity-70">
                                        <Mic size={14} /> {t.labels.voice_msg}
                                    </div>
                                    <audio controls src={msg.audioUrl} className="h-8 w-48 custom-audio" />
                                </div>
                            )}
                            {msg.type === 'file' && (
                                <div className="flex items-center gap-3 p-2 bg-black/5 rounded-lg border border-black/5">
                                    <div className="p-2 bg-white rounded-md shadow-sm">
                                        <FileIcon size={16} className="text-slate-600" />
                                    </div>
                                    <span className="text-xs font-medium truncate max-w-[150px]">{msg.content}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Upload Progress Bar */}
                {isLoading && uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="flex justify-end px-4">
                        <div className="w-[80%] bg-slate-200 rounded-full h-2 mb-2 relative overflow-hidden">
                            <div
                                class="bg-slate-900 h-full transition-all duration-300 absolute left-0 top-0"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {isLoading && authState === 'authenticated' && uploadProgress === 0 && (
                    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white text-slate-400 p-4 rounded-2xl border border-slate-100 rounded-bl-none flex items-center gap-3 shadow-sm shadow-slate-200/50">
                            <div className="flex gap-1 items-center">
                                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
                            </div>
                            <span className="text-xs font-medium tracking-wide uppercase italic">{t.input.thinking}</span>
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
                        <h3 className="text-xl font-semibold text-gray-900">{t.auth.required_title}</h3>
                        <p className="text-sm text-gray-500">{t.auth.required_desc}</p>
                    </div>
                    <form onSubmit={handleAuthInit} className="flex flex-col gap-4">
                        <input
                            type="email"
                            placeholder={t.auth.placeholder_email}
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
                            {isLoading ? <Loader2 className="animate-spin mx-auto" /> : t.auth.get_code}
                        </button>
                        <button
                            type="button"
                            onClick={() => setAuthState('idle')}
                            className="text-xs text-gray-500 hover:underline text-center"
                        >
                            {t.auth.cancel}
                        </button>
                    </form>
                </div>
            );
        }

        if (authState === 'otp_input') {
            return (
                <div className="p-6 flex flex-col gap-6 h-full justify-center">
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-semibold text-gray-900">{t.auth.verify_title}</h3>
                        <p className="text-sm text-gray-500">{t.auth.verify_desc}</p>
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
                            {isLoading ? <Loader2 className="animate-spin mx-auto" /> : t.auth.verify_btn}
                        </button>
                        <button
                            type="button"
                            onClick={() => setAuthState('email_input')}
                            className="text-xs text-gray-500 hover:underline text-center"
                        >
                            {t.auth.change_email}
                        </button>
                    </form>
                </div>
            );
        }

        // Main Chat Interface
        return (
            <>
                {/* Header for Chat Window */}
                <div className="flex justify-between items-center p-4 bg-white/80 backdrop-blur-md border-b border-slate-100 rounded-t-2xl sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                            <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-25"></div>
                        </div>
                        <h2 className="font-bold text-slate-800 tracking-tight">{t.title}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {authState === 'authenticated' && (
                            <button
                                onClick={handleLogout}
                                className="mr-2 text-xs font-medium text-slate-500 hover:text-red-600 bg-white hover:bg-red-50 px-2 py-1 rounded transition-colors border border-gray-200"
                                title={t.auth.logout}
                            >
                                {t.auth.logout}
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
                            placeholder={t.input.placeholder}
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
                        <p className="text-[10px] text-gray-400">{t.input.disclaimer}</p>
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
                    {t.tooltip}
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
