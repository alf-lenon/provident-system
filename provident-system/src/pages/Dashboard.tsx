import { Link } from 'react-router-dom';

function Dashboard() {
	return (
		<div className='p-6'>
			<h1 className='text-2xl font-bold mb-4'>Dashboard</h1>

			<Link to='/new' className='bg-blue-600 text-white px-4 py-2 rounded-lg'>
				+ New Application
			</Link>
		</div>
	);
}

export default Dashboard;
