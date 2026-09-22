import type { ExtractedApplicationData } from '../types/scan.types.js';

export function extractLoanApplicationFields(
	text: string,
): ExtractedApplicationData {
	const result: ExtractedApplicationData = {
		borrower: {
			fullName: '',
			employeeNumber: '',
			school: '',
			position: '',
			salaryGrade: '',
			salaryStep: '',
			code: '',
		},

		coMaker: {
			name: '',
			employeeNumber: '',
			contactNumber: '',
		},

		loan: {
			loanAmount: '',
			loanType: '',
			purpose: '',
			term: '',
			accountNumber: '',
		},

		evaluation: {
			netPay: '',
			newDeduction: '',
			existingDeduction: '',
			existingBalance: '',
			percentPrincipalPaid: '',
		},

		soa: {
			checkNumber: '',
			lastMonth: '',
			balance: '',
		},

		verification: {
			authorizationTerm: '',
			termMatch: null,

			soaLoanAmount: '',
			loanAmountMatch: null,

			soaBalance: '',
			balanceMatch: null,

			soaLoanGranted: '',
			loanGrantedMatch: null,
		},
	};

	const loanAmountMatch = text.match(
		/Loan Amount:\s*(?:Loan Amount:\s*)?(?:Php|PHP|₱)?\s*([\d,]+(?:\.\d{1,2})?)/i,
	);

	if (loanAmountMatch) {
		result.loan.loanAmount = loanAmountMatch[1].replace(/,/g, '');
	}

	const nameMatch = text.match(/Name:\s*(.+?)\s+Name:/i);

	if (nameMatch) {
		result.borrower.fullName = nameMatch[1].trim();
	}

	const positionMatch = text.match(/Position:\s*(.+?)\s+Position:/i);

	if (positionMatch) {
		result.borrower.position = positionMatch[1].trim();
	}

	const employeeNumberMatch = text.match(/Employee No\.?:\s*([A-Za-z0-9-]+)/i);

	if (employeeNumberMatch) {
		result.borrower.employeeNumber = employeeNumberMatch[1].trim();
	}

	const officeMatch = text.match(/Office:\s*(.+?)\s+Office:/i);

	if (officeMatch) {
		result.borrower.school = officeMatch[1].trim();
	}

	const coMakerNameMatch = text.match(/Name:\s*.+?\s+Name:\s*(.+)/i);

	if (coMakerNameMatch) {
		result.coMaker.name = coMakerNameMatch[1].trim();
	}

	const employeeNumberMatches = [
		...text.matchAll(/Employee No\.?:\s*([A-Za-z0-9-]+)/gi),
	];

	if (employeeNumberMatches.length >= 2) {
		result.coMaker.employeeNumber = employeeNumberMatches[1][1].trim();
	}

	const mobileMatches = [...text.matchAll(/Mobile No\.?:\s*([0-9+\-\s]+)/gi)];

	if (mobileMatches.length >= 2) {
		result.coMaker.contactNumber = mobileMatches[1][1]
			.replace(/\s+/g, '')
			.trim();
	}

	const normalizedText = text.replace(/\r/g, '').toLowerCase();

	if (/\[\s*x\s*\]\s*renewal/i.test(text)) {
		result.loan.loanType = 'Renewal';
	} else if (/\[\s*x\s*\]\s*new/i.test(text)) {
		result.loan.loanType = 'New';
	} else if (/\[\s*x\s*\]\s*additional/i.test(text)) {
		result.loan.loanType = 'Additional';
	}

	if (!result.loan.loanType) {
		if (normalizedText.includes('[x] renewal')) {
			result.loan.loanType = 'Renewal';
		} else if (normalizedText.includes('[x] new')) {
			result.loan.loanType = 'New';
		} else if (normalizedText.includes('[x] additional')) {
			result.loan.loanType = 'Additional';
		}
	}

	if (/\[\s*x\s*\]\s*educational/i.test(text)) {
		result.loan.purpose = 'Educational';
	} else if (/\[\s*x\s*\]\s*hospitalization\/medical/i.test(text)) {
		result.loan.purpose = 'Hospitalization/Medical';
	} else if (/\[\s*x\s*\]\s*house repair/i.test(text)) {
		result.loan.purpose = 'House Repair';
	}

	const termMatch = text.match(/Term:\s*(\d+).*?(?:month|months|year|years)/i);

	if (termMatch) {
		result.loan.term = termMatch[1].trim();
	}

	return result;
}
