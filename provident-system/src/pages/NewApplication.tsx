import { useState } from 'react';

type FormData = {
	// TypeScript
	borrower: {
		// Fields
		fullName: string;
		employeeNumber: string;
		school: string;
		position: string;
		salaryGrade: string;
		salaryStep: string;
	};
	coMaker: {
		// Fields
		name: string;
		employeeNumber: string;
		contactNumber: string;
		salaryGrade: string;
		salaryStep: string;
	};
	loan: {
		// Fields
		loanAmount: string;
		accountNumber: string;
		loanType: string;
		term: string;
		purpose: string;
	};

	evaluation: {
		netPay: string;
		newDeduction: string;
		existingDeduction: string;
		existingBalance: string;
		percentPrincipalPaid: string;
	};

	flags: {
		hasUndeLoan: boolean; // true or false
	};
	checklist: {
		soa: boolean;
		payslipReadable: boolean;
		payslipOriginal: boolean;
		authorizationFormComplete: boolean;
		supportingDocuments: boolean;
		photocopyOfId: boolean;
		photocopyOfAtm: boolean;
		accountNumberVerified: boolean;
		loanApplicationForm: boolean;
		authorizationSalaryDeduction: boolean;
		latestPayslip: boolean;
		approvedAppointment: boolean;
		coMakerDocuments: boolean;
	};
};

