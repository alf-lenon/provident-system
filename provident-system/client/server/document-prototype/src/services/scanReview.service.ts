import type {
	ExtractedApplicationData,
	ProcessedDocument,
	ScanWarning,
} from '../types/scan.types.js';

export function generateScanWarnings(
	data: ExtractedApplicationData,
	documents: ProcessedDocument[],
): ScanWarning[] {
	const warnings: ScanWarning[] = [];

	// ----------------------------
	// ACCOUNT NUMBER
	// ----------------------------

	if (data.verification.accountNumberStatus === 'unverified') {
		warnings.push({
			field: 'loan.accountNumber',
			code: 'ACCOUNT_UNVERIFIED',
			message: 'Account number has not been verified.',
			severity: 'review',
		});
	}

	if (data.verification.accountNumberStatus === 'needs-review') {
		warnings.push({
			field: 'loan.accountNumber',
			code: 'ACCOUNT_NEEDS_REVIEW',
			message: 'Account number requires manual verification.',
			severity: 'review',
		});
	}

	if (data.verification.accountNumberStatus === 'mismatch') {
		warnings.push({
			field: 'loan.accountNumber',
			code: 'ACCOUNT_MISMATCH',
			message: 'Payslip and ATM account numbers do not match.',
			severity: 'error',
		});
	}

	// ----------------------------
	// NET PAY
	// ----------------------------

	if (!data.evaluation.netPay) {
		warnings.push({
			field: 'evaluation.netPay',
			code: 'NET_PAY_MISSING',
			message: 'Net pay could not be extracted reliably.',
			severity: 'review',
		});
	}

	// ----------------------------
	// NEW DEDUCTION
	// ----------------------------

	if (!data.evaluation.newDeduction) {
		warnings.push({
			field: 'evaluation.newDeduction',
			code: 'NEW_DEDUCTION_MISSING',
			message: 'New deduction could not be extracted.',
			severity: 'review',
		});
	}

	if (
		data.evaluation.newDeduction &&
		data.verification.newDeductionStatus === 'needs-review'
	) {
		warnings.push({
			field: 'evaluation.newDeduction',
			code: 'NEW_DEDUCTION_NEEDS_REVIEW',
			message:
				'New deduction was extracted from the Authorization form and requires verification.',
			severity: 'review',
		});
	}

	// ----------------------------
	// UNIDENTIFIED DOCUMENTS
	// ----------------------------

	for (const document of documents) {
		if (document.needsClassification) {
			warnings.push({
				field: `documents.page.${document.page}`,
				code: 'DOCUMENT_NEEDS_CLASSIFICATION',
				message: `Page ${document.page} contains content but could not be classified.`,
				severity: 'review',
			});
		}
	}

	return warnings;
}
