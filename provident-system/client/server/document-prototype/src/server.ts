import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import type {
	DocumentType,
	ProcessedDocument,
	ExtractedApplicationData,
} from './types/scan.types.js';

import { classifyDocument } from './classifiers/document.classifier.js';

const app = express();

const PORT = 5001;
const MAX_PAGES = 30;

const upload = multer({
	dest: 'uploads/',
	limits: {
		fileSize: 15 * 1024 * 1024,
	},
});

const pdfJsWasmPath = path.join(
	process.cwd(),
	'node_modules',
	'pdfjs-dist',
	'wasm',
);

const pdfJsWasmUrl = pathToFileURL(pdfJsWasmPath + path.sep).href;

function extractLoanApplicationFields(text: string): ExtractedApplicationData {
	const result: ExtractedApplicationData = {
		borrower: {
			fullName: '',
			employeeNumber: '',
			school: '',
			position: '',
			salaryGrade: '',
			salaryStep: '',
			code: '',
		},

		coMaker: {
			name: '',
			employeeNumber: '',
			contactNumber: '',
		},

		loan: {
			loanAmount: '',
			loanType: '',
			purpose: '',
			term: '',
			accountNumber: '',
		},

		evaluation: {
			netPay: '',
			newDeduction: '',
			existingDeduction: '',
			existingBalance: '',
			percentPrincipalPaid: '',
		},

		soa: {
			checkNumber: '',
			lastMonth: '',
			balance: '',
		},

		verification: {
			authorizationTerm: '',
			termMatch: null,

			soaLoanAmount: '',
			loanAmountMatch: null,

			soaBalance: '',
			balanceMatch: null,

			soaLoanGranted: '',
			loanGrantedMatch: null,
		},
	};

	const loanAmountMatch = text.match(
		/Loan Amount:\s*(?:Loan Amount:\s*)?(?:Php|PHP|₱)?\s*([\d,]+(?:\.\d{1,2})?)/i,
	);

	if (loanAmountMatch) {
		result.loan.loanAmount = loanAmountMatch[1].replace(/,/g, '');
	}

	const nameMatch = text.match(/Name:\s*(.+?)\s+Name:/i);

	if (nameMatch) {
		result.borrower.fullName = nameMatch[1].trim();
	}

	const positionMatch = text.match(/Position:\s*(.+?)\s+Position:/i);

	if (positionMatch) {
		result.borrower.position = positionMatch[1].trim();
	}

	const employeeNumberMatch = text.match(/Employee No\.?:\s*([A-Za-z0-9-]+)/i);

	if (employeeNumberMatch) {
		result.borrower.employeeNumber = employeeNumberMatch[1].trim();
	}

	const officeMatch = text.match(/Office:\s*(.+?)\s+Office:/i);

	if (officeMatch) {
		result.borrower.school = officeMatch[1].trim();
	}

	const coMakerNameMatch = text.match(/Name:\s*.+?\s+Name:\s*(.+)/i);

	if (coMakerNameMatch) {
		result.coMaker.name = coMakerNameMatch[1].trim();
	}

	const employeeNumberMatches = [
		...text.matchAll(/Employee No\.?:\s*([A-Za-z0-9-]+)/gi),
	];

	if (employeeNumberMatches.length >= 2) {
		result.coMaker.employeeNumber = employeeNumberMatches[1][1].trim();
	}

	const mobileMatches = [...text.matchAll(/Mobile No\.?:\s*([0-9+\-\s]+)/gi)];

	if (mobileMatches.length >= 2) {
		result.coMaker.contactNumber = mobileMatches[1][1]
			.replace(/\s+/g, '')
			.trim();
	}

	const normalizedText = text.replace(/\r/g, '').toLowerCase();

	if (/\[\s*x\s*\]\s*renewal/i.test(text)) {
		result.loan.loanType = 'Renewal';
	} else if (/\[\s*x\s*\]\s*new/i.test(text)) {
		result.loan.loanType = 'New';
	} else if (/\[\s*x\s*\]\s*additional/i.test(text)) {
		result.loan.loanType = 'Additional';
	}

	if (!result.loan.loanType) {
		if (normalizedText.includes('[x] renewal')) {
			result.loan.loanType = 'Renewal';
		} else if (normalizedText.includes('[x] new')) {
			result.loan.loanType = 'New';
		} else if (normalizedText.includes('[x] additional')) {
			result.loan.loanType = 'Additional';
		}
	}

	if (/\[\s*x\s*\]\s*educational/i.test(text)) {
		result.loan.purpose = 'Educational';
	} else if (/\[\s*x\s*\]\s*hospitalization\/medical/i.test(text)) {
		result.loan.purpose = 'Hospitalization/Medical';
	} else if (/\[\s*x\s*\]\s*house repair/i.test(text)) {
		result.loan.purpose = 'House Repair';
	}

	const termMatch = text.match(/Term:\s*(\d+).*?(?:month|months|year|years)/i);

	if (termMatch) {
		result.loan.term = termMatch[1].trim();
	}

	return result;
}

