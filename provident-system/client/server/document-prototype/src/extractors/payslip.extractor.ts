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
		result.loan.accountNumber = accountNumberMatch[1];
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

	// ----------------------------
	// NET PAY FALLBACK
	//
	// OCR:
	// 1st Half Pay: eo. 3865.00
	// 28d Half Fay : 3,467.89
	//
	// Monthly net pay =
	// first half + second half
	// ----------------------------

	if (!result.evaluation.netPay) {
		const firstHalfMatch = text.match(
			/1st\s+Half\s+(?:Pay|Fay)[^0-9]{0,20}([\d,]+\.\d{2})/i,
		);

		const secondHalfMatch = text.match(
			/(?:2nd|28d)\s+Half\s+(?:Pay|Fay)[^0-9]{0,20}([\d,]+\.\d{2})/i,
		);

		if (firstHalfMatch && secondHalfMatch) {
			const firstHalf = Number(firstHalfMatch[1].replace(/,/g, ''));

			const secondHalf = Number(secondHalfMatch[1].replace(/,/g, ''));

			if (Number.isFinite(firstHalf) && Number.isFinite(secondHalf)) {
				result.evaluation.netPay = (firstHalf + secondHalf).toFixed(2);
			}
		}
	}

	return result;
}
