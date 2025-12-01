import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Mic, Paperclip, Loader2, File as FileIcon, StopCircle, CheckCircle } from 'lucide-react';
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
const N8N_URL = import.meta.env.PUBLIC_N8N_WEBHOOK_URL || 'https://your-n8n-instance.com';
const TURNSTILE_SITE_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAAFetvs7aO1ZlD6M'; // Key from screenshot

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'bot', type: 'text', content: 'Bonjour ! Je suis votre assistant virtuel. Comment puis-je vous aider ?' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Audio Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

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
        const storedToken = localStorage.getItem('chat_jwt');
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
                toast.error('Erreur lors de l\'initialisation.');
            }
        } catch (error) {
            console.error('Auth Init Error:', error);
            toast.error('Erreur de connexion au serveur.');
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

            if (response.status === 200 && data && data.token) {
                setJwt(data.token);
                localStorage.setItem('chat_jwt', data.token);
                setAuthState('authenticated');
                toast.success('Authentification réussie !');

                // If there was a pending message, send it now
                if (pendingMessage) {
                    sendMessageInternal(pendingMessage.text, pendingMessage.audio, pendingMessage.file, data.token);
                    setPendingMessage(null);
                    setInputValue('');
                    setAudioBlob(null);
                    setSelectedFile(null);
                }
            } else {
                console.error('Token missing in response:', data);
                toast.error('Code incorrect ou erreur serveur.');
            }
        } catch (error) {
            console.error('Auth Verify Error:', error);
            toast.error('Erreur de vérification.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Message Logic ---
    const handleSendMessage = async () => {
        if ((!inputValue.trim() && !audioBlob && !selectedFile) || isLoading) return;

        // Check Auth
        if (authState !== 'authenticated') {
            setPendingMessage({
                text: inputValue,
                audio: audioBlob,
                file: selectedFile
            });
            setAuthState('email_input');
            toast.info('Veuillez vous identifier pour envoyer un message.');
            return;
        }

        await sendMessageInternal(inputValue, audioBlob, selectedFile, jwt);

        // Reset inputs
        setInputValue('');
        setAudioBlob(null);
        setSelectedFile(null);
    };

    const sendMessageInternal = async (text, audio, file, token) => {
        // Add user message to UI
        const newUserMsg = {
            role: 'user',
            type: audio ? 'audio' : (file ? 'file' : 'text'),
            content: text || (audio ? 'Message vocal' : file?.name),
            audioUrl: audio ? URL.createObjectURL(audio) : null
        };

        setMessages(prev => [...prev, newUserMsg]);
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

            const data = Array.isArray(response.data) ? response.data[0] : response.data;

            // Add bot response
            if (data.response || data.audioResponse) {
                setMessages(prev => [...prev, {
                    role: 'bot',
                    type: data.audioResponse ? 'audio' : 'text',
                    content: data.response || 'Message audio reçu',
                    audioUrl: data.audioResponse
                }]);
            } else {
                // Fallback if no specific response field
                setMessages(prev => [...prev, { role: 'bot', type: 'text', content: 'Message reçu.' }]);
            }

        } catch (error) {
            console.error('Send Message Error:', error);
            toast.error('Erreur lors de l\'envoi du message.');
            setMessages(prev => [...prev, { role: 'bot', type: 'text', content: 'Désolé, une erreur est survenue.' }]);
        } finally {
            setIsLoading(false);
            setUploadProgress(0);
        }
    };

    // --- Render Helpers ---
    const renderContent = () => {
        if (authState === 'email_input') {
            return (
                <div className="p-4 flex flex-col gap-4">
                    <h3 className="text-lg font-semibold text-gray-800">Connexion requise</h3>
                    <p className="text-sm text-gray-600">Veuillez entrer votre email pour continuer.</p>
                    <form onSubmit={handleAuthInit} className="flex flex-col gap-3">
                        <input
                            type="email"
                            placeholder="votre@email.com"
                            className="p-2 border rounded-md focus:ring-2 focus:ring-blue-900 outline-none"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <div className="w-full overflow-hidden">
                            <Turnstile
                                siteKey={TURNSTILE_SITE_KEY}
                                onSuccess={setTurnstileToken}
                                options={{ theme: 'light' }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || !turnstileToken}
                            className="bg-blue-900 text-white p-2 rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors"
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
                <div className="p-4 flex flex-col gap-4">
                    <h3 className="text-lg font-semibold text-gray-800">Vérification</h3>
                    <p className="text-sm text-gray-600">Entrez le code reçu par email.</p>
                    <form onSubmit={handleAuthVerify} className="flex flex-col gap-3">
                        <input
                            type="text"
                            placeholder="123456"
                            className="p-2 border rounded-md focus:ring-2 focus:ring-blue-900 outline-none"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                        />
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-blue-900 text-white p-2 rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors"
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

        return (
            <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                            <div className={cn(
                                "max-w-[80%] p-3 rounded-lg shadow-sm",
                                msg.role === 'user' ? "bg-blue-900 text-white rounded-br-none" : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                            )}>
                                {msg.type === 'text' && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
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
                            <div className="bg-white text-gray-500 p-3 rounded-lg border border-gray-200 rounded-bl-none flex items-center gap-2">
                                <Loader2 className="animate-spin" size={16} />
                                <span className="text-sm">Thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-white border-t border-gray-200">
                    {/* Preview Attachments */}
                    {(audioBlob || selectedFile) && (
                        <div className="flex gap-2 mb-2 overflow-x-auto">
                            {audioBlob && (
                                <div className="flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded-full text-xs border border-red-100">
                                    <Mic size={12} /> Audio <button onClick={() => setAudioBlob(null)}><X size={12} /></button>
                                </div>
                            )}
                            {selectedFile && (
                                <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-xs border border-blue-100">
                                    <FileIcon size={12} /> {selectedFile.name} <button onClick={() => setSelectedFile(null)}><X size={12} /></button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex items-end gap-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-gray-500 hover:text-blue-900 transition-colors"
                            title="Joindre un fichier"
                        >
                            <Paperclip size={20} />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileSelect}
                        />

                        <textarea
                            className="flex-1 max-h-32 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-900 outline-none resize-none text-sm"
                            rows={1}
                            placeholder="Écrivez votre message..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                        />

                        {inputValue.trim() || audioBlob || selectedFile ? (
                            <button
                                onClick={handleSendMessage}
                                disabled={isLoading}
                                className="p-2 bg-blue-900 text-white rounded-full hover:bg-blue-800 transition-colors disabled:opacity-50"
                            >
                                <Send size={20} />
                            </button>
                        ) : (
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                className={cn(
                                    "p-3 sm:p-2 rounded-full transition-all duration-300 flex items-center justify-center",
                                    isRecording ? "bg-red-500 text-white animate-pulse shadow-lg scale-110" : "text-gray-500 hover:text-blue-900 bg-gray-100 sm:bg-transparent"
                                )}
                            >
                                {isRecording ? <StopCircle size={28} /> : <Mic size={28} className="sm:w-6 sm:h-6" />}
                            </button>
                        )}
                    </div>
                </div>
            </>
        );
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
            <Toaster position="top-center" richColors />
            {isOpen && (
                <div className="mb-4 w-[350px] sm:w-[400px] h-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
                    {/* Header */}
                    <div className="bg-blue-900 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <h2 className="font-semibold">Assistant Gehringer</h2>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-blue-800 p-1 rounded">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    {renderContent()}
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-blue-900 hover:bg-blue-800 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center justify-center"
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
            </button>
        </div>
    );
}
