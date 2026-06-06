import { useEffect, useState, useCallback } from 'react';
import RefundModal from '../components/RefundModal';

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

	flags: {
		hasUndeLoan: boolean;
	};

	processing: {
		status: string;
		dateProcessed?: string;
		released: boolean;
		dateReleased?: string;
	};

	documentNumbers: {
		dvNumber: string;
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

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalApplications, setTotalApplications] = useState(0);

	const [showRefundModal, setShowRefundModal] = useState(false);

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

	// Mark application as processed
	const handleMarkAsProcessed = async (id: string) => {
		try {
			const response = await fetch(
				`http://localhost:5000/applications/${id}/process`,
				{
					method: 'PUT',
				},
			);

			const data = await response.json();

			if (!response.ok) {
				alert(data.message || 'Failed to mark as processed');
				return;
			}

			setApplications((prev) =>
				prev.map((app) => (app._id === id ? data.application : app)),
			);
		} catch (error) {
			console.error('Error processing application', error);
		}
	};

	// Mark application as released
	const handleRelease = async (id: string) => {
		try {
			const response = await fetch(
				`http://localhost:5000/applications/${id}/release`,
				{
					method: 'PUT',
				},
			);

			const data = await response.json();

			if (!response.ok) {
				alert(data.message || 'Failed to mark as released');
				return;
			}

			setApplications((prev) =>
				prev.map((app) => (app._id === id ? data.application : app)),
			);
		} catch (error) {
			console.error('Error releasing application', error);
		}
	};

	const handleUndoProcessed = async (id: string) => {
		try {
			const response = await fetch(
				`http://localhost:5000/applications/${id}/unprocess`,
				{ method: 'PUT' },
			);

			const data = await response.json();

			if (!response.ok) {
				alert(data.message || 'Failed to undo process action');
				return;
			}

			setApplications((prev) =>
				prev.map((app) => (app._id === id ? data.application : app)),
			);
		} catch (error) {
			console.error('Error undo processing', error);
		}
	};

	const handleUndoRelease = async (id: string) => {
		try {
			const response = await fetch(
				`http://localhost:5000/applications/${id}/unrelease`,
				{ method: 'PUT' },
			);

			const data = await response.json();

			if (!response.ok) {
				alert(data.message || 'Failed to undo release action');
				return;
			}

			setApplications((prev) =>
				prev.map((app) => (app._id === id ? data.application : app)),
			);
		} catch (error) {
			console.error('Error undo release', error);
		}
	};

	// Filter and Search System
	const filteredApplications = applications.filter((app) => {
		const matchesSearch = app.borrower.fullName
			.toLowerCase()
			.includes(searchTerm.toLowerCase());

		const matchesStatus =
			statusFilter === 'All' || app.evaluation.status === statusFilter;

		return matchesSearch && matchesStatus;
	});

	const canProcess = (app: Application) => {
		return app.evaluation.status === 'Ready for Processing';
	};

	const canRelease = (app: Application) => {
		return app.processing?.status === 'Processed';
	};

	// Fetch to backend

	const fetchApplications = useCallback(async () => {
		try {
			setIsLoading(true);
			setError('');

			const response = await fetch(
				`http://localhost:5000/applications?page=${currentPage}&limit=20&search=${searchTerm}`,
			);

			const data = await response.json();

			if (!response.ok) {
				setError(data.message || 'Failed to fetch applications');
				return;
			}

			setApplications(data.applications);
			setCurrentPage(data.currentPage);
			setTotalPages(data.totalPages);
			setTotalApplications(data.totalApplications);
		} catch (error) {
			console.error('error', error);
			setError('Could not connect to the server.');
		} finally {
			setIsLoading(false);
		}
	}, [currentPage, searchTerm]);

	useEffect(() => {
		fetchApplications();
	}, [fetchApplications]);

	const handleSelectApplication = (id: string) => {
		setSelectedIds((prev) =>
			prev.includes(id)
				? prev.filter((selectedId) => selectedId !== id)
				: [...prev, id],
		);
	};

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

					<button
						onClick={() => setShowRefundModal(true)}
						className='px-4 py-2 bg-orange-600 text-white rounded-lg'
					>
						+ New Refund
					</button>
				</header>

				{/* Stats Cards */}
				<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
					<div className='bg-white p-5 rounded-xl shadow'>
						<p className='text-sm text-gray-500'>Total Applications</p>
						<h3 className='text-2xl font-bold text-gray-800'>
							{totalApplications}
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
						{isLoading && (
							<p className='text-sm text-gray-500 mb-4'>
								Loading applications...
							</p>
						)}

						{error && <p className='text-sm text-red-600 mb-4'>{error}</p>}
						<button
							disabled={selectedIds.length === 0}
							onClick={async () => {
								const response = await fetch(
									'http://localhost:5000/applications/export/monitoring/bulk',
									{
										method: 'POST',
										headers: {
											'Content-Type': 'application/json',
										},
										body: JSON.stringify({ ids: selectedIds }),
									},
								);

								const blob = await response.blob();
								const url = window.URL.createObjectURL(blob);

								const link = document.createElement('a');
								link.href = url;
								link.download = 'provident-monitoring-selected.xlsx';
								link.click();

								window.URL.revokeObjectURL(url);
							}}
							className={
								selectedIds.length === 0
									? 'bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed'
									: 'bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition'
							}
						>
							Export Selected Monitoring ({selectedIds.length})
						</button>

						<button
							disabled={selectedIds.length === 0}
							onClick={async () => {
								const response = await fetch(
									'http://localhost:5000/applications/export/sl/bulk',
									{
										method: 'POST',
										headers: {
											'Content-Type': 'application/json',
										},
										body: JSON.stringify({ ids: selectedIds }),
									},
								);

								const blob = await response.blob();
								const url = window.URL.createObjectURL(blob);

								const link = document.createElement('a');
								link.href = url;
								link.download = 'sl-selected.xlsx';
								link.click();

								window.URL.revokeObjectURL(url);
							}}
							className={
								selectedIds.length === 0
									? 'bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed'
									: 'bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition'
							}
						>
							Export Selected SL ({selectedIds.length})
						</button>

						<button
							disabled={selectedIds.length === 0}
							onClick={async () => {
								const response = await fetch(
									'http://localhost:5000/applications/export/dv/bulk',
									{
										method: 'POST',
										headers: {
											'Content-Type': 'application/json',
										},
										body: JSON.stringify({ ids: selectedIds }),
									},
								);

								const blob = await response.blob();

								const url = window.URL.createObjectURL(blob);

								const link = document.createElement('a');
								link.href = url;
								link.download = 'dv-selected.zip';
								link.click();

								window.URL.revokeObjectURL(url);

								window.URL.revokeObjectURL(url);
							}}
							className={
								selectedIds.length === 0
									? 'bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed'
									: 'bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition'
							}
						>
							Export Selected DV ({selectedIds.length})
						</button>

						<button
							disabled={selectedIds.length === 0}
							onClick={async () => {
								const response = await fetch(
									'http://localhost:5000/applications/export/payroll/bulk',
									{
										method: 'POST',
										headers: {
											'Content-Type': 'application/json',
										},
										body: JSON.stringify({ ids: selectedIds }),
									},
								);

								const blob = await response.blob();
								const url = window.URL.createObjectURL(blob);

								const link = document.createElement('a');
								link.href = url;
								link.download = 'payroll.xlsx';
								link.click();

								window.URL.revokeObjectURL(url);
							}}
							className={
								selectedIds.length === 0
									? 'bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed'
									: 'bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition'
							}
						>
							Export Selected Payroll ({selectedIds.length})
						</button>

						<button
							disabled={selectedIds.length === 0}
							onClick={() => setSelectedIds([])}
							className={
								selectedIds.length === 0
									? 'bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed'
									: 'bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition'
							}
						>
							Clear Selected
						</button>

						<table className='min-w-full divide-y divide-gray-200'>
							<thead className='bg-gray-50'>
								<tr>
									<th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase'>
										Select
									</th>

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
										Date Submitted
									</th>

									<th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase'>
										Status
									</th>

									<th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase'>
										Processing
									</th>

									<th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase'>
										Release
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
											colSpan={9}
											className='px-6 py-8 text-center text-gray-500'
										>
											No applications found.
										</td>
									</tr>
								)}

								{filteredApplications.map((app) => (
									<tr key={app._id} className='hover:bg-gray-50 transition'>
										<td className='px-6 py-4'>
											<input
												type='checkbox'
												checked={selectedIds.includes(app._id)}
												onChange={() => handleSelectApplication(app._id)}
											/>
										</td>

										<td className='px-6 py-4'>
											<div>
												<p className='font-semibold text-gray-800'>
													{app.borrower.fullName}
												</p>
											</div>
										</td>

										<td className='px-6 py-4'>
											{app.loan.loanType === 'Refund' ? (
												<span className='bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-medium'>
													Refund
												</span>
											) : (
												<span className='text-gray-700'>
													{app.loan.loanType}
												</span>
											)}
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

										<td className='px-6 py-4'>
											<span
												className={
													app.processing?.status === 'Processed'
														? 'bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium'
														: 'bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium'
												}
											>
												{app.processing?.status || 'Pending'}
											</span>

											{app.processing?.dateProcessed && (
												<p className='text-xs text-gray-500 mt-1'>
													{new Date(
														app.processing.dateProcessed,
													).toLocaleDateString('en-PH')}
												</p>
											)}
										</td>

										<td className='px-6 py-4'>
											<span
												className={
													app.processing?.released
														? 'bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium'
														: 'bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium'
												}
											>
												{app.processing?.released ? 'Released' : 'Not Released'}
											</span>

											{app.processing?.dateReleased && (
												<p className='text-xs text-gray-500 mt-1'>
													{new Date(
														app.processing.dateReleased,
													).toLocaleDateString('en-PH')}
												</p>
											)}
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

												{app.processing?.status === 'Processed' ? (
													<button
														onClick={() => handleUndoProcessed(app._id)}
														className='bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition'
													>
														Undo Process
													</button>
												) : (
													<button
														onClick={() => handleMarkAsProcessed(app._id)}
														disabled={!canProcess(app)}
														className={
															!canProcess(app)
																? 'bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed'
																: 'bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition'
														}
													>
														Process
													</button>
												)}

												{app.processing?.released ? (
													<button
														onClick={() => handleUndoRelease(app._id)}
														className='bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition'
													>
														Undo Release
													</button>
												) : (
													<button
														onClick={() => handleRelease(app._id)}
														disabled={!canRelease(app)}
														className={
															!canRelease(app)
																? 'bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed'
																: 'bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition'
														}
													>
														Release
													</button>
												)}

												<select
													defaultValue=''
													onChange={(e) => {
														const url = e.target.value;

														if (!url) return;

														window.open(url, '_blank');
														e.target.value = '';
													}}
													className='border border-gray-300 text-sm px-3 py-2 rounded-lg bg-white hover:bg-gray-50 transition'
												>
													<option value='' disabled>
														Export...
													</option>

													<option
														value={`http://localhost:5000/applications/${app._id}/export/monitoring`}
													>
														Monitoring
													</option>

													<option
														value={`http://localhost:5000/applications/${app._id}/export/sl`}
													>
														SL
													</option>

													<option
														value={`http://localhost:5000/applications/${app._id}/export/dv`}
													>
														DV
													</option>
												</select>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>

						<div className='flex items-center justify-between mt-4'>
							<button
								disabled={currentPage === 1}
								onClick={() => setCurrentPage((prev) => prev - 1)}
								className='px-4 py-2 border rounded-lg disabled:opacity-50'
							>
								Previous
							</button>

							<p className='text-sm text-gray-600'>
								Page {currentPage} of {totalPages}
							</p>

							<button
								disabled={currentPage === totalPages}
								onClick={() => setCurrentPage((prev) => prev + 1)}
								className='px-4 py-2 border rounded-lg disabled:opacity-50'
							>
								Next
							</button>
						</div>
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
									<p>
										DV Number: {selectedApplication.documentNumbers.dvNumber}
									</p>
									<p>
										Salary Grade: {selectedApplication.borrower.salaryGrade}
									</p>
									<p>Salary Step {selectedApplication.borrower.salaryStep}</p>
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
									<p>Salary Grade: {selectedApplication.coMaker.salaryGrade}</p>
									<p>Salary Step: {selectedApplication.coMaker.salaryStep}</p>
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
					<div className='bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6'>
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

						<div className='space-y-6'>
							<section className='bg-gray-50 border border-gray-200 rounded-xl p-5'>
								<h3 className='font-semibold text-gray-800 mb-4'>
									Borrower Information
								</h3>

								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Full Name
										</label>
										<input
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
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
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Employee Number
										</label>
										<input
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.borrower.employeeNumber}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													borrower: {
														...editingApplication.borrower,
														employeeNumber: e.target.value,
													},
												})
											}
										/>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											School / Office
										</label>
										<input
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.borrower.school}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													borrower: {
														...editingApplication.borrower,
														school: e.target.value,
													},
												})
											}
										/>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Position
										</label>
										<input
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.borrower.position}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													borrower: {
														...editingApplication.borrower,
														position: e.target.value,
													},
												})
											}
										/>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Code / STA
										</label>
										<input
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.borrower.code}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													borrower: {
														...editingApplication.borrower,
														code: e.target.value,
													},
												})
											}
										/>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											LAF Number
										</label>
										<input
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.borrower.lafNumber}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													borrower: {
														...editingApplication.borrower,
														lafNumber: e.target.value,
													},
												})
											}
										/>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Salary Grade
										</label>
										<input
											type='number'
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.borrower.salaryGrade}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													borrower: {
														...editingApplication.borrower,
														salaryGrade: e.target.value,
													},
												})
											}
										/>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Salary Step
										</label>
										<input
											type='number'
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.borrower.salaryStep}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													borrower: {
														...editingApplication.borrower,
														salaryStep: e.target.value,
													},
												})
											}
										/>
									</div>
								</div>
							</section>

							<section className='bg-gray-50 border border-gray-200 rounded-xl p-5'>
								<h3 className='font-semibold text-gray-800 mb-4'>
									Co-maker Information
								</h3>

								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Co-maker Name
										</label>

										<input
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.coMaker.name}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													coMaker: {
														...editingApplication.coMaker,
														name: e.target.value,
													},
												})
											}
										/>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Employee Number
										</label>

										<input
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.coMaker.employeeNumber}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													coMaker: {
														...editingApplication.coMaker,
														employeeNumber: e.target.value,
													},
												})
											}
										/>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Contact Number
										</label>

										<input
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.coMaker.contactNumber}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													coMaker: {
														...editingApplication.coMaker,
														contactNumber: e.target.value,
													},
												})
											}
										/>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Salary Grade
										</label>

										<input
											type='number'
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.coMaker.salaryGrade}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													coMaker: {
														...editingApplication.coMaker,
														salaryGrade: e.target.value,
													},
												})
											}
										/>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Salary Step
										</label>

										<input
											type='number'
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.coMaker.salaryStep}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													coMaker: {
														...editingApplication.coMaker,
														salaryStep: e.target.value,
													},
												})
											}
										/>
									</div>
								</div>
							</section>

							<section className='bg-gray-50 border border-gray-200 rounded-xl p-5'>
								<h3 className='font-semibold text-gray-800 mb-4'>
									Loan Information
								</h3>

								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Loan Type
										</label>

										<select
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.loan.loanType}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													loan: {
														...editingApplication.loan,
														loanType: e.target.value,
													},
												})
											}
										>
											<option value=''>Select Loan Type</option>
											<option value='New'>New</option>
											<option value='Renewal'>Renewal</option>
											<option value='Additional'>Additional</option>
										</select>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Loan Amount
										</label>

										<input
											type='number'
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
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

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Account Number
										</label>

										<input
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.loan.accountNumber}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													loan: {
														...editingApplication.loan,
														accountNumber: e.target.value,
													},
												})
											}
										/>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Term
										</label>

										<select
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.loan.term}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													loan: {
														...editingApplication.loan,
														term: e.target.value,
													},
												})
											}
										>
											<option value=''>Select Term</option>
											<option value='12 months'>12 months</option>
											<option value='24 months'>24 months</option>
											<option value='36 months'>36 months</option>
											<option value='48 months'>48 months</option>
											<option value='60 months'>60 months</option>
										</select>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Purpose
										</label>

										<select
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.loan.purpose}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													loan: {
														...editingApplication.loan,
														purpose: e.target.value,
													},
												})
											}
										>
											<option value=''>Select Purpose</option>
											<option value='Educational'>Educational</option>
											<option value='Medical'>Medical</option>
											<option value='House Repair'>House Repair</option>
											<option value='Others'>Others</option>
										</select>
									</div>
								</div>
							</section>

							<section className='bg-gray-50 border border-gray-200 rounded-xl p-5'>
								<h3 className='font-semibold text-gray-800 mb-4'>Evaluation</h3>

								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Net Pay
										</label>

										<input
											type='number'
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.evaluation.netPay}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													evaluation: {
														...editingApplication.evaluation,
														netPay: Number(e.target.value),
													},
												})
											}
										/>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Monthly Amortization / New Deduction
										</label>

										<input
											type='number'
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.evaluation.newDeduction}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													evaluation: {
														...editingApplication.evaluation,
														newDeduction: Number(e.target.value),
													},
												})
											}
										/>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Existing Deduction
										</label>

										<input
											type='number'
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.evaluation.existingDeduction}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													evaluation: {
														...editingApplication.evaluation,
														existingDeduction: Number(e.target.value),
													},
												})
											}
										/>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Existing Balance
										</label>

										<input
											type='number'
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.evaluation.existingBalance}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													evaluation: {
														...editingApplication.evaluation,
														existingBalance: Number(e.target.value),
													},
												})
											}
										/>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											% Principal Paid
										</label>

										<input
											type='number'
											className='border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
											value={editingApplication.evaluation.percentPrincipalPaid}
											onChange={(e) =>
												setEditingApplication({
													...editingApplication,
													evaluation: {
														...editingApplication.evaluation,
														percentPrincipalPaid: Number(e.target.value),
													},
												})
											}
										/>
									</div>
								</div>
							</section>

							<section className='bg-gray-50 border border-gray-200 rounded-xl p-5'>
								<h3 className='font-semibold text-gray-800 mb-4'>
									Checklist / Documents
								</h3>

								<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
									{[
										['loanApplicationForm', 'Loan Application Form'],
										[
											'authorizationSalaryDeduction',
											'Authorization for Salary Deduction',
										],
										['latestPayslip', 'Latest Payslip'],
										['approvedAppointment', 'Approved Appointment'],
										['coMakerDocuments', 'Co-maker Documents'],
										['accountNumberVerified', 'Account Number Verified'],
										['soa', 'SOA'],
										[
											'authorizationFormComplete',
											'Authorization Form Complete',
										],
										['payslipReadable', 'Payslip is Readable'],
										['payslipOriginal', 'Payslip is Original'],
										['supportingDocuments', 'Supporting Documents'],
										['photocopyOfId', 'Photocopy of ID'],
										['photocopyOfAtm', 'Photocopy of ATM'],
									].map(([field, label]) => (
										<label
											key={field}
											className='flex items-center gap-2 text-sm text-gray-700'
										>
											<input
												type='checkbox'
												checked={
													editingApplication.checklist[
														field as keyof Application['checklist']
													]
												}
												onChange={(e) =>
													setEditingApplication({
														...editingApplication,
														checklist: {
															...editingApplication.checklist,
															[field]: e.target.checked,
														},
													})
												}
											/>
											{label}
										</label>
									))}
								</div>
							</section>

							<section className='bg-gray-50 border border-gray-200 rounded-xl p-5'>
								<h3 className='font-semibold text-gray-800 mb-4'>Loan Flags</h3>

								<label className='flex items-center gap-2 text-sm text-gray-700'>
									<input
										type='checkbox'
										checked={editingApplication.flags.hasUndeLoan}
										onChange={(e) =>
											setEditingApplication({
												...editingApplication,
												flags: {
													...editingApplication.flags,
													hasUndeLoan: e.target.checked,
												},
											})
										}
									/>
									Has UNDE Loan
								</label>
							</section>
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

			{showRefundModal && (
				<RefundModal
					onClose={() => setShowRefundModal(false)}
					onSuccess={() => fetchApplications()}
				/>
			)}
		</main>
	);
}

export default Dashboard;
