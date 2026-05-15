import {
	computeNPAD,
	computeFinalLoanGranted,
	validateCoMaker,
	computeStatus,
	generateCorrectionReasons,
	generateRejectionReasons,
} from './utils/evaluation';

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

		// Evaluation fields
		const netPay = Number(formData.evaluation.netPay);
		const newDeduction = Number(formData.evaluation.newDeduction);
		const existingDeduction = Number(
			formData.evaluation.existingDeduction || 0,
		);
		const existingBalance = Number(formData.evaluation.existingBalance || 0);
		const percentPrincipalPaid = Number(
			formData.evaluation.percentPrincipalPaid || 0,
		);

		// Requested Loan Amount
		const requestedLoanAmount = Number(formData.loan.loanAmount);

		// If Loan type is Renewal
		const isRenewal = formData.loan.loanType === 'Renewal';

		// Final Loan Granted
		const finalLoanGranted = computeFinalLoanGranted(
			requestedLoanAmount,
			existingBalance,
			isRenewal,
		);

		// Renewal Loan Type Principal Paid must be at least 30% rule
		const isThirtyPercentPaidValid = !isRenewal || percentPrincipalPaid >= 30;

		// Net Pay After Deduction
		const netPayAfterDeduction = computeNPAD(
			netPay,
			newDeduction,
			existingDeduction,
			isRenewal,
		);

		// NPAD Validation
		const isNPADValid = netPayAfterDeduction >= 5000;

		// Borrower Informations
		const borrowerGrade = Number(formData.borrower.salaryGrade);
		const borrowerStep = Number(formData.borrower.salaryStep);

		// Co maker Informations
		const coMakerGrade = Number(formData.coMaker.salaryGrade);
		const coMakerStep = Number(formData.coMaker.salaryStep);

		const hasSalaryInputs = Boolean(
			formData.borrower.salaryGrade &&
			formData.borrower.salaryStep &&
			formData.coMaker.salaryGrade &&
			formData.coMaker.salaryStep,
		);

		// Co maker validation
		const isCoMakerValid = validateCoMaker(
			coMakerGrade,
			borrowerGrade,
			coMakerStep,
			borrowerStep,
			hasSalaryInputs,
		);

		// UNDE Loan Validation
		const isUndeValid = !formData.flags.hasUndeLoan;

		// Correction Reasons
		const correctionReasons = generateCorrectionReasons(
			formData,
			isRenewal,
			finalLoanGranted,
		);
		const hasCorrections = correctionReasons.length > 0;

		const rejectionReasons = generateRejectionReasons(
			isCoMakerValid,
			isNPADValid,
			isUndeValid,
			isThirtyPercentPaidValid,
		);

		const isRejected = rejectionReasons.length > 0;

		// Compute status
		const status = computeStatus(isRejected, hasCorrections);

		// Take the data from frontend and save it to MongoDB
		// create() = INSERT data into database

		//  Save everything
		const newApplication = await ApplicationModel.create({
			...formData,
			evaluation: {
				...formData.evaluation,
				netPayAfterDeduction,
				isNPADValid,
				isThirtyPercentPaidValid,
				finalLoanGranted,
				hasSalaryInputs,
				isCoMakerValid,
				isUndeValid,
				status,
				remarks: correctionReasons,
				rejectionReasons,
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