function extractPayslipFields(
	text: string,
	currentData: ExtractedApplicationData,
): ExtractedApplicationData {
	const result = structuredClone(currentData);

	// ----------------------------
	// EMPLOYEE NUMBER
	// ----------------------------

	const employeeNumberMatch = text.match(
		/(?:Employee|Enployee)\s+(?:No|Ho)\.?\s*:?\s*([0-9]{5,12})/i,
	);

	if (employeeNumberMatch) {
		result.borrower.employeeNumber = employeeNumberMatch[1];
	}

	// ----------------------------
	// SALARY GRADE
	// ----------------------------

	const salaryGradeMatch = text.match(
		/(?:Salary\s+Grade|Grade|SG)[.:]?\s*(\d{1,2})/i,
	);

	if (salaryGradeMatch) {
		result.borrower.salaryGrade = salaryGradeMatch[1];
	}

	// ----------------------------
	// SALARY STEP
	// ----------------------------

	const salaryStepMatch = text.match(
		/(?:Salary\s+Step|Step)[.:]?\s*(\d{1,2})/i,
	);

	if (salaryStepMatch) {
		result.borrower.salaryStep = salaryStepMatch[1];
	}

	// ----------------------------
	// POSITION
	// Payslip is more reliable here than handwriting.
	// Example OCR:
	// Position: 314C REGISTRAR I
	// ----------------------------

	const positionMatch = text.match(
		/Position\s*:?\s*(?:[A-Z0-9]+\s+)?([A-Z][A-Z\s-]+?(?:\s+[IVX]+)?)(?=\s+(?:Basic|asic)\s+Salary|\n)/i,
	);

	if (positionMatch) {
		const position = positionMatch[1].replace(/\s+/g, ' ').trim();

		if (position.length >= 3) {
			result.borrower.position = position;
		}
	}

	// ----------------------------
	// ACCOUNT NUMBER
	//
	// OCR currently reads:
	// "Recount Mo. © 0085186049"
	//
	// Allow a small amount of OCR garbage
	// between the label and the number.
	// ----------------------------

	const accountNumberMatch = text.match(
		/(?:Account|Recount)\s+(?:No|Mo)\.?[^0-9]{0,10}([0-9]{8,20})/i,
	);

	if (accountNumberMatch) {
		result.loan.accountNumber = accountNumberMatch[1];
	}

	// ----------------------------
	// STA / CODE
	//
	// Keep blank unless we get a believable value.
	// Do not accept random one-character OCR.
	// ----------------------------

	const staMatch = text.match(/\bSta(?:tion)?[.:]?\s*([0-9]{2,5})\b/i);

	if (staMatch) {
		result.borrower.code = staMatch[1];
	}

	// ----------------------------
	// DIRECT NET PAY
	// ----------------------------

	const directNetPayMatch = text.match(
		/(?:Net|Ret)\s+Pay[^0-9]{0,15}([\d,]+\.\d{2})/i,
	);

	if (directNetPayMatch) {
		result.evaluation.netPay = directNetPayMatch[1].replace(/,/g, '');
	}

	// ----------------------------
	// NET PAY FALLBACK
	//
	// OCR:
	// 1st Half Pay: eo. 3865.00
	// 28d Half Fay : 3,467.89
	//
	// Monthly net pay =
	// first half + second half
	// ----------------------------

	if (!result.evaluation.netPay) {
		const firstHalfMatch = text.match(
			/1st\s+Half\s+(?:Pay|Fay)[^0-9]{0,20}([\d,]+\.\d{2})/i,
		);

		const secondHalfMatch = text.match(
			/(?:2nd|28d)\s+Half\s+(?:Pay|Fay)[^0-9]{0,20}([\d,]+\.\d{2})/i,
		);

		if (firstHalfMatch && secondHalfMatch) {
			const firstHalf = Number(firstHalfMatch[1].replace(/,/g, ''));

			const secondHalf = Number(secondHalfMatch[1].replace(/,/g, ''));

			if (Number.isFinite(firstHalf) && Number.isFinite(secondHalf)) {
				result.evaluation.netPay = (firstHalf + secondHalf).toFixed(2);
			}
		}
	}

	return result;
}

