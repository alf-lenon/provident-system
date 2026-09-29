import type { ExtractedApplicationData } from '../types/scan.types.js';

export function verifyAccountNumber(
	currentData: ExtractedApplicationData,
): ExtractedApplicationData {
	const result = structuredClone(currentData);

	const payslipAccount = result.verification.payslipAccountNumber.trim();
	const atmAccount = result.verification.atmAccountNumber.trim();

	// No payslip candidate yet.
	if (!payslipAccount) {
		result.loan.accountNumber = '';
		result.verification.accountNumberStatus = 'unverified';
		result.verification.accountNumberVerificationMethod = 'none';

		return result;
	}

	// ATM copy has not been detected yet.
	if (!result.verification.atmCopyDetected) {
		result.loan.accountNumber = '';
		result.verification.accountNumberStatus = 'unverified';
		result.verification.accountNumberVerificationMethod = 'none';

		return result;
	}

	// ATM copy exists, but its account number could not be read.
	if (!atmAccount) {
		result.loan.accountNumber = '';
		result.verification.accountNumberStatus = 'needs-review';
		result.verification.accountNumberVerificationMethod = 'none';

		return result;
	}

	// Both sources were readable and agree.
	if (payslipAccount === atmAccount) {
		result.loan.accountNumber = payslipAccount;
		result.verification.accountNumberStatus = 'matched';
		result.verification.accountNumberVerificationMethod = 'cross-check';

		return result;
	}

	// Both sources were readable but disagree.
	result.loan.accountNumber = '';
	result.verification.accountNumberStatus = 'mismatch';
	result.verification.accountNumberVerificationMethod = 'none';

	return result;
}
