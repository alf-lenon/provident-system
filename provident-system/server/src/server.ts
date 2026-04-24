import express, { application } from 'express';
import cors from 'cors'; // Frontend can talk to backend

const app = express();
const PORT = 5000;
// Tempotary storage

// Middlewares
app.use(cors());
app.use(express.json()); // Parse incoming JSON data or Converts JSON string to object again.

app.post('/applications', (req, res) => {
	console.log('Applications Received');
	console.log(req.body);

	res.json('I got it man! Thanks!');
});

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
