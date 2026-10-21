import { Navigate, Route, Routes } from 'react-router'
import { HomePage } from '@/features/home/HomePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      {/* Replaced by a proper 404 page in stage 3. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
