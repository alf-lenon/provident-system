import archiver from 'archiver';
import fs from 'fs';
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

// Format name for DV (file 3)
const formatNameForSheet = (fullName: string) => {
	if (fullName.includes(',')) {
		return fullName.toUpperCase();
	}

	const parts = fullName.trim().split(' ');
	const lastName = parts[parts.length - 1];
	const firstAndMiddle = parts.slice(0, -1).join(' ');

	return `${lastName}, ${firstAndMiddle}`.toUpperCase();
};

const formatNameForPayee = (fullName: string) => {
	if (fullName.includes(',')) {
		const [lastName, firstAndMiddle] = fullName.split(',');

		return `${firstAndMiddle.trim()} ${lastName.trim()}`.toUpperCase();
	}

	return fullName.toUpperCase();
};

const isRefundRecord = (application: any) => {
	return application.loan?.loanType === 'Refund';
};

const applyMonitoringRowStyle = (row: ExcelJS.Row) => {
	row.eachCell({ includeEmpty: true }, (cell) => {
		cell.font = { name: 'Arial', size: 10 };
		cell.alignment = {
			vertical: 'middle',
			horizontal: 'center',
			wrapText: true,
		};
		cell.border = {
			top: { style: 'thin' },
			left: { style: 'thin' },
			bottom: { style: 'thin' },
			right: { style: 'thin' },
		};
	});

	['M', 'N', 'Q'].forEach((col) => {
		row.getCell(col).alignment = {
			vertical: 'middle',
			horizontal: 'left',
			wrapText: true,
		};
	});

	['G', 'H', 'I', 'J', 'K', 'R'].forEach((col) => {
		row.getCell(col).numFmt = '#,##0.00';
	});

	row.getCell('L').numFmt = '@';
	row.height = 18;
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
			'uploads',
			'templates',
			'monitoring.xlsx',
		);

		if (!fs.existsSync(templatePath)) {
			return res.status(404).json({
				message: 'Monitoring template not uploaded yet',
			});
		}

		await workbook.xlsx.readFile(templatePath);

		const worksheet =
			workbook.getWorksheet('MONITORING') || workbook.worksheets[0];

		worksheet.autoFilter = undefined;

		applications.forEach((application) => {
			const borrower = application.borrower!;
			const coMaker = application.coMaker!;
			const loan = application.loan!;
			const evaluation = application.evaluation!;

			const nextRowNumber = worksheet.lastRow
				? worksheet.lastRow.number + 1
				: 2;
			const newRow = worksheet.getRow(nextRowNumber);

			const values = [
				new Date(),
				isRefundRecord(application) ? 'Refund' : loan.loanType,
				isRefundRecord(application) ? '' : termToYears(loan.term),
				borrower.position,
				borrower.code,
				borrower.employeeNumber,
				Number(evaluation.finalLoanGranted || 0),
				evaluation.netPayAfterDeduction,
				evaluation.existingDeduction,
				evaluation.newDeduction,
				evaluation.netPay,
				Number(borrower.lafNumber),
				borrower.fullName,
				coMaker.name,
				coMaker.employeeNumber,
				coMaker.contactNumber,
				borrower.school,
				Number(loan.loanAmount || 0),
				isRefundRecord(application) ? 'Refund' : evaluation.status,
				'',
				'',
				'',
				'',
				'',
				'',
				evaluation.remarks?.join(', ') || '',
			];

			values.forEach((value, index) => {
				newRow.getCell(index + 1).value = value;
			});

			/* const templateRow = worksheet.getRow(2902);

			templateRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
				newRow.getCell(colNumber).style = { ...cell.style };
			});

			newRow.getCell('L').style = {
				...templateRow.getCell('L').style,
			};

			newRow.getCell('R').style = {
				...templateRow.getCell('R').style,
			};

			newRow.height = templateRow.height; */
			applyMonitoringRowStyle(newRow);
			newRow.commit();
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

app.post('/applications/export/sl/bulk', async (req, res) => {
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
			'uploads',
			'templates',
			'sl.xlsx',
		);

		if (!fs.existsSync(templatePath)) {
			return res.status(404).json({
				message: 'SL template not uploaded yet',
			});
		}

		await workbook.xlsx.readFile(templatePath);

		const worksheet = workbook.worksheets[0];

		applications.forEach((application) => {
			const borrower = application.borrower!;
			const coMaker = application.coMaker!;
			const loan = application.loan!;
			const evaluation = application.evaluation!;

			const refNumber = application.documentNumbers?.dvNumber || '';

			const newRow = worksheet.addRow([], 'i');

			const templateRow = worksheet.getRow(18); // CRUZ, MARGIE S. row

			templateRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
				newRow.getCell(colNumber).style = { ...cell.style };
			});

			newRow.getCell('B').value = isRefundRecord(application)
				? 'REFUND'
				: loan.loanType.toUpperCase();

			newRow.getCell('C').value = '';
			newRow.getCell('D').value = refNumber;
			newRow.getCell('E').value = borrower.fullName;
			newRow.getCell('F').value = isRefundRecord(application) ? 'Refund' : '';
			newRow.getCell('G').value = null;
			newRow.getCell('H').value = Number(loan.loanAmount || 0);
			newRow.getCell('I').value = Number(evaluation.existingBalance || 0);
			newRow.getCell('J').value = Number(evaluation.finalLoanGranted || 0);

			newRow.getCell('K').value = {
				formula: `N(K${newRow.number - 1})+N(G${newRow.number})-N(J${newRow.number})`,
				result: 0,
			};
			newRow.getCell('Q').value = borrower.code;
			newRow.getCell('R').value = borrower.employeeNumber;
			newRow.getCell('S').value = termToMonths(loan.term);
			newRow.getCell('T').value = evaluation.newDeduction;
			newRow.getCell('U').value = borrower.position;
			newRow.getCell('V').value = borrower.lafNumber;
			newRow.getCell('W').value = borrower.school;
			newRow.getCell('X').value = coMaker.name;
			newRow.getCell('Y').value = coMaker.employeeNumber;
			newRow.getCell('Z').value = isRefundRecord(application)
				? 'Refund'
				: loan.loanType;
			newRow.getCell('AA').value = application.soa?.checkNumber || '';
			newRow.getCell('AB').value = application.soa?.lastMonth || '';
			newRow.getCell('AC').value = loan.accountNumber;

			newRow.commit();
		});

		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		);

		res.setHeader(
			'Content-Disposition',
			'attachment; filename="sl-bulk-export.xlsx"',
		);

		await workbook.xlsx.write(res);
		res.end();
	} catch (error: any) {
		res.status(500).json({
			message: 'Error exporting selected SL records',
			error: error.message,
		});
	}
});

