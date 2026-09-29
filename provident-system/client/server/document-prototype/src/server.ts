import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createWorker } from 'tesseract.js';

import type { ProcessedDocument } from './types/scan.types.js';

import { classifyDocument } from './classifiers/document.classifier.js';

import { extractLoanApplicationFields } from './extractors/loanApplication.extractor.js';

import { extractPayslipFields } from './extractors/payslip.extractor.js';

import { extractAuthorizationFields } from './extractors/authorization.extractor.js';

import { extractLoanScheduleFields } from './extractors/loanSchedule.extractor.js';

import { extractSoaFields } from './extractors/soa.extractor.js';

import { loadPdf, renderPdfPage } from './services/pdf.service.js';

import sharp from 'sharp';

import {
	preprocessImage,
	recognizeImage,
	recognizeImageRegion,
} from './services/ocr.service.js';

import { verifyAccountNumber } from './services/accountVerification.service.js';

import { hasVisualContent } from './services/imageAnalysis.service.js';

const app = express();

const PORT = 5001;
const MAX_PAGES = 30;

const upload = multer({
	dest: 'uploads/',
	limits: {
		fileSize: 15 * 1024 * 1024,
	},
});

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

		const pdf = await loadPdf(uploadedPdfPath);

		if (pdf.numPages > MAX_PAGES) {
			return res.status(400).json({
				message: `PDF exceeds the maximum of ${MAX_PAGES} pages.`,
			});
		}

		worker = await createWorker('eng');

		const documents: ProcessedDocument[] = [];

		for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
			const page = await pdf.getPage(pageNumber);

			const imagePath = path.join(processedFolder, `page-${pageNumber}.png`);

			await renderPdfPage(page, imagePath);

			// ----------------------------
			// IMAGE PREPROCESSING
			// ----------------------------

			const enhancedImagePath = path.join(
				processedFolder,
				`page-${pageNumber}-enhanced.png`,
			);

			await preprocessImage(imagePath, enhancedImagePath);

			// ----------------------------
			// OCR ENHANCED IMAGE
			// ----------------------------

			const text = await recognizeImage(worker, enhancedImagePath);

			const documentType = classifyDocument(text);

			const hasOcrContent = text.replace(/\s/g, '').length >= 10;

			const pageHasVisualContent = await hasVisualContent(imagePath);

			const needsClassification =
				documentType === 'unknown' && pageHasVisualContent;

			if (documentType === 'payslip') {
				const metadata = await sharp(imagePath).metadata();

				if (metadata.width && metadata.height) {
					const region = {
						left: Math.round(metadata.width * 0.22),
						top: Math.round(metadata.height * 0.12),
						width: Math.round(metadata.width * 0.2),
						height: Math.round(metadata.height * 0.035),
					};
					// Temporary local debugging only.
					// Save the crop outside processedFolder because processedFolder
					// is automatically deleted in finally.
					const debugFolder = path.join(process.cwd(), 'debug-crops');

					await fs.mkdir(debugFolder, {
						recursive: true,
					});

					const debugCropPath = path.join(debugFolder, 'payslip-account.png');

					await sharp(imagePath).extract(region).png().toFile(debugCropPath);

					const accountRegionText = await recognizeImageRegion(
						worker,
						imagePath,
						region,
					);

					await worker.setParameters({
						tessedit_pageseg_mode: '3' as any,
						tessedit_char_whitelist: '',
					});
				}
			}

			documents.push({
				page: pageNumber,
				type: documentType,
				text,
				hasOcrContent,
				hasVisualContent: pageHasVisualContent,
				needsClassification,
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

		extracted = verifyAccountNumber(extracted);

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
				hasOcrContent: document.hasOcrContent,
				hasVisualContent: document.hasVisualContent,
				needsClassification: document.needsClassification,
			})),

			extracted,
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
