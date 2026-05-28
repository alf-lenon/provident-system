import path from 'path';
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

// Match term format to excel files
// Convert term to years to match the excel format.
const termToYears = (term: string) => {
	const months = parseInt(term);

	if (!months || Number.isNaN(months)) return term;

	const years = months / 12;

	return years === 1 ? '1 Year' : `${years} Years`;
};

// Convert term to months to match the excel format.
const termToMonths = (term: string) => {
	const months = parseInt(term);

	if (!months || Number.isNaN(months)) return term;

	return `${months}`;
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

			const newApplications: any[] = [];
			const skippedDuplicates: any[] = [];

			for (const application of importedApplications) {
				const existingApplication = await ApplicationModel.findOne({
					'borrower.fullName': application.borrower.fullName,
					'borrower.employeeNumber': application.borrower.employeeNumber,
					'borrower.lafNumber': application.borrower.lafNumber,
				});

				if (existingApplication) {
					skippedDuplicates.push(application);
					continue;
				}

				newApplications.push(application);
			}

			const savedApplications =
				newApplications.length > 0
					? await ApplicationModel.insertMany(newApplications)
					: [];

			res.json({
				message: 'Monitoring records import completed',
				totalRead: importedApplications.length,
				totalImported: savedApplications.length,
				totalSkippedDuplicates: skippedDuplicates.length,
			});
		} catch (error: any) {
			res.status(500).json({
				message: 'Error importing monitoring records',
				error: error.message,
			});
		}
	},
);

app.post('/applications/export/monitoring/bulk', async (req, res) => {
	try {
		const { ids } = req.body;

		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return res.status(400).json({
				message: 'No application IDs provided',
			});
		}

		const applications = await ApplicationModel.find({
			_id: { $in: ids },
		});

		if (applications.length === 0) {
			return res.status(404).json({
				message: 'No applications found',
			});
		}

		const workbook = new ExcelJS.Workbook();

		const templatePath = path.join(
			process.cwd(),
			'templates',
			'provident-monitoring-template.xlsx',
		);

		await workbook.xlsx.readFile(templatePath);

		const worksheet = workbook.worksheets[0];

		applications.forEach((application) => {
			const borrower = application.borrower!;
			const coMaker = application.coMaker!;
			const loan = application.loan!;
			const evaluation = application.evaluation!;

			worksheet.addRow([
				new Date(),
				loan.loanType,
				termToYears(loan.term),
				borrower.position,
				borrower.code,
				borrower.employeeNumber,
				evaluation.finalLoanGranted,
				evaluation.netPayAfterDeduction,
				evaluation.existingDeduction,
				evaluation.newDeduction,
				evaluation.netPay,
				borrower.lafNumber,
				borrower.fullName,
				coMaker.name,
				coMaker.employeeNumber,
				coMaker.contactNumber,
				borrower.school,
				loan.loanAmount,
				evaluation.status,
				'',
				'',
				'',
				'',
				'',
				'',
				evaluation.remarks?.join(', ') || '',
			]);
		});

		const buffer = await workbook.xlsx.writeBuffer();

		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		);

		res.setHeader(
			'Content-Disposition',
			'attachment; filename="provident-monitoring-bulk-export.xlsx"',
		);

		res.send(buffer);
	} catch (error: any) {
		res.status(500).json({
			message: 'Error exporting selected monitoring records',
			error: error.message,
		});
	}
});

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

app.post(
	'/applications/import-sl/debug',
	upload.single('file'),
	async (req, res) => {
		try {
			if (!req.file) {
				return res.status(400).json({ message: 'No file uploaded' });
			}

			const workbook = new ExcelJS.Workbook();
			await workbook.xlsx.readFile(req.file.path);

			const worksheet = workbook.worksheets[0];

			if (!worksheet) {
				return res.status(400).json({ message: 'No worksheet found' });
			}

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
		} catch (error: any) {
			console.error('SL debug error:', error);

			res.status(500).json({
				message: 'Error reading SL file',
				error: error.message,
			});
		}
	},
);

// Get saved data
app.get('/applications', async (req, res) => {
	const applications = await ApplicationModel.find();

	res.json(applications);
});

// Get all saved applications from MongoDB
// find() = SELECT all data from database

