function App() {
	return (
		<main className='min-h-screen bg-gray-100 p-6'>
			{/* Header */}
			<header className='mb-6'>
				<h1 className='text-2xl font-bold text-gray-800'>
					Provident Loan System
				</h1>
				<p className='text-gray-600'>Version 1 - Internal Pre-Screening Tool</p>
			</header>

			{/* Button */}
			<section className='mb-6'>
				<button className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700'>
					+ New Application
				</button>
			</section>

			{/* Applications */}
			<section>
				<h2 className='text-lg font-semibold mb-4 text-gray-800'>
					Applications
				</h2>

				<div className='space-y-4'>
					<div className='bg-white p-4 rounded-lg shadow'>
						<p className='font-bold'>Juan Dela Cruz</p>
						<p className='text-sm text-gray-600'>Loan Type: Renewal</p>
						<p className='text-green-600 font-semibold'>Ready for Processing</p>
					</div>

					<div className='bg-white p-4 rounded-lg shadow'>
						<p className='font-bold'>Maria Santos</p>
						<p className='text-sm text-gray-600'>Loan Type: New</p>
						<p className='text-yellow-600 font-semibold'>Needs Correction</p>
					</div>

					<div className='bg-white p-4 rounded-lg shadow'>
						<p className='font-bold'>Pedro Reyes</p>
						<p className='text-sm text-gray-600'>Loan Type: Renewal</p>
						<p className='text-red-600 font-semibold'>Rejected</p>
					</div>
				</div>
			</section>
		</main>
	);
}

export default App;
