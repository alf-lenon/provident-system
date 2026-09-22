import type { ExtractedApplicationData } from '../types/scan.types.js';

export function extractAuthorizationFields(
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
