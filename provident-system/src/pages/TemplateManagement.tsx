import { useEffect, useState } from 'react';

type TemplateType = 'monitoring' | 'sl' | 'dv' | 'payroll';

type TemplateStatus = Record<TemplateType, boolean>;

const templates: TemplateType[] = ['monitoring', 'sl', 'dv', 'payroll'];

export default function TemplateManagement() {
	const [status, setStatus] = useState<TemplateStatus>({
		monitoring: false,
		sl: false,
		dv: false,
		payroll: false,
	});

	const fetchStatus = async () => {
		const response = await fetch('http://localhost:5000/templates/status');
		const data = await response.json();
		setStatus(data);
	};

	useEffect(() => {
		const loadStatus = async () => {
			const response = await fetch('http://localhost:5000/templates/status');
			const data = await response.json();
			setStatus(data);
		};

		loadStatus();
	}, []);

	const handleUpload = async (type: TemplateType, file: File) => {
		const formData = new FormData();
		formData.append('file', file);

		await fetch(`http://localhost:5000/templates/${type}/upload`, {
			method: 'POST',
			body: formData,
		});

		fetchStatus();
	};

	return (
		<div className='p-6'>
			<h1 className='text-2xl font-bold mb-6'>Template Management</h1>

			<div className='space-y-4'>
				{templates.map((template) => (
					<div
						key={template}
						className='border rounded-lg p-4 flex items-center justify-between'
					>
						<div>
							<h2 className='font-semibold uppercase'>{template}</h2>
							<p
								className={
									status[template]
										? 'text-green-600 text-sm'
										: 'text-red-600 text-sm'
								}
							>
								{status[template] ? 'Uploaded' : 'Missing'}
							</p>
						</div>

						<input
							type='file'
							accept='.xlsx'
							onChange={(e) => {
								const file = e.target.files?.[0];
								if (!file) return;

								handleUpload(template, file);
								e.target.value = '';
							}}
						/>
					</div>
				))}
			</div>
		</div>
	);
}
