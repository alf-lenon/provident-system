import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';

const pdfJsWasmPath = path.join(
	process.cwd(),
	'node_modules',
	'pdfjs-dist',
	'wasm',
);

const pdfJsWasmUrl = pathToFileURL(pdfJsWasmPath + path.sep).href;

export async function loadPdf(pdfPath: string) {
	const pdfBuffer = await fs.readFile(pdfPath);

	const loadingTask = pdfjsLib.getDocument({
		data: new Uint8Array(pdfBuffer),
		wasmUrl: pdfJsWasmUrl,
	});

	return loadingTask.promise;
}

export async function renderPdfPage(
	page: Awaited<ReturnType<Awaited<ReturnType<typeof loadPdf>>['getPage']>>,
	outputPath: string,
) {
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

	const pngBuffer = canvas.toBuffer('image/png');

	await fs.writeFile(outputPath, pngBuffer);
}
