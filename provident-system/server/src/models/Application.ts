import mongoose from 'mongoose';

// Define the structure of data
const applicationSchema = new mongoose.Schema(
	{
		borrower: {
			fullName: { type: String, required: [true, 'Full name is required'] },
			employeeNumber: { type: String, required: true },
			school: { type: String, required: true },
			position: { type: String, required: true },
			salaryGrade: String,
			salaryStep: String,
		},

		coMaker: {
			name: { type: String, required: [true, 'Full name is required'] },
			employeeNumber: { type: String, required: true },
			contactNumber: { type: String, required: true },
			salaryGrade: String,
			salaryStep: String,
		},

		loan: {
			loanAmount: { type: String, required: [true, 'Loan amount is required'] },
			loanType: { type: String, required: [true, 'Loan type is required'] },
			accountNumber: {
				type: String,
				required: [true, 'Account number is required'],
			},
			term: { type: String, required: [true, 'Term is required'] },
			purpose: String,
		},

		checklist: {
			soaRequired: Boolean,
			payslipReadable: Boolean,
			authorizationComplete: Boolean,
		},

		evaluation: {
			npad: Number,
			unde: Number,
			status: String,
			remarks: [String], // array of reasons
		},
	},
	{
		timestamps: true,
	},
);

// Model interacts with MongoDB
const ApplicationModel = mongoose.model('Application', applicationSchema);

export default ApplicationModel;
