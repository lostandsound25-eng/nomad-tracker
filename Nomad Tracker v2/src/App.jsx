import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import ExpenseInput from './components/ExpenseInput';
import ExpenseList from './components/ExpenseList';
import ExpenseModal from './components/ExpenseModal';
import { parseExpense } from './utils/parser';

export default function App() {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal State
    const [modalExpense, setModalExpense] = useState(null);
    const [isDoubleCheck, setIsDoubleCheck] = useState(false);

    useEffect(() => {
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

    const handleInitialSubmit = (rawString) => {
        const lastCategory = localStorage.getItem('lastCategory') || 'other';
        const parsedData = parseExpense(rawString, lastCategory);
        
        if (!parsedData) {
            alert("Could not extract an amount. Try '15 lunch'");
            return;
        }

        // Check if parser flagged this for double checking (e.g. "5:50")
        if (parsedData.needsConfirmation) {
            setModalExpense(parsedData);
            setIsDoubleCheck(true);
            return; // Halt save and open modal
        }

        executeSave(parsedData);
    };

    const executeSave = async (expenseData) => {
        // Memory: Save last used category
        localStorage.setItem('lastCategory', expenseData.category);

        const isUpdate = !!expenseData.id;

        const newExpenseData = {
            ...expenseData,
            date: expenseData.date || new Date().toISOString().split('T')[0],
        };

        // Remove our local flag before sending to DB
        delete newExpenseData.needsConfirmation;

        setModalExpense(null); // Close modal

        if (isUpdate) {
            // OPTIMISTIC UPDATE
            const previousExpenses = [...expenses];
            const updatedExpenses = expenses.map(e => e.id === expenseData.id ? newExpenseData : e);
            setExpenses(updatedExpenses);
            localStorage.setItem('expenses', JSON.stringify(updatedExpenses));

            const { error } = await supabase
                .from('expenses')
                .update({ 
                    amount: newExpenseData.amount,
                    category: newExpenseData.category,
                    subcategories: newExpenseData.subcategories,
                    note: newExpenseData.note,
                    raw_input: newExpenseData.raw_input
                })
                .eq('id', expenseData.id);

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
                setExpenses(prev => prev.map(e => e.id === tempId ? data[0] : e));
            }
        }
    };

    const handleDelete = async (id) => {
        const previousExpenses = [...expenses];
        const newExpenseList = expenses.filter(e => e.id !== id);
        
        setExpenses(newExpenseList);
        localStorage.setItem('expenses', JSON.stringify(newExpenseList));

        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', id);

        if (error) {
            console.error(error);
            setExpenses(previousExpenses); 
            localStorage.setItem('expenses', JSON.stringify(previousExpenses));
        }
    };

    const handleEditClick = (expense) => {
        setModalExpense(expense);
        setIsDoubleCheck(false);
    };

    const totalToday = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className="min-h-screen bg-[#F2F2F7] max-w-md mx-auto relative flex flex-col font-sans select-none">
            <header className="pt-14 pb-5 px-5">
                <div className="text-[#8E8E93] text-[13px] font-semibold uppercase tracking-wider mb-1">Today</div>
                <div className="text-[44px] font-bold tracking-tight text-black leading-none">${totalToday.toFixed(2)}</div>
            </header>

            <main className="flex-1 overflow-y-auto px-4">
                <ExpenseList expenses={expenses} onDelete={handleDelete} onEdit={handleEditClick} />
            </main>

            <ExpenseInput onAddExpense={handleInitialSubmit} />

            <ExpenseModal 
                isOpen={!!modalExpense}
                expense={modalExpense}
                isDoubleCheck={isDoubleCheck}
                onSave={executeSave}
                onClose={() => setModalExpense(null)}
            />
        </div>
    );
}