app.post('/applications/export/dv/bulk', async (req, res) => {
	try {
		const { ids } = req.body;

		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return res.status(400).json({ message: 'No application IDs provided' });
		}

		const applications = await ApplicationModel.find({
			_id: { $in: ids },
		});

		if (applications.length === 0) {
			return res.status(404).json({ message: 'No applications found' });
		}

		const templatePath = path.join(
			process.cwd(),
			'uploads',
			'templates',
			'dv.xlsx',
		);

		if (!fs.existsSync(templatePath)) {
			return res.status(404).json({
				message: 'DV template not uploaded yet',
			});
		}

		res.setHeader('Content-Type', 'application/zip');
		res.setHeader(
			'Content-Disposition',
			'attachment; filename="dv-selected.zip"',
		);

		const archive = archiver('zip', {
			zlib: { level: 9 },
		});

		archive.pipe(res);

		for (const application of applications) {
			const borrower = application.borrower!;
			const loan = application.loan!;
			const evaluation = application.evaluation!;

			const workbook = new ExcelJS.Workbook();

			await workbook.xlsx.readFile(templatePath);

			const worksheet = workbook.getWorksheet('TEMPLATE');

			if (!worksheet) {
				continue;
			}

			worksheet.name = formatNameForSheet(borrower.fullName).slice(0, 31);

			worksheet.getCell('AD6').value =
				application.documentNumbers?.dvNumber || '';

			worksheet.getCell('E11').value = formatNameForPayee(borrower.fullName);

			worksheet.getCell('E13').value = borrower.school;
			worksheet.getCell('K17').value = borrower.position;
			worksheet.getCell('L17').value = borrower.lafNumber;
			worksheet.getCell('H23').value = Number(loan.loanAmount || 0);
			worksheet.getCell('H24').value = Number(evaluation.existingBalance || 0);
			worksheet.getCell('H25').value = Number(evaluation.finalLoanGranted || 0);
			worksheet.getCell('AE36').value = Number(
				evaluation.finalLoanGranted || 0,
			);

			workbook.worksheets.forEach((sheet) => {
				if (sheet.name === 'TEMPLATE') {
					workbook.removeWorksheet(sheet.id);
				}
			});

			const buffer = await workbook.xlsx.writeBuffer();

			const safeFileName = formatNameForSheet(borrower.fullName).replace(
				/[^a-z0-9_-]/gi,
				'_',
			);

			archive.append(Buffer.from(buffer), {
				name: `dv-${safeFileName}.xlsx`,
			});
		}

		await archive.finalize();
	} catch (error: any) {
		res.status(500).json({
			message: 'Error exporting selected DV records',
			error: error.message,
		});
	}
});

