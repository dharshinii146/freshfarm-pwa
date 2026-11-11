FreshFarm Direct - MERN development setup

REQUIREMENTS
 - Node.js 20 or newer and npm.
 - For persistent data, a MongoDB connection string (local MongoDB or MongoDB Atlas).

RUN LOCALLY
 1. Open this folder in VS Code and run: npm install
 2. Run: npm run dev
 3. Open http://localhost:5173

When MONGODB_URI is not set, development starts an ephemeral MongoDB automatically.
Its data resets when the API process stops. For persistent data, copy .env.example to .env
and set MONGODB_URI to your MongoDB connection string and JWT_SECRET to a long random value.

DEMO LOGINS
 - Farmer: 9000000001 / 1234
 - FPO officer: fpo / admin123
 - Pending farmer for FPO approval tests: 9000000002 / 1234

BUILD AND RUN
 - npm run build creates the React production build in client/dist.
 - Set MONGODB_URI and JWT_SECRET, set NODE_ENV=production, then run npm start.

The React/Vite client is in client/ and the Express/Mongoose API is in server/.
The original standalone PWA HTML files are kept in this folder as a reference.
