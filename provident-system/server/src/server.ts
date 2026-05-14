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
		const finalLoanGranted = isRenewal
			? requestedLoanAmount - existingBalance
			: requestedLoanAmount;

		// Renewal Loan Type Principal Paid must be at least 30% rule
		const isThirtyPercentPaidValid = !isRenewal || percentPrincipalPaid >= 30;

		// Net Pay After Deduction
		const netPayAfterDeduction = isRenewal
			? netPay - newDeduction + existingDeduction
			: netPay - newDeduction;

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
		const isCoMakerValid = hasSalaryInputs
			? coMakerGrade > borrowerGrade ||
				(coMakerGrade === borrowerGrade && coMakerStep >= borrowerStep)
			: true;

		// UNDE Loan Validation
		const isUndeValid = !formData.flags.hasUndeLoan;

		// Correction Reasons
		const correctionReasons: string[] = [];

		// Check fields one by one
		if (!formData.borrower.fullName) {
			correctionReasons.push("Missing Borrower's Full Name");
		}

		if (!formData.borrower.code) {
			correctionReasons.push("Missing Borrower's code/sta");
		}

		if (!formData.borrower.lafNumber) {
			correctionReasons.push("Missing Borrower's LAF No.");
		}

		if (!formData.coMaker.name) {
			correctionReasons.push("Missing Co-Maker's Full Name");
		}

		if (!formData.loan.loanAmount) {
			correctionReasons.push('Missing Loan Amount');
		}

		if (!formData.loan.accountNumber) {
			correctionReasons.push('Missing Account Number');
		}

		if (!formData.borrower.employeeNumber) {
			correctionReasons.push("Missing Borrower's Employee Number");
		}

		if (!formData.coMaker.employeeNumber) {
			correctionReasons.push("Missing Co-Maker's Employee Number");
		}

		if (!formData.loan.loanType) {
			correctionReasons.push('Missing Loan Type');
		}

		if (!formData.checklist.soa && formData.loan.loanType === 'Renewal') {
			correctionReasons.push('SOA is required for renewal');
		}

		if (!formData.checklist.payslipReadable) {
			correctionReasons.push('Payslip is not readable');
		}

		if (!formData.checklist.authorizationFormComplete) {
			correctionReasons.push('Authorization form is not complete');
		}

		if (!formData.checklist.payslipOriginal) {
			correctionReasons.push('Payslip of borrower is not original');
		}

		if (!formData.checklist.supportingDocuments) {
			correctionReasons.push('Missing or insufficient supporting documents');
		}

		if (!formData.checklist.photocopyOfId) {
			correctionReasons.push('Missing Photocopy of ID');
		}

		if (!formData.checklist.photocopyOfAtm) {
			correctionReasons.push('Missing Photocopy of ATM');
		}

		if (!formData.checklist.accountNumberVerified) {
			correctionReasons.push('Account number is not verified');
		}

		if (!formData.loan.term) {
			correctionReasons.push('Missing Term');
		}

		if (!formData.loan.purpose) {
			correctionReasons.push('Missing Loan Purpose');
		}

		if (isRenewal && (finalLoanGranted ?? 0) <= 0) {
			correctionReasons.push(
				'Requested amount is too low after deducting existing balance. Consider increasing loan amount.',
			);
		}

		if (!formData.checklist.loanApplicationForm) {
			correctionReasons.push('Missing Loan Application Form');
		}

		if (!formData.checklist.authorizationSalaryDeduction) {
			correctionReasons.push(
				'Authorization for Salary Deduction fields are empty',
			);
		}

		if (!formData.checklist.latestPayslip) {
			correctionReasons.push('Payslip is not latest');
		}

		if (!formData.checklist.approvedAppointment) {
			correctionReasons.push('Appointment is not approved');
		}

		if (!formData.checklist.coMakerDocuments) {
			correctionReasons.push('Missing Co-maker documents');
		}

		const hasCorrections = correctionReasons.length > 0;

		// Reject only if value exist
		const isRejected =
			!isCoMakerValid ||
			!isNPADValid ||
			!isUndeValid ||
			!isThirtyPercentPaidValid;

		let status = 'Pending';

		// Status logic
		if (isRejected) {
			status = 'Rejected';
		} else if (hasCorrections) {
			status = 'Needs Correction';
		} else {
			status = 'Ready for Processing';
		}

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
