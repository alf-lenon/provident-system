import mongoose from 'mongoose';

// Define the structure of data
const applicationSchema = new mongoose.Schema(
	{
		borrower: {
			fullName: { type: String, required: true },
			employeeNumber: String,
			school: String,
			position: String,
			salaryGrade: String,
			salaryStep: String,
		},

		coMaker: {
			name: String,
			employeeNumber: String,
			contactNumber: String,
			salaryGrade: String,
			salaryStep: String,
		},

		loan: {
			loanAmount: { type: String, required: true },
			loanType: { type: String, required: true },
			accountNumber: { type: String, required: true },
			term: { type: String, required: true },
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
