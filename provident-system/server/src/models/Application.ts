import mongoose from 'mongoose';

// Define the structure of data
const applicationSchema = new mongoose.Schema(
	{
		borrower: {
			fullName: { type: String, required: [true, 'Full name is required'] },
			employeeNumber: { type: String, required: true },
			school: { type: String, required: true },
			position: { type: String, required: true },
			code: { type: String, required: true },
			lafNumber: { type: String, required: true },
			salaryGrade: { type: String, required: true },
			salaryStep: { type: String, required: true },
		},

		coMaker: {
			name: { type: String, required: [true, 'Full name is required'] },
			employeeNumber: { type: String, required: true },
			contactNumber: { type: String, required: true },
			salaryGrade: { type: String, required: true },
			salaryStep: { type: String, required: true },
		},

		loan: {
			loanAmount: { type: String, required: [true, 'Loan amount is required'] },
			loanType: { type: String, required: [true, 'Loan type is required'] },
			accountNumber: {
				type: String,
				required: [true, 'Account number is required'],
			},
			term: { type: String, required: [true, 'Term is required'] },
			purpose: { type: String, required: true },
		},

		flags: {
			hasUndeLoan: Boolean,
		},

		checklist: {
			soa: Boolean,
			payslipReadable: Boolean,
			payslipOriginal: Boolean,
			authorizationFormComplete: Boolean,
			supportingDocuments: Boolean,
			photocopyOfId: Boolean,
			photocopyOfAtm: Boolean,
			accountNumberVerified: Boolean,
			loanApplicationForm: Boolean,
			authorizationSalaryDeduction: Boolean,
			latestPayslip: Boolean,
			approvedAppointment: Boolean,
			coMakerDocuments: Boolean,
		},

		evaluation: {
			netPay: {
				type: Number,
				required: true,
				min: [0, 'Net pay must be higher than 5,000'],
			},
			newDeduction: { type: Number, required: true },

			existingDeduction: Number,
			existingBalance: Number,
			percentPrincipalPaid: Number,

			netPayAfterDeduction: Number,
			isNPADValid: Boolean,
			isThirtyPercentPaidValid: Boolean,
			finalLoanGranted: Number,

			hasSalaryInputs: Boolean,
			isCoMakerValid: Boolean,
			isUndeValid: Boolean,
			status: String,
			remarks: [String], // array of reasons
			rejectionReasons: [String],
		},
	},
	{
		timestamps: true,
	},
);

// Model interacts with MongoDB
const ApplicationModel = mongoose.model('Application', applicationSchema);

export default ApplicationModel;