function NewApplication() {
	const [formData, setFormData] = useState<FormData>({
		borrower: {
			fullName: '',
			employeeNumber: '',
			school: '',
			position: '',
			salaryGrade: '',
			salaryStep: '',
		},
		coMaker: {
			name: '',
			employeeNumber: '',
			contactNumber: '',
			salaryGrade: '',
			salaryStep: '',
		},
		loan: {
			loanAmount: '',
			accountNumber: '',
			loanType: '',
			term: '',
			purpose: '',
		},
		evaluation: {
			netPay: '',
			newDeduction: '',
			existingDeduction: '',
			existingBalance: '',
			percentPrincipalPaid: '',
		},

		flags: {
			hasUndeLoan: false,
		},
		checklist: {
			soa: false,
			payslipReadable: false,
			payslipOriginal: false,
			authorizationFormComplete: false,
			supportingDocuments: false,
			photocopyOfId: false,
			photocopyOfAtm: false,
			accountNumberVerified: false,
			loanApplicationForm: false,
			authorizationSalaryDeduction: false,
			latestPayslip: false,
			approvedAppointment: false,
			coMakerDocuments: false,
		},
	});

	const handleBorrowerChange = (
		field: keyof FormData['borrower'],
		value: string,
	) => {
		setFormData((prev) => ({
			...prev,
			borrower: {
				...prev.borrower,
				[field]: value,
			},
		}));
	};

	const handleCoMakerChange = (
		field: keyof FormData['coMaker'],
		value: string,
	) => {
		setFormData((prev) => ({
			...prev,
			coMaker: {
				...prev.coMaker,
				[field]: value,
			},
		}));
	};

	const handleLoanChange = (field: keyof FormData['loan'], value: string) => {
		setFormData((prev) => ({
			...prev,
			loan: {
				...prev.loan,
				[field]: value,
			},
		}));
	};

	const handleEvaluationChange = (
		field: keyof FormData['evaluation'],
		value: string,
	) => {
		setFormData((prev) => ({
			...prev,
			evaluation: {
				...prev.evaluation,
				[field]: value,
			},
		}));
	};

	const handleFlagChange = (field: keyof FormData['flags'], value: boolean) => {
		setFormData((prev) => ({
			...prev,
			flags: {
				...prev.flags,
				[field]: value,
			},
		}));
	};

	const handleCheckListChange = (
		field: keyof FormData['checklist'],
		value: boolean,
	) => {
		setFormData((prev) => ({
			...prev,
			checklist: {
				...prev.checklist,
				[field]: value,
			},
		}));
	};

	// Borrower Informations
	const borrowerGrade = Number(formData.borrower.salaryGrade);
	const borrowerStep = Number(formData.borrower.salaryStep);

	// Co maker Informations
	const coMakerGrade = Number(formData.coMaker.salaryGrade);
	const coMakerStep = Number(formData.coMaker.salaryStep);

	const hasCoMakerSalaryInputs =
		formData.borrower.salaryGrade &&
		formData.borrower.salaryStep &&
		formData.coMaker.salaryGrade &&
		formData.coMaker.salaryStep;

	// Co maker validation
	const isCoMakerValid = hasCoMakerSalaryInputs
		? coMakerGrade > borrowerGrade ||
			(coMakerGrade === borrowerGrade && coMakerStep >= borrowerStep)
		: true;

	// Evaluation fields
	const netPay = Number(formData.evaluation.netPay);
	const newDeduction = Number(formData.evaluation.newDeduction);
	const existingDeduction = Number(formData.evaluation.existingDeduction);
	const existingBalance = Number(formData.evaluation.existingBalance);
	const percentPrincipalPaid = Number(formData.evaluation.percentPrincipalPaid);

	// Requested Loan Amount
	const requestedLoanAmount = Number(formData.loan.loanAmount);

	// If Loan type is Renewal
	const isRenewal = formData.loan.loanType === 'Renewal';

	// Final Loan Granted
	const finalLoanGranted = isRenewal
		? requestedLoanAmount - existingBalance
		: requestedLoanAmount;

	// Renewal Loan Type Principal Paid must be at least 30% rule
	const isThirtyPercentPaidValid = !isRenewal || percentPrincipalPaid >= 30;

	// Net Pay After Deduction
	const netPayAfterDeduction = isRenewal
		? netPay - newDeduction + existingDeduction
		: netPay - newDeduction;

	// NPAD Validation
	const isNPADValid = netPayAfterDeduction >= 5000;

	// UNDE Loan Validation
	const isUndeValid = !formData.flags.hasUndeLoan;

	const isRejected =
		!isCoMakerValid ||
		!isNPADValid ||
		!isUndeValid ||
		!isThirtyPercentPaidValid;

	let status = 'Pending';

	// Correction Reasons
	const correctionReasons: string[] = [];

	// Check fields one by one
	if (!formData.borrower.fullName) {
		correctionReasons.push("Missing Borrower's Full Name");
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

	if (!formData.checklist.soa && formData.loan.loanType === 'Renewal') {
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

	const hasCorrections = correctionReasons.length > 0;

	// Status logic
	if (isRejected) {
		status = 'Rejected';
	} else if (hasCorrections) {
		status = 'Needs Correction';
	} else {
		status = 'Ready for Processing';
	}

	// Format currency
	const formatPeso = (amount: number) => amount.toLocaleString('en-PH');

	return (
		<main className='min-h-screen bg-gray-100 p-6'>
			{/* Header */}
			<header className='mb-6'>
				<h1 className='text-2xl font-bold text-gray-800'>
					New Loan Application
				</h1>
				<p className='text-gray-600'>Fill out borrower and loan details</p>
			</header>

			{/* Form Container */}
			<div className='bg-white p-6 rounded-lg shadow space-y-8'>
				{/* Borrower Information */}
				<section>
					<h2 className='text-lg font-semibold mb-4 text-gray-800'>
						Borrower Information
					</h2>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<input
							type='text'
							placeholder='Full Name'
							className='border p-2 rounded'
							value={formData.borrower.fullName}
							onChange={(e) => handleBorrowerChange('fullName', e.target.value)}
						/>
						<input
							type='text'
							placeholder='Employee Number'
							className='border p-2 rounded'
							value={formData.borrower.employeeNumber}
							onChange={(e) =>
								handleBorrowerChange('employeeNumber', e.target.value)
							}
						/>
						<input
							type='text'
							placeholder='School / Office'
							className='border p-2 rounded'
							value={formData.borrower.school}
							onChange={(e) => handleBorrowerChange('school', e.target.value)}
						/>
						<input
							type='text'
							placeholder='Position'
							className='border p-2 rounded'
							value={formData.borrower.position}
							onChange={(e) => handleBorrowerChange('position', e.target.value)}
						/>
						<input
							type='number'
							placeholder='Salary Grade'
							className='border p-2 rounded'
							value={formData.borrower.salaryGrade}
							onChange={(e) =>
								handleBorrowerChange('salaryGrade', e.target.value)
							}
						/>
						<input
							type='number'
							placeholder='Salary Step'
							className='border p-2 rounded'
							value={formData.borrower.salaryStep}
							onChange={(e) =>
								handleBorrowerChange('salaryStep', e.target.value)
							}
						/>
						{/* Co-maker Section */}
						<h3 className='col-span-2 font-semibold text-gray-700 mt-4'>
							Co-maker Information
						</h3>
						<input
							type='text'
							placeholder='Co-maker Name'
							className='border p-2 rounded'
							value={formData.coMaker.name}
							onChange={(e) => handleCoMakerChange('name', e.target.value)}
						/>
						<input
							type='text'
							placeholder='Co-maker Employee Number'
							className='border p-2 rounded'
							value={formData.coMaker.employeeNumber}
							onChange={(e) =>
								handleCoMakerChange('employeeNumber', e.target.value)
							}
						/>
						<input
							type='text'
							placeholder='Co-maker Contact Number'
							className='border p-2 rounded'
							value={formData.coMaker.contactNumber}
							onChange={(e) =>
								handleCoMakerChange('contactNumber', e.target.value)
							}
						/>
						<input
							type='number'
							placeholder='Salary Grade'
							className='border p-2 rounded'
							value={formData.coMaker.salaryGrade}
							onChange={(e) =>
								handleCoMakerChange('salaryGrade', e.target.value)
							}
						/>
						<input
							type='number'
							placeholder='Salary Step'
							className='border p-2 rounded'
							value={formData.coMaker.salaryStep}
							onChange={(e) =>
								handleCoMakerChange('salaryStep', e.target.value)
							}
						/>

						{hasCoMakerSalaryInputs && (
							<p className='text-sm text-blue-600'>
								Co-Maker valid: {isCoMakerValid ? 'Yes' : 'No'}
							</p>
						)}
					</div>
				</section>

				{/* Loan Information */}
				<section>
					<h2 className='text-lg font-semibold mb-4 text-gray-800'>
						Loan Information
					</h2>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						{/* Loan Type */}
						<select
							className='border p-2 rounded'
							value={formData.loan.loanType}
							onChange={(e) => handleLoanChange('loanType', e.target.value)}
						>
							<option value=''>Select Loan Type</option>
							<option>New</option>
							<option>Renewal</option>
							<option>Additional</option>
						</select>

						{/* Purpose */}
						<div>
							<select
								className='border p-2 rounded'
								value={formData.loan.purpose}
								onChange={(e) => handleLoanChange('purpose', e.target.value)}
							>
								<option value=''>Select Purpose</option>

								<option>Educational</option>
								<option>Medical</option>
								<option>House Repair</option>
								<option>Others</option>
							</select>

							<p className='text-sm text-gray-500'>
								Ensure purpose matches supporting documents and loan amount is
								reasonable.
							</p>
						</div>

						<input
							type='number'
							placeholder='Requested Loan Amount'
							className='border p-2 rounded'
							value={formData.loan.loanAmount}
							onChange={(e) => handleLoanChange('loanAmount', e.target.value)}
						/>

						{/* Term */}
						<select
							className='border p-2 rounded'
							value={formData.loan.term}
							onChange={(e) => handleLoanChange('term', e.target.value)}
						>
							<option value=''>Select Term</option>
							<option>12 months</option>
							<option>24 months</option>
							<option>36 months</option>
							<option>48 months</option>
							<option>60 months</option>
						</select>

						<input
							type='text'
							placeholder='Account Number'
							className='border p-2 rounded'
							value={formData.loan.accountNumber}
							onChange={(e) =>
								handleLoanChange('accountNumber', e.target.value)
							}
						/>
					</div>
				</section>

				{/* Checklist / Documents */}
				<section>
					<h2 className='text-lg font-semibold mb-4 text-gray-800'>
						Checklist / Documents
					</h2>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<label className='flex items-center gap-2'>
							<input
								type='checkbox'
								checked={formData.checklist.loanApplicationForm}
								onChange={(e) =>
									handleCheckListChange('loanApplicationForm', e.target.checked)
								}
							/>
							Loan Application Form
						</label>

						<label className='flex items-center gap-2'>
							<input
								type='checkbox'
								checked={formData.checklist.authorizationSalaryDeduction}
								onChange={(e) =>
									handleCheckListChange(
										'authorizationSalaryDeduction',
										e.target.checked,
									)
								}
							/>
							Authorization for Salary Deduction
						</label>

						<label className='flex items-center gap-2'>
							<input
								type='checkbox'
								checked={formData.checklist.latestPayslip}
								onChange={(e) =>
									handleCheckListChange('latestPayslip', e.target.checked)
								}
							/>
							Latest Payslip
						</label>

						<label className='flex items-center gap-2'>
							<input
								type='checkbox'
								checked={formData.checklist.approvedAppointment}
								onChange={(e) =>
									handleCheckListChange('approvedAppointment', e.target.checked)
								}
							/>
							Approved Appointment
						</label>

						<label className='flex items-center gap-2'>
							<input
								type='checkbox'
								checked={formData.checklist.coMakerDocuments}
								onChange={(e) =>
									handleCheckListChange('coMakerDocuments', e.target.checked)
								}
							/>
							Co-maker Documents
						</label>

						<label className='flex items-center gap-2'>
							<input
								type='checkbox'
								checked={formData.checklist.accountNumberVerified}
								onChange={(e) =>
									handleCheckListChange(
										'accountNumberVerified',
										e.target.checked,
									)
								}
							/>
							Account Number Verified
						</label>

						<label className='flex items-center gap-2'>
							<input
								type='checkbox'
								checked={formData.checklist.soa}
								onChange={(e) => handleCheckListChange('soa', e.target.checked)}
							/>
							SOA (for Renewal only)
						</label>

						<label className='flex items-center gap-2'>
							<input
								type='checkbox'
								checked={formData.checklist.authorizationFormComplete}
								onChange={(e) =>
									handleCheckListChange(
										'authorizationFormComplete',
										e.target.checked,
									)
								}
							/>
							Authorization Form Complete
						</label>

						<label className='flex items-center gap-2'>
							<input
								type='checkbox'
								checked={formData.checklist.payslipReadable}
								onChange={(e) =>
									handleCheckListChange('payslipReadable', e.target.checked)
								}
							/>
							Payslip is Readable
						</label>

						<label className='flex items-center gap-2'>
							<input
								type='checkbox'
								checked={formData.checklist.payslipOriginal}
								onChange={(e) =>
									handleCheckListChange('payslipOriginal', e.target.checked)
								}
							/>
							Payslip is Original
						</label>

						<label className='flex items-center gap-2'>
							<input
								type='checkbox'
								checked={formData.checklist.supportingDocuments}
								onChange={(e) =>
									handleCheckListChange('supportingDocuments', e.target.checked)
								}
							/>
							Supporting Documents
						</label>

						<label className='flex items-center gap-2'>
							<input
								type='checkbox'
								checked={formData.checklist.photocopyOfId}
								onChange={(e) =>
									handleCheckListChange('photocopyOfId', e.target.checked)
								}
							/>
							Photocopy of ID
						</label>

						<label className='flex items-center gap-2'>
							<input
								type='checkbox'
								checked={formData.checklist.photocopyOfAtm}
								onChange={(e) =>
									handleCheckListChange('photocopyOfAtm', e.target.checked)
								}
							/>
							Photocopy of ATM
						</label>

						<label className='flex items-center gap-2'>
							<input
								type='checkbox'
								checked={formData.flags.hasUndeLoan}
								onChange={(e) =>
									handleFlagChange('hasUndeLoan', e.target.checked)
								}
							/>
							Has UNDE Loan
						</label>

						<p className={isUndeValid ? 'text-green-600' : 'text-red-600'}>
							UNDE Status: {isUndeValid ? 'No UNDE' : 'Has UNDE Loan'}
						</p>
					</div>
				</section>

				{/* Evaluation */}
				<section>
					<h2 className='text-lg font-semibold mb-4 text-gray-800'>
						Evaluation
					</h2>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<input
							type='number'
							placeholder='Net Pay'
							className='border p-2 rounded'
							value={formData.evaluation.netPay}
							onChange={(e) => handleEvaluationChange('netPay', e.target.value)}
						/>

						<input
							type='number'
							placeholder='New Deduction'
							className='border p-2 rounded'
							value={formData.evaluation.newDeduction}
							onChange={(e) =>
								handleEvaluationChange('newDeduction', e.target.value)
							}
						/>
						<input
							type='number'
							placeholder='Existing Balance (Renewal only)'
							className='border p-2 rounded'
							value={formData.evaluation.existingBalance}
							onChange={(e) =>
								handleEvaluationChange('existingBalance', e.target.value)
							}
						/>
						<input
							type='number'
							placeholder='Existing Deduction (Renewal only)'
							className='border p-2 rounded'
							value={formData.evaluation.existingDeduction}
							onChange={(e) =>
								handleEvaluationChange('existingDeduction', e.target.value)
							}
						/>
						<input
							type='number'
							placeholder='% Principal Paid (Renewal only)'
							className='border p-2 rounded'
							value={formData.evaluation.percentPrincipalPaid}
							onChange={(e) =>
								handleEvaluationChange('percentPrincipalPaid', e.target.value)
							}
						/>
					</div>
				</section>

				{/* Result */}
				<section>
					<h2 className='text-lg font-semibold mb-4 text-gray-800'>Result</h2>

					<div className='bg-gray-50 p-4 rounded-lg space-y-2'>
						<p>
							<strong>Final Loan Granted:</strong> ₱
							{formatPeso(finalLoanGranted)}
						</p>
						<p>
							<strong>Net Pay After Deduction:</strong> ₱
							{formatPeso(netPayAfterDeduction)}
						</p>

						<p className={isNPADValid ? 'text-green-600' : 'text-red-600'}>
							NPAD Status: {isNPADValid ? 'Valid' : 'Below ₱5,000'}
						</p>

						<p
							className={
								status === 'Rejected'
									? 'text-red-600 font-semibold'
									: status === 'Needs Correction'
										? 'text-yellow-600 font-semibold'
										: 'text-green-600 font-semibold'
							}
						>
							Status: {status}
						</p>
						{status === 'Rejected' && (
							<ul className='text-sm text-gray-600 mt-2'>
								{!isCoMakerValid && <li>• Co-maker salary is not valid</li>}
								{!isNPADValid && (
									<li>• Net Pay After Deduction is below ₱5,000</li>
								)}
								{!isUndeValid && <li>• Borrower has UNDE loan</li>}

								{!isThirtyPercentPaidValid && (
									<li>• Renewal loan is below the 30% paid rule</li>
								)}
							</ul>
						)}

						{status === 'Needs Correction' && (
							<ul className='text-sm text-gray-600 mt-2'>
								{correctionReasons.map((reason, index) => (
									<li key={index}>• {reason}</li>
								))}
							</ul>
						)}

						{status === 'Ready for Processing' && (
							<p className='text-green-600'>
								Application is ready for processing
							</p>
						)}
					</div>
				</section>
			</div>
		</main>
	);
}

export default NewApplication;
