export const computeNPAD = (
	netPay: number,
	newDeduction: number,
	existingDeduction: number,
	isRenewal: boolean,
) => {
	if (isRenewal) {
		return netPay - newDeduction + existingDeduction;
	}

	// If not renewal
	return netPay - newDeduction;
};

export const computeFinalLoanGranted = (
	requestedLoanAmount: number,
	existingBalance: number,
	isRenewal: boolean,
) => {
	if (isRenewal) {
		return requestedLoanAmount - existingBalance;
	}

	// If not renewal
	return requestedLoanAmount;
};

export const validateCoMaker = (
	coMakerGrade: number,
	borrowerGrade: number,
	coMakerStep: number,
	borrowerStep: number,
	hasSalaryInputs: boolean,
) => {
	if (hasSalaryInputs) {
		return (
			coMakerGrade > borrowerGrade ||
			(coMakerGrade === borrowerGrade && coMakerStep >= borrowerStep)
		);
	}

	return true;
};

export const computeStatus = (isRejected: boolean, hasCorrections: boolean) => {
	if (isRejected) {
		return 'Rejected';
	}

	if (hasCorrections) {
		return 'Needs Correction';
	}

	return 'Ready for Processing';
};

export const generateCorrectionReasons = (
	formData: any,
	isRenewal: boolean,
	finalLoanGranted: number,
) => {
	const correctionReasons: string[] = [];

	// Check fields one by one
	if (!formData.borrower.fullName) {
		correctionReasons.push("Missing Borrower's Full Name");
	}

	if (!formData.borrower.code) {
		correctionReasons.push("Missing Borrower's code/sta");
	}

	if (!formData.borrower.lafNumber) {
		correctionReasons.push("Missing Borrower's LAF No.");
	}

	if (!formData.coMaker.name) {
		correctionReasons.push("Missing Co-Maker's Full Name");
	}

	if (!formData.loan.loanAmount) {
		correctionReasons.push('Missing Loan Amount');
	}

	if (!formData.loan.accountNumber) {
		correctionReasons.push('Missing Account Number');
	}

	if (!formData.borrower.employeeNumber) {
		correctionReasons.push("Missing Borrower's Employee Number");
	}

	if (!formData.coMaker.employeeNumber) {
		correctionReasons.push("Missing Co-Maker's Employee Number");
	}

	if (!formData.loan.loanType) {
		correctionReasons.push('Missing Loan Type');
	}

	if (!formData.checklist.soa && isRenewal) {
		correctionReasons.push('SOA is required for renewal');
	}

	if (!formData.checklist.payslipReadable) {
		correctionReasons.push('Payslip is not readable');
	}

	if (!formData.checklist.authorizationFormComplete) {
		correctionReasons.push('Authorization form is not complete');
	}

	if (!formData.checklist.payslipOriginal) {
		correctionReasons.push('Payslip of borrower is not original');
	}

	if (!formData.checklist.supportingDocuments) {
		correctionReasons.push('Missing or insufficient supporting documents');
	}

	if (!formData.checklist.photocopyOfId) {
		correctionReasons.push('Missing Photocopy of ID');
	}

	if (!formData.checklist.photocopyOfAtm) {
		correctionReasons.push('Missing Photocopy of ATM');
	}

	if (!formData.checklist.accountNumberVerified) {
		correctionReasons.push('Account number is not verified');
	}

	if (!formData.loan.term) {
		correctionReasons.push('Missing Term');
	}

	if (!formData.loan.purpose) {
		correctionReasons.push('Missing Loan Purpose');
	}

	if (isRenewal && finalLoanGranted <= 0) {
		correctionReasons.push(
			'Requested amount is too low after deducting existing balance. Consider increasing loan amount.',
		);
	}

	if (!formData.checklist.loanApplicationForm) {
		correctionReasons.push('Missing Loan Application Form');
	}

	if (!formData.checklist.authorizationSalaryDeduction) {
		correctionReasons.push(
			'Authorization for Salary Deduction fields are empty',
		);
	}

	if (!formData.checklist.latestPayslip) {
		correctionReasons.push('Payslip is not latest');
	}

	if (!formData.checklist.approvedAppointment) {
		correctionReasons.push('Appointment is not approved');
	}

	if (!formData.checklist.coMakerDocuments) {
		correctionReasons.push('Missing Co-maker documents');
	}

	return correctionReasons;
};
