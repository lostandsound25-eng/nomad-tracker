import React, { useState } from 'react';
import { Mic, Send } from 'lucide-react';
import { parseExpense } from '../utils/parser';

export default function ExpenseInput({ onAddExpense }) {
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);

    let recognition = null;
    if ('webkitSpeechRecognition' in window) {
        recognition = new window.webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
            setTimeout(() => handleSubmit(transcript), 300);
        };
    }

    const handleSubmit = (textToParse = input) => {
        if (!textToParse.trim()) return;
        
        const parsed = parseExpense(textToParse);
        if (!parsed) {
            alert("Couldn't find an amount. Try '15 lunch'");
            return;
        }

        onAddExpense(parsed);
        setInput('');
        
        if (navigator.vibrate) navigator.vibrate(50);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    const toggleVoice = () => {
        if (!recognition) return alert("Voice input not supported in this browser.");
        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-ios-surface border-t border-ios-border px-4 py-3 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
            <div className="flex items-center gap-3 max-w-md mx-auto">
                <button 
                    onClick={toggleVoice}
                    className={`p-3 rounded-full transition-colors flex-shrink-0 ${isListening ? 'bg-ios-red text-white' : 'bg-ios-bg text-ios-muted hover:text-ios-blue'}`}
                >
                    <Mic size={22} />
                </button>
                
                <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? "Listening..." : "e.g. 15.50 lunch"}
                    className="flex-1 bg-ios-bg border border-transparent focus:border-ios-blue focus:bg-ios-bg/80 rounded-full px-5 py-3.5 outline-none transition-all text-[16px] placeholder-ios-muted"
                />
                
                <button 
                    onClick={() => handleSubmit()}
                    disabled={!input.trim()}
                    className="p-3 bg-ios-blue text-white rounded-full disabled:opacity-50 disabled:bg-ios-muted transition-colors flex-shrink-0"
                >
                    <Send size={22} className="ml-0.5" />
                </button>
            </div>
        </div>
    );
}
