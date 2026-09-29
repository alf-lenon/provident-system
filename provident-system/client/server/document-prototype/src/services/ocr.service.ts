import sharp from 'sharp';
import type { Worker } from 'tesseract.js';

export async function preprocessImage(
	inputPath: string,
	outputPath: string,
): Promise<void> {
	await sharp(inputPath)
		.grayscale()
		.normalize()
		.sharpen()
		.png()
		.toFile(outputPath);
}

export async function recognizeImage(
	worker: Worker,
	imagePath: string,
): Promise<string> {
	const {
		data: { text },
	} = await worker.recognize(imagePath);

	return text;
}
