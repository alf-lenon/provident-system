import { useState } from 'react';

type FormData = {
	borrower: {
		fullName: string;
		employeeNumber: string;
		school: string;
		position: string;
		salaryGrade: string;
		salaryStep: string;
	};
	coMaker: {
		name: string;
		employeeNumber: string;
		contactNumber: string;
		salaryGrade: string;
		salaryStep: string;
	};
}; // TypeScript

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
	});

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
							onChange={
								(event) =>
									setFormData({
										...formData,
										borrower: {
											...formData.borrower, // ...formData means = Keep the other values unchanged.
											fullName: event.target.value,
										},
									}) // ...formData means = Keep the other values unchanged.
							}
						/>
						<p>{formData.borrower.fullName}</p>

						<input
							type='text'
							placeholder='Employee Number'
							className='border p-2 rounded'
							value={formData.borrower.employeeNumber}
							onChange={(event) =>
								setFormData({
									...formData,
									borrower: {
										...formData.borrower,
										employeeNumber: event.target.value,
									},
								})
							}
						/>
						<p>{formData.borrower.employeeNumber}</p>

						<input
							type='text'
							placeholder='School / Office'
							className='border p-2 rounded'
							value={formData.borrower.school}
							onChange={(event) =>
								setFormData({
									...formData,
									borrower: {
										...formData.borrower,
										school: event.target.value,
									},
								})
							}
						/>
						<p>{formData.borrower.school}</p>

						<input
							type='text'
							placeholder='Position'
							className='border p-2 rounded'
							value={formData.borrower.position}
							onChange={(event) =>
								setFormData({
									...formData,
									borrower: {
										...formData.borrower,
										position: event.target.value,
									},
								})
							}
						/>
						<p>{formData.borrower.position}</p>

						<input
							type='number'
							placeholder='Salary Grade'
							className='border p-2 rounded'
							value={formData.borrower.salaryGrade}
							onChange={(event) =>
								setFormData({
									...formData,
									borrower: {
										...formData.borrower,
										salaryGrade: event.target.value,
									},
								})
							}
						/>
						<p>{formData.borrower.salaryGrade}</p>

						<input
							type='number'
							placeholder='Salary Step'
							className='border p-2 rounded'
							value={formData.borrower.salaryStep}
							onChange={(event) =>
								setFormData({
									...formData,
									borrower: {
										...formData.borrower,
										salaryStep: event.target.value,
									},
								})
							}
						/>
						<p>{formData.borrower.salaryStep}</p>

						{/* Co-maker Section */}
						<h3 className='col-span-2 font-semibold text-gray-700 mt-4'>
							Co-maker Information
						</h3>

						<input
							type='text'
							placeholder='Co-maker Name'
							className='border p-2 rounded'
							value={formData.coMaker.name}
							onChange={(event) =>
								setFormData({
									...formData,
									coMaker: {
										...formData.coMaker,
										name: event.target.value,
									},
								})
							}
						/>
						<p>{formData.coMaker.name}</p>

						<input
							type='text'
							placeholder='Co-maker Employee Number'
							className='border p-2 rounded'
							value={formData.coMaker.employeeNumber}
							onChange={(event) =>
								setFormData({
									...formData,
									coMaker: {
										...formData.coMaker,
										employeeNumber: event.target.value,
									},
								})
							}
						/>
						<p>{formData.coMaker.employeeNumber}</p>

						<input
							type='text'
							placeholder='Co-maker Contact Number'
							className='border p-2 rounded'
							value={formData.coMaker.contactNumber}
							onChange={(event) =>
								setFormData({
									...formData,
									coMaker: {
										...formData.coMaker,
										contactNumber: event.target.value,
									},
								})
							}
						/>
						<p>{formData.coMaker.contactNumber}</p>

						<input
							type='number'
							placeholder='Salary Grade'
							className='border p-2 rounded'
							value={formData.coMaker.salaryGrade}
							onChange={(event) =>
								setFormData({
									...formData,
									coMaker: {
										...formData.coMaker,
										salaryGrade: event.target.value,
									},
								})
							}
						/>
						<p>{formData.coMaker.salaryGrade}</p>

						<input
							type='number'
							placeholder='Salary Step'
							className='border p-2 rounded'
							value={formData.coMaker.salaryStep}
							onChange={(event) =>
								setFormData({
									...formData,
									coMaker: {
										...formData.coMaker,
										salaryStep: event.target.value,
									},
								})
							}
						/>
						<p>{formData.coMaker.salaryStep}</p>
					</div>
				</section>

				{/* Loan Information */}
				<section>
					<h2 className='text-lg font-semibold mb-4 text-gray-800'>
						Loan Information
					</h2>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						{/* Loan Type */}
						<select className='border p-2 rounded'>
							<option value=''>Select Loan Type</option>
							<option>New</option>
							<option>Renewal</option>
							<option>Additional</option>
						</select>

						{/* Purpose */}
						<div>
							<select className='border p-2 rounded'>
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
						/>

						{/* Term */}
						<select className='border p-2 rounded'>
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
							<input type='checkbox' />
							Loan Application Form
						</label>

						<label className='flex items-center gap-2'>
							<input type='checkbox' />
							Authorization for Salary Deduction
						</label>

						<label className='flex items-center gap-2'>
							<input type='checkbox' />
							Latest Payslip
						</label>

						<label className='flex items-center gap-2'>
							<input type='checkbox' />
							DepEd ID
						</label>

						<label className='flex items-center gap-2'>
							<input type='checkbox' />
							Approved Appointment
						</label>

						<label className='flex items-center gap-2'>
							<input type='checkbox' />
							Co-maker Documents
						</label>

						<label className='flex items-center gap-2'>
							<input type='checkbox' />
							Account Number Verified
						</label>

						<label className='flex items-center gap-2'>
							<input type='checkbox' />
							SOA (for Renewal only)
						</label>

						<label className='flex items-center gap-2'>
							<input type='checkbox' />
							No UNDE Loan
						</label>

						<label className='flex items-center gap-2'>
							<input type='checkbox' />
							Authorization Form Complete
						</label>

						<label className='flex items-center gap-2'>
							<input type='checkbox' />
							Payslip is Readable
						</label>

						<label className='flex items-center gap-2'>
							<input type='checkbox' />
							Payslip is Original
						</label>

						<label className='flex items-center gap-2'>
							<input type='checkbox' />
							Purpose Attachment Complete
						</label>

						<label className='flex items-center gap-2'>
							<input type='checkbox' />
							Photocopy of ID
						</label>

						<label className='flex items-center gap-2'>
							<input type='checkbox' />
							Photocopy of ATM
						</label>

						<section />

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
								/>

								<input
									type='number'
									placeholder='New Deduction'
									className='border p-2 rounded'
								/>

								<input
									type='number'
									placeholder='Existing Balance (Renewal only)'
									className='border p-2 rounded'
								/>

								<input
									type='number'
									placeholder='Existing Deduction (Renewal only)'
									className='border p-2 rounded'
								/>

								<input
									type='number'
									placeholder='% Principal Paid (Renewal only)'
									className='border p-2 rounded'
								/>
							</div>
						</section>

						{/* Result */}
						<section>
							<h2 className='text-lg font-semibold mb-4 text-gray-800'>
								Result
							</h2>

							<div className='bg-gray-50 p-4 rounded-lg space-y-2'>
								<p>
									<strong>Final Loan Granted:</strong> ₱0.00
								</p>
								<p>
									<strong>NPAD:</strong> ₱0.00
								</p>

								<p className='font-semibold text-gray-700'>Status: Pending</p>

								<p className='text-sm text-gray-600'>Reason: —</p>
							</div>
						</section>
					</div>
				</section>
			</div>
		</main>
	);
}

export default NewApplication;
