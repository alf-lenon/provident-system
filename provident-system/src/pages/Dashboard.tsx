import { useEffect, useState } from 'react';

// TypeScript
type Application = {
	borrower: {
		fullName: string;
		code: string;
		lafNumber: string;
		employeeNumber: string;
		school: string;
		position: string;
	};
	coMaker: {
		name: string;
		employeeNumber: string;
		contactNumber: string;
	};
	loan: {
		loanAmount: string;
		loanType: string;
		accountNumber: string;
		term: string;
		purpose: string;
	};
	evaluation: {
		status: string;
		netPay: number;
		newDeduction: number;
		existingDeduction: number;
		existingBalance: number;
		percentPrincipalPaid: number;
		netPayAfterDeduction: number;
		finalLoanGranted: number;
		remarks: string[];
		rejectionReasons: string[];
	};
};
function Dashboard() {
	const [applications, setApplications] = useState<Application[]>([]);

	const [selectedApplication, setSelectedApplication] =
		useState<Application | null>(null);

	useEffect(() => {
		const fetchApplications = async () => {
			try {
				const response = await fetch('http://localhost:5000/applications'); // Request data from back end
				const data = await response.json(); // Data or response from back end
				setApplications(data); // Updates the state or Replaces current applications with new data
			} catch (error) {
				console.error('error', error);
			}
		};
		fetchApplications();
	}, []);
	return (
		<main className='min-h-screen bg-gray-100 flex'>
			{/* Sidebar */}
			<aside className='w-64 bg-white border-r border-gray-200 p-5 hidden md:block'>
				<h2 className='text-xl font-bold text-blue-700 mb-8'>
					Provident System
				</h2>

				<nav className='space-y-2'>
					<button className='w-full text-left px-4 py-2 rounded-lg bg-blue-600 text-white'>
						Dashboard
					</button>
					<button className='w-full text-left px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100'>
						New Application
					</button>
					<button className='w-full text-left px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100'>
						Applications
					</button>
					<button className='w-full text-left px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100'>
						Ready for Processing
					</button>
					<button className='w-full text-left px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100'>
						Needs Correction
					</button>
					<button className='w-full text-left px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100'>
						Rejected
					</button>
				</nav>
			</aside>

			{/* Main Content */}
			<section className='flex-1 p-6'>
				{/* Header */}
				<header className='mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
					<div>
						<h1 className='text-2xl font-bold text-gray-800'>
							Applications Dashboard
						</h1>
						<p className='text-gray-600'>
							Review and monitor provident loan applications
						</p>
					</div>

					<button className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition'>
						New Application
					</button>
				</header>

				{/* Stats Cards */}
				<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
					<div className='bg-white p-5 rounded-xl shadow'>
						<p className='text-sm text-gray-500'>Total Applications</p>
						<h3 className='text-2xl font-bold text-gray-800'>
							{applications.length}
						</h3>
					</div>

					<div className='bg-white p-5 rounded-xl shadow'>
						<p className='text-sm text-gray-500'>Ready</p>
						<h3 className='text-2xl font-bold text-green-600'>
							{
								applications.filter(
									(app) => app.evaluation.status === 'Ready for Processing',
								).length
							}
						</h3>
					</div>

					<div className='bg-white p-5 rounded-xl shadow'>
						<p className='text-sm text-gray-500'>Needs Correction</p>
						<h3 className='text-2xl font-bold text-yellow-600'>
							{
								applications.filter(
									(app) => app.evaluation.status === 'Needs Correction',
								).length
							}
						</h3>
					</div>

					<div className='bg-white p-5 rounded-xl shadow'>
						<p className='text-sm text-gray-500'>Rejected</p>
						<h3 className='text-2xl font-bold text-red-600'>
							{
								applications.filter(
									(app) => app.evaluation.status === 'Rejected',
								).length
							}
						</h3>
					</div>
				</div>

				{/* Application Cards */}
				<div className='bg-white rounded-xl shadow p-5'>
					<div className='flex justify-between items-center mb-4'>
						<h2 className='text-lg font-semibold text-gray-800'>
							Recent Applications
						</h2>
					</div>

					<div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
						{applications.map((app, index) => (
							<div
								key={index}
								className='border border-gray-200 rounded-xl p-4 hover:shadow-md transition'
							>
								<div className='flex justify-between gap-4 mb-3'>
									<div>
										<h3 className='font-semibold text-gray-800'>
											{app.borrower.fullName}
										</h3>
										<p className='text-sm text-gray-500'>
											{app.loan.loanType} Loan
										</p>
									</div>

									<span
										className={
											app.evaluation.status === 'Ready for Processing'
												? 'bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-medium h-fit'
												: app.evaluation.status === 'Needs Correction'
													? 'bg-yellow-100 text-yellow-700 text-xs px-3 py-1 rounded-full font-medium h-fit'
													: 'bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full font-medium h-fit'
										}
									>
										{app.evaluation.status}
									</span>
								</div>

								<p className='text-sm text-gray-700 mb-4'>
									<span className='font-medium'>Loan Amount:</span> ₱
									{Number(app.loan.loanAmount).toLocaleString('en-PH')}
								</p>

								<button
									onClick={() => setSelectedApplication(app)}
									className='w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-blue-600 hover:text-white transition'
								>
									View Details
								</button>
							</div>
						))}
					</div>
				</div>
			</section>

			{selectedApplication && (
				<div className='fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50'>
					<div className='bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6'>
						<div className='flex justify-between items-center border-b pb-4 mb-6'>
							<div>
								<h2 className='text-xl font-bold text-gray-800'>
									Application Details
								</h2>
								<p className='text-sm text-gray-500'>
									Complete borrower and loan information
								</p>
							</div>

							<button
								onClick={() => setSelectedApplication(null)}
								className='text-gray-500 hover:text-gray-800'
							>
								Close
							</button>
						</div>

						<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
							<section>
								<h3 className='font-semibold text-gray-800 mb-3'>
									Borrower Information
								</h3>
								<div className='space-y-2 text-sm text-gray-700'>
									<p>Name: {selectedApplication.borrower.fullName}</p>
									<p>
										Employee No: {selectedApplication.borrower.employeeNumber}
									</p>
									<p>Code: {selectedApplication.borrower.code}</p>
									<p>LAF No: {selectedApplication.borrower.lafNumber}</p>
								</div>
							</section>

							<section>
								<h3 className='font-semibold text-gray-800 mb-3'>
									Loan Information
								</h3>
								<div className='space-y-2 text-sm text-gray-700'>
									<p>Loan Type: {selectedApplication.loan.loanType}</p>
									<p>
										Loan Amount: ₱
										{Number(selectedApplication.loan.loanAmount).toLocaleString(
											'en-PH',
										)}
									</p>

									<p>
										Account Number: {selectedApplication.loan.accountNumber}
									</p>
									<p>Term: {selectedApplication.loan.term}</p>
									<p>Purpose: {selectedApplication.loan.purpose}</p>
								</div>
							</section>

							<section>
								<h3 className='font-semibold text-gray-800 mb-3'>
									Co-maker Information
								</h3>
								<div className='space-y-2 text-sm text-gray-700'>
									<p>Name: {selectedApplication.coMaker.name}</p>
									<p>
										Employee No: {selectedApplication.coMaker.employeeNumber}
									</p>
									<p>Contact No: {selectedApplication.coMaker.contactNumber}</p>
								</div>
							</section>

							<section>
								<h3 className='font-semibold text-gray-800 mb-3'>Evaluation</h3>
								<div className='space-y-2 text-sm text-gray-700'>
									<p>
										Net Pay: ₱
										{Number(
											selectedApplication.evaluation.netPay,
										).toLocaleString('en-PH')}
									</p>

									<p>
										Monthly Amortization / New Deduction: ₱
										{Number(
											selectedApplication.evaluation.newDeduction,
										).toLocaleString('en-PH')}
									</p>

									<p>
										Existing Deduction: ₱
										{Number(
											selectedApplication.evaluation.existingDeduction || 0,
										).toLocaleString('en-PH')}
									</p>

									<p>
										Existing Balance: ₱
										{Number(
											selectedApplication.evaluation.existingBalance || 0,
										).toLocaleString('en-PH')}
									</p>

									<p>
										NPAD: ₱
										{Number(
											selectedApplication.evaluation.netPayAfterDeduction,
										).toLocaleString('en-PH')}
									</p>
									<p>
										Final Loan Granted: ₱
										{Number(
											selectedApplication.evaluation.finalLoanGranted,
										).toLocaleString('en-PH')}
									</p>

									<p>Status: {selectedApplication.evaluation.status}</p>
								</div>
							</section>

							{selectedApplication.evaluation.status === 'Rejected' && (
								<section className='md:col-span-2'>
									<h3 className='font-semibold text-red-700 mb-3'>
										Rejection Reasons
									</h3>

									{selectedApplication.evaluation.rejectionReasons.length >
									0 ? (
										<ul className='list-disc list-inside text-sm text-red-700 space-y-1'>
											{selectedApplication.evaluation.rejectionReasons.map(
												(reason, index) => (
													<li key={index}>{reason}</li>
												),
											)}
										</ul>
									) : (
										<p className='text-sm text-gray-500'>
											No rejection reason recorded.
										</p>
									)}
								</section>
							)}

							<section className='md:col-span-2'>
								<h3 className='font-semibold text-gray-800 mb-3'>Remarks</h3>

								{selectedApplication.evaluation.remarks.length > 0 ? (
									<ul className='list-disc list-inside text-sm text-gray-700 space-y-1'>
										{selectedApplication.evaluation.remarks.map(
											(remark, index) => (
												<li key={index}>{remark}</li>
											),
										)}
									</ul>
								) : (
									<p className='text-sm text-green-600'>No corrections.</p>
								)}
							</section>
						</div>
					</div>
				</div>
			)}
		</main>
	);
}

export default Dashboard;
