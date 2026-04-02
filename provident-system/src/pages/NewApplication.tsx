function NewApplication() {
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
						/>

						<input
							type='text'
							placeholder='Employee Number'
							className='border p-2 rounded'
						/>

						<input
							type='text'
							placeholder='School / Office'
							className='border p-2 rounded'
						/>

						<input
							type='text'
							placeholder='Position'
							className='border p-2 rounded'
						/>

						<input
							type='number'
							placeholder='Borrower Salary'
							className='border p-2 rounded'
						/>

						<input
							type='text'
							placeholder='Co-maker Name'
							className='border p-2 rounded'
						/>

						<input
							type='number'
							placeholder='Co-maker Salary'
							className='border p-2 rounded'
						/>
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
						<select className='border p-2 rounded'>
							<option value=''>Select Purpose</option>
							<option>Educational</option>
							<option>Medical</option>
							<option>House Repair</option>
							<option>Others</option>
						</select>

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
					</div>
				</section>
			</div>
		</main>
	);
}

export default NewApplication;
