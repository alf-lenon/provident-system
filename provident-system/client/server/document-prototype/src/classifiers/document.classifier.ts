import type { DocumentType } from '../types/scan.types.js';

export function classifyDocument(text: string): DocumentType {
	const t = text.toLowerCase();

	// ----------------------------
	// LOAN APPLICATION
	// ----------------------------

	if (
		t.includes('provident fund') &&
		(t.includes("borrower's information") ||
			t.includes('borrower information')) &&
		t.includes('co-maker')
	) {
		return 'loan-application';
	}

	// ----------------------------
	// AUTHORIZATION
	// ----------------------------

	if (t.includes('authorization') && t.includes('salary deduction')) {
		return 'authorization';
	}

	// ----------------------------
	// PAYSLIP
	// ----------------------------

	// ----------------------------
	// PAYSLIP
	// ----------------------------

	const payslipScore = [
		'payroll slip',
		'gross compensation',
		'total deductions',
		'basic salary',
		'employee no',
		'account no',
		'grade',
		'step',
		'provident fund',
	].filter((keyword) => t.includes(keyword)).length;

	if (t.includes('payroll slip') || payslipScore >= 3) {
		return 'payslip';
	}

	// ----------------------------
	// LOAN SCHEDULE
	// ----------------------------

	const loanScheduleScore = [
		'schedule of loan payments',
		'amount still due',
		'principal paid',
		'check no',
		'amortization',
		'total loan',
	].filter((keyword) => t.includes(keyword)).length;

	if (t.includes('schedule of loan payments') || loanScheduleScore >= 3) {
		return 'loan-schedule';
	}

	// ----------------------------
	// SOA
	// ----------------------------

	const soaScore = [
		'provident loan',
		'total amount still due',
		'loan requested',
		'loan granted',
		'updated soa',
	].filter((keyword) => t.includes(keyword)).length;

	if (soaScore >= 2) {
		return 'soa';
	}

	return 'unknown';
}
