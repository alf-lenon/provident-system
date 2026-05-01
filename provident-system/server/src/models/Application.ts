import mongoose from 'mongoose';

// Define the structure of data
const applicationSchema = new mongoose.Schema(
	{
		borrower: {
			fullName: { type: String, required: true },
		},

		loan: {
			loanAmount: { type: String, required: true },
			loanType: { type: String, required: true },
		},
	},
	{
		timestamps: true, // createdAt || updatedAt
	},
);

// Model interacts with MongoDB
const ApplicationModel = mongoose.model('Application', applicationSchema);

export default ApplicationModel;
