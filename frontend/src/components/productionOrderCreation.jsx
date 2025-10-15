import React, { useState, useEffect } from 'react';
import { Factory, ClipboardCheck, AlertTriangle, Loader2 } from 'lucide-react';

const apiKey = "" // API key is needed for fetch calls to external APIs, otherwise leave as-is.

/**
 * Helper function for API calls with exponential backoff retry logic
 */
const fetchDataWithRetry = async (url, options = {}, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                // If not OK, throw error to trigger retry unless status is 4xx
                if (response.status >= 400 && response.status < 500) {
                     const errorData = await response.json();
                     throw new Error(errorData.message || `Client Error: ${response.status}`);
                }
                throw new Error(`Server error: ${response.statusText}`);
            }
            return response.json();
        } catch (error) {
            if (i === retries - 1) {
                // Last attempt, re-throw final error
                throw error;
            }
            // Wait with exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay * (2 ** i)));
        }
    }
};

const ProductionOrderCreation = () => {
    // Form state
    const [formData, setFormData] = useState({
        recipeId: '',
        targetQty: 0,
        machineId: '',
        startedAt: new Date().toISOString().slice(0, 16), // YYYY-MM-DDThh:mm format for datetime-local
    });

    // Master data state (Dropdown options)
    const [recipes, setRecipes] = useState([]);
    const [machines, setMachines] = useState([]);
    const [loadingMasterData, setLoadingMasterData] = useState(true);

    // UI Feedback state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // --- Fetch Master Data (Recipes and Machines) ---
    useEffect(() => {
        const fetchMasterData = async () => {
            setLoadingMasterData(true);
            try {
                // Mocking data if APIs are not yet defined. Replace with actual fetch calls.
                const mockRecipes = [
                    { id: 1, name: 'T-Shirt (Design A)', designCode: 'TS-001' },
                    { id: 2, name: 'Pants (Design B)', designCode: 'PN-002' },
                    { id: 3, name: 'Jacket (Design C)', designCode: 'JK-003' },
                ];
                const mockMachines = [
                    { id: 1, modelName: 'Knitting Unit 1', capacity: 500 },
                    { id: 2, modelName: 'Assembly Line 3', capacity: 1200 },
                    { id: 3, modelName: 'Cutting Laser 5', capacity: 800 },
                ];
                
                // --- Actual API Calls (Uncomment when routes are fully implemented) ---
                /*
                const [recipesResult, machinesResult] = await Promise.all([
                    fetchDataWithRetry(`/api/recipes`, { headers: { 'X-API-Key': apiKey } }),
                    fetchDataWithRetry(`/api/machines`, { headers: { 'X-API-Key': apiKey } })
                ]);
                setRecipes(recipesResult.data || []);
                setMachines(machinesResult.data || []);
                */
               
                // Using mock data for immediate functionality
                setRecipes(mockRecipes);
                setMachines(mockMachines);
                
                if (mockRecipes.length > 0) setFormData(prev => ({ ...prev, recipeId: mockRecipes[0].id }));
                if (mockMachines.length > 0) setFormData(prev => ({ ...prev, machineId: mockMachines[0].id }));

            } catch (err) {
                setError(`Master data fetch error: ${err.message}. Please ensure /api/recipes and /api/machines are running.`);
                console.error("Master Data Fetch Error:", err);
            } finally {
                setLoadingMasterData(false);
            }
        };

        fetchMasterData();
    }, []);

    // --- Form Handling ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null); // Clear error on change
        setSuccessMessage(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setLoading(true);

        const payload = {
            recipeId: Number(formData.recipeId),
            targetQty: Number(formData.targetQty),
            machineId: Number(formData.machineId),
            startedAt: formData.startedAt,
        };
        
        // Basic Client-Side Validation
        if (!payload.recipeId || !payload.machineId || payload.targetQty <= 0) {
            setError("Kripya sabhi zaroori field bharein (Recipe, Machine, Target Quantity > 0).");
            setLoading(false);
            return;
        }

        try {
            const result = await fetchDataWithRetry(`/api/production-orders`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey 
                },
                body: JSON.stringify(payload)
            });

            setSuccessMessage(result.message || `Production Order ${result.data?.orderNumber} kamyabi se banaya gaya.`);
            // Clear form and reset to default
            setFormData({
                recipeId: recipes[0]?.id || '',
                targetQty: 0,
                machineId: machines[0]?.id || '',
                startedAt: new Date().toISOString().slice(0, 16),
            });
            
        } catch (err) {
            // Error handling for insufficient stock (409) or validation (400) from controller
            setError(`Order creation failed: ${err.message}`);
            console.error("Order Creation API Error:", err);
        } finally {
            setLoading(false);
        }
    };

    // --- Render Logic ---
    if (loadingMasterData) {
        return (
            <div className="flex justify-center items-center h-64 bg-white rounded-xl shadow-lg">
                <Loader2 className="animate-spin w-8 h-8 text-blue-500 mr-3" />
                <p className="text-gray-600">Master Data Load ho raha hai...</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-lg mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-800 mb-6 flex items-center">
                <Factory className="w-7 h-7 mr-3 text-blue-600"/> 
                Naya Production Order Banayein
            </h1>
            <p className="text-sm text-gray-500 mb-6 border-b pb-4">
                Target set karein aur zaroori Inventory stock turant deduct karein.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Recipe Selection */}
                <div>
                    <label htmlFor="recipeId" className="block text-sm font-medium text-gray-700 mb-1">
                        1. Product Recipe / BOM:
                    </label>
                    <select
                        id="recipeId"
                        name="recipeId"
                        value={formData.recipeId}
                        onChange={handleChange}
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                        disabled={loading}
                    >
                        <option value="" disabled>Select a Recipe</option>
                        {recipes.map(recipe => (
                            <option key={recipe.id} value={recipe.id}>
                                {recipe.name} ({recipe.designCode})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Machine Selection */}
                <div>
                    <label htmlFor="machineId" className="block text-sm font-medium text-gray-700 mb-1">
                        2. Production Machine:
                    </label>
                    <select
                        id="machineId"
                        name="machineId"
                        value={formData.machineId}
                        onChange={handleChange}
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                        disabled={loading}
                    >
                        <option value="" disabled>Select a Machine</option>
                        {machines.map(machine => (
                            <option key={machine.id} value={machine.id}>
                                {machine.modelName} (Capacity: {machine.capacity} Units/Shift)
                            </option>
                        ))}
                    </select>
                </div>

                {/* Target Quantity */}
                <div>
                    <label htmlFor="targetQty" className="block text-sm font-medium text-gray-700 mb-1">
                        3. Target Quantity (Units to produce):
                    </label>
                    <input
                        type="number"
                        id="targetQty"
                        name="targetQty"
                        value={formData.targetQty}
                        onChange={handleChange}
                        min="1"
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                        disabled={loading}
                    />
                </div>

                {/* Start Date/Time */}
                <div>
                    <label htmlFor="startedAt" className="block text-sm font-medium text-gray-700 mb-1">
                        4. Planned Start Date/Time:
                    </label>
                    <input
                        type="datetime-local"
                        id="startedAt"
                        name="startedAt"
                        value={formData.startedAt}
                        onChange={handleChange}
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                        disabled={loading}
                    />
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-center" role="alert">
                        <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}
                
                {/* Success Display */}
                {successMessage && (
                    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg flex items-center" role="alert">
                        <ClipboardCheck className="w-5 h-5 mr-3 flex-shrink-0" />
                        <p className="text-sm font-medium">{successMessage}</p>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-medium text-white transition duration-200 ${
                        loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-[1.01]'
                    }`}
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2 className="animate-spin w-5 h-5 mr-2" />
                    ) : (
                        <ClipboardCheck className="w-5 h-5 mr-2" />
                    )}
                    {loading ? 'Order Bheja Ja Raha Hai...' : 'Create Production Order & Deduct Stock'}
                </button>
            </form>
        </div>
    );
};

export default ProductionOrderCreation;