app.post('/applications/export/payroll/bulk', async (req, res) => {
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
			'uploads',
			'templates',
			'payroll.xlsx',
		);

		if (!fs.existsSync(templatePath)) {
			return res.status(404).json({
				message: 'Payroll template not uploaded yet',
			});
		}

		await workbook.xlsx.readFile(templatePath);
		console.log(
			'Payroll sheets:',
			workbook.worksheets.map((sheet) => sheet.name),
		);

		const worksheet = workbook.getWorksheet('TEMPLATE');

		if (!worksheet) {
			return res.status(404).json({
				message: 'TEMPLATE sheet not found',
			});
		}

		const firstDvNumber = applications[0].documentNumbers?.dvNumber || 'START';
		const lastDvNumber =
			applications[applications.length - 1].documentNumbers?.dvNumber || 'END';

		worksheet.name = `${firstDvNumber} TO ${lastDvNumber}`.slice(0, 31);

		const startRow = 14;

		applications.forEach((application, index) => {
			const borrower = application.borrower!;
			const loan = application.loan!;
			const evaluation = application.evaluation!;

			const rowNumber = startRow + index;
			const row = worksheet.getRow(rowNumber);

			row.getCell('A').value = index + 1;
			row.getCell('B').value = formatNameForSheet(borrower.fullName);
			row.getCell('C').value = application.documentNumbers?.dvNumber || '';
			row.getCell('D').value = borrower.employeeNumber;
			row.getCell('E').value = borrower.school;
			row.getCell('F').value = 'P';
			row.getCell('G').value = evaluation.finalLoanGranted || 0;
			row.getCell('H').value = index + 1;
			row.getCell('I').value = loan.accountNumber;

			row.commit();
		});

		const totalLoanGranted = applications.reduce((total, application) => {
			return total + Number(application.evaluation?.finalLoanGranted || 0);
		}, 0);

		let totalRowNumber = 31;

		worksheet.eachRow((row, rowNumber) => {
			if (String(row.getCell('A').value).trim().toUpperCase() === 'TOTAL') {
				totalRowNumber = rowNumber;
			}
		});

		worksheet.getCell(`G${totalRowNumber}`).value = totalLoanGranted;
		worksheet.getCell(`G${totalRowNumber}`).numFmt = '#,##0.00';

		const safeFileName = `${firstDvNumber}_TO_${lastDvNumber}`.replace(
			/[^a-z0-9_-]/gi,
			'_',
		);

		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		);

		res.setHeader(
			'Content-Disposition',
			`attachment; filename="payroll-${safeFileName}.xlsx"`,
		);

		await workbook.xlsx.write(res);
		res.end();
	} catch (error: any) {
		res.status(500).json({
			message: 'Error exporting payroll file',
			error: error.message,
		});
	}
});

const templateStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'uploads/templates');
	},
	filename: (req, file, cb) => {
		const templateType = req.params.type;
		cb(null, `${templateType}.xlsx`);
	},
});

const templateUpload = multer({
	storage: templateStorage,

	fileFilter: (req, file, cb) => {
		const isExcel =
			file.mimetype ===
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
			file.originalname.endsWith('.xlsx');

		if (!isExcel) {
			return cb(new Error('Only Excel files are allowed'));
		}

		cb(null, true);
	},
});

// Convert file name into fixed excel file name with validation
app.post(
	'/templates/:type/upload',
	templateUpload.single('file'),
	(req, res) => {
		const type = String(req.params.type);

		const allowedTypes = ['monitoring', 'sl', 'dv', 'payroll'];

		if (!allowedTypes.includes(type)) {
			return res.status(400).json({
				message: 'Invalid template type',
			});
		}

		if (!req.file) {
			return res.status(400).json({
				message: 'No file uploaded',
			});
		}

		res.json({
			message: `${type} template uploaded successfully`,
			file: req.file.filename,
		});
	},
);

app.get('/templates/status', (req, res) => {
	const templateDir = path.join(process.cwd(), 'uploads', 'templates');

	res.json({
		monitoring: fs.existsSync(path.join(templateDir, 'monitoring.xlsx')),
		sl: fs.existsSync(path.join(templateDir, 'sl.xlsx')),
		dv: fs.existsSync(path.join(templateDir, 'dv.xlsx')),
		payroll: fs.existsSync(path.join(templateDir, 'payroll.xlsx')),
	});
});

