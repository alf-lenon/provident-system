import type { ExtractedApplicationData } from '../types/scan.types.js';

export function extractSoaFields(
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