function extractAuthorizationFields(
	text: string,
	currentData: ExtractedApplicationData,
): ExtractedApplicationData {
	const result = structuredClone(currentData);

	const deductionMatch = text.match(
		/authorize\s+the\s+deduction\s+of\s+(?:Php|PHP|₱)?\s*([\d,]+(?:\.\d{1,2})?)/i,
	);

	if (deductionMatch) {
		result.evaluation.newDeduction = deductionMatch[1].replace(/,/g, '');
	}

	const authorizationTermMatch = text.match(
		/from\s+my\s+salary\s+for\s+(\d+)\s+months?/i,
	);

	if (authorizationTermMatch) {
		const authorizationTerm = authorizationTermMatch[1].trim();

		result.verification.authorizationTerm = authorizationTerm;

		if (result.loan.term) {
			result.verification.termMatch = result.loan.term === authorizationTerm;
		}
	}

	return result;
}

function extractLoanScheduleFields(
	text: string,
	currentData: ExtractedApplicationData,
): ExtractedApplicationData {
	const result = structuredClone(currentData);

	const amortizationMatch = text.match(
		/Amortization\s*:?\s*(?:Php|PHP|₱)?\s*([\d,]+(?:\.\d{1,2})?)/i,
	);

	if (amortizationMatch) {
		result.evaluation.existingDeduction = amortizationMatch[1].replace(
			/,/g,
			'',
		);
	}

	const balanceMatch = text.match(
		/(?:Amount Still Due|Outstanding Balance|Remaining Balance|Balance)\s*:?\s*(?:Php|PHP|₱)?\s*([\d,]+(?:\.\d{1,2})?)/i,
	);

	if (balanceMatch) {
		result.evaluation.existingBalance = balanceMatch[1].replace(/,/g, '');
	}

	const percentPaidMatch = text.match(
		/%\s*Principal\s*Paid\s*:?\s*(\d+(?:\.\d+)?)\s*%/i,
	);

	if (percentPaidMatch) {
		result.evaluation.percentPrincipalPaid = percentPaidMatch[1].trim();
	}

	const checkNumberMatch = text.match(/Check\s+No\.?\s*:?\s*([A-Za-z0-9-]+)/i);

	if (checkNumberMatch) {
		result.soa.checkNumber = checkNumberMatch[1].trim();
	}

	return result;
}

function extractSoaFields(
	text: string,
	currentData: ExtractedApplicationData,
): ExtractedApplicationData {
	const result = structuredClone(currentData);

	const lastMonthMatch = text.match(
		/(?:UPDATED SOA\s+as of|as of|for the month of)\s+([A-Za-z]+)\s+\d{1,2},\s*(\d{4})/i,
	);

	if (lastMonthMatch) {
		const month = lastMonthMatch[1].trim();
		const year = lastMonthMatch[2].trim();

		result.soa.lastMonth = `${month} ${year}`;
	}

	const balanceMatch = text.match(
		/(?:Amount Still Due|Outstanding Balance|Balance)\s*:?\s*(?:Php|PHP|₱)?\s*([\d,]+(?:\.\d{1,2})?)/i,
	);

	if (balanceMatch) {
		const soaBalance = balanceMatch[1].replace(/,/g, '');

		result.soa.balance = soaBalance;
		result.verification.soaBalance = soaBalance;

		if (result.evaluation.existingBalance) {
			result.verification.balanceMatch =
				Number(result.evaluation.existingBalance) === Number(soaBalance);
		}
	}

	const loanRequestedMatch = text.match(
		/Loan\s+Requested\s*:?\s*(?:Php|PHP|₱)?\s*([\d,]+(?:\.\d{1,2})?)/i,
	);

	if (loanRequestedMatch) {
		const soaLoanAmount = loanRequestedMatch[1].replace(/,/g, '');

		result.verification.soaLoanAmount = soaLoanAmount;

		if (result.loan.loanAmount) {
			result.verification.loanAmountMatch =
				Number(result.loan.loanAmount) === Number(soaLoanAmount);
		}
	}

	const loanGrantedMatch = text.match(
		/Loan\s+Granted\s*:?\s*(?:Php|PHP|₱)?\s*([\d,]+(?:\.\d{1,2})?)/i,
	);

	if (loanGrantedMatch) {
		const soaLoanGranted = loanGrantedMatch[1].replace(/,/g, '');

		result.verification.soaLoanGranted = soaLoanGranted;

		if (result.loan.loanAmount && result.evaluation.existingBalance) {
			const requestedAmount = Number(result.loan.loanAmount);

			const existingBalance = Number(result.evaluation.existingBalance);

			const expectedLoanGranted = requestedAmount - existingBalance;

			result.verification.loanGrantedMatch =
				Math.abs(expectedLoanGranted - Number(soaLoanGranted)) < 0.01;
		}
	}

	return result;
}

