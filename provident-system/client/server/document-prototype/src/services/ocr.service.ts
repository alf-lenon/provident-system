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

export async function recognizeImageRegion(
	worker: Worker,
	imagePath: string,
	region: {
		left: number;
		top: number;
		width: number;
		height: number;
	},
): Promise<string> {
	const croppedImage = await sharp(imagePath)
		.extract(region)
		.resize({
			width: region.width * 4,
		})
		.grayscale()
		.normalize()
		.sharpen()
		.threshold(180)
		.png()
		.toBuffer();

	await worker.setParameters({
		tessedit_pageseg_mode: '7' as any,
		tessedit_char_whitelist: '0123456789',
	});

	const {
		data: { text },
	} = await worker.recognize(croppedImage);

	return text.trim();
}
