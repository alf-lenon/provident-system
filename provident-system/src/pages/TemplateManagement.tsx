import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type TemplateType = 'monitoring' | 'sl' | 'dv' | 'payroll';

type TemplateInfo = {
	uploaded: boolean;
	fileName: string;
};

type TemplateStatus = Record<TemplateType, TemplateInfo>;

const templates: { type: TemplateType; label: string; description: string }[] =
	[
		{
			type: 'monitoring',
			label: 'Monitoring Template',
			description: 'Used for Provident Monitoring export.',
		},
		{
			type: 'sl',
			label: 'Subsidiary Ledger Template',
			description: 'Used for SL export, DV number, and LAF number detection.',
		},
		{
			type: 'dv',
			label: 'Disbursement Voucher Template',
			description: 'Used for single and bulk DV exports.',
		},
		{
			type: 'payroll',
			label: 'Payroll Template',
			description: 'Used for payroll batch export.',
		},
	];

export default function TemplateManagement() {
	const navigate = useNavigate();

	const [status, setStatus] = useState<TemplateStatus>({
		monitoring: { uploaded: false, fileName: '' },
		sl: { uploaded: false, fileName: '' },
		dv: { uploaded: false, fileName: '' },
		payroll: { uploaded: false, fileName: '' },
	});

	const [isLoading, setIsLoading] = useState(true);
	const [uploadingType, setUploadingType] = useState<TemplateType | null>(null);
	const [message, setMessage] = useState('');

	const fetchStatus = async () => {
		try {
			setIsLoading(true);

			const response = await fetch('http://localhost:5000/templates/status');
			const data = await response.json();

			if (!response.ok) {
				setMessage(data.message || 'Failed to load template status');
				return;
			}

			setStatus(data);
		} catch (error) {
			console.error(error);
			setMessage('Could not connect to the server.');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchStatus();
	}, []);

	const handleUpload = async (type: TemplateType, file: File) => {
		try {
			setUploadingType(type);
			setMessage('');

			const formData = new FormData();
			formData.append('file', file);

			const response = await fetch(
				`http://localhost:5000/templates/${type}/upload`,
				{
					method: 'POST',
					body: formData,
				},
			);

			const data = await response.json();

			if (!response.ok) {
				setMessage(data.message || 'Template upload failed');
				return;
			}

			setMessage(`${type.toUpperCase()} template uploaded successfully.`);
			await fetchStatus();
		} catch (error) {
			console.error(error);
			setMessage('Could not upload template.');
		} finally {
			setUploadingType(null);
		}
	};

	return (
		<main className='min-h-screen bg-[#F5F5F7] p-4 sm:p-6'>
			<div className='max-w-5xl mx-auto'>
				<header className='mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
					<div>
						<h1 className='text-2xl font-bold text-gray-800'>
							Template Management
						</h1>
						<p className='text-gray-600'>
							Upload and manage Excel templates used by the system.
						</p>
					</div>

					<button
						onClick={() => navigate('/')}
						className='px-4 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition'
					>
						Back to Dashboard
					</button>
				</header>

				{message && (
					<div className='mb-4 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700'>
						{message}
					</div>
				)}

				{isLoading ? (
					<div className='rounded-2xl border border-gray-200 bg-white p-6 text-gray-500'>
						Loading template status...
					</div>
				) : (
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						{templates.map((template) => (
							<div
								key={template.type}
								className='bg-white/90 border border-gray-200 rounded-2xl shadow-sm p-5'
							>
								<div className='flex items-start justify-between gap-4'>
									<div>
										<h2 className='font-semibold text-gray-800'>
											{template.label}
										</h2>

										<p className='text-sm text-gray-500 mt-1'>
											{template.description}
										</p>

										<span
											className={
												status[template.type].uploaded
													? 'inline-block mt-3 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium'
													: 'inline-block mt-3 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium'
											}
										>
											{status[template.type] ? 'Uploaded' : 'Missing'}
										</span>

										{status[template.type].fileName && (
											<p className='mt-2 text-xs text-gray-500'>
												File: {status[template.type].fileName}
											</p>
										)}
									</div>
								</div>

								<div className='mt-5'>
									<label className='block'>
										<span className='sr-only'>Upload template</span>

										<input
											type='file'
											accept='.xlsx'
											disabled={uploadingType === template.type}
											onChange={(e) => {
												const file = e.target.files?.[0];
												if (!file) return;

												handleUpload(template.type, file);
												e.target.value = '';
											}}
											className='block w-full text-sm text-gray-600 file:mr-4 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700'
										/>
									</label>

									{uploadingType === template.type && (
										<p className='text-sm text-gray-500 mt-2'>Uploading...</p>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</main>
	);
}
