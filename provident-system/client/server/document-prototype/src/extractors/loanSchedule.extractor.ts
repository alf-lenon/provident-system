import type { ExtractedApplicationData } from '../types/scan.types.js';

export function extractLoanScheduleFields(
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
