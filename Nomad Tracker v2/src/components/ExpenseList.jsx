import React from 'react';
import { format } from 'date-fns';
import { getCategoryEmoji } from '../utils/parser';
import { Trash2 } from 'lucide-react';

export default function ExpenseList({ expenses, onDelete }) {
    if (expenses.length === 0) {
        return (
            <div className="text-center text-ios-muted py-12">
                <p className="text-[15px]">No expenses logged today.</p>
                <p className="text-[13px] mt-2 opacity-70">Try typing "5.50 coffee"</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 pb-32">
            {expenses.map((expense) => (
                <div 
                    key={expense.id} 
                    className="bg-ios-surface rounded-[20px] p-4 flex items-center justify-between shadow-sm border border-black/5 relative overflow-hidden group hover:shadow-md transition-shadow"
                >
                    <div className="flex items-center gap-3 relative z-10 bg-ios-surface flex-1">
                        <div className="text-2xl bg-ios-bg w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                            {getCategoryEmoji(expense.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-[17px] capitalize truncate">
                                {expense.category}
                            </div>
                            <div className="text-[13px] text-ios-muted truncate pr-2">
                                {expense.note || expense.raw_input}
                                {expense.subcategories && expense.subcategories.length > 0 && ` • ${expense.subcategories.join(', ')}`}
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0 mr-12 sm:mr-16 transition-all group-hover:mr-20">
                            <div className="font-bold text-[17px]">
                                ${expense.amount.toFixed(2)}
                            </div>
                            <div className="text-[12px] text-ios-muted">
                                {format(new Date(expense.created_at || new Date()), 'h:mm a')}
                            </div>
                        </div>
                    </div>

                    {/* Delete button revealed on swipe (or hover for now) */}
                    <button 
                        onClick={() => onDelete(expense.id)}
                        className="absolute right-0 top-0 bottom-0 bg-ios-red text-white w-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-0"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            ))}
        </div>
    );
}
