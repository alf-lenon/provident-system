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

import { extractLoanApplicationFields } from './extractors/loanApplication.extractor.js';

import { extractPayslipFields } from './extractors/payslip.extractor.js';

import { extractAuthorizationFields } from './extractors/authorization.extractor.js';

import { extractLoanScheduleFields } from './extractors/loanSchedule.extractor.js';

import { extractSoaFields } from './extractors/soa.extractor.js';

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
