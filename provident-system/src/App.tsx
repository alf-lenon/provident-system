import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import NewApplication from './pages/NewApplication';

function App() {
	return (
		<Routes>
			<Route path='/' element={<Dashboard />}></Route>
			<Route path='/new' element={<NewApplication />}></Route>
		</Routes>
	);
}

export default App;
