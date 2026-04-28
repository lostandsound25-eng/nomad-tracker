import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import ExpenseInput from './components/ExpenseInput';
import ExpenseList from './components/ExpenseList';
import { parseExpense } from './utils/parser';

export default function App() {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        // Load instantly from local storage (Offline First / Speed)
        const cached = localStorage.getItem('expenses');
        if (cached) setExpenses(JSON.parse(cached));
        
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .gte('date', today)
            .order('created_at', { ascending: false })
            .limit(30);

        if (!error && data) {
            setExpenses(data);
            localStorage.setItem('expenses', JSON.stringify(data));
        }
        setLoading(false);
    };

    const handleSaveExpense = async (rawString) => {
        const lastCategory = localStorage.getItem('lastCategory') || 'other';
        const parsedData = parseExpense(rawString, lastCategory);
        
        if (!parsedData) {
            alert("Could not extract an amount. Try '15 lunch'");
            return;
        }

        // Memory: Save last used category
        localStorage.setItem('lastCategory', parsedData.category);

        const newExpenseData = {
            ...parsedData,
            date: editingItem ? editingItem.date : new Date().toISOString().split('T')[0],
        };

        if (editingItem) {
            // OPTIMISTIC UPDATE
            const previousExpenses = [...expenses];
            const updatedExpenses = expenses.map(e => e.id === editingItem.id ? { ...e, ...newExpenseData } : e);
            setExpenses(updatedExpenses);
            localStorage.setItem('expenses', JSON.stringify(updatedExpenses));
            setEditingItem(null);

            const { error } = await supabase
                .from('expenses')
                .update({ 
                    amount: newExpenseData.amount,
                    category: newExpenseData.category,
                    subcategories: newExpenseData.subcategories,
                    note: newExpenseData.note,
                    raw_input: newExpenseData.raw_input
                })
                .eq('id', editingItem.id);

            if (error) {
                console.error(error);
                setExpenses(previousExpenses); // revert
            }
        } else {
            // OPTIMISTIC INSERT
            const tempId = Date.now().toString();
            const optimisticExpense = { id: tempId, created_at: new Date().toISOString(), ...newExpenseData };
            
            const newExpenseList = [optimisticExpense, ...expenses];
            setExpenses(newExpenseList);
            localStorage.setItem('expenses', JSON.stringify(newExpenseList));

            const { data, error } = await supabase
                .from('expenses')
                .insert([{ ...newExpenseData }])
                .select();

            if (error) {
                console.error(error);
                setExpenses(expenses.filter(e => e.id !== tempId)); // revert
            } else if (data && data[0]) {
                // Background swap temp ID with real ID
                setExpenses(prev => prev.map(e => e.id === tempId ? data[0] : e));
            }
        }
    };

    const handleDelete = async (id) => {
        const previousExpenses = [...expenses];
        const newExpenseList = expenses.filter(e => e.id !== id);
        
        // Optimistic delete
        setExpenses(newExpenseList);
        localStorage.setItem('expenses', JSON.stringify(newExpenseList));

        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', id);

        if (error) {
            console.error(error);
            setExpenses(previousExpenses); // Revert
            localStorage.setItem('expenses', JSON.stringify(previousExpenses));
        }
    };

    const handleEdit = (expense) => {
        setEditingItem(expense);
    };

    const totalToday = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className="min-h-screen bg-[#F2F2F7] max-w-md mx-auto relative flex flex-col font-sans select-none">
            {/* Extremely minimal header */}
            <header className="pt-14 pb-5 px-5">
                <div className="text-[#8E8E93] text-[13px] font-semibold uppercase tracking-wider mb-1">Today</div>
                <div className="text-[44px] font-bold tracking-tight text-black leading-none">${totalToday.toFixed(2)}</div>
            </header>

            <main className="flex-1 overflow-y-auto px-4">
                <ExpenseList expenses={expenses} onDelete={handleDelete} onEdit={handleEdit} />
            </main>

            <ExpenseInput 
                onAddExpense={handleSaveExpense} 
                editingItem={editingItem} 
                onCancelEdit={() => setEditingItem(null)} 
            />
        </div>
    );
}
