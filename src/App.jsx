import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthProvider'
import CreateGoal from './pages/CreateGoal'
import Dashboard from './pages/Dashboard'
import EditGoal from './pages/EditGoal'
import GoalDetails from './pages/GoalDetails'
import GroupDetails from './pages/GroupDetails'
import Groups from './pages/Groups'
import MyGoals from './pages/MyGoals'
import NotFound from './pages/NotFound'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import ProtectedRoute from './routes/ProtectedRoute'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Layout route: every child below is protected and gets the navbar. */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="goals" element={<MyGoals />} />
              <Route path="goals/new" element={<CreateGoal />} />
              {/* :goalId is a URL parameter, read with useParams(). */}
              <Route path="goals/:goalId" element={<GoalDetails />} />
              <Route path="goals/:goalId/edit" element={<EditGoal />} />
              <Route path="groups" element={<Groups />} />
              <Route path="groups/:groupId" element={<GroupDetails />} />
            </Route>

            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
