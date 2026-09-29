import sharp from 'sharp';

export async function hasVisualContent(imagePath: string): Promise<boolean> {
	const { data, info } = await sharp(imagePath)
		.grayscale()
		.resize({
			width: 500,
			withoutEnlargement: true,
		})
		.raw()
		.toBuffer({
			resolveWithObject: true,
		});

	let darkPixels = 0;

	// Pixels near pure white are treated as background.
	const DARK_PIXEL_THRESHOLD = 235;

	for (const pixel of data) {
		if (pixel < DARK_PIXEL_THRESHOLD) {
			darkPixels++;
		}
	}

	const totalPixels = info.width * info.height;
	const darkPixelRatio = darkPixels / totalPixels;

	// Initial experimental threshold.
	// We'll validate this against the real scanned package.
	return darkPixelRatio >= 0.005;
}
