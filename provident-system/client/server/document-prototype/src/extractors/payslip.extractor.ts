import type { ExtractedApplicationData } from '../types/scan.types.js';

export function extractPayslipFields(
	text: string,
	currentData: ExtractedApplicationData,
): ExtractedApplicationData {
	const result = structuredClone(currentData);

	// ----------------------------
	// EMPLOYEE NUMBER
	// ----------------------------

	const employeeNumberMatch = text.match(
		/(?:Employee|Enployee)\s+(?:No|Ho)\.?\s*:?\s*([0-9]{5,12})/i,
	);

	if (employeeNumberMatch) {
		result.borrower.employeeNumber = employeeNumberMatch[1];
	}

	// ----------------------------
	// SALARY GRADE
	// ----------------------------

	const salaryGradeMatch = text.match(
		/(?:Salary\s+Grade|Grade|SG)[.:]?\s*(\d{1,2})/i,
	);

	if (salaryGradeMatch) {
		result.borrower.salaryGrade = salaryGradeMatch[1];
	}

	// ----------------------------
	// SALARY STEP
	// ----------------------------

	const salaryStepMatch = text.match(
		/(?:Salary\s+Step|Step)[.:]?\s*(\d{1,2})/i,
	);

	if (salaryStepMatch) {
		result.borrower.salaryStep = salaryStepMatch[1];
	}

	// ----------------------------
	// POSITION
	// Payslip is more reliable here than handwriting.
	// Example OCR:
	// Position: 314C REGISTRAR I
	// ----------------------------

	const positionMatch = text.match(
		/Position\s*:?\s*(?:[A-Z0-9]+\s+)?([A-Z][A-Z\s-]+?(?:\s+[IVX]+)?)(?=\s+(?:Basic|asic)\s+Salary|\n)/i,
	);

	if (positionMatch) {
		const position = positionMatch[1].replace(/\s+/g, ' ').trim();

		if (position.length >= 3) {
			result.borrower.position = position;
		}
	}

	// ----------------------------
	// ACCOUNT NUMBER
	//
	// OCR currently reads:
	// "Recount Mo. © 0085186049"
	//
	// Allow a small amount of OCR garbage
	// between the label and the number.
	// ----------------------------

	const accountNumberMatch = text.match(
		/(?:Account|Recount)\s+(?:No|Mo)\.?[^0-9]{0,10}([0-9]{8,20})/i,
	);

	if (accountNumberMatch) {
		result.verification.payslipAccountNumber = accountNumberMatch[1];
		result.verification.accountNumberStatus = 'unverified';

		// Do not populate the official account number until
		// it has been independently verified.
		result.loan.accountNumber = '';
	}

	// ----------------------------
	// STA / CODE
	//
	// Keep blank unless we get a believable value.
	// Do not accept random one-character OCR.
	// ----------------------------

	const staMatch = text.match(/\bSta(?:tion)?[.:]?\s*([0-9]{2,5})\b/i);

	if (staMatch) {
		result.borrower.code = staMatch[1];
	}

	// ----------------------------
	// DIRECT NET PAY
	// ----------------------------

	const directNetPayMatch = text.match(
		/(?:Net|Ret)\s+Pay[^0-9]{0,15}([\d,]+\.\d{2})/i,
	);

	if (directNetPayMatch) {
		result.evaluation.netPay = directNetPayMatch[1].replace(/,/g, '');
	}

	return result;
}
