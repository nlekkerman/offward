import { createBrowserRouter } from 'react-router-dom'
import AppShell from '../shared/layout/AppShell.jsx'
import AboutPage from '../pages/AboutPage.jsx'
import ContactPage from '../pages/ContactPage.jsx'
import CountriesListPage from '../pages/CountriesListPage.jsx'
import CountryPage from '../pages/CountryPage.jsx'
import EventPage from '../pages/EventPage.jsx'
import ExplorePage from '../pages/ExplorePage.jsx'
import HomePage from '../pages/HomePage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import PlacePage from '../pages/PlacePage.jsx'
import RoutePage from '../pages/RoutePage.jsx'
import SegmentDetailPage from '../pages/SegmentDetailPage.jsx'
import StoriesListPage from '../pages/StoriesListPage.jsx'
import StoryPage from '../pages/StoryPage.jsx'
import TourPage from '../pages/TourPage.jsx'
import VideoPage from '../pages/VideoPage.jsx'
import WaypointDetailPage from '../pages/WaypointDetailPage.jsx'
import ManageRouter from './manageRouter.jsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'explore', element: <ExplorePage /> },
      { path: 'countries', element: <CountriesListPage /> },
      { path: 'countries/:countrySlug', element: <CountryPage /> },
      { path: 'places/:placeSlug', element: <PlacePage /> },
      { path: 'routes/:routeSlug', element: <RoutePage /> },
      { path: 'routes/:routeSlug/waypoints/:id', element: <WaypointDetailPage /> },
      { path: 'routes/:routeSlug/segments/:id', element: <SegmentDetailPage /> },
      { path: 'stories', element: <StoriesListPage /> },
      { path: 'stories/:storySlug', element: <StoryPage /> },
      { path: 'videos/:videoSlug', element: <VideoPage /> },
      { path: 'tours/:tourSlug', element: <TourPage /> },
      { path: 'events/:eventSlug', element: <EventPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'manage/*', element: <ManageRouter /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])