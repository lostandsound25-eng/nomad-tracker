import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { getCategoryEmoji } from '../utils/parser';
import { Trash2 } from 'lucide-react';

function SwipeableExpenseItem({ expense, onDelete, onEdit }) {
    const [offset, setOffset] = useState(0);
    const startX = useRef(null);

    const handleTouchStart = (e) => {
        startX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e) => {
        if (startX.current === null) return;
        const diff = e.touches[0].clientX - startX.current;
        if (diff < 0 && diff > -100) { 
            setOffset(diff);
        }
    };

    const handleTouchEnd = () => {
        if (offset < -50) {
            setOffset(-80); // Lock open
        } else {
            setOffset(0); // Snap back
        }
        startX.current = null;
    };

    return (
        <div className="relative overflow-hidden rounded-[16px] bg-[#FF3B30] mb-2.5 shadow-sm transition-all animate-in fade-in slide-in-from-top-4 duration-150">
            {/* Delete Background Button */}
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(expense.id); }}
                className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center text-white"
            >
                <Trash2 size={22} />
            </button>

            {/* Foreground Card */}
            <div 
                className="bg-white p-4 flex items-center justify-between relative z-10 transition-transform active:bg-gray-50 cursor-pointer"
                style={{ transform: `translateX(${offset}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => onEdit(expense)}
            >
                <div className="flex items-center gap-4 min-w-0">
                    <div className="text-[28px] w-10 text-center flex-shrink-0 opacity-90">
                        {getCategoryEmoji(expense.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[16px] text-black capitalize truncate leading-tight">
                            {expense.category}
                        </div>
                        <div className="text-[13px] text-[#8E8E93] truncate mt-0.5">
                            {expense.note}
                            {expense.note && expense.subcategories?.length > 0 && ' • '}
                            {expense.subcategories?.join(', ')}
                            {!expense.note && (!expense.subcategories || expense.subcategories.length === 0) && expense.raw_input}
                        </div>
                    </div>
                </div>
                
                <div className="text-right flex-shrink-0 pl-3">
                    <div className="font-bold text-[18px] text-black">
                        ${expense.amount.toFixed(2)}
                    </div>
                    <div className="text-[12px] text-[#8E8E93] mt-1">
                        {format(new Date(expense.created_at || new Date()), 'h:mm a')}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ExpenseList({ expenses, onDelete, onEdit }) {
    if (expenses.length === 0) {
        return (
            <div className="text-center text-[#8E8E93] py-12">
                <p className="text-[16px] font-medium text-black/50">Ready to track.</p>
                <p className="text-[14px] mt-2 opacity-60">"5.50 coffee"</p>
            </div>
        );
    }

    return (
        <div className="pb-32 px-1">
            {expenses.map((expense) => (
                <SwipeableExpenseItem 
                    key={expense.id} 
                    expense={expense} 
                    onDelete={onDelete} 
                    onEdit={onEdit} 
                />
            ))}
        </div>
    );
}
