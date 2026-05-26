import multer from 'multer';
import ExcelJS from 'exceljs';

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

const upload = multer({ dest: 'uploads/' });

// Helper function
const processApplicationData = (formData: any) => {
	const netPay = Number(formData.evaluation.netPay);
	const newDeduction = Number(formData.evaluation.newDeduction);
	const existingDeduction = Number(formData.evaluation.existingDeduction || 0);
	const existingBalance = Number(formData.evaluation.existingBalance || 0);
	const percentPrincipalPaid = Number(
		formData.evaluation.percentPrincipalPaid || 0,
	);

	const requestedLoanAmount = Number(formData.loan.loanAmount);
	const isRenewal = formData.loan.loanType === 'Renewal';

	const finalLoanGranted = computeFinalLoanGranted(
		requestedLoanAmount,
		existingBalance,
		isRenewal,
	);

	const isThirtyPercentPaidValid = !isRenewal || percentPrincipalPaid >= 30;

	const netPayAfterDeduction = computeNPAD(
		netPay,
		newDeduction,
		existingDeduction,
		isRenewal,
	);

	const isNPADValid = netPayAfterDeduction >= 5000;

	const borrowerGrade = Number(formData.borrower.salaryGrade);
	const borrowerStep = Number(formData.borrower.salaryStep);
	const coMakerGrade = Number(formData.coMaker.salaryGrade);
	const coMakerStep = Number(formData.coMaker.salaryStep);

	const hasSalaryInputs = Boolean(
		formData.borrower.salaryGrade &&
		formData.borrower.salaryStep &&
		formData.coMaker.salaryGrade &&
		formData.coMaker.salaryStep,
	);

	const isCoMakerValid = validateCoMaker(
		coMakerGrade,
		borrowerGrade,
		coMakerStep,
		borrowerStep,
		hasSalaryInputs,
	);

	const isUndeValid = !formData.flags.hasUndeLoan;

	const correctionReasons = generateCorrectionReasons(
		formData,
		isRenewal,
		finalLoanGranted,
	);

	const rejectionReasons = generateRejectionReasons(
		isCoMakerValid,
		isNPADValid,
		isUndeValid,
		isThirtyPercentPaidValid,
	);

	const hasCorrections = correctionReasons.length > 0;
	const isRejected = rejectionReasons.length > 0;

	const status = computeStatus(isRejected, hasCorrections);

	return {
		...formData,
		evaluation: {
			...formData.evaluation,
			netPay,
			newDeduction,
			existingDeduction,
			existingBalance,
			percentPrincipalPaid,
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
	};
};

// Save into database or Create new data
app.post('/applications', async (req, res) => {
	try {
		const formData = req.body;

		//  Save everything
		const processedData = processApplicationData(formData);

		const newApplication = await ApplicationModel.create(processedData);

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

// Excel Monitoring import preview
app.post(
	'/applications/import-monitoring/preview',
	upload.single('file'),
	async (req, res) => {
		try {
			if (!req.file) {
				return res.status(400).json({ message: 'No file uploaded' });
			}

			const workbook = new ExcelJS.Workbook();
			await workbook.xlsx.readFile(req.file.path);

			const worksheet = workbook.worksheets[0];

			const rows: any[] = [];

			worksheet.eachRow((row, rowNumber) => {
				if (rowNumber <= 1) return;

				const cleanValue = (value: string) => {
					if (!value || value === '#ERROR!') return '';
					return value.trim();
				};

				const borrowerName = cleanValue(row.getCell(13).text);
				const loanType = cleanValue(row.getCell(2).text);

				if (!borrowerName) return;

				rows.push({
					rowNumber,
					borrower: {
						fullName: borrowerName,
						position: cleanValue(row.getCell(4).text),
						employeeNumber: cleanValue(row.getCell(6).text),
						code: cleanValue(row.getCell(5).text),
						lafNumber: cleanValue(row.getCell(12).text),
						school: cleanValue(row.getCell(17).text),
					},
					coMaker: {
						name: cleanValue(row.getCell(14).text),
						employeeNumber: cleanValue(row.getCell(15).text),
						contactNumber: cleanValue(row.getCell(16).text),
					},
					loan: {
						loanType,
						term: cleanValue(row.getCell(3).text),
						loanAmount: cleanValue(row.getCell(18).text),
					},
					evaluation: {
						netPay: cleanValue(row.getCell(11).text),
						newDeduction: cleanValue(row.getCell(10).text),
						existingDeduction: cleanValue(row.getCell(9).text),
						netPayAfterDeduction: cleanValue(row.getCell(8).text),
						finalLoanGranted: cleanValue(row.getCell(7).text),
					},
					monitoring: {
						dateReceived: cleanValue(row.getCell(1).text),
						compliance: cleanValue(row.getCell(19).text),
						dateComplied: cleanValue(row.getCell(20).text),
						remarks: cleanValue(row.getCell(26).text),
					},
				});
			});

			res.json({
				message: 'Monitoring file preview generated',
				totalRows: rows.length,
				rows,
			});
		} catch (error: any) {
			res.status(500).json({
				message: 'Error reading monitoring file',
				error: error.message,
			});
		}
	},
);

// Save imported excel to MongoDB
app.post(
	'/applications/import-monitoring/save',
	upload.single('file'),
	async (req, res) => {
		try {
			if (!req.file) {
				return res.status(400).json({ message: 'No file uploaded' });
			}

			// Helper Function
			const cleanValue = (value: string) => {
				if (!value || value === '#ERROR!') return '';
				return value.trim();
			};

			const cleanNumber = (value: string) => {
				const cleaned = cleanValue(value).replace(/,/g, '');
				const numberValue = Number(cleaned);

				return Number.isNaN(numberValue) ? 0 : numberValue;
			};

			const workbook = new ExcelJS.Workbook();
			await workbook.xlsx.readFile(req.file.path);

			const worksheet = workbook.worksheets[0];

			const importedApplications: any[] = [];

			worksheet.eachRow((row, rowNumber) => {
				if (rowNumber <= 1) return;

				const borrowerName = cleanValue(row.getCell(13).text);
				const loanType = cleanValue(row.getCell(2).text);

				if (!borrowerName) return;

				importedApplications.push({
					borrower: {
						fullName: borrowerName,
						employeeNumber: cleanValue(row.getCell(6).text) || 'N/A',
						school: cleanValue(row.getCell(17).text) || 'N/A',
						position: cleanValue(row.getCell(4).text) || 'N/A',
						code: cleanValue(row.getCell(5).text) || 'N/A',
						lafNumber: cleanValue(row.getCell(12).text) || 'N/A',
						salaryGrade: 'N/A',
						salaryStep: 'N/A',
					},

					coMaker: {
						name: cleanValue(row.getCell(14).text) || 'N/A',
						employeeNumber: cleanValue(row.getCell(15).text) || 'N/A',
						contactNumber: cleanValue(row.getCell(16).text) || 'N/A',
						salaryGrade: 'N/A',
						salaryStep: 'N/A',
					},

					loan: {
						loanAmount: String(cleanNumber(row.getCell(18).text)),
						loanType: loanType || 'N/A',
						accountNumber: 'N/A',
						term: cleanValue(row.getCell(3).text) || 'N/A',
						purpose: 'Imported from monitoring',
					},

					flags: {
						hasUndeLoan: false,
					},

					checklist: {
						soa: false,
						payslipReadable: false,
						payslipOriginal: false,
						authorizationFormComplete: false,
						supportingDocuments: false,
						photocopyOfId: false,
						photocopyOfAtm: false,
						accountNumberVerified: false,
						loanApplicationForm: false,
						authorizationSalaryDeduction: false,
						latestPayslip: false,
						approvedAppointment: false,
						coMakerDocuments: false,
					},

					evaluation: {
						netPay: cleanNumber(row.getCell(11).text),
						newDeduction: cleanNumber(row.getCell(10).text),
						existingDeduction: cleanNumber(row.getCell(9).text),
						existingBalance: 0,
						percentPrincipalPaid: 0,
						netPayAfterDeduction: cleanNumber(row.getCell(8).text),
						finalLoanGranted: cleanNumber(row.getCell(7).text),
						status: 'Imported',
						remarks: [cleanValue(row.getCell(26).text)].filter(Boolean),
						rejectionReasons: [],
					},

					processing: {
						status: 'Imported',
						released: false,
					},
				});
			});

			const savedApplications =
				await ApplicationModel.insertMany(importedApplications);

			res.json({
				message: 'Monitoring records imported successfully',
				totalImported: savedApplications.length,
			});
		} catch (error: any) {
			res.status(500).json({
				message: 'Error importing monitoring records',
				error: error.message,
			});
		}
	},
);

app.post(
	'/applications/import-monitoring/debug',
	upload.single('file'),
	async (req, res) => {
		if (!req.file) {
			return res.status(400).json({ message: 'No file uploaded' });
		}

		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.readFile(req.file.path);

		const worksheet = workbook.worksheets[0];

		const preview: any[] = [];

		worksheet.eachRow((row, rowNumber) => {
			if (rowNumber > 15) return;

			const cells: any[] = [];

			row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
				cells.push({
					colNumber,
					value: cell.text,
				});
			});

			preview.push({
				rowNumber,
				cells,
			});
		});

		res.json(preview);
	},
);

// Get saved data
app.get('/applications', async (req, res) => {
	const applications = await ApplicationModel.find();

	res.json(applications);
});

// Get all saved applications from MongoDB
// find() = SELECT all data from database

// Delete data from database
app.delete('/applications/:id', async (req, res) => {
	try {
		const { id } = req.params;

		const deletedApplication = await ApplicationModel.findByIdAndDelete(id);

		if (!deletedApplication) {
			return res.status(404).json({
				message: 'Application not found',
			});
		}

		res.json({
			message: 'Application deleted successfully',
			application: deletedApplication,
		});
	} catch (error: any) {
		res.status(400).json({
			message: 'Error deleting application',
			error: error.message,
		});
	}
});

// Update or edit one application using its MongoDB _id
app.put('/applications/:id', async (req, res) => {
	try {
		// Express automatically gives the req.params from '/applications/:id'
		// Get the id and save it into variable
		const { id } = req.params;

		const processedData = processApplicationData(req.body);

		// Find this application (id), then replace/update it with the new submitted data (processedData)
		const updatedApplication = await ApplicationModel.findByIdAndUpdate(
			id,
			processedData,
			{
				new: true, // Return the updated version, not the old version.
				runValidators: true, // Still follow our schema rules.
			},
		);

		if (!updatedApplication) {
			return res.status(404).json({
				message: 'Application not found',
			});
		}

		res.json({
			message: 'Application updated successfully',
			application: updatedApplication,
		});
	} catch (error: any) {
		res.status(400).json({
			message: 'Error updating application',
			error: error.message,
		});
	}
});

// Update application to 'processed'
app.put('/applications/:id/process', async (req, res) => {
	try {
		const { id } = req.params;

		const updatedApplication = await ApplicationModel.findByIdAndUpdate(
			id,
			{
				'processing.status': 'Processed',
				'processing.dateProcessed': new Date(),
			},
			{
				new: true,
				runValidators: true,
			},
		);

		if (!updatedApplication) {
			return res.status(404).json({
				message: 'Application not found',
			});
		}

		res.json({
			message: 'Application marked as processed',
			application: updatedApplication,
		});
	} catch (error: any) {
		res.status(400).json({
			message: 'Error marking application as processed',
			error: error.message,
		});
	}
});

// Update application to 'Released'
app.put('/applications/:id/release', async (req, res) => {
	try {
		const { id } = req.params;

		const updatedApplication = await ApplicationModel.findByIdAndUpdate(
			id,
			{
				'processing.released': true,
				'processing.dateReleased': new Date(),
			},
			{
				new: true,
				runValidators: true,
			},
		);

		if (!updatedApplication) {
			return res.status(404).json({
				message: 'Application not found',
			});
		}

		res.json({
			message: 'Application marked as released',
			application: updatedApplication,
		});
	} catch (error: any) {
		res.status(400).json({
			message: 'Error marking application as released',
			error: error.message,
		});
	}
});

//  Update application to 'Unprocess'
app.put('/applications/:id/unprocess', async (req, res) => {
	try {
		const { id } = req.params;

		const updatedApplication = await ApplicationModel.findByIdAndUpdate(
			id,
			{
				'processing.status': 'Pending',
				'processing.released': false,
				$unset: {
					'processing.dateProcessed': '',
					'processing.dateReleased': '',
				},
			},
			{ new: true },
		);

		if (!updatedApplication) {
			return res.status(404).json({ message: 'Application not found' });
		}

		res.json({
			message: 'Application moved back to pending',
			application: updatedApplication,
		});
	} catch (error: any) {
		res.status(400).json({
			message: 'Error undoing process action',
			error: error.message,
		});
	}
});

// Update application to 'Unrelease'
app.put('/applications/:id/unrelease', async (req, res) => {
	try {
		const { id } = req.params;

		const updatedApplication = await ApplicationModel.findByIdAndUpdate(
			id,
			{
				'processing.released': false,
				$unset: {
					'processing.dateReleased': '',
				},
			},
			{ new: true },
		);

		if (!updatedApplication) {
			return res.status(404).json({ message: 'Application not found' });
		}

		res.json({
			message: 'Application release undone',
			application: updatedApplication,
		});
	} catch (error: any) {
		res.status(400).json({
			message: 'Error undoing release action',
			error: error.message,
		});
	}
});

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}/applications`);
});
