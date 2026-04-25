import { useEffect, useState } from 'react';

// TypeScript
type Application = {
	borrower: {
		fullName: string;
	};
	loan: {
		loanAmount: string;
		loanType: string;
	};
};

function Dashboard() {
	const [applications, setApplications] = useState<Application[]>([]);

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
		<div>
			<h1>Applications</h1>

			{applications.map((app, index) => (
				<div key={index}>
					<p>Name: {app.borrower.fullName}</p>
					<p>Loan amount: {app.loan.loanAmount}</p>
					<p>Loan type: {app.loan.loanType}</p>
				</div>
			))}
		</div>
	);
}

export default Dashboard;
