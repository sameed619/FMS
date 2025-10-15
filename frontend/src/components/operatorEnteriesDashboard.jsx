import React, { useState, useEffect, useCallback, useRef } from 'react';

// Custom hook for simple interval logic for auto-refresh
const useInterval = (callback, delay) => {
    const savedCallback = useRef();

    // Remember the latest callback.
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the interval.
    useEffect(() => {
        function tick() {
            savedCallback.current();
        }
        if (delay !== null) {
            let id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
};

// --- API Wrapper Functions ---
const BASE_URL = 'http://localhost:5000/api/operator-entries';
// NOTE: API_KEY is left empty as per standard instructions.

const fetchOpenEntries = async () => {
    // Retry logic with exponential backoff for robustness
    for (let i = 0; i < 3; i++) {
        try {
            const response = await fetch(`${BASE_URL}/open`, {
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                // If the response is not 200, throw error to trigger retry or catch block
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch open entries.');
            }
            const result = await response.json();
            return result.data;
        } catch (error) {
            if (i < 2) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000)); // Exponential backoff
            } else {
                throw error; // Throw after final attempt
            }
        }
    }
};

const startEntry = async (productionOrderId, operatorId, notes, activityType) => {
    const payload = {
        productionOrderId: parseInt(productionOrderId),
        operatorId: parseInt(operatorId),
        notes,
        activityType,
    };
    const response = await fetch(`${BASE_URL}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start work entry.');
    }
    return response.json();
};

const stopEntry = async (entryId, notes) => {
    const payload = {
        entryId: parseInt(entryId),
        notes,
    };
    const response = await fetch(`${BASE_URL}/stop`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to stop work entry.');
    }
    return response.json();
};

// --- Main App Component ---
const OperatorEnteriesDashboard = () => {
    const [openEntries, setOpenEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusMessage, setStatusMessage] = useState(null);

    // Form State for Starting Work
    const [form, setForm] = useState({
        operatorId: '1', // Defaulting to 1 for easy testing
        productionOrderId: '2', // Defaulting to 2 for easy testing
        notes: '',
        activityType: 'Production',
    });

    // --- Data Fetching Logic ---
    const refreshEntries = useCallback(async () => {
        setError(null);
        try {
            const data = await fetchOpenEntries();
            setOpenEntries(data);
        } catch (err) {
            console.error("Fetch Error:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load and setup interval for live refresh
    useEffect(() => {
        refreshEntries();
    }, [refreshEntries]);
    
    // Auto-refresh every 5 seconds for live status
    useInterval(refreshEntries, 5000); 

    // --- Handler Functions ---
    const handleStartWork = async (e) => {
        e.preventDefault();
        setStatusMessage(null);
        if (!form.operatorId || !form.productionOrderId) {
            setError("Operator ID and Production Order ID are required.");
            return;
        }

        try {
            setIsLoading(true);
            const result = await startEntry(form.operatorId, form.productionOrderId, form.notes, form.activityType);
            setStatusMessage(result.message);
            // Clear only notes/orderId, keep operatorId for continuous use
            setForm(prev => ({ ...prev, productionOrderId: '', notes: '' })); 
            await refreshEntries(); 
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStopWork = async (entryId) => {
        setStatusMessage(null);
        try {
            // Using prompt as a modal placeholder, as alert() is forbidden
            const stopNotes = window.prompt("Enter notes/reason for stopping:"); 
            if (stopNotes === null) return; // User cancelled

            setIsLoading(true);
            const result = await stopEntry(entryId, stopNotes);
            setStatusMessage(result.message);
            await refreshEntries(); 
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Helper for time display ---
    const timeSince = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes";
        return Math.floor(seconds) + " seconds";
    };


    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-extrabold text-indigo-700 mb-6 border-b-4 border-indigo-200 pb-2">
                    🏭 Operator Labor Tracking Dashboard
                </h1>

                {/* Status and Error Messages */}
                {statusMessage && (
                    <div className="p-3 mb-4 text-sm text-green-800 bg-green-100 rounded-lg shadow-md" role="alert">
                        {statusMessage}
                    </div>
                )}
                {error && (
                    <div className="p-3 mb-4 text-sm text-red-800 bg-red-100 rounded-lg shadow-md" role="alert">
                        **Error:** {error}
                    </div>
                )}
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Column 1: Start Work Form */}
                    <div className="lg:col-span-1">
                        <form onSubmit={handleStartWork} className="bg-white p-6 rounded-xl shadow-2xl border-t-4 border-indigo-500">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                                🟢 Start New Work Entry
                            </h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="operatorId" className="block text-sm font-medium text-gray-700">Operator ID:</label>
                                    <input
                                        type="number"
                                        id="operatorId"
                                        value={form.operatorId}
                                        onChange={(e) => setForm({ ...form, operatorId: e.target.value })}
                                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="E.g., 1"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label htmlFor="productionOrderId" className="block text-sm font-medium text-gray-700">Production Order ID:</label>
                                    <input
                                        type="number"
                                        id="productionOrderId"
                                        value={form.productionOrderId}
                                        onChange={(e) => setForm({ ...form, productionOrderId: e.target.value })}
                                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="E.g., 2"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="activityType" className="block text-sm font-medium text-gray-700">Activity Type:</label>
                                    <select
                                        id="activityType"
                                        value={form.activityType}
                                        onChange={(e) => setForm({ ...form, activityType: e.target.value })}
                                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option>Production</option>
                                        <option>Setup</option>
                                        <option>Break</option>
                                        <option>Maintenance</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Start Notes (Optional):</label>
                                    <textarea
                                        id="notes"
                                        rows="2"
                                        value={form.notes}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Machine status or initial remarks..."
                                    ></textarea>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-6 py-3 px-4 border border-transparent rounded-lg shadow-lg text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition duration-150 ease-in-out"
                            >
                                {isLoading ? '🚀 Starting Work...' : '✅ Start Work Now'}
                            </button>
                        </form>
                    </div>

                    {/* Column 2/3: Open Entries List */}
                    <div className="lg:col-span-2">
                        <div className="bg-white p-6 rounded-xl shadow-2xl border-t-4 border-amber-500">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex justify-between items-center">
                                🟡 Live Open Entries
                                <button 
                                    onClick={refreshEntries} 
                                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Refreshing...' : 'Manual Refresh'}
                                </button>
                            </h2>
                            
                            {isLoading && !openEntries.length ? (
                                <div className="text-center p-8 text-gray-500">Loading open work entries...</div>
                            ) : openEntries.length === 0 ? (
                                <div className="text-center p-8 bg-gray-50 rounded-lg text-gray-600 font-semibold">
                                    No Operator is currently recording work. All entries are closed.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {openEntries.map((entry) => (
                                        <div 
                                            key={entry.id} 
                                            className="p-4 border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition duration-300 bg-yellow-50"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-bold text-lg text-gray-800">
                                                    {entry.operator?.name || 'N/A'} 
                                                    <span className="ml-2 text-sm font-normal text-indigo-500">({entry.activityType})</span>
                                                </div>
                                                <button
                                                    onClick={() => handleStopWork(entry.id)}
                                                    disabled={isLoading}
                                                    className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg shadow-md hover:bg-red-600 disabled:opacity-50 transition"
                                                >
                                                    🛑 Stop Work (ID: {entry.id})
                                                </button>
                                            </div>
                                            
                                            <div className="text-sm text-gray-600 space-y-1">
                                                <p><span className="font-semibold">Order:</span> {entry.productionOrder?.orderNumber || 'Unknown'} (ID: {entry.productionOrderId})</p>
                                                <p><span className="font-semibold">Started At:</span> {new Date(entry.startTime).toLocaleTimeString()} ({timeSince(entry.startTime)} ago)</p>
                                                <p><span className="font-semibold">Notes:</span> {entry.notes || 'No notes provided'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OperatorEnteriesDashboard;
