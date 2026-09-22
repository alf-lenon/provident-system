export type DocumentType =
	| 'loan-application'
	| 'authorization'
	| 'payslip'
	| 'loan-schedule'
	| 'soa'
	| 'unknown';

export type ProcessedDocument = {
	page: number;
	type: DocumentType;
	text: string;
};

export type ExtractedApplicationData = {
	borrower: {
		fullName: string;
		employeeNumber: string;
		school: string;
		position: string;
		salaryGrade: string;
		salaryStep: string;
		code: string;
	};

	coMaker: {
		name: string;
		employeeNumber: string;
		contactNumber: string;
	};

	loan: {
		loanAmount: string;
		loanType: string;
		purpose: string;
		term: string;
		accountNumber: string;
	};

	evaluation: {
		netPay: string;
		newDeduction: string;
		existingDeduction: string;
		existingBalance: string;
		percentPrincipalPaid: string;
	};

	soa: {
		checkNumber: string;
		lastMonth: string;
		balance: string;
	};

	verification: {
		authorizationTerm: string;
		termMatch: boolean | null;

		soaLoanAmount: string;
		loanAmountMatch: boolean | null;

		soaBalance: string;
		balanceMatch: boolean | null;

		soaLoanGranted: string;
		loanGrantedMatch: boolean | null;
	};
};