async function safelyDeleteFile(filePath: string) {
	try {
		await fs.unlink(filePath);
	} catch (error: any) {
		if (error?.code !== 'ENOENT') {
			console.error('Failed to delete temporary file:', filePath);
		}
	}
}

app.post('/scan', upload.single('document'), async (req, res) => {
	let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

	if (!req.file) {
		return res.status(400).json({
			message: 'No PDF uploaded.',
		});
	}

	const uploadedPdfPath = req.file.path;

	const processedFolder = path.join(
		process.cwd(),
		'processed',
		req.file.filename,
	);

	try {
		if (req.file.mimetype !== 'application/pdf') {
			return res.status(400).json({
				message: 'Only PDF files are allowed.',
			});
		}

		await fs.mkdir(processedFolder, {
			recursive: true,
		});

		const pdfBuffer = await fs.readFile(uploadedPdfPath);

		const loadingTask = pdfjsLib.getDocument({
			data: new Uint8Array(pdfBuffer),
			wasmUrl: pdfJsWasmUrl,
		});

		const pdf = await loadingTask.promise;

		if (pdf.numPages > MAX_PAGES) {
			return res.status(400).json({
				message: `PDF exceeds the maximum of ${MAX_PAGES} pages.`,
			});
		}

		worker = await createWorker('eng');

		const documents: ProcessedDocument[] = [];

		for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
			const page = await pdf.getPage(pageNumber);

			const viewport = page.getViewport({
				scale: 2.5,
			});

			const canvas = createCanvas(
				Math.ceil(viewport.width),
				Math.ceil(viewport.height),
			);

			const context = canvas.getContext('2d');

			await page.render({
				canvas: canvas as any,
				canvasContext: context as any,
				viewport,
			}).promise;

			const imagePath = path.join(processedFolder, `page-${pageNumber}.png`);

			const pngBuffer = canvas.toBuffer('image/png');

			await fs.writeFile(imagePath, pngBuffer);

			// ----------------------------
			// IMAGE PREPROCESSING
			// ----------------------------

			const enhancedImagePath = path.join(
				processedFolder,
				`page-${pageNumber}-enhanced.png`,
			);

			await sharp(imagePath)
				.grayscale()
				.normalize()
				.sharpen()
				.png()
				.toFile(enhancedImagePath);

			// ----------------------------
			// OCR ENHANCED IMAGE
			// ----------------------------

			const {
				data: { text },
			} = await worker.recognize(enhancedImagePath);

			const documentType = classifyDocument(text);

			documents.push({
				page: pageNumber,
				type: documentType,
				text,
			});
		}

		const loanApplicationDocument = documents.find(
			(document) => document.type === 'loan-application',
		);

		if (!loanApplicationDocument) {
			return res.status(400).json({
				message: 'Loan Application Form was not detected.',
			});
		}

		let extracted = extractLoanApplicationFields(loanApplicationDocument.text);

		const payslipDocument = documents.find(
			(document) => document.type === 'payslip',
		);

		if (payslipDocument) {
			extracted = extractPayslipFields(payslipDocument.text, extracted);
		}

		const authorizationDocument = documents.find(
			(document) => document.type === 'authorization',
		);

		if (authorizationDocument) {
			extracted = extractAuthorizationFields(
				authorizationDocument.text,
				extracted,
			);
		}

		const loanScheduleDocument = documents.find(
			(document) => document.type === 'loan-schedule',
		);

		if (loanScheduleDocument) {
			extracted = extractLoanScheduleFields(
				loanScheduleDocument.text,
				extracted,
			);
		}

		const soaDocument = documents.find((document) => document.type === 'soa');

		if (soaDocument) {
			extracted = extractSoaFields(soaDocument.text, extracted);
		}

		const page5Document = documents.find((document) => document.page === 5);

		return res.json({
			message: 'PDF processed successfully.',

			file: {
				name: req.file.originalname,
				type: req.file.mimetype,
				size: req.file.size,
			},

			pages: pdf.numPages,

			documents: documents.map((document) => ({
				page: document.page,
				type: document.type,
			})),

			extracted,

			page5OcrText: page5Document?.text ?? '',
		});
	} catch (error) {
		console.error('PDF processing failed:', error);

		return res.status(500).json({
			message: 'Failed to process PDF.',
		});
	} finally {
		if (worker) {
			try {
				await worker.terminate();
			} catch {
				// ignore cleanup error
			}
		}

		try {
			await fs.rm(processedFolder, {
				recursive: true,
				force: true,
			});
		} catch (error) {
			console.error('Failed to remove processed folder:', error);
		}

		await safelyDeleteFile(uploadedPdfPath);

		console.log('Temporary OCR files cleaned up.');
	}
});

app.listen(PORT, () => {
	console.log(`Document prototype running at http://localhost:${PORT}`);
});
