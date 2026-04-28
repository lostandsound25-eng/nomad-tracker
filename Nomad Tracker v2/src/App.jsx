import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import ExpenseInput from './components/ExpenseInput';
import ExpenseList from './components/ExpenseList';

export default function App() {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .gte('date', today)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setExpenses(data);
        } else if (error) {
            console.error("Fetch error:", error);
        }
        setLoading(false);
    };

    const handleAddExpense = async (parsedData) => {
        const tempId = Date.now().toString();
        const newExpense = {
            id: tempId,
            ...parsedData,
            date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString()
        };

        // Optimistic update
        setExpenses([newExpense, ...expenses]);

        // Backend sync
        const { data, error } = await supabase
            .from('expenses')
            .insert([
                { 
                    amount: parsedData.amount,
                    category: parsedData.category,
                    subcategories: parsedData.subcategories,
                    note: parsedData.note,
                    raw_input: parsedData.raw_input,
                    date: newExpense.date
                }
            ])
            .select();

        if (error) {
            console.error("Insert error:", error);
            alert("Failed to save to database. (Is RLS disabled?)");
            setExpenses(expenses.filter(e => e.id !== tempId));
        } else if (data && data[0]) {
            setExpenses(prev => prev.map(e => e.id === tempId ? data[0] : e));
        }
    };

    const handleDelete = async (id) => {
        const previousExpenses = [...expenses];
        // Optimistic delete
        setExpenses(expenses.filter(e => e.id !== id));

        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Delete error:", error);
            alert("Failed to delete.");
            setExpenses(previousExpenses);
        }
    };

    const totalToday = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className="min-h-screen bg-[#F2F2F7] max-w-md mx-auto relative shadow-2xl flex flex-col font-sans">
            <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-10 border-b border-[#C6C6C8] px-5 py-4 safe-area-top shadow-sm">
                <div className="flex justify-between items-center mb-1.5">
                    <h1 className="text-[17px] font-semibold tracking-tight text-black">Trip to Tokyo</h1>
                    <button className="text-[#007AFF] text-[15px] font-medium">Change</button>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-[#8E8E93] text-[13px] font-semibold uppercase tracking-wider">Today</span>
                    <span className="text-[34px] font-bold tracking-tight text-black">${totalToday.toFixed(2)}</span>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-4 pt-6">
                {loading ? (
                    <div className="text-center text-[#8E8E93] py-10 text-[15px]">Loading...</div>
                ) : (
                    <ExpenseList expenses={expenses} onDelete={handleDelete} />
                )}
            </main>

            <ExpenseInput onAddExpense={handleAddExpense} />
        </div>
    );
}
