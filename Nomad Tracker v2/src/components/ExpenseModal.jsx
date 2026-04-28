import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

export default function ExpenseModal({ isOpen, expense, isDoubleCheck, onSave, onClose }) {
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('other');
    const [subcategories, setSubcategories] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        if (expense && isOpen) {
            setAmount(expense.amount || '');
            setCategory(expense.category || 'other');
            setSubcategories(expense.subcategories ? expense.subcategories.join(', ') : '');
            setNote(expense.note || '');
        }
    }, [expense, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[24px] w-full max-w-sm p-6 shadow-2xl transform transition-all zoom-in-95">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="font-semibold text-[18px] text-black tracking-tight">
                        {isDoubleCheck ? "Did you mean?" : "Edit Logic"}
                    </h3>
                    <button onClick={onClose} className="p-1.5 bg-[#F2F2F7] rounded-full text-[#8E8E93] hover:bg-[#E5E5EA] transition-colors">
                        <X size={20}/>
                    </button>
                </div>
                
                <div className="space-y-4.5">
                    {isDoubleCheck && (
                         <div className="text-[14px] text-[#8E8E93] bg-[#F2F2F7] p-3 rounded-[12px] mb-4 border border-[#E5E5EA]">
                             <span className="font-medium text-black">You said:</span> "{expense?.raw_input}"
                         </div>
                    )}

                    <div>
                        <label className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider mb-1.5 block ml-1">Amount</label>
                        <div className="flex items-center bg-[#F2F2F7] rounded-[14px] px-4 py-3 border border-transparent focus-within:border-[#007AFF] focus-within:bg-white transition-all">
                            <span className="text-[#8E8E93] mr-1.5 font-semibold text-[18px]">$</span>
                            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="bg-transparent flex-1 outline-none text-[18px] font-semibold text-black" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider mb-1.5 block ml-1">Main Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-[#F2F2F7] rounded-[14px] px-4 py-3.5 outline-none text-[16px] font-medium text-black border border-transparent focus:border-[#007AFF] focus:bg-white transition-all appearance-none">
                            <option value="lodging">🏨 Lodging</option>
                            <option value="transportation">🚕 Transportation</option>
                            <option value="food">🍔 Food</option>
                            <option value="other">📦 Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider mb-1.5 block ml-1">Subcategories</label>
                        <input type="text" value={subcategories} onChange={e => setSubcategories(e.target.value)} placeholder="e.g. flights, deodorant" className="w-full bg-[#F2F2F7] rounded-[14px] px-4 py-3 outline-none text-[16px] border border-transparent focus:border-[#007AFF] focus:bg-white transition-all" />
                    </div>

                    <div>
                        <label className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider mb-1.5 block ml-1">Note</label>
                        <input type="text" value={note} onChange={e => setNote(e.target.value)} className="w-full bg-[#F2F2F7] rounded-[14px] px-4 py-3 outline-none text-[16px] border border-transparent focus:border-[#007AFF] focus:bg-white transition-all" />
                    </div>
                </div>

                <button 
                    onClick={() => onSave({
                        ...expense,
                        amount: parseFloat(amount) || 0,
                        category,
                        subcategories: subcategories.split(',').map(s => s.trim()).filter(Boolean),
                        note
                    })} 
                    className="w-full bg-[#007AFF] hover:bg-[#0056b3] text-white font-semibold text-[17px] py-4 rounded-[14px] mt-6 flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                    <Check size={22} className="stroke-[2.5]" />
                    {isDoubleCheck ? "Yes, Save" : "Save Changes"}
                </button>
            </div>
        </div>
    );
}