// Refund route
app.post('/refunds', async (req, res) => {
	try {
		const { borrowerName, refundAmount, school, accountNumber, dvNumber } =
			req.body;

		if (!borrowerName || !refundAmount || !school || !accountNumber) {
			return res.status(400).json({
				message:
					'Borrower name, refund amount, school, and account number are required',
			});
		}

		const refundRecord = await ApplicationModel.create({
			borrower: {
				fullName: borrowerName,
				employeeNumber: 'N/A',
				school,
				position: 'N/A',
				code: 'N/A',
				lafNumber: 'N/A',
				salaryGrade: 'N/A',
				salaryStep: 'N/A',
			},

			coMaker: {
				name: 'N/A',
				employeeNumber: 'N/A',
				contactNumber: 'N/A',
				salaryGrade: 'N/A',
				salaryStep: 'N/A',
			},

			loan: {
				loanAmount: String(refundAmount),
				loanType: 'Refund',
				accountNumber,
				term: 'N/A',
				purpose: 'Refund',
			},

			evaluation: {
				netPay: 0,
				newDeduction: 0,
				existingDeduction: 0,
				existingBalance: 0,
				percentPrincipalPaid: 0,
				netPayAfterDeduction: 0,
				finalLoanGranted: Number(refundAmount),
				status: 'Ready for Payroll',
				remarks: [],
				rejectionReasons: [],
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
				accountNumberVerified: true,
				loanApplicationForm: false,
				authorizationSalaryDeduction: false,
				latestPayslip: false,
				approvedAppointment: false,
				coMakerDocuments: false,
			},

			documentNumbers: {
				dvNumber: dvNumber || '',
			},

			processing: {
				status: 'Ready for Payroll',
				released: false,
			},
		});

		res.json({
			message: 'Refund record saved successfully',
			application: refundRecord,
		});
	} catch (error: any) {
		res.status(500).json({
			message: 'Error saving refund record',
			error: error.message,
		});
	}
});
// Get saved data and limit the data
app.get('/applications', async (req, res) => {
	try {
		const page = Number(req.query.page) || 1;
		const limit = Number(req.query.limit) || 20;
		const search = String(req.query.search || '');

		const skip = (page - 1) * limit;

		const query = search
			? {
					$or: [
						{ 'borrower.fullName': { $regex: search, $options: 'i' } },
						{ 'borrower.employeeNumber': { $regex: search, $options: 'i' } },
						{ 'borrower.lafNumber': { $regex: search, $options: 'i' } },
						{ 'documentNumbers.dvNumber': { $regex: search, $options: 'i' } },
					],
				}
			: {};

		const applications = await ApplicationModel.find(query)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit);

		const totalApplications = await ApplicationModel.countDocuments(query);

		res.json({
			applications,
			currentPage: page,
			totalPages: Math.ceil(totalApplications / limit),
			totalApplications,
		});
	} catch (error: any) {
		res.status(500).json({
			message: 'Error fetching applications',
			error: error.message,
		});
	}
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
			'uploads',
			'templates',
			'monitoring.xlsx',
		);

		if (!fs.existsSync(templatePath)) {
			return res.status(404).json({
				message: 'Monitoring template not uploaded yet',
			});
		}

		await workbook.xlsx.readFile(templatePath);

		const worksheet =
			workbook.getWorksheet('MONITORING') || workbook.worksheets[0];

		const newRow = worksheet.addRow([
			new Date(),
			isRefundRecord(application) ? 'Refund' : loan.loanType,
			isRefundRecord(application) ? '' : termToYears(loan.term),
			borrower.position,
			borrower.code,
			borrower.employeeNumber,
			Number(evaluation.finalLoanGranted || 0),
			evaluation.netPayAfterDeduction,
			evaluation.existingDeduction,
			evaluation.newDeduction,
			evaluation.netPay,
			Number(borrower.lafNumber),
			borrower.fullName,
			coMaker.name,
			coMaker.employeeNumber,
			coMaker.contactNumber,
			borrower.school,
			Number(loan.loanAmount || 0),
			isRefundRecord(application) ? 'Refund' : evaluation.status,
			'',
			'',
			'',
			'',
			'',
			'',
			evaluation.remarks?.join(', ') || '',
		]);

		/* const templateRow = worksheet.getRow(2902);

		templateRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
			newRow.getCell(colNumber).style = { ...cell.style };
		});

		newRow.height = templateRow.height; */

		applyMonitoringRowStyle(newRow);
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

app.get('/test/payroll-template', async (req, res) => {
	try {
		const workbook = new ExcelJS.Workbook();

		const templatePath = path.join(
			process.cwd(),
			'uploads',
			'templates',
			'payroll.xlsx',
		);

		await workbook.xlsx.readFile(templatePath);

		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		);

		res.setHeader(
			'Content-Disposition',
			'attachment; filename="payroll-template-test.xlsx"',
		);

		await workbook.xlsx.write(res);
		res.end();
	} catch (error: any) {
		res.status(500).json({
			message: 'Error testing payroll template',
			error: error.message,
		});
	}
});

