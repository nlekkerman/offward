import { Navigate, Route, Routes } from 'react-router-dom'
import ManagementGuard from '../pages/manage/ManagementGuard.jsx'
import ManageDashboardPage from '../pages/manage/ManageDashboardPage.jsx'
import ManageLayout from '../pages/manage/ManageLayout.jsx'
import ManageLoginPage from '../pages/manage/ManageLoginPage.jsx'
import AccessDeniedPage from '../pages/manage/AccessDeniedPage.jsx'

import EntityListPage from '../features/management/EntityListPage.jsx'
import EntityFormPage from '../features/management/EntityFormPage.jsx'

function ManageRouter() {
  return (
    <Routes>
      <Route path="login" element={<ManageLoginPage />} />
      <Route path="access-denied" element={<AccessDeniedPage />} />

      <Route element={<ManagementGuard />}>
        <Route element={<ManageLayout />}>
          <Route index element={<ManageDashboardPage />} />
          <Route path="countries" element={<EntityListPage resourceKey="countries" title="Countries" />} />
          <Route path="countries/new" element={<EntityFormPage resourceKey="countries" title="Create Country" />} />
          <Route path="countries/:id/edit" element={<EntityFormPage resourceKey="countries" title="Edit Country" />} />

          <Route path="places" element={<EntityListPage resourceKey="places" title="Places" />} />
          <Route path="places/new" element={<EntityFormPage resourceKey="places" title="Create Place" />} />
          <Route path="places/:id/edit" element={<EntityFormPage resourceKey="places" title="Edit Place" />} />

          <Route path="routes" element={<EntityListPage resourceKey="routes" title="Routes" />} />
          <Route path="routes/new" element={<EntityFormPage resourceKey="routes" title="Create Route" />} />
          <Route path="routes/:id/edit" element={<EntityFormPage resourceKey="routes" title="Edit Route" />} />

          <Route path="stories" element={<EntityListPage resourceKey="stories" title="Stories" />} />
          <Route path="stories/new" element={<EntityFormPage resourceKey="stories" title="Create Story" />} />
          <Route path="stories/:id/edit" element={<EntityFormPage resourceKey="stories" title="Edit Story" />} />

          <Route path="videos" element={<EntityListPage resourceKey="videos" title="Videos" />} />
          <Route path="videos/new" element={<EntityFormPage resourceKey="videos" title="Create Video" />} />
          <Route path="videos/:id/edit" element={<EntityFormPage resourceKey="videos" title="Edit Video" />} />

          <Route path="tours" element={<EntityListPage resourceKey="tours" title="Tours" />} />
          <Route path="tours/new" element={<EntityFormPage resourceKey="tours" title="Create Tour" />} />
          <Route path="tours/:id/edit" element={<EntityFormPage resourceKey="tours" title="Edit Tour" />} />

          <Route path="events" element={<EntityListPage resourceKey="events" title="Events" />} />
          <Route path="events/new" element={<EntityFormPage resourceKey="events" title="Create Event" />} />
          <Route path="events/:id/edit" element={<EntityFormPage resourceKey="events" title="Edit Event" />} />

          <Route path="partners" element={<EntityListPage resourceKey="partners" title="Partners" />} />
          <Route path="partners/new" element={<EntityFormPage resourceKey="partners" title="Create Partner" />} />
          <Route path="partners/:id/edit" element={<EntityFormPage resourceKey="partners" title="Edit Partner" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/manage" replace />} />
    </Routes>
  )
}

export default ManageRouter
