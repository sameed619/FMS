import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Factory, List, Send, Filter, CheckCircle, AlertTriangle } from 'lucide-react';

const LOG_BASE_URL = 'http://localhost:5000/api/machine-logs'; 
const ORDER_BASE_URL = 'http://localhost:5000/api/production-orders'; 
const API_KEY = ""; 

const SHIFTS = ['DAY', 'NIGHT', 'GENERAL'];

const fetchDataWithRetry = async (url, options = {}, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Server returned status ${response.status}` }));
                throw new Error(errorData.message || `API call failed with status ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Attempt ${i + 1} failed for ${url}:`, error.message);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
            } else {
                throw error;
            }
        }
    }
};

const MachineDashboard = () => {
    const [openOrders, setOpenOrders] = useState([]);
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [statusMessage, setStatusMessage] = useState(null);
    
    const [fulfillmentData, setFulfillmentData] = useState({
        productionOrderId: '',
        actualQtyProduced: '',
        wastageQty: '0',
        completedAt: new Date().toISOString().split('T')[0], 
        shift: 'DAY', 
    });

    const [logFilterShift, setLogFilterShift] = useState('');


    const fetchOpenOrders = useCallback(async () => {
        setError(null); 
        try {
            const result = await fetchDataWithRetry(`${ORDER_BASE_URL}/open`); 
            setOpenOrders(result.data);

            if (result.data.length > 0) {
                const isSelectedOrderValid = result.data.some(o => o.id.toString() === fulfillmentData.productionOrderId);
                if (!isSelectedOrderValid) {
                    setFulfillmentData(prev => ({ ...prev, productionOrderId: result.data[0].id.toString() }));
                }
            } else {
                 setFulfillmentData(prev => ({ ...prev, productionOrderId: '' }));
            }
        } catch (err) {
            console.error("Fetch Open Orders Error:", err);
            setError(`Error fetching open orders from ${ORDER_BASE_URL}/open. Check backend implementation.`);
            setOpenOrders([]); // Clear list on error
            setFulfillmentData(prev => ({ ...prev, productionOrderId: '' }));
        }
    }, [fulfillmentData.productionOrderId]);

    const fetchMachineLogs = useCallback(async () => {
        setIsLoading(true);
        setError(null); 
        const params = new URLSearchParams(logFilterShift ? { shift: logFilterShift } : {});
        const url = `${LOG_BASE_URL}?${params.toString()}`;

        try {
            const result = await fetchDataWithRetry(url);
            setLogs(result.data);
            setStatusMessage(null); 
        } catch (err) {
            console.error("Fetch Logs Error:", err);
            setError(`Error fetching machine logs: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [logFilterShift]);

    useEffect(() => {
        fetchOpenOrders();
        fetchMachineLogs();
    }, [fetchOpenOrders, fetchMachineLogs]);

    const handleFulfillment = async (e) => {
        e.preventDefault();
        if (!fulfillmentData.productionOrderId || fulfillmentData.actualQtyProduced === '' || fulfillmentData.actualQtyProduced < 0) {
             setError("Please select an order and enter a valid actual quantity produced.");
             return;
        }

        setIsLoading(true);
        setError(null);
        setStatusMessage(null);

        const payload = {
            ...fulfillmentData,
            productionOrderId: parseInt(fulfillmentData.productionOrderId),
            actualQtyProduced: parseFloat(fulfillmentData.actualQtyProduced),
            wastageQty: parseFloat(fulfillmentData.wastageQty || 0),
        };

        try {
            const result = await fetchDataWithRetry(`${LOG_BASE_URL}/fulfill`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            
            const orderNumber = result.data.orderNumber || payload.productionOrderId;
            setStatusMessage(`✅ Order ${orderNumber} successfully completed and logged!`);
            
            await Promise.all([fetchOpenOrders(), fetchMachineLogs()]);
            
            setFulfillmentData(prev => ({ ...prev, actualQtyProduced: '', wastageQty: '0' }));

        } catch (err) {
            setError(`Fulfillment Failed: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const getMachineModel = () => {
        const order = openOrders.find(o => o.id.toString() === fulfillmentData.productionOrderId);
        return order?.machine?.modelName || 'N/A';
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>{`
                /* Font for consistency */
                :root {
                    font-family: 'Inter', sans-serif;
                }
                .disabled-overlay {
                    cursor: not-allowed;
                    background-color: #f7f7f7;
                }
            `}</style>
            <div className="max-w-8xl mx-auto">
                <h1 className="text-3xl font-extrabold text-indigo-700 mb-8 border-b-4 border-indigo-200 pb-2 flex items-center">
                    <Factory className="mr-3" size={28} /> Production Fulfillment & Logging
                </h1>

                {error && (
                    <div className="p-4 mb-4 text-sm text-red-800 bg-red-100 rounded-lg shadow-md border border-red-300 flex items-start" role="alert">
                        <AlertTriangle className="mt-0.5 mr-3 flex-shrink-0" size={20} />
                        <div>
                            <span className="font-bold">Error:</span> {error}
                            <p className="text-xs mt-1 italic">
                                Tip: Ensure your backend server is running and the Production Order endpoint (`${ORDER_BASE_URL}/open`) is working.
                            </p>
                        </div>
                    </div>
                )}
                {statusMessage && (
                    <div className="p-4 mb-4 text-sm text-green-800 bg-green-100 rounded-lg shadow-md border border-green-300 flex items-center" role="alert">
                        <CheckCircle className="mr-3 flex-shrink-0" size={20} />
                        <span className="font-medium">{statusMessage}</span>
                    </div>
                )}
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Column 1: Order Fulfillment Form */}
                    <div className="lg:col-span-1">
                        <form onSubmit={handleFulfillment} className={`bg-white p-6 rounded-xl shadow-2xl border-t-4 border-indigo-500 sticky top-4 ${isLoading ? 'disabled-overlay opacity-80' : ''}`}>
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                                <CheckCircle className="mr-2" size={20} /> Fulfill Production Order
                            </h2>
                            
                            <fieldset className="space-y-4" disabled={isLoading || openOrders.length === 0}>
                                {/* 1. Production Order Selector */}
                                <div>
                                    <label htmlFor="orderId" className="block text-sm font-medium text-gray-700">Select Open Order:</label>
                                    <select
                                        id="orderId"
                                        value={fulfillmentData.productionOrderId}
                                        onChange={(e) => setFulfillmentData({ ...fulfillmentData, productionOrderId: e.target.value })}
                                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                        required
                                    >
                                        {openOrders.length > 0 ? openOrders.map(order => (
                                            <option key={order.id} value={order.id}>
                                                {order.orderNumber} - {order.recipeName} (Target: {order.targetQty})
                                            </option>
                                        )) : (
                                            <option value="">-- No Open Orders Available --</option>
                                        )}
                                    </select>
                                    <p className="text-xs text-indigo-500 mt-1">
                                        Assigned Machine: **{getMachineModel()}**
                                    </p>
                                </div>
                                
                                {/* 2. Date and Shift */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="completedAt" className="block text-sm font-medium text-gray-700">Completion Date:</label>
                                        <input
                                            type="date"
                                            id="completedAt"
                                            value={fulfillmentData.completedAt}
                                            onChange={(e) => setFulfillmentData({ ...fulfillmentData, completedAt: e.target.value })}
                                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:ring-indigo-500 focus:border-indigo-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="shift" className="block text-sm font-medium text-gray-700">Shift Type:</label>
                                        <select
                                            id="shift"
                                            value={fulfillmentData.shift}
                                            onChange={(e) => setFulfillmentData({ ...fulfillmentData, shift: e.target.value })}
                                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                            required
                                        >
                                            {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* 3. Quantities */}
                                <div>
                                    <label htmlFor="actualQtyProduced" className="block text-sm font-medium text-gray-700">Actual Quantity Produced (Units):</label>
                                    <input
                                        type="number"
                                        id="actualQtyProduced"
                                        value={fulfillmentData.actualQtyProduced}
                                        onChange={(e) => setFulfillmentData({ ...fulfillmentData, actualQtyProduced: e.target.value })}
                                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Final good units"
                                        min="0"
                                        step="any"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label htmlFor="wastageQty" className="block text-sm font-medium text-gray-700">Wastage Quantity (Units):</label>
                                    <input
                                        type="number"
                                        id="wastageQty"
                                        value={fulfillmentData.wastageQty}
                                        onChange={(e) => setFulfillmentData({ ...fulfillmentData, wastageQty: e.target.value })}
                                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Units scrapped (default 0)"
                                        min="0"
                                        step="any"
                                    />
                                </div>
                            </fieldset>

                            <button
                                type="submit"
                                disabled={isLoading || openOrders.length === 0 || !fulfillmentData.productionOrderId}
                                className="w-full mt-6 py-3 px-4 border border-transparent rounded-lg shadow-lg text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition duration-150 ease-in-out"
                            >
                                {isLoading ? 'Fulfilling...' : '➡️ Fulfill & Create Log'}
                            </button>
                            {openOrders.length === 0 && (
                                <p className="mt-2 text-center text-sm text-red-500">No open orders to fulfill. (Check open orders API status)</p>
                            )}
                        </form>
                    </div>

                    {/* Column 2/3: Machine Log History */}
                    <div className="lg:col-span-2">
                        <div className="bg-white p-6 rounded-xl shadow-2xl border-t-4 border-amber-500">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex justify-between items-center">
                                <List className="mr-2" size={20} /> Machine Log History
                            </h2>

                            {/* Filter Bar */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-4">
                                <div className="flex items-center space-x-2 w-full sm:w-auto">
                                    <Filter size={20} className="text-gray-500 flex-shrink-0" />
                                    <select
                                        value={logFilterShift}
                                        onChange={(e) => setLogFilterShift(e.target.value)}
                                        className="py-2 px-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 w-full bg-white"
                                    >
                                        <option value="">All Shifts</option>
                                        {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <button
                                    onClick={fetchMachineLogs}
                                    disabled={isLoading}
                                    className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center sm:justify-start shadow-sm"
                                >
                                    <Clock size={20} className="mr-1" /> {isLoading ? 'Refreshing...' : 'Refresh Logs'}
                                </button>
                            </div>


                            {/* Log Table */}
                            <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Log ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order / Recipe</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Produced Qty</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Wastage Qty</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Log Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {logs.length > 0 ? (
                                            logs.map((log) => (
                                                <tr key={log.id} className="hover:bg-blue-50/50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.id}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        <span className="font-semibold">{log.productionOrder?.orderNumber || `PO-${log.productionOrderId}`}</span>
                                                        <span className="block text-xs text-gray-500">
                                                            {log.productionOrder?.recipe?.designCode || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.machine?.modelName || `ID ${log.machineId}`}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-center">
                                                        <span className={`px-2 py-0.5 rounded-full ${log.shift === 'DAY' ? 'bg-yellow-100 text-yellow-800' : log.shift === 'NIGHT' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                                                            {log.shift}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700 text-right">
                                                        {log.actualQtyProduced?.toFixed(2) || '0.00'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">
                                                        {log.wastageQty?.toFixed(2) || '0.00'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(log.logDate).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                                    {isLoading ? "Loading logs..." : "No machine logs found for this filter."}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MachineDashboard;
