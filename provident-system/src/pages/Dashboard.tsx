import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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

	routing?: {
		currentOffice: string;
		history: {
			office: string;
			receivedBy: string;
			dateReceived: string;
			remarks: string;
		}[];
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

	const [openActionId, setOpenActionId] = useState<string | null>(null);

	const [routingApplication, setRoutingApplication] =
		useState<Application | null>(null);

	const [routingForm, setRoutingForm] = useState({
		office: '',
		receivedBy: '',
		remarks: '',
	});

	const [showBulkRoutingModal, setShowBulkRoutingModal] = useState(false);

	const [bulkRoutingForm, setBulkRoutingForm] = useState({
		office: '',
		receivedBy: '',
		remarks: '',
	});

	const [showExportMenu, setShowExportMenu] = useState(false);

	const cardClass = 'bg-white/90 border border-gray-200 rounded-2xl shadow-sm';

	const inputClass =
		'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400';

	const primaryButtonClass =
		'px-4 py-2.5 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition';

	const signatoryOffices = [
		'Legal',
		'HR',
		'Accounting',
		'Admin',
		'Schools Division Superintendent',
		'Accounting - Final Approval',
	];

	const routingSteps = [
		'Legal',
		'HR',
		'Accounting',
		'Admin',
		'Schools Division Superintendent',
		'Accounting - Final Approval',
	];

	const navigate = useNavigate();

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

	const selectedApplications = applications.filter((app) =>
		selectedIds.includes(app._id),
	);

	const selectedTotalAmount = selectedApplications.reduce((total, app) => {
		return total + Number(app.evaluation.finalLoanGranted || 0);
	}, 0);

	const handleRouteApplication = async () => {
		if (!routingApplication) return;

		try {
			const response = await fetch(
				`http://localhost:5000/applications/${routingApplication._id}/route`,
				{
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(routingForm),
				},
			);

			const data = await response.json();

			if (!response.ok) {
				alert(data.message || 'Failed to update routing');
				return;
			}

			setApplications((prev) =>
				prev.map((app) =>
					app._id === routingApplication._id ? data.application : app,
				),
			);

			setRoutingApplication(null);
			setRoutingForm({
				office: '',
				receivedBy: '',
				remarks: '',
			});
		} catch (error) {
			console.error('Error updating routing:', error);
			alert('Could not connect to the server.');
		}
	};

	const handleBulkRouteApplications = async () => {
		try {
			const response = await fetch(
				'http://localhost:5000/applications/route/bulk',
				{
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						ids: selectedIds,
						...bulkRoutingForm,
					}),
				},
			);

			const data = await response.json();

			if (!response.ok) {
				alert(data.message || 'Failed to update selected locations');
				return;
			}

			setApplications((prev) =>
				prev.map((app) => {
					const updatedApp = data.applications.find(
						(updated: Application) => updated._id === app._id,
					);

					return updatedApp || app;
				}),
			);

			setShowBulkRoutingModal(false);
			setBulkRoutingForm({
				office: '',
				receivedBy: '',
				remarks: '',
			});
			setSelectedIds([]);
		} catch (error) {
			console.error('Error updating bulk routing:', error);
			alert('Could not connect to the server.');
		}
	};

	const handleUndoLastRoute = async (applicationId: string) => {
		const confirmed = window.confirm('Undo the last routing entry?');

		if (!confirmed) return;

		try {
			const response = await fetch(
				`http://localhost:5000/applications/${applicationId}/routing/undo`,
				{
					method: 'PUT',
				},
			);

			const data = await response.json();

			if (!response.ok) {
				alert(data.message || 'Failed to undo route');
				return;
			}

			setApplications((prev) =>
				prev.map((app) => (app._id === applicationId ? data.application : app)),
			);
		} catch (error) {
			console.error(error);
			alert('Could not connect to the server');
		}
	};

	const handleBulkExport = async (endpoint: string, filename: string) => {
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ ids: selectedIds }),
		});

		const blob = await response.blob();
		const url = window.URL.createObjectURL(blob);

		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		link.click();

		window.URL.revokeObjectURL(url);
		setShowExportMenu(false);
	};

	const canProcess = (app: Application) => {
		return app.evaluation.status === 'Ready for Processing';
	};

	const canRelease = (app: Application) => {
		return (
			app.processing?.status === 'Processed' &&
			app.routing?.currentOffice === 'Accounting - Final Approval'
		);
	};

	const getLoanTypeBadge = (loanType: string) => {
		switch (loanType) {
			case 'New':
				return 'bg-green-100 text-green-700';
			case 'Renewal':
				return 'bg-blue-100 text-blue-700';
			case 'Additional':
				return 'bg-purple-100 text-purple-700';
			case 'Refund':
				return 'bg-orange-100 text-orange-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
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

	// Close automatically when you click anywhere outside it.
	useEffect(() => {
		const handleClickOutside = () => {
			setOpenActionId(null);
		};

		if (!openActionId) return;

		document.addEventListener('click', handleClickOutside);

		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	}, [openActionId]);

	const handleSelectApplication = (id: string) => {
		setSelectedIds((prev) =>
			prev.includes(id)
				? prev.filter((selectedId) => selectedId !== id)
				: [...prev, id],
		);
	};

	return (
		<main className='min-h-screen bg-[#F5F5F7] flex flex-col md:flex-row'>
			{/* Mobile Header */}
			<div className='md:hidden bg-white border-b border-gray-200 p-4'>
				<h2 className='text-lg font-bold text-blue-700'>Provident System</h2>
				<p className='text-xs uppercase tracking-wide text-gray-400'>
					Applications Dashboard
				</p>
			</div>

			{/* Sidebar */}
			<aside className='w-64 bg-white/80 backdrop-blur border-r border-gray-200 p-5 hidden md:block'>
				<h2 className='text-xl font-bold text-blue-700 mb-8'>
					Provident System
				</h2>

				<nav className='space-y-2'>
					<button
						onClick={() => navigate('/')}
						className='w-full text-left px-4 py-2 rounded-lg bg-blue-600 text-white'
					>
						Dashboard
					</button>
					<button
						onClick={() => navigate('/new')}
						className='w-full text-left px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100'
					>
						New Application
					</button>
					<button
						onClick={() => navigate('/templates')}
						className='w-full text-left px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100'
					>
						Templates
					</button>
				</nav>
			</aside>

			{/* Main Content */}
			<section className='flex-1 w-full p-4 sm:p-6 overflow-hidden'>
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
					<div className='flex flex-col sm:flex-row gap-2 w-full md:w-auto'>
						<button
							onClick={() => navigate('/new')}
							className={primaryButtonClass}
						>
							New Application
						</button>

						<button
							onClick={() => setShowRefundModal(true)}
							className='px-4 py-2.5 rounded-full bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition'
						>
							+ New Refund
						</button>
					</div>
				</header>

				{/* Stats Cards */}
				<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-6'>
					<div className={`${cardClass} p-5`}>
						<p className='text-xs uppercase tracking-wide text-gray-400'>
							Total Applications
						</p>
						<h3 className='text-3xl font-semibold'>{totalApplications}</h3>
					</div>

					<div className={`${cardClass} p-5`}>
						<p className='text-xs uppercase tracking-wide text-gray-400'>
							Ready
						</p>
						<h3 className='text-3xl font-semibold'>
							{
								applications.filter(
									(app) => app.evaluation.status === 'Ready for Processing',
								).length
							}
						</h3>
					</div>

					<div className={`${cardClass} p-5`}>
						<p className='text-xs uppercase tracking-wide text-gray-400'>
							Needs Correction
						</p>
						<h3 className='text-3xl font-semibold '>
							{
								applications.filter(
									(app) => app.evaluation.status === 'Needs Correction',
								).length
							}
						</h3>
					</div>

					<div className={`${cardClass} p-5`}>
						<p className='text-xs uppercase tracking-wide text-gray-400'>
							Rejected
						</p>
						<h3 className='text-3xl font-semibold'>
							{
								applications.filter(
									(app) => app.evaluation.status === 'Rejected',
								).length
							}
						</h3>
					</div>

					<div className={`${cardClass} p-5`}>
						<p className='text-xs uppercase tracking-wide text-gray-400'>
							Processed
						</p>

						<h3 className='text-3xl font-semibold'>
							{
								applications.filter(
									(app) => app.processing?.status === 'Processed',
								).length
							}
						</h3>
					</div>

					<div className={`${cardClass} p-5`}>
						<p className='text-xs uppercase tracking-wide text-gray-400'>
							Released
						</p>

						<h3 className='text-3xl font-semibold'>
							{applications.filter((app) => app.processing?.released).length}
						</h3>
					</div>

					<div className={`${cardClass} p-5`}>
						<p className='text-xs uppercase tracking-wide text-gray-400'>
							In Routing
						</p>

						<h3 className='text-3xl font-semibold'>
							{
								applications.filter(
									(app) =>
										app.routing?.currentOffice &&
										app.routing.currentOffice !== 'Not Routed' &&
										!app.processing?.released,
								).length
							}
						</h3>
					</div>

					<div className={`${cardClass} p-5`}>
						<p className='text-xs uppercase tracking-wide text-gray-400'>
							Final Approval
						</p>

						<h3 className='text-3xl font-semibold'>
							{
								applications.filter(
									(app) =>
										app.routing?.currentOffice ===
										'Accounting - Final Approval',
								).length
							}
						</h3>
					</div>
				</div>

				<div className={`${cardClass} p-5 mb-6`}>
					<div className='flex items-center justify-between mb-4'>
						<div>
							<p className='text-xs uppercase tracking-wide text-gray-400'>
								Routing Overview
							</p>
							<h2 className='text-lg font-semibold text-gray-800'>
								Applications by Location
							</h2>
						</div>
					</div>

					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3'>
						{routingSteps.map((office) => {
							const count = applications.filter(
								(app) => app.routing?.currentOffice === office,
							).length;

							return (
								<div
									key={office}
									className='rounded-2xl border border-gray-200 bg-gray-50 p-4'
								>
									<p className='text-xs text-gray-500'>{office}</p>
									<h3 className='text-2xl font-semibold text-gray-800'>
										{count}
									</h3>
								</div>
							);
						})}
					</div>
				</div>

				{/* Application Cards */}
				<div className={`${cardClass} p-4 sm:p-5 overflow-hidden`}>
					<div className='flex justify-between items-center mb-4'>
						<h2 className='text-lg font-semibold text-gray-800'>
							Applications
						</h2>
					</div>

					<div className='flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5'>
						<input
							type='text'
							placeholder='Search by borrower name...'
							className={inputClass}
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>

						<select
							className={`${inputClass} md:w-56`}
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
						>
							<option value='All'>All Status</option>
							<option value='Ready for Processing'>Ready for Processing</option>
							<option value='Needs Correction'>Needs Correction</option>
							<option value='Rejected'>Rejected</option>
						</select>
					</div>

					<div className='w-full overflow-x-auto'>
						{isLoading && (
							<p className='text-sm text-gray-500 mb-4'>
								Loading applications...
							</p>
						)}

						{error && <p className='text-sm text-red-600 mb-4'>{error}</p>}

						{selectedIds.length > 0 && (
							<div className='mb-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4'>
								<div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
									<div>
										<p className='text-sm font-medium text-blue-700'>
											{selectedIds.length} Applications Selected
										</p>

										<p className='text-xl font-bold text-blue-900'>
											₱{selectedTotalAmount.toLocaleString('en-PH')}
										</p>

										<p className='text-xs text-blue-600'>
											Total Selected Amount
										</p>
									</div>

									<div className='flex flex-col sm:flex-row gap-2'>
										<div className='relative'>
											<button
												onClick={() => setShowExportMenu((prev) => !prev)}
												className='w-full sm:w-auto rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition'
											>
												Export Selected ▾
											</button>

											{showExportMenu && (
												<div className='absolute right-0 mt-2 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg z-30'>
													<button
														onClick={() =>
															handleBulkExport(
																'http://localhost:5000/applications/export/monitoring/bulk',
																'provident-monitoring-selected.xlsx',
															)
														}
														className='w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-gray-100'
													>
														Monitoring
													</button>

													<button
														onClick={() =>
															handleBulkExport(
																'http://localhost:5000/applications/export/sl/bulk',
																'sl-selected.xlsx',
															)
														}
														className='w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-gray-100'
													>
														SL
													</button>

													<button
														onClick={() =>
															handleBulkExport(
																'http://localhost:5000/applications/export/dv/bulk',
																'dv-selected.zip',
															)
														}
														className='w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-gray-100'
													>
														DV ZIP
													</button>

													<button
														onClick={() =>
															handleBulkExport(
																'http://localhost:5000/applications/export/payroll/bulk',
																'payroll.xlsx',
															)
														}
														className='w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-gray-100'
													>
														Payroll
													</button>
												</div>
											)}
										</div>

										<button
											onClick={() => setShowBulkRoutingModal(true)}
											className='rounded-full border border-blue-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50 transition'
										>
											Update Location
										</button>

										<button
											onClick={() => setSelectedIds([])}
											className='rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition'
										>
											Clear
										</button>
									</div>
								</div>
							</div>
						)}

						<div className='md:hidden space-y-3'>
							{filteredApplications.length === 0 && (
								<div className='rounded-2xl border border-gray-200 bg-white p-5 text-center text-sm text-gray-500'>
									No applications found.
								</div>
							)}

							{filteredApplications.map((app) => (
								<div
									key={app._id}
									className='rounded-2xl border border-gray-200 bg-white p-4 shadow-sm'
								>
									<div className='flex items-start justify-between gap-3'>
										<div>
											<p className='font-semibold text-gray-900'>
												{app.borrower.fullName}
											</p>
											<p className='text-xs uppercase tracking-wide text-gray-400'>
												{app.loan.loanType} • ₱
												{Number(app.loan.loanAmount).toLocaleString('en-PH')}
											</p>
										</div>

										<input
											type='checkbox'
											checked={selectedIds.includes(app._id)}
											onChange={() => handleSelectApplication(app._id)}
											className='mt-1'
										/>
									</div>

									<div className='mt-3 flex flex-wrap gap-2'>
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

										<span
											className={
												app.processing?.status === 'Processed'
													? 'bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium'
													: 'bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium'
											}
										>
											{app.processing?.status || 'Pending'}
										</span>

										<span
											className={
												app.processing?.released
													? 'bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium'
													: 'bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium'
											}
										>
											{app.processing?.released ? 'Released' : 'Not Released'}
										</span>
									</div>

									<p className='mt-3 text-xs text-gray-500'>
										Submitted:{' '}
										{new Date(app.createdAt).toLocaleDateString('en-PH', {
											year: 'numeric',
											month: 'short',
											day: 'numeric',
										})}
									</p>

									<div className='mt-4 grid grid-cols-2 gap-2'>
										<button
											onClick={() => setSelectedApplication(app)}
											className='rounded-full bg-blue-600 px-3 py-2 text-sm font-medium text-white'
										>
											View
										</button>

										<button
											onClick={() => setEditingApplication(app)}
											className='rounded-full bg-yellow-500 px-3 py-2 text-sm font-medium text-white'
										>
											Edit
										</button>

										<button
											onClick={() => handleDelete(app._id)}
											className='rounded-full bg-red-600 px-3 py-2 text-sm font-medium text-white'
										>
											Delete
										</button>

										<select
											defaultValue=''
											onChange={(e) => {
												const url = e.target.value;
												if (!url) return;

												window.open(url, '_blank');
												e.target.value = '';
											}}
											className='rounded-full border border-gray-200 bg-white px-3 py-2 text-sm'
										>
											<option value='' disabled>
												Export
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
								</div>
							))}
						</div>

						<div className='hidden md:block w-full overflow-x-auto'>
							<table className='min-w-full divide-y divide-gray-200'>
								<thead className='bg-gray-50/80'>
									<tr>
										<th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase'>
											<input
												type='checkbox'
												checked={
													filteredApplications.length > 0 &&
													filteredApplications.every((app) =>
														selectedIds.includes(app._id),
													)
												}
												onChange={(e) => {
													if (e.target.checked) {
														setSelectedIds(
															filteredApplications.map((app) => app._id),
														);
													} else {
														setSelectedIds([]);
													}
												}}
											/>
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

										<th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase'>
											Location
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
												colSpan={10}
												className='px-6 py-8 text-center text-gray-500'
											>
												No applications found.
											</td>
										</tr>
									)}

									{filteredApplications.map((app) => (
										<tr
											key={app._id}
											className='hover:bg-gray-50/80 transition'
										>
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
												<span
													className={`px-3 py-1 rounded-full text-xs font-medium ${getLoanTypeBadge(
														app.loan.loanType,
													)}`}
												>
													{app.loan.loanType}
												</span>
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
													{app.processing?.released
														? 'Released'
														: 'Not Released'}
												</span>

												{app.processing?.dateReleased && (
													<p className='text-xs text-gray-500 mt-1'>
														{new Date(
															app.processing.dateReleased,
														).toLocaleDateString('en-PH')}
													</p>
												)}
											</td>

											<td className='px-6 py-4'>
												<span
													className={
														app.routing?.currentOffice === 'Legal'
															? 'bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium'
															: app.routing?.currentOffice === 'HR'
																? 'bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium'
																: app.routing?.currentOffice === 'Accounting'
																	? 'bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-medium'
																	: app.routing?.currentOffice === 'Admin'
																		? 'bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium'
																		: app.routing?.currentOffice ===
																			  'Schools Division Superintendent'
																			? 'bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium'
																			: app.routing?.currentOffice ===
																				  'Accounting - Final Approval'
																				? 'bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium'
																				: 'bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium'
													}
												>
													{app.routing?.currentOffice || 'Not Routed'}
												</span>
											</td>

											<td className='px-6 py-4 text-center'>
												<div className='relative flex justify-center gap-2'>
													<button
														onClick={() => setSelectedApplication(app)}
														className='rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition'
													>
														View
													</button>

													<button
														onClick={(e) => {
															e.stopPropagation();
															setOpenActionId(
																openActionId === app._id ? null : app._id,
															);
														}}
														className='rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition'
													>
														More
													</button>

													{openActionId === app._id && (
														<div
															onClick={(e) => e.stopPropagation()}
															className='absolute right-0 top-11 z-20 w-48 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg'
														>
															<button
																onClick={() => {
																	setEditingApplication(app);
																	setOpenActionId(null);
																}}
																className='w-full rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100'
															>
																Edit
															</button>

															<button
																onClick={() => {
																	setRoutingApplication(app);
																	setRoutingForm({
																		office: app.routing?.currentOffice || '',
																		receivedBy: '',
																		remarks: '',
																	});
																	setOpenActionId(null);
																}}
																className='w-full rounded-xl px-3 py-2 text-left text-sm text-blue-700 hover:bg-blue-50'
															>
																Route / Update Location
															</button>

															{app.routing?.history?.length ? (
																<button
																	onClick={() => {
																		handleUndoLastRoute(app._id);
																		setOpenActionId(null);
																	}}
																	className='w-full rounded-xl px-3 py-2 text-left text-sm text-orange-700 hover:bg-orange-50'
																>
																	Undo Last Route
																</button>
															) : null}

															<button
																onClick={() => {
																	handleDelete(app._id);
																	setOpenActionId(null);
																}}
																className='w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50'
															>
																Delete
															</button>

															{app.processing?.status === 'Processed' ? (
																<button
																	onClick={() => {
																		handleUndoProcessed(app._id);
																		setOpenActionId(null);
																	}}
																	className='w-full rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100'
																>
																	Undo Process
																</button>
															) : (
																<button
																	onClick={() => {
																		handleMarkAsProcessed(app._id);
																		setOpenActionId(null);
																	}}
																	disabled={!canProcess(app)}
																	className={
																		!canProcess(app)
																			? 'w-full rounded-xl px-3 py-2 text-left text-sm text-gray-400 cursor-not-allowed'
																			: 'w-full rounded-xl px-3 py-2 text-left text-sm text-green-700 hover:bg-green-50'
																	}
																>
																	Process
																</button>
															)}

															{app.processing?.released ? (
																<button
																	onClick={() => {
																		handleUndoRelease(app._id);
																		setOpenActionId(null);
																	}}
																	className='w-full rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100'
																>
																	Undo Release
																</button>
															) : (
																<button
																	onClick={() => {
																		handleRelease(app._id);
																		setOpenActionId(null);
																	}}
																	disabled={!canRelease(app)}
																	className={
																		!canRelease(app)
																			? 'w-full rounded-xl px-3 py-2 text-left text-sm text-gray-400 cursor-not-allowed'
																			: 'w-full rounded-xl px-3 py-2 text-left text-sm text-purple-700 hover:bg-purple-50'
																	}
																>
																	Release
																</button>
															)}

															<div className='my-1 border-t border-gray-100' />

															<button
																onClick={() =>
																	window.open(
																		`http://localhost:5000/applications/${app._id}/export/monitoring`,
																		'_blank',
																	)
																}
																className='w-full rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100'
															>
																Export Monitoring
															</button>

															<button
																onClick={() =>
																	window.open(
																		`http://localhost:5000/applications/${app._id}/export/sl`,
																		'_blank',
																	)
																}
																className='w-full rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100'
															>
																Export SL
															</button>

															<button
																onClick={() =>
																	window.open(
																		`http://localhost:5000/applications/${app._id}/export/dv`,
																		'_blank',
																	)
																}
																className='w-full rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100'
															>
																Export DV
															</button>
														</div>
													)}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						<div className='flex items-center justify-between mt-4'>
							<button
								disabled={currentPage === 1}
								onClick={() => setCurrentPage((prev) => prev - 1)}
								className='px-4 py-2 rounded-full border border-gray-200 bg-white text-sm disabled:opacity-50 hover:bg-gray-50 transition'
							>
								Previous
							</button>

							<p className='text-sm text-gray-600'>
								Page {currentPage} of {totalPages}
							</p>

							<button
								disabled={currentPage === totalPages}
								onClick={() => setCurrentPage((prev) => prev + 1)}
								className='px-4 py-2 rounded-full border border-gray-200 bg-white text-sm disabled:opacity-50 hover:bg-gray-50 transition'
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
						<div className='sticky top-0 bg-white z-10 flex justify-between items-center border-b pb-4 mb-6'>
							<div>
								<h2 className='text-xl font-bold text-gray-800'>
									Application Details
								</h2>

								<div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 mb-6'>
									{/* Status */}
									<div className='bg-white border border-gray-200 rounded-2xl p-4'>
										<p className='text-xs uppercase tracking-wide text-gray-400'>
											Status
										</p>

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
									<div className='bg-white border border-gray-200 rounded-2xl p-4'>
										<p className='text-xs uppercase tracking-wide text-gray-400'>
											NPAD
										</p>

										<p className='text-2xl font-semibold text-gray-800 mt-2'>
											₱
											{selectedApplication.evaluation.netPayAfterDeduction.toLocaleString(
												'en-PH',
											)}
										</p>
									</div>

									{/* Existing Balance */}
									<div className='bg-white border border-gray-200 rounded-2xl p-4'>
										<p className='text-xs uppercase tracking-wide text-gray-400'>
											Existing Balance
										</p>

										<p className='text-2xl font-semibold text-gray-800 mt-2'>
											₱
											{selectedApplication.evaluation.existingBalance.toLocaleString(
												'en-PH',
											)}
										</p>
									</div>

									{/* Loan Granted */}
									<div className='bg-white border border-gray-200 rounded-2xl p-4'>
										<p className='text-xs uppercase tracking-wide text-gray-400'>
											Final Loan Granted
										</p>

										<p className='text-2xl font-semibold text-gray-800 mt-2'>
											₱
											{selectedApplication.evaluation.finalLoanGranted.toLocaleString(
												'en-PH',
											)}
										</p>
									</div>
								</div>

								<p className='text-xs uppercase tracking-wide text-gray-400'>
									Complete borrower and loan information
								</p>

								<div className='flex flex-wrap gap-2 mt-4'>
									<span className='bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium'>
										{selectedApplication.loan.loanType}
									</span>

									<span className='bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium'>
										LAF #{selectedApplication.borrower.lafNumber}
									</span>

									<span className='bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium'>
										DV No: {selectedApplication.documentNumbers.dvNumber}
									</span>

									<span className='bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium'>
										₱
										{selectedApplication.evaluation.finalLoanGranted.toLocaleString(
											'en-PH',
										)}
									</span>
								</div>
							</div>

							<button
								onClick={() => setSelectedApplication(null)}
								className='rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition'
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
										<p className='text-xs uppercase tracking-wide text-gray-400'>
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

							<section className='md:col-span-2 bg-gray-50 border border-gray-200 rounded-xl p-5'>
								<div className='flex items-center justify-between mb-3'>
									<h3 className='font-semibold text-gray-800'>
										Routing History
									</h3>

									<span className='bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium'>
										{selectedApplication.routing?.currentOffice || 'Not Routed'}
									</span>

									<div className='mt-4 flex flex-wrap gap-2'>
										{routingSteps.map((step) => {
											const completed =
												selectedApplication.routing?.history?.some(
													(route) => route.office === step,
												);

											return (
												<div
													key={step}
													className={
														completed
															? 'bg-green-100 text-green-700 px-3 py-2 rounded-full text-xs font-medium'
															: 'bg-gray-100 text-gray-500 px-3 py-2 rounded-full text-xs font-medium'
													}
												>
													{completed ? '✓' : '○'} {step}
												</div>
											);
										})}
									</div>
								</div>

								{selectedApplication.routing?.history?.length ? (
									<div className='space-y-3'>
										{selectedApplication.routing.history.map((route, index) => (
											<div
												key={index}
												className='bg-white border border-gray-200 rounded-2xl p-4'
											>
												<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1'>
													<p className='font-medium text-gray-800'>
														{route.office}
													</p>

													<p className='text-xs text-gray-500'>
														{new Date(route.dateReceived).toLocaleDateString(
															'en-PH',
															{
																year: 'numeric',
																month: 'short',
																day: 'numeric',
															},
														)}
													</p>
												</div>

												<p className='text-sm text-gray-600 mt-1'>
													Received by: {route.receivedBy}
												</p>

												{route.remarks && (
													<p className='text-sm text-gray-500 mt-1'>
														Remarks: {route.remarks}
													</p>
												)}
											</div>
										))}
									</div>
								) : (
									<p className='text-sm text-gray-500'>
										No routing history yet.
									</p>
								)}
							</section>
						</div>
					</div>
				</div>
			)}

			{editingApplication && (
				<div className='fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50'>
					<div className='bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6'>
						<div className='sticky top-0 bg-white z-10 flex justify-between items-center border-b pb-4 mb-6'>
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

			{routingApplication && (
				<div className='fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50'>
					<div className='bg-white rounded-2xl shadow-xl max-w-md w-full p-6'>
						<div className='flex items-start justify-between border-b border-gray-200 pb-4 mb-5'>
							<div>
								<h2 className='text-xl font-bold text-gray-800'>
									Route Application
								</h2>
								<p className='text-sm text-gray-500'>
									{routingApplication.borrower.fullName}
								</p>
							</div>

							<button
								onClick={() => setRoutingApplication(null)}
								className='rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50'
							>
								Close
							</button>
						</div>

						<div className='space-y-4'>
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>
									Office / Signatory
								</label>

								<select
									value={routingForm.office}
									onChange={(e) =>
										setRoutingForm({
											...routingForm,
											office: e.target.value,
										})
									}
									className={inputClass}
								>
									<option value=''>Select office</option>

									{signatoryOffices.map((office) => (
										<option key={office} value={office}>
											{office}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>
									Received By
								</label>

								<input
									type='text'
									value={routingForm.receivedBy}
									onChange={(e) =>
										setRoutingForm({
											...routingForm,
											receivedBy: e.target.value,
										})
									}
									className={inputClass}
									placeholder='Name of receiving person'
								/>
							</div>

							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>
									Remarks
								</label>

								<textarea
									value={routingForm.remarks}
									onChange={(e) =>
										setRoutingForm({
											...routingForm,
											remarks: e.target.value,
										})
									}
									className={inputClass}
									rows={3}
									placeholder='Optional remarks'
								/>
							</div>
						</div>

						<div className='flex justify-end gap-2 mt-6'>
							<button
								onClick={() => setRoutingApplication(null)}
								className='px-4 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50'
							>
								Cancel
							</button>

							<button
								onClick={handleRouteApplication}
								disabled={!routingForm.office || !routingForm.receivedBy}
								className={
									!routingForm.office || !routingForm.receivedBy
										? 'px-4 py-2 rounded-full bg-gray-300 text-gray-500 text-sm font-medium cursor-not-allowed'
										: 'px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700'
								}
							>
								Save Route
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

			{showBulkRoutingModal && (
				<div className='fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50'>
					<div className='bg-white rounded-2xl shadow-xl max-w-md w-full p-6'>
						<div className='flex items-start justify-between border-b border-gray-200 pb-4 mb-5'>
							<div>
								<h2 className='text-xl font-bold text-gray-800'>
									Bulk Update Location
								</h2>
								<p className='text-sm text-gray-500'>
									{selectedIds.length} selected application
									{selectedIds.length > 1 ? 's' : ''}
								</p>
							</div>

							<button
								onClick={() => setShowBulkRoutingModal(false)}
								className='rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50'
							>
								Close
							</button>
						</div>

						<div className='space-y-4'>
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>
									Office / Signatory
								</label>

								<select
									value={bulkRoutingForm.office}
									onChange={(e) =>
										setBulkRoutingForm({
											...bulkRoutingForm,
											office: e.target.value,
										})
									}
									className={inputClass}
								>
									<option value=''>Select office</option>

									{signatoryOffices.map((office) => (
										<option key={office} value={office}>
											{office}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>
									Received By
								</label>

								<input
									type='text'
									value={bulkRoutingForm.receivedBy}
									onChange={(e) =>
										setBulkRoutingForm({
											...bulkRoutingForm,
											receivedBy: e.target.value,
										})
									}
									className={inputClass}
									placeholder='Name of receiving person'
								/>
							</div>

							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>
									Remarks
								</label>

								<textarea
									value={bulkRoutingForm.remarks}
									onChange={(e) =>
										setBulkRoutingForm({
											...bulkRoutingForm,
											remarks: e.target.value,
										})
									}
									className={inputClass}
									rows={3}
									placeholder='Optional remarks'
								/>
							</div>
						</div>

						<div className='flex justify-end gap-2 mt-6'>
							<button
								onClick={() => setShowBulkRoutingModal(false)}
								className='px-4 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50'
							>
								Cancel
							</button>

							<button
								onClick={handleBulkRouteApplications}
								disabled={
									!bulkRoutingForm.office ||
									!bulkRoutingForm.receivedBy ||
									selectedIds.length === 0
								}
								className={
									!bulkRoutingForm.office ||
									!bulkRoutingForm.receivedBy ||
									selectedIds.length === 0
										? 'px-4 py-2 rounded-full bg-gray-300 text-gray-500 text-sm font-medium cursor-not-allowed'
										: 'px-4 py-2 rounded-full bg-sky-600 text-white text-sm font-medium hover:bg-sky-700'
								}
							>
								Update Location
							</button>
						</div>
					</div>
				</div>
			)}
		</main>
	);
}

export default Dashboard;
