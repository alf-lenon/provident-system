import { useEffect, useState } from 'react';

// TypeScript
type Application = {
	_id: string; // id automatically made from MongoDB
	createdAt: string;

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

	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('All');

	const [editingApplication, setEditingApplication] =
		useState<Application | null>(null);

	// Delete request to backend
	const handleDelete = async (id: string) => {
		const confirmDelete = window.confirm(
			'Are you sure you want to delete this application?',
		);

		if (!confirmDelete) return;

		try {
			const response = await fetch(`http://localhost:5000/applications/${id}`, {
				method: 'DELETE',
			});

			const data = await response.json();

			if (!response.ok) {
				alert(data.message || 'Failed to delete application');
				return;
			}

			setApplications((prev) => prev.filter((app) => app._id !== id));
		} catch (error) {
			console.error('Error deleting application:', error);
		}
	};

	// Update || Edit request to backend
	const handleUpdate = async () => {
		if (!editingApplication) return;

		try {
			const response = await fetch(
				`http://localhost:5000/applications/${editingApplication._id}`,
				{
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(editingApplication),
				},
			);

			const data = await response.json();

			if (!response.ok) {
				alert(data.message || 'Failed to update application');
				return;
			}

			setApplications((prev) =>
				prev.map((app) =>
					app._id === editingApplication._id ? data.application : app,
				),
			);

			setEditingApplication(null);
		} catch (error) {
			console.error('Error updating application:', error);
		}
	};

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

	// Filter and Search System
	const filteredApplications = applications.filter((app) => {
		const matchesSearch = app.borrower.fullName
			.toLowerCase()
			.includes(searchTerm.toLowerCase());

		const matchesStatus =
			statusFilter === 'All' || app.evaluation.status === statusFilter;

		return matchesSearch && matchesStatus;
	});
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

					<div className='flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5'>
						<input
							type='text'
							placeholder='Search by borrower name...'
							className='border border-gray-300 rounded-lg px-4 py-2 w-full md:max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>

						<select
							className='border border-gray-300 rounded-lg px-4 py-2 w-full md:w-56 focus:outline-none focus:ring-2 focus:ring-blue-500'
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
						>
							<option value='All'>All Status</option>
							<option value='Ready for Processing'>Ready for Processing</option>
							<option value='Needs Correction'>Needs Correction</option>
							<option value='Rejected'>Rejected</option>
						</select>
					</div>

					<div className='overflow-x-auto'>
						<table className='min-w-full divide-y divide-gray-200'>
							<thead className='bg-gray-50'>
								<tr>
									<th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase'>
										Borrower
									</th>

									<th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase'>
										Loan Type
									</th>

									<th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase'>
										Loan Amount
									</th>

									<th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase'>
										Date Processed
									</th>

									<th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase'>
										Status
									</th>

									<th className='px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase'>
										Actions
									</th>
								</tr>
							</thead>

							<tbody className='bg-white divide-y divide-gray-100'>
								{filteredApplications.length === 0 && (
									<tr>
										<td
											colSpan={6}
											className='px-6 py-8 text-center text-gray-500'
										>
											No applications found.
										</td>
									</tr>
								)}

								{filteredApplications.map((app, index) => (
									<tr key={index} className='hover:bg-gray-50 transition'>
										<td className='px-6 py-4'>
											<div>
												<p className='font-semibold text-gray-800'>
													{app.borrower.fullName}
												</p>
											</div>
										</td>

										<td className='px-6 py-4 text-gray-700'>
											{app.loan.loanType}
										</td>

										<td className='px-6 py-4 text-gray-700'>
											₱{Number(app.loan.loanAmount).toLocaleString('en-PH')}
										</td>

										<td className='px-6 py-4 text-gray-700'>
											{new Date(app.createdAt).toLocaleDateString('en-PH', {
												year: 'numeric',
												month: 'short',
												day: 'numeric',
											})}
										</td>

										<td className='px-6 py-4'>
											<span
												className={
													app.evaluation.status === 'Ready for Processing'
														? 'bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium'
														: app.evaluation.status === 'Needs Correction'
															? 'bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-medium'
															: 'bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium'
												}
											>
												{app.evaluation.status}
											</span>
										</td>

										<td className='px-6 py-4 text-center'>
											<div className='flex justify-center gap-2'>
												<button
													onClick={() => setSelectedApplication(app)}
													className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition'
												>
													View
												</button>

												<button
													onClick={() => setEditingApplication(app)}
													className='bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition'
												>
													Edit
												</button>

												<button
													onClick={() => handleDelete(app._id)}
													className='bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition'
												>
													Delete
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
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

								<div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 mb-6'>
									{/* Status */}
									<div className='bg-white border rounded-xl p-4 shadow-sm'>
										<p className='text-sm text-gray-500'>Status</p>

										<span
											className={
												selectedApplication.evaluation.status ===
												'Ready for Processing'
													? 'inline-block mt-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium'
													: selectedApplication.evaluation.status ===
														  'Needs Correction'
														? 'inline-block mt-2 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium'
														: 'inline-block mt-2 bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium'
											}
										>
											{selectedApplication.evaluation.status}
										</span>
									</div>

									{/* NPAD */}
									<div className='bg-white border rounded-xl p-4 shadow-sm'>
										<p className='text-sm text-gray-500'>NPAD</p>

										<p className='text-xl font-bold text-gray-800 mt-2'>
											₱
											{selectedApplication.evaluation.netPayAfterDeduction.toLocaleString(
												'en-PH',
											)}
										</p>
									</div>

									{/* Loan Granted */}
									<div className='bg-white border rounded-xl p-4 shadow-sm'>
										<p className='text-sm text-gray-500'>Final Loan Granted</p>

										<p className='text-xl font-bold text-gray-800 mt-2'>
											₱
											{selectedApplication.evaluation.finalLoanGranted.toLocaleString(
												'en-PH',
											)}
										</p>
									</div>
								</div>

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
							<section className='bg-gray-50 border border-gray-200 rounded-xl p-5'>
								<h3 className='font-semibold text-gray-800 mb-3'>
									Borrower Information
								</h3>
								<div className='space-y-2 text-sm text-gray-700'>
									<p>Name: {selectedApplication.borrower.fullName}</p>
									<p>Position: {selectedApplication.borrower.position}</p>
									<p>School: {selectedApplication.borrower.school}</p>
									<p>
										Employee No: {selectedApplication.borrower.employeeNumber}
									</p>
									<p>Code: {selectedApplication.borrower.code}</p>
									<p>LAF No: {selectedApplication.borrower.lafNumber}</p>
								</div>
							</section>

							<section className='bg-gray-50 border border-gray-200 rounded-xl p-5'>
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

							<section className='bg-gray-50 border border-gray-200 rounded-xl p-5'>
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

							<section className='bg-gray-50 border border-gray-200 rounded-xl p-5'>
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

									<div className='flex items-center gap-2'>
										<span className='font-medium text-gray-700'>Status:</span>

										<span
											className={
												selectedApplication.evaluation.status ===
												'Ready for Processing'
													? 'bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium'
													: selectedApplication.evaluation.status ===
														  'Needs Correction'
														? 'bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium'
														: 'bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium'
											}
										>
											{selectedApplication.evaluation.status}
										</span>
									</div>
								</div>
							</section>

							{selectedApplication.evaluation.status === 'Rejected' && (
								<section className='md:col-span-2 bg-red-50 border border-red-200 rounded-xl p-5'>
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

							<section className='md:col-span-2 bg-gray-50 border border-gray-200 rounded-xl p-5'>
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

			{editingApplication && (
				<div className='fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50'>
					<div className='bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6'>
						<div className='flex justify-between items-center border-b pb-4 mb-6'>
							<h2 className='text-xl font-bold text-gray-800'>
								Edit Application
							</h2>

							<button
								onClick={() => setEditingApplication(null)}
								className='text-gray-500 hover:text-gray-800'
							>
								Close
							</button>
						</div>

						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							<input
								className='border p-2 rounded'
								value={editingApplication.borrower.fullName}
								onChange={(e) =>
									setEditingApplication({
										...editingApplication,
										borrower: {
											...editingApplication.borrower,
											fullName: e.target.value,
										},
									})
								}
							/>

							<input
								className='border p-2 rounded'
								value={editingApplication.loan.loanAmount}
								onChange={(e) =>
									setEditingApplication({
										...editingApplication,
										loan: {
											...editingApplication.loan,
											loanAmount: e.target.value,
										},
									})
								}
							/>
						</div>

						<div className='flex justify-end gap-3 mt-6'>
							<button
								onClick={() => setEditingApplication(null)}
								className='px-4 py-2 rounded-lg border'
							>
								Cancel
							</button>

							<button
								onClick={handleUpdate}
								className='px-4 py-2 rounded-lg bg-blue-600 text-white'
							>
								Save Changes
							</button>
						</div>
					</div>
				</div>
			)}
		</main>
	);
}

export default Dashboard;
