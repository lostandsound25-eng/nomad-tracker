import React, { useState } from 'react';
import { getCategoryEmoji } from '../utils/parser';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

export default function CategoryBreakdown({ expenses, onEdit }) {
    const [expandedCategory, setExpandedCategory] = useState(null);

    const categories = ['food', 'transportation', 'lodging', 'other'];

    return (
        <div className="flex flex-col gap-3">
            {categories.map(cat => {
                const catExpenses = expenses.filter(e => e.category === cat);
                
                // Show category bucket even if 0, or just hide? 
                // Showing all 4 provides a consistent UI. Let's show all 4.
                const total = catExpenses.reduce((sum, e) => sum + e.amount, 0);
                const isExpanded = expandedCategory === cat;

                return (
                    <div key={cat} className="bg-white rounded-[16px] shadow-sm overflow-hidden transition-all">
                        <div 
                            className="p-4 flex items-center justify-between cursor-pointer active:bg-gray-50"
                            onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="text-[24px] w-10 text-center opacity-90">{getCategoryEmoji(cat)}</div>
                                <div className="font-semibold text-[17px] capitalize text-black">{cat}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`font-bold text-[18px] ${total > 0 ? 'text-black' : 'text-[#8E8E93]/50'}`}>
                                    ${total.toFixed(2)}
                                </div>
                                {isExpanded ? <ChevronUp size={20} className="text-[#8E8E93]" /> : <ChevronDown size={20} className="text-[#8E8E93]" />}
                            </div>
                        </div>

                        {/* Accordion content */}
                        {isExpanded && (
                            <div className="px-4 pb-3 pt-1 border-t border-[#F2F2F7]">
                                {catExpenses.length === 0 ? (
                                    <div className="text-[13px] text-[#8E8E93] text-center py-4 italic">No {cat} expenses today</div>
                                ) : (
                                    catExpenses.map(expense => {
                                        let title = expense.note || expense.subcategories?.join(', ') || expense.raw_input;
                                        if (!title.trim()) title = "Unnamed expense";

                                        return (
                                            <div 
                                                key={expense.id} 
                                                className="py-3 flex justify-between items-center border-b border-[#F2F2F7] last:border-0 cursor-pointer active:opacity-50"
                                                onClick={() => onEdit(expense)}
                                            >
                                                <div className="min-w-0 flex-1 pr-3">
                                                    <div className="text-[15px] text-black font-medium truncate">
                                                        {title}
                                                    </div>
                                                    <div className="text-[12px] text-[#8E8E93] mt-0.5">
                                                        {format(new Date(expense.created_at || new Date()), 'h:mm a')}
                                                    </div>
                                                </div>
                                                <div className="font-semibold text-[15px] text-black flex-shrink-0">
                                                    ${expense.amount.toFixed(2)}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
