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
      <Route path="/manage/login" element={<ManageLoginPage />} />
      <Route path="/manage/access-denied" element={<AccessDeniedPage />} />

      <Route element={<ManagementGuard />}>
        <Route element={<ManageLayout />}>
          <Route path="/manage" element={<ManageDashboardPage />} />
          <Route path="/manage/countries" element={<EntityListPage resourceKey="countries" title="Countries" />} />
          <Route path="/manage/countries/new" element={<EntityFormPage resourceKey="countries" title="Create Country" />} />
          <Route path="/manage/countries/:id/edit" element={<EntityFormPage resourceKey="countries" title="Edit Country" />} />

          <Route path="/manage/places" element={<EntityListPage resourceKey="places" title="Places" />} />
          <Route path="/manage/places/new" element={<EntityFormPage resourceKey="places" title="Create Place" />} />
          <Route path="/manage/places/:id/edit" element={<EntityFormPage resourceKey="places" title="Edit Place" />} />

          <Route path="/manage/routes" element={<EntityListPage resourceKey="routes" title="Routes" />} />
          <Route path="/manage/routes/new" element={<EntityFormPage resourceKey="routes" title="Create Route" />} />
          <Route path="/manage/routes/:id/edit" element={<EntityFormPage resourceKey="routes" title="Edit Route" />} />

          <Route path="/manage/stories" element={<EntityListPage resourceKey="stories" title="Stories" />} />
          <Route path="/manage/stories/new" element={<EntityFormPage resourceKey="stories" title="Create Story" />} />
          <Route path="/manage/stories/:id/edit" element={<EntityFormPage resourceKey="stories" title="Edit Story" />} />

          <Route path="/manage/videos" element={<EntityListPage resourceKey="videos" title="Videos" />} />
          <Route path="/manage/videos/new" element={<EntityFormPage resourceKey="videos" title="Create Video" />} />
          <Route path="/manage/videos/:id/edit" element={<EntityFormPage resourceKey="videos" title="Edit Video" />} />

          <Route path="/manage/tours" element={<EntityListPage resourceKey="tours" title="Tours" />} />
          <Route path="/manage/tours/new" element={<EntityFormPage resourceKey="tours" title="Create Tour" />} />
          <Route path="/manage/tours/:id/edit" element={<EntityFormPage resourceKey="tours" title="Edit Tour" />} />

          <Route path="/manage/events" element={<EntityListPage resourceKey="events" title="Events" />} />
          <Route path="/manage/events/new" element={<EntityFormPage resourceKey="events" title="Create Event" />} />
          <Route path="/manage/events/:id/edit" element={<EntityFormPage resourceKey="events" title="Edit Event" />} />

          <Route path="/manage/partners" element={<EntityListPage resourceKey="partners" title="Partners" />} />
          <Route path="/manage/partners/new" element={<EntityFormPage resourceKey="partners" title="Create Partner" />} />
          <Route path="/manage/partners/:id/edit" element={<EntityFormPage resourceKey="partners" title="Edit Partner" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/manage" replace />} />
    </Routes>
  )
}

export default ManageRouter
