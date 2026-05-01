import ApplicationModel from './models/Application';
import connectDB from './config/db';

import express, { application } from 'express';
import cors from 'cors'; // Frontend can talk to backend
connectDB();
const app = express();
const PORT = 5000;
// Tempotary storage

// Middlewares
app.use(cors());
app.use(express.json()); // Parse incoming JSON data or Converts JSON string to object again.

// Save into database
app.post('/applications', async (req, res) => {
	// Take the data from frontend and save it to MongoDB
	// create() = INSERT data into database
	const newApplication = await ApplicationModel.create(req.body);

	res.json({
		message: 'Application saved to database',
		application: newApplication,
	});
});

// Get saved data
app.get('/applications', async (req, res) => {
	const applications = await ApplicationModel.find();

	res.json(applications);
});

// Get all saved applications from MongoDB
// find() = SELECT all data from database

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}/applications`);
});
