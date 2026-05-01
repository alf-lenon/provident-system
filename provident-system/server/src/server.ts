import ApplicationModel from './models/Application';
import connectDB from './config/db';

import express from 'express';
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
	try {
		const formData = req.body;

		// Convert values to numbers for NPAD computation
		const netPay = Number(formData.evaluation.netPay);
		const newDeduction = Number(formData.evaluation.newDeduction);
		const existingDeduction = Number(
			formData.evaluation.existingDeduction || 0,
		);

		const percentPrincipalPaid = Number(
			formData.evaluation.percentPrincipalPaid || 0,
		);

		const loanType = formData.loan.loanType;

		//  30% rule
		if (loanType === 'Renewal' && percentPrincipalPaid < 0.3) {
			return res.status(400).json({
				message: 'Renewal not allowed: less than 30% principal paid',
			});
		}

		//  NPAD
		let npad =
			loanType === 'Renewal'
				? netPay - newDeduction + existingDeduction
				: netPay - newDeduction;

		//  Status
		let status = npad < 5000 ? 'Rejected' : 'Approved';

		// Loan amount must be positive
		if (Number(formData.loan.loanAmount) <= 0) {
			return res.status(400).json({
				message: 'Loan amount must be greater than 0',
			});
		}

		// Take the data from frontend and save it to MongoDB
		// create() = INSERT data into database

		//  Save everything
		const newApplication = await ApplicationModel.create({
			...formData,
			evaluation: {
				...formData.evaluation,
				npad,
				status,
			},
		});

		res.json({
			message: 'Application processed and saved',
			application: newApplication,
		});
	} catch (error: any) {
		res.status(400).json({
			message: 'Error processing application',
			error: error.message,
		});
	}
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
