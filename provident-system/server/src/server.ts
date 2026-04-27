import connectDB from './config/db';

import express from 'express';
import cors from 'cors'; // Frontend can talk to backend
connectDB();
const app = express();
const PORT = 5000;
// Tempotary storage
const applications: any[] = [];
// Middlewares
app.use(cors());
app.use(express.json()); // Parse incoming JSON data or Converts JSON string to object again.

// API
app.post('/applications', (req, res) => {
	applications.push(req.body);
	console.log('Applications saved', applications);

	res.json({
		message: 'Applications saved successfully!',
		application: applications,
	});
});
// API
app.get('/applications', (req, res) => {
	res.json(applications);
});

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}/applications`);
});
