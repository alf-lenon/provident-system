import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import NewApplication from './pages/NewApplication';
import TemplateManagement from './pages/TemplateManagement';

function App() {
	return (
		<Routes>
			<Route path='/' element={<Dashboard />}></Route>
			<Route path='/new' element={<NewApplication />}></Route>
			<Route path='/templates' element={<TemplateManagement />} />
		</Routes>
	);
}

export default App;
