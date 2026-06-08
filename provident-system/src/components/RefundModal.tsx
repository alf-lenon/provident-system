import { useEffect, useState } from 'react';

type Props = {
	onClose: () => void;
	onSuccess: () => void;
};

export default function RefundModal({ onClose, onSuccess }: Props) {
	const [formData, setFormData] = useState({
		borrowerName: '',
		school: '',
		accountNumber: '',
		refundAmount: '',
		dvNumber: '',
	});

	useEffect(() => {
		const fetchNextDvNumber = async () => {
			try {
				const response = await fetch(
					'http://localhost:5000/applications/next-dv-number',
				);

				const data = await response.json();

				if (!response.ok) return;

				if (data.nextDvNumber) {
					setFormData((prev) => ({
						...prev,
						dvNumber: data.nextDvNumber,
					}));
				}
			} catch (error) {
				console.error('Error fetching next DV number:', error);
			}
		};

		fetchNextDvNumber();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			const response = await fetch('http://localhost:5000/refunds', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(formData),
			});

			const data = await response.json();

			if (!response.ok) {
				alert(data.message || 'Failed to save refund');
				return;
			}

			alert('Refund saved successfully');

			onSuccess();
			onClose();
		} catch (error) {
			console.error(error);
			alert('Could not connect to the server');
		}
	};

	const inputClass =
		'w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500';

	return (
		<div className='fixed inset-0 bg-black/50 flex items-center justify-center'>
			<div className='bg-white p-6 rounded-2xl w-full max-w-md shadow-xl'>
				<h2 className='text-lg font-semibold mb-4'>New Refund</h2>

				<form onSubmit={handleSubmit} className='space-y-3'>
					<input
						className={inputClass}
						placeholder='Borrower Name'
						required
						value={formData.borrowerName}
						onChange={(e) =>
							setFormData({
								...formData,
								borrowerName: e.target.value.toUpperCase(),
							})
						}
					/>

					<input
						className={inputClass}
						placeholder='School / Address'
						required
						value={formData.school}
						onChange={(e) =>
							setFormData({
								...formData,
								school: e.target.value.toUpperCase(),
							})
						}
					/>

					<input
						className={inputClass}
						placeholder='Account Number'
						required
						value={formData.accountNumber}
						onChange={(e) =>
							setFormData({
								...formData,
								accountNumber: e.target.value,
							})
						}
					/>

					<input
						className={inputClass}
						type='number'
						placeholder='Refund Amount'
						required
						value={formData.refundAmount}
						onChange={(e) =>
							setFormData({
								...formData,
								refundAmount: e.target.value,
							})
						}
					/>

					<input
						className={inputClass}
						placeholder='DV Number'
						required
						value={formData.dvNumber}
						onChange={(e) =>
							setFormData({
								...formData,
								dvNumber: e.target.value,
							})
						}
					/>

					<div className='flex justify-end gap-2 pt-3'>
						<button
							type='button'
							onClick={onClose}
							className='px-4 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50'
						>
							Cancel
						</button>

						<button
							type='submit'
							className='px-4 py-2 rounded-full bg-orange-500 text-white text-sm font-medium hover:bg-orange-600'
						>
							Save Refund
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
