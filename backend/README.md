# Factory Management System - Backend

Backend API for Factory Management System Module 1 (Machine & Production Management) built with Node.js, Express, and MongoDB.

## 🚀 Features

- **Machine Management**: CRUD operations for factory machines
- **Production Management**: Track daily production records with machine, fabric, and thread linkage
- **Inventory Management**: Manage fabric and thread inventory with automatic stock updates
- **Purchase Entry**: Track purchase entries with automatic inventory updates

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## 🛠 Installation

1. **Clone the repository and navigate to backend directory**

   ```bash
   cd backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   - Copy `.env` file and update the MongoDB connection string
   - Default MongoDB URI: `mongodb://localhost:27017/factory_management`
   - Default PORT: `5000`

4. **Start MongoDB**
   - Make sure MongoDB is running on your system
   - For local MongoDB: `mongod`
   - For MongoDB Atlas: Update the connection string in `.env`

## 🏃‍♂️ Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:5000` (or the PORT specified in .env)

## 📚 API Endpoints

### Health Check

- **GET** `/api/health` - Check if the server is running

### Machine Management

- **GET** `/api/machines` - Get all machines
- **GET** `/api/machines/:id` - Get machine by ID
- **POST** `/api/machines` - Create new machine
- **PUT** `/api/machines/:id` - Update machine
- **DELETE** `/api/machines/:id` - Delete machine

### Production Management

- **GET** `/api/production` - Get all production records
- **GET** `/api/production/:id` - Get production record by ID
- **POST** `/api/production` - Create new production record
- **PUT** `/api/production/:id` - Update production record
- **DELETE** `/api/production/:id` - Delete production record

### Inventory Management

- **GET** `/api/inventory` - Get all inventory items
- **GET** `/api/inventory/:id` - Get inventory item by ID
- **POST** `/api/inventory` - Create new inventory item
- **PUT** `/api/inventory/:id` - Update inventory item
- **DELETE** `/api/inventory/:id` - Delete inventory item
- **PUT** `/api/inventory/:id/stock` - Update stock quantity

### Purchase Management

- **GET** `/api/purchase` - Get all purchase entries
- **GET** `/api/purchase/:id` - Get purchase entry by ID
- **POST** `/api/purchase` - Create new purchase entry
- **PUT** `/api/purchase/:id` - Update purchase entry
- **DELETE** `/api/purchase/:id` - Delete purchase entry

## 📊 Data Models

### Machine

```json
{
  "machineId": "MACH001",
  "name": "Sewing Machine 1",
  "type": "Industrial",
  "operatorName": "John Doe",
  "status": "active",
  "capacityPerDay": 100,
  "workingHours": 8,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Production Record

```json
{
  "recordId": "PROD001",
  "machineId": "ObjectId",
  "date": "2024-01-01T00:00:00.000Z",
  "fabric": "ObjectId",
  "thread": "ObjectId",
  "designCode": "DES001",
  "stitches": 1000,
  "front": true,
  "back": false,
  "operator": "Jane Smith",
  "workingHours": 8,
  "dailyOutput": 50,
  "remarks": "Good quality"
}
```

### Inventory

```json
{
  "itemId": "FAB001",
  "itemType": "Fabric",
  "name": "Cotton Fabric",
  "stockQty": 100,
  "unit": "meters",
  "supplier": "ABC Textiles",
  "lastPurchaseDate": "2024-01-01T00:00:00.000Z",
  "billNumber": "BILL001",
  "pricePerUnit": 50
}
```

### Purchase Entry

```json
{
  "purchaseId": "PUR001",
  "supplier": "ABC Textiles",
  "billNumber": "BILL001",
  "items": [
    {
      "itemId": "ObjectId",
      "qty": 50,
      "pricePerUnit": 50
    }
  ],
  "totalAmount": 2500,
  "purchaseDate": "2024-01-01T00:00:00.000Z"
}
```

## 🔧 Query Parameters

### Production Records

- `machineId` - Filter by machine ID
- `date` - Filter by specific date (YYYY-MM-DD)

### Inventory

- `itemType` - Filter by item type (Fabric/Thread)

### Purchase Entries

- `supplier` - Filter by supplier name
- `startDate` - Filter from date
- `endDate` - Filter to date

## 🚨 Error Handling

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "count": 10
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## 🔒 Environment Variables

```env
MONGO_URI=mongodb://localhost:27017/factory_management
PORT=5000
NODE_ENV=development
```

## 📁 Project Structure

```
backend/
├── server.js              # Main server file
├── config/
│   └── db.js             # Database configuration
├── models/
│   ├── Machine.js        # Machine model
│   ├── ProductionRecord.js # Production record model
│   ├── Inventory.js      # Inventory model
│   └── PurchaseEntry.js  # Purchase entry model
├── controllers/
│   ├── machineController.js
│   ├── productionController.js
│   ├── inventoryController.js
│   └── purchaseController.js
├── routes/
│   ├── machineRoutes.js
│   ├── productionRoutes.js
│   ├── inventoryRoutes.js
│   └── purchaseRoutes.js
├── .env                   # Environment variables
└── package.json
```

## 🧪 Testing

You can test the API using tools like:

- Postman
- Insomnia
- curl
- Thunder Client (VS Code extension)

### Example API Calls

**Create a Machine:**

```bash
curl -X POST http://localhost:5000/api/machines \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sewing Machine 1",
    "type": "Industrial",
    "operatorName": "John Doe",
    "capacityPerDay": 100,
    "workingHours": 8
  }'
```

**Get All Machines:**

```bash
curl http://localhost:5000/api/machines
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions, please contact the development team or create an issue in the repository.