app.get('/applications/:id/export/monitoring', async (req, res) => {
	try {
		const { id } = req.params;

		const application = await ApplicationModel.findById(id);

		if (!application) {
			return res.status(404).json({
				message: 'Application not found',
			});
		}

		const borrower = application.borrower!;
		const coMaker = application.coMaker!;
		const loan = application.loan!;
		const evaluation = application.evaluation!;

		const workbook = new ExcelJS.Workbook();

		const templatePath = path.join(
			process.cwd(),
			'templates',
			'provident-monitoring-template.xlsx',
		);

		await workbook.xlsx.readFile(templatePath);

		const worksheet = workbook.worksheets[0];

		const newRow = worksheet.addRow([
			new Date(),
			loan.loanType,
			loan.term,
			borrower.position,
			borrower.code,
			borrower.employeeNumber,
			evaluation.finalLoanGranted,
			evaluation.netPayAfterDeduction,
			evaluation.existingDeduction,
			evaluation.newDeduction,
			evaluation.netPay,
			borrower.lafNumber,
			borrower.fullName,
			coMaker.name,
			coMaker.employeeNumber,
			coMaker.contactNumber,
			borrower.school,
			loan.loanAmount,
			evaluation.status,
			'',
			'',
			'',
			'',
			'',
			'',
			evaluation.remarks?.join(', ') || '',
		]);

		newRow.commit();

		const safeFileName = borrower.fullName.replace(/[^a-z0-9]/gi, '_');

		const buffer = await workbook.xlsx.writeBuffer();

		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		);

		res.setHeader(
			'Content-Disposition',
			`attachment; filename="provident-monitoring-${safeFileName}.xlsx"`,
		);

		res.send(buffer);
	} catch (error: any) {
		res.status(500).json({
			message: 'Error exporting monitoring file',
			error: error.message,
		});
	}
});

app.get('/debug/sl-template', async (req, res) => {
	try {
		const workbook = new ExcelJS.Workbook();

		const templatePath = path.join(
			process.cwd(),
			'templates',
			'sl-template-may-2026.xlsx',
		);

		await workbook.xlsx.readFile(templatePath);

		const worksheet = workbook.worksheets[0];

		const preview: any[] = [];

		for (let rowNumber = 1; rowNumber <= 10; rowNumber++) {
			const row = worksheet.getRow(rowNumber);

			const cells: any[] = [];

			for (let colNumber = 1; colNumber <= 30; colNumber++) {
				cells.push({
					colNumber,
					value: row.getCell(colNumber).text,
				});
			}

			preview.push({
				rowNumber,
				cells,
			});
		}

		res.json(preview);
	} catch (error: any) {
		res.status(500).json({
			message: 'Error reading SL template',
			error: error.message,
		});
	}
});

// Export SL File
app.get('/applications/:id/export/sl', async (req, res) => {
	try {
		const { id } = req.params;

		const application = await ApplicationModel.findById(id);

		if (!application) {
			return res.status(404).json({
				message: 'Application not found',
			});
		}

		const borrower = application.borrower!;
		const coMaker = application.coMaker!;
		const loan = application.loan!;
		const evaluation = application.evaluation!;

		const workbook = new ExcelJS.Workbook();

		const templatePath = path.join(
			process.cwd(),
			'templates',
			'sl-template-may-2026.xlsx',
		);

		await workbook.xlsx.readFile(templatePath);

		const worksheet = workbook.worksheets[0];

		const currentDate = new Date();
		const month = String(currentDate.getMonth() + 1).padStart(2, '0');
		const year = currentDate.getFullYear();

		const refNumber = `${year}-${month}-${borrower.lafNumber}`;

		const newRow = worksheet.addRow([], 'i');

		newRow.getCell('B').value = loan.loanType.toUpperCase();
		newRow.getCell('C').value = '';
		newRow.getCell('D').value = refNumber;
		newRow.getCell('E').value = borrower.fullName;
		newRow.getCell('F').value = '';
		newRow.getCell('G').value = '';
		newRow.getCell('H').value = Number(loan.loanAmount);
		newRow.getCell('I').value = evaluation.existingBalance || '';
		newRow.getCell('J').value = evaluation.finalLoanGranted || 0;
		newRow.getCell('K').value = '';
		newRow.getCell('L').value = '';

		newRow.getCell('Q').value = borrower.code;
		newRow.getCell('R').value = borrower.employeeNumber;
		newRow.getCell('S').value = termToMonths(loan.term);
		newRow.getCell('T').value = evaluation.newDeduction;
		newRow.getCell('U').value = borrower.position;
		newRow.getCell('V').value = borrower.lafNumber;
		newRow.getCell('W').value = borrower.school;
		newRow.getCell('X').value = coMaker.name;
		newRow.getCell('Y').value = coMaker.employeeNumber;
		newRow.getCell('Z').value = loan.loanType;
		newRow.getCell('AA').value = application.soa?.checkNumber || '';
		newRow.getCell('AB').value = application.soa?.lastMonth || '';
		newRow.getCell('AC').value = loan.accountNumber;

		newRow.commit();

		const safeFileName = borrower.fullName.replace(/[^a-z0-9]/gi, '_');

		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		);

		res.setHeader(
			'Content-Disposition',
			`attachment; filename="sl-${safeFileName}.xlsx"`,
		);

		await workbook.xlsx.write(res);
		res.end();
	} catch (error: any) {
		res.status(500).json({
			message: 'Error exporting SL file',
			error: error.message,
		});
	}
});

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
