import React from 'react';
// 1. Zaroori Routing components import karein
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Home, Settings } from 'lucide-react'; 
import Inventory from './inventory';
import OperatorEnteriesDashboard from './operatorEnteriesDashboard';
import ProductionOrderCreation from './productionOrderCreation';
import MachineDashboard from './machineDashboard';
// --- Component Placeholders ---
// Yeh woh components hain jinhe aap apne file structure se import karenge
const OperatorDashboard = () => (
    <div className="p-8 bg-blue-100 rounded-xl text-center">
        <Home className="mx-auto w-8 h-8 text-blue-600 mb-2"/>
        <h2 className="text-2xl font-semibold">Operator Dashboard (Path: /)</h2>
    </div>
);

const InventoryManagement = () => (
    <div className="p-8 bg-green-100 rounded-xl text-center">
        <Settings className="mx-auto w-8 h-8 text-green-600 mb-2"/>
        <h2 className="text-2xl font-semibold">Inventory Management (Path: /inventory)</h2>
    </div>
);


// 2. Navigation Component: Yahan Link tag use hota hai
const Navigation = () => {
    return (
        <nav className="bg-gray-800 p-4 shadow-lg">
            <div className="max-w-4xl mx-auto flex space-x-4">
                {/* Home/Dashboard Link */}
                <Link to="/" className="text-white hover:text-blue-300 transition duration-150">
                    Operator Dashboard
                </Link>
                {/* Inventory Link */}
                <Link to="/inventory" className="text-white hover:text-blue-300 transition duration-150">
                    Inventory
                </Link>
                <Link to="/machines" className="text-white hover:text-blue-300 transition duration-150">
                    Machine Dashboard
                </Link>
                {/* <Link to="/production/create" className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium transition duration-150 flex items-center shadow-md">
                     New Production Order
                </Link> */}
            </div>
        </nav>
    );
};


// 3. Main App Component: BrowserRouter aur Routes ka wrapper
function NavBar() {
    return (
        // A. Sabse pehle, poore app ko BrowserRouter mein wrap karein
        <BrowserRouter>
            <div className="min-h-screen bg-gray-50">
                <Navigation />
                
                <main className="max-w-4xl mx-auto p-4 pt-8">
                    {/* B. Routes container: Saare Route elements ko ismein daalein */}
                    <Routes>
                        {/* C. Individual Route elements: path define karta hai URL, element mein component */}
                        
                        {/* Default Route: Operator Dashboard */}
                        <Route path="/" element={<OperatorEnteriesDashboard />} />
                        
                        {/* Inventory Route */}
                        <Route path="/inventory" element={<Inventory />} />

                        {/* NAYA ROUTE: Production Order Creation */}
                        <Route path="/production/create" element={<ProductionOrderCreation />} />

                        <Route path="/machines" element={<MachineDashboard />} />
                        
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default NavBar;
