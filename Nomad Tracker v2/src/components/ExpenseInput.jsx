import React, { useState, useEffect } from 'react';
import { Mic, Send } from 'lucide-react';
import { parseExpense } from '../utils/parser';

export default function ExpenseInput({ onAddExpense }) {
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);

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
            setTimeout(() => handleSubmit(transcript), 300);
        };
        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };
    }

    // --- Smart Auto-Submit for Native Dictation ---
    useEffect(() => {
        if (!input.trim()) return;

        const parsed = parseExpense(input);
        // Only auto-submit if we found a valid amount AND recognized a category.
        // If category is 'other', they might still be dictating/typing.
        const isComplete = parsed && parsed.amount > 0 && parsed.category !== 'other';

        if (isComplete) {
            // Wait 2 seconds. If input changes, timer resets. If not, boom, it submits!
            const timer = setTimeout(() => {
                handleSubmit(input);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [input]);

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
        if (!recognition) return alert("Web voice input is disabled by your phone when saved to the Home Screen. Tip: Just tap the input box and use the microphone button on your phone's native keyboard!");
        
        if (isListening) {
            recognition.stop();
        } else {
            try {
                recognition.start();
            } catch (e) {
                alert("Microphone permission denied. Tip: Use the microphone button on your phone's native keyboard!");
            }
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
