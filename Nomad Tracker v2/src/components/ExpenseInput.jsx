import React, { useState, useEffect, useRef } from 'react';
import { Mic, Plus } from 'lucide-react';

export default function ExpenseInput({ onAddExpense, editingItem }) {
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const inputRef = useRef(null);

    // Auto-focus on load and when editing an item
    useEffect(() => {
        if (editingItem) {
            setInput(editingItem.raw_input);
        }
        inputRef.current?.focus();
    }, [editingItem]);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
            // Notice: NO AUTO SUBMIT. Just populates input.
            inputRef.current?.focus();
        };
        recognition.onerror = () => setIsListening(false);
    }

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        if (!input.trim()) return;
        
        onAddExpense(input);
        setInput(''); // Clear instantly
        inputRef.current?.focus(); // NEVER lose focus
        
        if (navigator.vibrate) navigator.vibrate(50);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    };

    const toggleVoice = () => {
        if (!recognition) return alert("Native dictation is faster! Tap the input and use the microphone on your keyboard.");
        
        if (isListening) {
            recognition.stop();
        } else {
            try {
                recognition.start();
            } catch (e) {
                alert("Microphone unavailable. Use your keyboard's mic button!");
            }
        }
    };

    return (
        <div 
            className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[#C6C6C8] px-4 py-3 safe-area-bottom shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-20 cursor-text"
            onClick={() => inputRef.current?.focus()}
        >
            <div className="flex items-center gap-3 max-w-md mx-auto relative">
                <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleVoice(); }}
                    className={`p-2.5 rounded-full transition-colors flex-shrink-0 ${isListening ? 'bg-[#FF3B30] text-white' : 'text-[#8E8E93] hover:text-[#007AFF] bg-[#F2F2F7]'}`}
                >
                    <Mic size={22} />
                </button>
                
                <input 
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? "Listening..." : "e.g. 15.50 lunch"}
                    className="flex-1 bg-[#F2F2F7] border border-transparent focus:border-[#007AFF] focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,122,255,0.1)] rounded-full px-5 py-3 outline-none transition-all text-[16px] placeholder-[#8E8E93]"
                />
                
                <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
                    disabled={!input.trim()}
                    className={`p-2.5 rounded-full flex-shrink-0 transition-all ${input.trim() ? 'bg-[#007AFF] text-white shadow-md transform scale-100' : 'bg-[#E5E5EA] text-[#8E8E93] transform scale-95'}`}
                >
                    <Plus size={24} className="stroke-[2.5]" />
                </button>
            </div>
        </div>
    );
}