app.get('/debug/sl-template', async (req, res) => {
	try {
		const workbook = new ExcelJS.Workbook();

		const templatePath = path.join(
			process.cwd(),
			'uploads',
			'templates',
			'sl.xlsx',
		);

		if (!fs.existsSync(templatePath)) {
			return res.status(404).json({
				message: 'SL template not uploaded yet',
			});
		}

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

// Export single SL File
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
			'uploads',
			'templates',
			'sl.xlsx',
		);

		if (!fs.existsSync(templatePath)) {
			return res.status(404).json({
				message: 'SL template not uploaded yet',
			});
		}

		await workbook.xlsx.readFile(templatePath);

		const worksheet = workbook.worksheets[0];

		const refNumber = application.documentNumbers?.dvNumber || '';

		const newRow = worksheet.addRow([], 'i');

		const templateRow = worksheet.getRow(18); // CRUZ, MARGIE S. row

		templateRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
			newRow.getCell(colNumber).style = { ...cell.style };
		});

		newRow.getCell('B').value = isRefundRecord(application)
			? 'REFUND'
			: loan.loanType.toUpperCase();
		newRow.getCell('C').value = '';
		newRow.getCell('D').value = refNumber;
		newRow.getCell('E').value = borrower.fullName;
		newRow.getCell('F').value = isRefundRecord(application) ? 'Refund' : '';
		newRow.getCell('G').value = null;
		newRow.getCell('H').value = Number(loan.loanAmount || 0);
		newRow.getCell('I').value = Number(evaluation.existingBalance || 0);
		newRow.getCell('J').value = Number(evaluation.finalLoanGranted || 0);

		newRow.getCell('K').value = {
			formula: `N(K${newRow.number - 1})+N(G${newRow.number})-N(J${newRow.number})`,
			result: 0,
		};

		newRow.getCell('Q').value = borrower.code;
		newRow.getCell('R').value = borrower.employeeNumber;
		newRow.getCell('S').value = termToMonths(loan.term);
		newRow.getCell('T').value = evaluation.newDeduction;
		newRow.getCell('U').value = borrower.position;
		newRow.getCell('V').value = borrower.lafNumber;
		newRow.getCell('W').value = borrower.school;
		newRow.getCell('X').value = coMaker.name;
		newRow.getCell('Y').value = coMaker.employeeNumber;
		newRow.getCell('Z').value = isRefundRecord(application)
			? 'Refund'
			: loan.loanType;
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

app.get('/test/monitoring-template', async (req, res) => {
	try {
		const workbook = new ExcelJS.Workbook();

		const templatePath = path.join(
			process.cwd(),
			'uploads',
			'templates',
			'monitoring.xlsx',
		);

		await workbook.xlsx.readFile(templatePath);

		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		);

		res.setHeader(
			'Content-Disposition',
			'attachment; filename="monitoring-template-test.xlsx"',
		);

		await workbook.xlsx.write(res);
		res.end();
	} catch (error: any) {
		res.status(500).json({
			message: 'Error testing monitoring template',
			error: error.message,
		});
	}
});

// Export DV
app.get('/applications/:id/export/dv', async (req, res) => {
	try {
		const { id } = req.params;

		const application = await ApplicationModel.findById(id);

		if (!application) {
			return res.status(404).json({ message: 'Application not found' });
		}

		const borrower = application.borrower!;
		const loan = application.loan!;
		const evaluation = application.evaluation!;

		const workbook = new ExcelJS.Workbook();

		const templatePath = path.join(
			process.cwd(),
			'uploads',
			'templates',
			'dv.xlsx',
		);

		if (!fs.existsSync(templatePath)) {
			return res.status(404).json({
				message: 'DV template not uploaded yet',
			});
		}

		await workbook.xlsx.readFile(templatePath);

		const worksheet = workbook.getWorksheet('TEMPLATE');

		if (!worksheet) {
			return res.status(404).json({
				message: 'TEMPLATE sheet not found',
			});
		}

		const refNumber = application.documentNumbers?.dvNumber || '';

		const sheetName = formatNameForSheet(borrower.fullName).slice(0, 31);
		worksheet.name = sheetName;

		worksheet.getCell('AD6').value = refNumber;
		worksheet.getCell('E11').value = formatNameForPayee(borrower.fullName);
		worksheet.getCell('E13').value = borrower.school;
		worksheet.getCell('K17').value = borrower.position;
		worksheet.getCell('L17').value = borrower.lafNumber;
		worksheet.getCell('H23').value = Number(loan.loanAmount);
		worksheet.getCell('H24').value = evaluation.existingBalance || 0;
		worksheet.getCell('H25').value = evaluation.finalLoanGranted || 0;
		worksheet.getCell('AE36').value = evaluation.finalLoanGranted || 0;

		const safeFileName = borrower.fullName.replace(/[^a-z0-9]/gi, '_');

		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		);

		res.setHeader(
			'Content-Disposition',
			`attachment; filename="dv-${safeFileName}.xlsx"`,
		);

		await workbook.xlsx.write(res);
		res.end();
	} catch (error: any) {
		res.status(500).json({
			message: 'Error exporting DV file',
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
