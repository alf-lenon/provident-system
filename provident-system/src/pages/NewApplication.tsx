import { useState } from 'react';

type FormData = {
	// TypeScript
	borrower: {
		// Fields
		fullName: string;
		employeeNumber: string;
		school: string;
		position: string;
		code: string;
		lafNumber: string;
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

	soa: {
		checkNumber: string;
		lastMonth: string;
	};

	documentNumbers: {
		dvNumber: string;
	};
};

type BackendResult = {
	message: string;

	application: {
		evaluation: {
			netPayAfterDeduction: number;
			isNPADValid: boolean;
			isThirtyPercentPaidValid: boolean;
			finalLoanGranted: number;
			hasSalaryInputs: boolean;
			isCoMakerValid: boolean;
			isUndeValid: boolean;
			status: string;
			remarks: string[];
		};
	};
};

function NewApplication() {
	const [formData, setFormData] = useState<FormData>({
		borrower: {
			fullName: '',
			employeeNumber: '',
			school: '',
			position: '',
			code: '',
			lafNumber: '',
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

		soa: {
			checkNumber: '',
			lastMonth: '',
		},

		documentNumbers: {
			dvNumber: '',
		},
	});

	// Back end result state
	const [result, setResult] = useState<BackendResult | null>(null);
	const [successMessage, setSuccessMessage] = useState('');
	const [errorMessage, setErrorMessage] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

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

	const handleSoaChange = (field: keyof FormData['soa'], value: string) => {
		setFormData((prev) => ({
			...prev,
			soa: {
				...prev.soa,
				[field]: value,
			},
		}));
	};

	const handleDocumentNumberChange = (
		field: keyof FormData['documentNumbers'],
		value: string,
	) => {
		setFormData((prev) => ({
			...prev,
			documentNumbers: {
				...prev.documentNumbers,
				[field]: value,
			},
		}));
	};

	// Send data to back end

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setResult(null);

		try {
			// Prevent double submit
			setIsSubmitting(true);
			setErrorMessage('');
			setSuccessMessage('');

			const response = await fetch('http://localhost:5000/applications', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(formData),
			});

			const data = await response.json();

			if (!response.ok) {
				setErrorMessage(data.message || 'Something went wrong');
				return;
			}

			setResult(data);
			setSuccessMessage(data.message || 'Application submitted successfully');
		} catch (error) {
			console.error('Error', error);
			setErrorMessage('Could not connect to the server.');
		} finally {
			setIsSubmitting(false);
		}
	};

	// Format currency
	const formatPeso = (amount: number) => amount.toLocaleString('en-PH');

	// Shared input style
	const inputClass =
		'border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500';

	const sectionClass =
		'bg-white border border-gray-200 rounded-2xl shadow-sm p-6';

	const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
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
			<form onSubmit={handleSubmit} className='max-w-6xl mx-auto space-y-8'>
				{/* Borrower Information */}
				<section className={sectionClass}>
					<h2 className='text-lg font-semibold mb-4 text-gray-800'>
						Borrower Information
					</h2>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<div>
							<label className={labelClass}>Full Name</label>

							<input
								type='text'
								className={`${inputClass} uppercase`}
								value={formData.borrower.fullName}
								onChange={(e) =>
									handleBorrowerChange('fullName', e.target.value.toUpperCase())
								}
								required
							/>
						</div>

						<div>
							<label className={labelClass}>Employee Number</label>

							<input
								type='text'
								className={inputClass}
								value={formData.borrower.employeeNumber}
								onChange={(e) =>
									handleBorrowerChange('employeeNumber', e.target.value)
								}
								required
							/>
						</div>

						<div>
							<label className={labelClass}>School / Office</label>

							<input
								type='text'
								className={`${inputClass} uppercase`}
								value={formData.borrower.school}
								onChange={(e) =>
									handleBorrowerChange('school', e.target.value.toUpperCase())
								}
								required
							/>
						</div>

						<div>
							<label className={labelClass}>Position</label>
							<input
								type='text'
								className={`${inputClass} uppercase`}
								value={formData.borrower.position}
								onChange={(e) =>
									handleBorrowerChange('position', e.target.value.toUpperCase())
								}
								required
							/>
						</div>

						<div>
							<label className={labelClass}>Code/ Sta</label>

							<input
								type='text'
								inputMode='numeric'
								className={`${inputClass}`}
								value={formData.borrower.code}
								onChange={(e) =>
									handleBorrowerChange(
										'code',
										e.target.value.replace(/\D/g, ''),
									)
								}
								required
							/>
						</div>

						<div>
							<label className={labelClass}>LAF Number</label>

							<input
								type='text'
								inputMode='numeric'
								className={inputClass}
								value={formData.borrower.lafNumber}
								onChange={(e) =>
									handleBorrowerChange(
										'lafNumber',
										e.target.value.replace(/\D/g, ''),
									)
								}
								required
							/>
						</div>

						<div>
							<label className={labelClass}>Salary Grade</label>

							<input
								type='text'
								inputMode='numeric'
								className={inputClass}
								value={formData.borrower.salaryGrade}
								onChange={(e) =>
									handleBorrowerChange(
										'salaryGrade',
										e.target.value.replace(/\D/g, ''),
									)
								}
								required
							/>
						</div>

						<div>
							<label className={labelClass}>Salary Step</label>
							<input
								type='text'
								inputMode='numeric'
								className={inputClass}
								value={formData.borrower.salaryStep}
								onChange={(e) =>
									handleBorrowerChange(
										'salaryStep',
										e.target.value.replace(/\D/g, ''),
									)
								}
								required
							/>
						</div>

						{/* Co-maker Section */}
						<h3 className='col-span-2 font-semibold text-gray-700 mt-4'>
							Co-maker Information
						</h3>

						<div>
							<label className={labelClass}>Full Name</label>

							<input
								type='text'
								className={`${inputClass} uppercase`}
								value={formData.coMaker.name}
								onChange={(e) =>
									handleCoMakerChange('name', e.target.value.toUpperCase())
								}
								required
							/>
						</div>

						<div>
							<label className={labelClass}>Employee Number</label>
							<input
								type='text'
								className={inputClass}
								value={formData.coMaker.employeeNumber}
								onChange={(e) =>
									handleCoMakerChange('employeeNumber', e.target.value)
								}
								required
							/>
						</div>

						<div>
							<label className={labelClass}>Contact Number</label>

							<input
								type='text'
								className={inputClass}
								value={formData.coMaker.contactNumber}
								onChange={(e) =>
									handleCoMakerChange('contactNumber', e.target.value)
								}
								required
							/>
						</div>

						<div>
							<label className={labelClass}>Salary Grade</label>
							<input
								type='text'
								inputMode='numeric'
								className={inputClass}
								value={formData.coMaker.salaryGrade}
								onChange={(e) =>
									handleCoMakerChange(
										'salaryGrade',
										e.target.value.replace(/\D/g, ''),
									)
								}
								required
							/>
						</div>

						<div>
							<label className={labelClass}>Salary Step</label>

							<input
								type='text'
								inputMode='numeric'
								className={inputClass}
								value={formData.coMaker.salaryStep}
								onChange={(e) =>
									handleCoMakerChange(
										'salaryStep',
										e.target.value.replace(/\D/g, ''),
									)
								}
								required
							/>
						</div>

						{result?.application?.evaluation?.hasSalaryInputs && (
							<p className='text-sm text-blue-600'>
								Co-Maker valid:{' '}
								{result?.application?.evaluation?.isCoMakerValid ? 'Yes' : 'No'}
							</p>
						)}
					</div>
				</section>

				{/* Loan Information */}
				<section className={sectionClass}>
					<h2 className='text-lg font-semibold mb-4 text-gray-800'>
						Loan Information
					</h2>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						{/* Loan Type */}
						<div>
							<select
								required
								className={inputClass}
								value={formData.loan.loanType}
								onChange={(e) => handleLoanChange('loanType', e.target.value)}
							>
								<option value=''>Select Loan Type</option>
								<option>New</option>
								<option>Renewal</option>
								<option>Additional</option>
							</select>
						</div>

						{/* Purpose */}
						<div>
							<select
								required
								className={inputClass}
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

						<div>
							<label className={labelClass}>Requested Loan Amount</label>
							<input
								type='text'
								inputMode='decimal'
								className={inputClass}
								value={formData.loan.loanAmount}
								onChange={(e) =>
									handleLoanChange(
										'loanAmount',
										e.target.value.replace(/[^0-9.]/g, ''),
									)
								}
								required
							/>
						</div>

						{/* Term */}
						<div>
							<select
								required
								className={inputClass}
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
						</div>

						<div>
							<label className={labelClass}>Account Number</label>
							<input
								type='text'
								className={inputClass}
								value={formData.loan.accountNumber}
								onChange={(e) =>
									handleLoanChange('accountNumber', e.target.value)
								}
								required
							/>
						</div>
					</div>
				</section>

				{/* Checklist / Documents */}
				<section className={sectionClass}>
					<h2 className='text-lg font-semibold mb-4 text-gray-800'>
						Checklist / Documents
					</h2>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<label className='flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition'>
							<input
								type='checkbox'
								checked={formData.checklist.loanApplicationForm}
								onChange={(e) =>
									handleCheckListChange('loanApplicationForm', e.target.checked)
								}
							/>
							Loan Application Form
						</label>

						<label className='flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition'>
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

						<label className='flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition'>
							<input
								type='checkbox'
								checked={formData.checklist.latestPayslip}
								onChange={(e) =>
									handleCheckListChange('latestPayslip', e.target.checked)
								}
							/>
							Latest Payslip
						</label>

						<label className='flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition'>
							<input
								type='checkbox'
								checked={formData.checklist.approvedAppointment}
								onChange={(e) =>
									handleCheckListChange('approvedAppointment', e.target.checked)
								}
							/>
							Approved Appointment
						</label>

						<label className='flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition'>
							<input
								type='checkbox'
								checked={formData.checklist.coMakerDocuments}
								onChange={(e) =>
									handleCheckListChange('coMakerDocuments', e.target.checked)
								}
							/>
							Co-maker Documents
						</label>

						<label className='flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition'>
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

						<label className='flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition'>
							<input
								type='checkbox'
								checked={formData.checklist.soa}
								onChange={(e) => handleCheckListChange('soa', e.target.checked)}
							/>
							SOA (for Renewal only)
						</label>

						<label className='flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition'>
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

						<label className='flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition'>
							<input
								type='checkbox'
								checked={formData.checklist.payslipReadable}
								onChange={(e) =>
									handleCheckListChange('payslipReadable', e.target.checked)
								}
							/>
							Payslip is Readable
						</label>

						<label className='flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition'>
							<input
								type='checkbox'
								checked={formData.checklist.payslipOriginal}
								onChange={(e) =>
									handleCheckListChange('payslipOriginal', e.target.checked)
								}
							/>
							Payslip is Original
						</label>

						<label className='flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition'>
							<input
								type='checkbox'
								checked={formData.checklist.supportingDocuments}
								onChange={(e) =>
									handleCheckListChange('supportingDocuments', e.target.checked)
								}
							/>
							Supporting Documents
						</label>

						<label className='flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition'>
							<input
								type='checkbox'
								checked={formData.checklist.photocopyOfId}
								onChange={(e) =>
									handleCheckListChange('photocopyOfId', e.target.checked)
								}
							/>
							Photocopy of ID
						</label>

						<label className='flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition'>
							<input
								type='checkbox'
								checked={formData.checklist.photocopyOfAtm}
								onChange={(e) =>
									handleCheckListChange('photocopyOfAtm', e.target.checked)
								}
							/>
							Photocopy of ATM
						</label>

						<label className='flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition'>
							<input
								type='checkbox'
								checked={formData.flags.hasUndeLoan}
								onChange={(e) =>
									handleFlagChange('hasUndeLoan', e.target.checked)
								}
							/>
							Has UNDE Loan
						</label>
						{result && (
							<p
								className={
									result?.application?.evaluation?.isUndeValid
										? 'text-green-600'
										: 'text-red-600'
								}
							>
								UNDE Status:{' '}
								{result?.application?.evaluation?.isUndeValid
									? 'No UNDE'
									: 'Has UNDE Loan'}
							</p>
						)}
					</div>
				</section>

				{formData.loan.loanType === 'Renewal' && (
					<section className={sectionClass}>
						<h2 className='text-lg font-semibold mb-4 text-gray-800'>
							SOA Information
						</h2>

						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							<div>
								<label className={labelClass}>SOA Check Number</label>
								<input
									type='text'
									className={inputClass}
									value={formData.soa.checkNumber}
									onChange={(e) =>
										handleSoaChange('checkNumber', e.target.value)
									}
								/>
							</div>

							<div>
								<label className={labelClass}>Last Month SOA</label>
								<input
									type='text'
									className={inputClass}
									value={formData.soa.lastMonth}
									onChange={(e) => handleSoaChange('lastMonth', e.target.value)}
								/>
							</div>
						</div>
					</section>
				)}

				<section className={sectionClass}>
					<h2 className='text-lg font-semibold mb-4 text-gray-800'>
						Document Numbers
					</h2>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<div>
							<label className={labelClass}>D.V Number / REF</label>

							<input
								type='text'
								className={inputClass}
								value={formData.documentNumbers.dvNumber}
								onChange={(e) =>
									handleDocumentNumberChange('dvNumber', e.target.value)
								}
								placeholder='2026-05-4079'
							/>
						</div>
					</div>
				</section>

				{/* Evaluation */}
				<section className={sectionClass}>
					<h2 className='text-lg font-semibold mb-4 text-gray-800'>
						Evaluation
					</h2>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<div>
							<label className={labelClass}>Net Pay</label>
							<input
								type='text'
								inputMode='decimal'
								className={inputClass}
								value={formData.evaluation.netPay}
								onChange={(e) =>
									handleEvaluationChange(
										'netPay',
										e.target.value.replace(/[^0-9.]/g, ''),
									)
								}
								required
							/>
						</div>

						<div>
							<label className={labelClass}>New Deduction</label>
							<input
								type='text'
								inputMode='decimal'
								className={inputClass}
								value={formData.evaluation.newDeduction}
								onChange={(e) =>
									handleEvaluationChange(
										'newDeduction',
										e.target.value.replace(/[^0-9.]/g, ''),
									)
								}
								required
							/>
						</div>

						<div>
							<label className={labelClass}>
								Existing Balance (Renewal only)
							</label>
							<input
								type='text'
								inputMode='decimal'
								className={inputClass}
								value={formData.evaluation.existingBalance}
								onChange={(e) =>
									handleEvaluationChange(
										'existingBalance',
										e.target.value.replace(/[^0-9.]/g, ''),
									)
								}
							/>
						</div>

						<div>
							<label className={labelClass}>
								Existing Deduction (Renewal only)
							</label>
							<input
								type='text'
								inputMode='decimal'
								className={inputClass}
								value={formData.evaluation.existingDeduction}
								onChange={(e) =>
									handleEvaluationChange(
										'existingDeduction',
										e.target.value.replace(/[^0-9.]/g, ''),
									)
								}
							/>
						</div>

						<div>
							<label className={labelClass}>
								% Principal Paid (Renewal only)
								<input
									type='text'
									inputMode='numeric'
									className={inputClass}
									value={formData.evaluation.percentPrincipalPaid}
									onChange={(e) =>
										handleEvaluationChange(
											'percentPrincipalPaid',
											e.target.value.replace(/[^0-9.]/g, ''),
										)
									}
								/>
							</label>
						</div>
					</div>
				</section>

				{/* Result */}
				<section className={sectionClass}>
					<h2 className='text-lg font-semibold mb-4 text-gray-800'>Result</h2>

					<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
						<div className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm'>
							<p className='text-sm text-gray-500'>Final Loan Granted</p>

							<h3 className='text-2xl font-bold text-gray-800 mt-2'>
								₱
								{formatPeso(
									result?.application?.evaluation?.finalLoanGranted ?? 0,
								)}
							</h3>
						</div>
						<div className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm'>
							<p className='text-sm text-gray-500'>Net Pay After Deduction</p>

							<h3 className='text-2xl font-bold text-gray-800 mt-2'>
								₱
								{formatPeso(
									result?.application?.evaluation?.netPayAfterDeduction ?? 0,
								)}
							</h3>
						</div>

						<div className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm'>
							{result && (
								<p
									className={
										result?.application?.evaluation?.isNPADValid
											? 'text-sm text-green-600'
											: 'text-sm text-red-600'
									}
								>
									NPAD Status:{' '}
									{result?.application?.evaluation?.isNPADValid
										? 'Valid'
										: 'Below ₱5,000'}
								</p>
							)}
						</div>

						{result && (
							<p
								className={
									result.application.evaluation.status === 'Rejected'
										? 'text-red-600 font-semibold'
										: result.application.evaluation.status ===
											  'Needs Correction'
											? 'text-yellow-600 font-semibold'
											: 'text-green-600 font-semibold'
								}
							>
								Status: {result.application.evaluation.status}
							</p>
						)}
						{result?.application?.evaluation?.status === 'Rejected' && (
							<ul className='text-sm text-gray-600 mt-2'>
								{!result?.application?.evaluation?.isCoMakerValid && (
									<li>• Co-maker salary is not valid</li>
								)}
								{!result?.application?.evaluation?.isNPADValid && (
									<li>• Net Pay After Deduction is below ₱5,000</li>
								)}
								{!result?.application?.evaluation?.isUndeValid && (
									<li>• Borrower has UNDE loan</li>
								)}

								{!result?.application?.evaluation?.isThirtyPercentPaidValid && (
									<li>• Renewal loan is below the 30% paid rule</li>
								)}
							</ul>
						)}

						{result?.application?.evaluation?.status === 'Needs Correction' && (
							<ul className='text-sm text-gray-600 mt-2'>
								{result?.application?.evaluation?.remarks.map(
									(reason, index) => (
										<li key={index}>• {reason}</li>
									),
								)}
							</ul>
						)}

						{result?.application?.evaluation?.status ===
							'Ready for Processing' && (
							<p className='text-green-600'>
								Application is ready for processing
							</p>
						)}
					</div>
				</section>

				{successMessage && (
					<p className='bg-green-100 text-green-700 p-3 rounded'>
						{successMessage}
					</p>
				)}

				{errorMessage && (
					<p className='bg-red-100 text-red-700 p-3 rounded'>{errorMessage}</p>
				)}

				<div className='sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end gap-3 rounded-b-2xl'>
					<button
						type='submit'
						disabled={isSubmitting}
						className={
							isSubmitting
								? 'bg-gray-300 text-gray-500 px-6 py-2 rounded-lg cursor-not-allowed'
								: 'bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition'
						}
					>
						{isSubmitting ? 'Submitting...' : 'Submit Application'}
					</button>
				</div>
			</form>
		</main>
	);
}

export default NewApplication;
