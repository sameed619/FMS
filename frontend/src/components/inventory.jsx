import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Search, Trash2, Edit, Truck, X, Factory, Box, ChevronDown, ChevronUp, RefreshCw, AlertTriangle } from 'lucide-react';

const BASE_URL = 'http://localhost:5000/api/inventory';
const API_KEY = "" // API key is left empty as per instruction

// --- API Wrapper Functions ---

const fetchInventory = async (filterType = '') => {
    try {
        const response = await fetch(`${BASE_URL}?itemType=${filterType}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error("Error fetching inventory:", error);
        return [];
    }
};

const createInventory = async (data) => {
    try {
        const response = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Failed to create item.");
        return { success: true, data: result.data };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

const deleteInventory = async (id) => {
    try {
        const response = await fetch(`${BASE_URL}/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error("Failed to delete item.");
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

const adjustStock = async (id, qty, operation) => {
    try {
        const response = await fetch(`${BASE_URL}/${id}/stock`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qty: parseInt(qty), operation }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Failed to adjust stock.");
        return { success: true, data: result.data };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

// --- Main Inventory Management Component ---
const Inventory = () => {
    const [inventoryList, setInventoryList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [filterType, setFilterType] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [newInventoryItem, setNewInventoryItem] = useState({
        itemId: '', name: '', itemType: 'Fabric', stockQty: 0, unit: 'kgs', supplier: '', billNumber: '', pricePerUnit: 0
    });
    const [stockAdjustment, setStockAdjustment] = useState({ id: null, qty: 0, operation: 'add' });

    // Notification Helper
    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    // Load Inventory Callback
    const loadInventory = useCallback(async (type) => {
        setIsLoading(true);
        const data = await fetchInventory(type);
        setInventoryList(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadInventory(filterType);
    }, [filterType, loadInventory]);

    // --- Form Handlers ---
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setNewInventoryItem(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateItem = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const response = await createInventory(newInventoryItem);

        if (response.success) {
            showNotification(`Item ${response.data.itemId} created successfully!`, 'success');
            setNewInventoryItem({
                itemId: '', name: '', itemType: 'Fabric', stockQty: 0, unit: 'kgs', supplier: '', billNumber: '', pricePerUnit: 0
            });
            setIsFormOpen(false);
            loadInventory(filterType); // Refresh list
        } else {
            showNotification(response.message, 'error');
        }
        setIsLoading(false);
    };

    const handleDeleteItem = async (id, itemId) => {
        if (!window.confirm(`Are you sure you want to delete Inventory Item ${itemId}?`)) return;

        setIsLoading(true);
        const response = await deleteInventory(id);

        if (response.success) {
            showNotification(`Item ${itemId} deleted successfully.`, 'success');
            loadInventory(filterType);
        } else {
            showNotification(response.message, 'error');
        }
        setIsLoading(false);
    };

    const handleStockAdjustment = async () => {
        if (stockAdjustment.qty <= 0 || !stockAdjustment.id) {
            showNotification("Please enter a valid quantity.", 'error');
            return;
        }

        setIsLoading(true);
        const response = await adjustStock(stockAdjustment.id, stockAdjustment.qty, stockAdjustment.operation);

        if (response.success) {
            showNotification(`Stock adjusted for ID ${stockAdjustment.id}. New Qty: ${response.data.stockQty}`, 'success');
            setStockAdjustment({ id: null, qty: 0, operation: 'add' }); // Reset form
            loadInventory(filterType); // Refresh list
        } else {
            showNotification(response.message, 'error');
        }
        setIsLoading(false);
    };

    // --- Filtering and Searching ---
    const filteredInventory = inventoryList.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        return (
            item.itemId.toLowerCase().includes(searchLower) ||
            item.name.toLowerCase().includes(searchLower) ||
            item.supplier.toLowerCase().includes(searchLower)
        );
    });

    // --- Render Helpers ---
    const getBadgeColor = (type) => {
        return type === 'Fabric' ? 'bg-indigo-100 text-indigo-800' : 'bg-pink-100 text-pink-800';
    };

    const formatDate = (isoDate) => {
        if (!isoDate) return 'N/A';
        return new Date(isoDate).toLocaleDateString();
    };


    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                
                {/* Header and Title */}
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 mb-6 flex items-center border-b pb-4">
                    <Box className="h-8 w-8 mr-3 text-green-600" />
                    Inventory Master Management
                </h1>

                {/* Notification Area */}
                {notification && (
                    <div 
                        className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-xl text-white transition-opacity duration-300 flex items-center ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
                        role="alert"
                    >
                        {notification.type === 'error' && <AlertTriangle className="h-5 w-5 mr-2" />}
                        {notification.message}
                    </div>
                )}

                {/* Action Bar */}
                <div className="bg-white p-4 rounded-xl shadow-lg mb-6 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                    
                    {/* Search */}
                    <div className="relative w-full md:w-1/3">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by ID, Name, or Supplier..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                        />
                    </div>
                    
                    {/* Filter */}
                    <div className="flex space-x-3 items-center">
                        <label className="text-sm font-medium text-gray-600">Filter By Type:</label>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="py-2 px-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 bg-white shadow-sm"
                        >
                            <option value="">All Types</option>
                            <option value="Fabric">Fabric</option>
                            <option value="Thread">Thread</option>
                        </select>
                        <button
                            onClick={() => loadInventory(filterType)}
                            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700 transition"
                            disabled={isLoading}
                        >
                            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Add New Item Button */}
                    <button
                        onClick={() => setIsFormOpen(!isFormOpen)}
                        className={`py-2 px-4 font-semibold rounded-xl shadow-md transition duration-200 flex items-center ${isFormOpen ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                        disabled={isLoading}
                    >
                        {isFormOpen ? <X className="h-5 w-5 mr-2" /> : <PlusCircle className="h-5 w-5 mr-2" />}
                        {isFormOpen ? 'Close Form' : 'Add New Item'}
                    </button>
                </div>

                {/* Add New Item Form */}
                {isFormOpen && (
                    <div className="bg-white p-6 rounded-xl shadow-2xl mb-8 border border-green-200">
                        <h2 className="text-xl font-bold text-green-600 mb-4">Create New Inventory Item</h2>
                        <form onSubmit={handleCreateItem} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            
                            <input type="text" name="itemId" value={newInventoryItem.itemId} onChange={handleFormChange} placeholder="Item ID (e.g., MSK-101)" required className="p-2 border rounded-lg" />
                            <input type="text" name="name" value={newInventoryItem.name} onChange={handleFormChange} placeholder="Item Name (e.g., Blue Cotton Fabric)" required className="p-2 border rounded-lg" />
                            
                            <select name="itemType" value={newInventoryItem.itemType} onChange={handleFormChange} required className="p-2 border rounded-lg bg-white">
                                <option value="Fabric">Fabric</option>
                                <option value="Thread">Thread</option>
                            </select>

                            <input type="number" name="stockQty" value={newInventoryItem.stockQty} onChange={handleFormChange} placeholder="Stock Quantity" required min="0" className="p-2 border rounded-lg" />
                            <input type="text" name="unit" value={newInventoryItem.unit} onChange={handleFormChange} placeholder="Unit (e.g., kgs, meters, spools)" required className="p-2 border rounded-lg" />
                            <input type="text" name="supplier" value={newInventoryItem.supplier} onChange={handleFormChange} placeholder="Supplier Name" required className="p-2 border rounded-lg" />
                            
                            <input type="text" name="billNumber" value={newInventoryItem.billNumber} onChange={handleFormChange} placeholder="Last Bill Number (Optional)" className="p-2 border rounded-lg" />
                            <input type="number" name="pricePerUnit" value={newInventoryItem.pricePerUnit} onChange={handleFormChange} placeholder="Price Per Unit" required min="0" step="0.01" className="p-2 border rounded-lg" />
                            
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="md:col-span-3 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition disabled:bg-gray-400"
                            >
                                {isLoading ? 'Saving...' : 'Save New Item'}
                            </button>
                        </form>
                    </div>
                )}


                {/* Inventory Table */}
                <div className="bg-white p-6 rounded-xl shadow-2xl border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Current Stock List ({filteredInventory.length} Items)</h2>
                    
                    {isLoading && inventoryList.length === 0 ? (
                         <div className="text-center p-8 text-gray-500">Loading inventory data...</div>
                    ) : filteredInventory.length === 0 ? (
                        <div className="text-center p-8 text-gray-500">No items match your criteria.</div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-inner">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Item ID / Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Qty</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price / Unit</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Adjustment</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredInventory.map((item) => (
                                        <tr key={item.id} className="hover:bg-blue-50 transition duration-150">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="font-bold text-gray-900">{item.itemId}</div>
                                                <div className="text-sm text-gray-500">{item.name}</div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getBadgeColor(item.itemType)}`}>
                                                    {item.itemType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-lg font-extrabold text-blue-600">
                                                {item.stockQty} <span className="text-sm font-medium text-gray-500 ml-1">{item.unit}</span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                ₹{item.pricePerUnit?.toFixed(2) || '0.00'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                <div className="flex items-center">
                                                    <Truck className="h-4 w-4 mr-1 text-gray-400" />
                                                    {item.supplier}
                                                </div>
                                                <div className="text-xs text-gray-500">Bill: {item.billNumber || 'N/A'}</div>
                                            </td>
                                            
                                            {/* Stock Adjustment Column */}
                                            <td className="px-4 py-2 text-center">
                                                {stockAdjustment.id === item.id ? (
                                                    <div className="flex items-center space-x-1">
                                                        <input
                                                            type="number"
                                                            value={stockAdjustment.qty}
                                                            onChange={(e) => setStockAdjustment(p => ({ ...p, qty: e.target.value }))}
                                                            min="1"
                                                            placeholder="Qty"
                                                            className="w-16 p-1 border rounded-lg text-center text-sm"
                                                        />
                                                        <select
                                                            value={stockAdjustment.operation}
                                                            onChange={(e) => setStockAdjustment(p => ({ ...p, operation: e.target.value }))}
                                                            className="p-1 border rounded-lg bg-white text-sm"
                                                        >
                                                            <option value="add">Add</option>
                                                            <option value="subtract">Sub</option>
                                                        </select>
                                                        <button 
                                                            onClick={handleStockAdjustment} 
                                                            disabled={isLoading || stockAdjustment.qty <= 0}
                                                            className="p-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                                                        >
                                                            &#10003;
                                                        </button>
                                                        <button 
                                                            onClick={() => setStockAdjustment({ id: null, qty: 0, operation: 'add' })}
                                                            className="p-1 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setStockAdjustment({ id: item.id, qty: 1, operation: 'add' })}
                                                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition shadow-md"
                                                    >
                                                        Adjust
                                                    </button>
                                                )}
                                            </td>

                                            {/* Actions Column */}
                                            <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                                                <div className="flex justify-center space-x-2">
                                                    {/* NOTE: Edit functionality is commented out as the API for it is complex (PUT /:id) and not explicitly requested for UI */}
                                                    {/* <button className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-indigo-100 transition">
                                                        <Edit className="h-5 w-5" />
                                                    </button> */}
                                                    <button 
                                                        onClick={() => handleDeleteItem(item.id, item.itemId)}
                                                        disabled={isLoading}
                                                        className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Inventory;
